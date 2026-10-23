package com.utp.horario.application.service;

import com.utp.horario.application.dtos.SessionBootstrapDto.SessionBootstrapResult;
import com.utp.horario.application.handle.GenerateScheduleCommandHandler;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.exceptions.ScheduleUnavailableException;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Auto-Bootstrap Integral de sesión (Fase 0.7): caso de uso unificado que prepara la
 * sesión del estudiante para operar sin estados vacíos ni gastos de tokens evitables.
 *
 * <p>Pipeline:
 * <ol>
 *   <li><b>Horario local-first:</b> si MySQL ya tiene un snapshot oficial sincronizado
 *       hoy ({@link GenerateScheduleCommandHandler#ensureFreshSchedule}), se sirve de
 *       base de datos en milisegundos y la pasarela no se consulta — el re-login no
 *       repite la latencia remota. Solo los snapshots ausentes o vencidos disparan el
 *       fetch oficial; si la pasarela no responde degrada al snapshot previo en vez de
 *       abortar el login (excepción declarada solo cuando no hay datos de ninguna
 *       fuente).</li>
 *   <li><b>Extracción de cursos:</b> códigos únicos de asignatura matriculada a partir
 *       del intervalo vigente (fuentes declarativas y horario).</li>
 *   <li><b>Sílabos concurrentes:</b> para cada curso se resuelve el sílabo vía
 *       {@link SyllabusService#getSyllabus(String, String, String, String)}, que es
 *       local-first: los sílabos ya persistidos (HIT local, milisegundos) no tocan la
 *       pasarela y solo los faltantes se descargan, en paralelo, con un presupuesto de
 *       espera acotado — los pendientes concluyen en segundo plano y quedan
 *       reintentables, para que el login no quede bloqueado por un PDF remoto.</li>
 * </ol>
 *
 * <p><b>Regla de honestidad:</b> el resultado reporta los faltantes pero nunca inventa
 * sílabos ni semanas; los faltantes son reintentables sin repetir el paso 1.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionBootstrapService {

    /**
     * Tope de descargas de sílabos en paralelo. Cota de seguridad para un dyno pequeño:
     * las llamadas son IO-bound (pasarela que parsea PDFs), por lo que algunos hilos
     * simultáneos basta para acotar el tiempo total sin agotar recursos.
     */
    static final int MAX_PARALLEL_SYLLABUS_FETCHES = 8;

    /**
     * Presupuesto de espera por los sílabos que deban descargarse de la pasarela
     * durante el login. Vencido el plazo, los downloads siguen en segundo plano y
     * persisten al completarse (reintentables en el siguiente bootstrap): el
     * stepper reporta el conteo real confirmado y el login no se congela.
     */
    static final int SYLLABUS_RESOLUTION_BUDGET_SECONDS = 8;

    private final GenerateScheduleCommandHandler scheduleSyncHandler;
    private final SyllabusService syllabusService;

    public SessionBootstrapResult bootstrapStudentData(String studentCode, String token, String period) {
        if (studentCode == null || studentCode.isBlank() || "current-student".equalsIgnoreCase(studentCode)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para el bootstrap de sesión");
        }
        String effectivePeriod = (period == null || period.isBlank())
                ? AcademicToolService.DEFAULT_PERIOD_NAME : period;

        // Paso 1: horario local-first — si MySQL ya tiene snapshot oficial sincronizado
        // hoy se sirve en milisegundos (sin llamada a la pasarela); si falta o venció,
        // fetch oficial; si la pasarela no responde degrada al snapshot previo persistido.
        ScheduleInterval schedule;
        try {
            schedule = scheduleSyncHandler.ensureFreshSchedule(
                    studentCode, token, effectivePeriod, LocalDate.now());
        } catch (ScheduleUnavailableException ex) {
            log.warn("[SessionBootstrap] 🚫 Horario no disponible para [{}/{}]: {}",
                    studentCode, effectivePeriod, safeMessage(ex));
            return new SessionBootstrapResult(false, 0, 0, 0);
        }

        // Paso 2: cursos matriculados únicos (declarativos + horario)
        List<CourseTarget> targets = enrolledCourseTargets(schedule);
        log.info("[SessionBootstrap] 📚 {} curso(s) matriculado(s) detectado(s) para [{}]", targets.size(), studentCode);

        // Paso 3: sílabos locales-first, faltantes en paralelo
        int synced = resolveSyllabiConcurrently(targets, token);

        log.info("[SessionBootstrap] ✔ Bootstrap integral de [{}] completado: sílabos {}/{}",
                studentCode, synced, targets.size());
        return new SessionBootstrapResult(true, targets.size(), synced, targets.size());
    }

    /**
     * Extrae los pares (courseCode, sectionId) únicos del intervalo oficial: primero los
     * cursos declarativos, luego las sesiones del horario que los confirmen o summ
     * asignaturas sin declaración. La primera sección vista gana.
     */
    private List<CourseTarget> enrolledCourseTargets(ScheduleInterval schedule) {
        Map<String, String> sectionByCode = new LinkedHashMap<>();
        if (schedule.getCourses() != null) {
            for (Course c : schedule.getCourses()) {
                if (c.getCode() != null && !c.getCode().isBlank()) {
                    sectionByCode.putIfAbsent(c.getCode().trim(), normalize(c.getSection()));
                }
            }
        }
        if (schedule.getClasses() != null) {
            for (ClassSession cs : schedule.getClasses()) {
                if (cs.getCourseCode() != null && !cs.getCourseCode().isBlank()) {
                    sectionByCode.merge(cs.getCourseCode().trim(), normalize(cs.getSectionId()),
                            (current, offered) -> (current == null || current.isBlank()) ? offered : current);
                }
            }
        }
        return sectionByCode.entrySet().stream()
                .map(e -> new CourseTarget(e.getKey(), e.getValue()))
                .toList();
    }

    private String normalize(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    /**
     * Resuelve los sílabos de todos los cursos en paralelo; cada descarga fallida
     * (pasarela ocupada, PDF no verificable) cuenta como pendiente y NO aborta el resto.
     * La espera por los faltantes remotos es acotada por el presupuesto
     * {@link #SYLLABUS_RESOLUTION_BUDGET_SECONDS}: los downloads inconclusos
     * continúan en segundo plano y persisten al completarse.
     */
    private int resolveSyllabiConcurrently(List<CourseTarget> targets, String token) {
        if (targets.isEmpty()) {
            return 0;
        }
        ExecutorService pool = Executors.newFixedThreadPool(
                Math.min(targets.size(), MAX_PARALLEL_SYLLABUS_FETCHES));
        AtomicInteger synced = new AtomicInteger();
        try {
            List<CompletableFuture<Void>> jobs = targets.stream()
                    .map(target -> CompletableFuture.runAsync(() -> {
                        try {
                            Syllabus syllabus = syllabusService.getSyllabus(
                                    target.courseCode(), target.sectionId(), null, token);
                            if (syllabus != null) {
                                synced.incrementAndGet();
                            }
                        } catch (Exception ex) {
                            log.warn("[SessionBootstrap] ⚠️ Sílabo pendiente de [{}]: {}",
                                    target.courseCode(), safeMessage(ex));
                        }
                    }, pool))
                    .toList();
            try {
                CompletableFuture.allOf(jobs.toArray(new CompletableFuture[0]))
                        .get(SYLLABUS_RESOLUTION_BUDGET_SECONDS, TimeUnit.SECONDS);
            } catch (TimeoutException timeoutEx) {
                log.warn("[SessionBootstrap] ⏱️ Presupuesto de {} s agotado esperando sílabos remotos: "
                        + "los pendientes continúan en segundo plano y quedan reintentables.",
                        SYLLABUS_RESOLUTION_BUDGET_SECONDS);
            } catch (ExecutionException ex) {
                log.warn("[SessionBootstrap] ⚠️ Fallo agregado resolviendo sílabos: {}", safeMessage(ex));
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("[SessionBootstrap] ⚠️ Resolución de sílabos interrumpida: {}", safeMessage(ex));
            }
        } finally {
            pool.shutdown();
        }
        return synced.get();
    }

    /** Objetivo de resolución de sílabo: código oficial de asignatura + su sección. */
    private record CourseTarget(String courseCode, String sectionId) {}

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return (message == null || message.isBlank()) ? ex.getClass().getSimpleName() : message;
    }
}

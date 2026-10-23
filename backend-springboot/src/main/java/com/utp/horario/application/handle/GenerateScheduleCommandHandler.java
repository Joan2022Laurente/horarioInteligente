package com.utp.horario.application.handle;

import com.utp.horario.application.command.GenerateScheduleCommand;
import com.utp.horario.domain.model.exceptions.ScheduleUnavailableException;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateScheduleCommandHandler {

    private final IScheduleRepository repository;
    private final IUtpPortalGateway utpPortalGateway;

    public ScheduleInterval handle(GenerateScheduleCommand command) {
        return syncScheduleFromUtp(command.getStudentId(), command.getToken(), command.getPeriod());
    }

    /**
     * Consulta del horario del alumno con regla de honestidad de datos:
     * se intenta la sincronización con la pasarela oficial solo si hay sesión, y se
     * adopta únicamente lo que la pasarela entregue ({@code null} = MISS). Ante
     * fallo se degrada al Read Model local y, como último recurso, a un intervalo
     * honestamente vacío (sin fechas ni semanas inventadas). Nada fabricado se
     * persiste ni se presenta como horario oficial.
     */
    public ScheduleInterval getStudentSchedule(String studentId, String period, String token) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para consultar horario");
        }

        if (token != null && !token.isBlank()) {
            ScheduleInterval interval = utpPortalGateway.fetchSchedule(token, period);
            if (interval != null) {
                return repository.save(studentId, interval);
            }
            log.warn("[GenerateSchedule] ⚠️ La pasarela no entregó horario para [{}/{}]: se degrada al Read Model local",
                    studentId, period);
        }

        return repository.findByStudentIdAndPeriod(studentId, period)
                .orElseGet(() -> {
                    log.warn("[GenerateSchedule] 🚫 Sin horario oficial ni copia local para [{}/{}] — se declara ausencia (lectura)",
                            studentId, period);
                    return buildHonestEmptyInterval(studentId, period);
                });
    }

    /**
     * Sincronización EXPLÍCITA solicitada por el cliente: si la pasarela no puede
     * entregar el horario se declara la ausencia (HTTP 503 reintentable
     * vía {@code ScheduleUnavailableException}), nunca un intervalo fabricado.
     */
    public ScheduleInterval syncScheduleFromUtp(String studentId, String token, String period) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para sincronizar horario");
        }
        ScheduleInterval interval = utpPortalGateway.fetchSchedule(token, period);
        if (interval == null) {
            throw new ScheduleUnavailableException(
                    "Horario no disponible para '" + period + "': la pasarela oficial no respondió. Reintenta en unos segundos.");
        }
        return repository.save(studentId, interval);
    }

    /**
     * Bootstrap de sesión (Fase 0.7): estrategia LOCAL-FIRST con ventana de frescura.
     *
     * <p>Si MySQL ya contiene un snapshot oficial sincronizado en {@code minSyncDate}
     * o después, se sirve de base de datos en milisegundos y la pasarela NO se
     * consulta: el re-login no repite la latencia remota. Solo cuando el snapshot
     * falta o está vencido se consulta la pasarela oficial. Si esta no responde
     * pero existe copia local previa (aunque vencida), se sirve para no congelar el
     * login — son los datos oficiales sincronizados antes, nunca inventados —; la
     * expiración declarada ({@link ScheduleUnavailableException}) queda reservada
     * para el caso sin datos remotos NI locales.</p>
     *
     * <p>La política de vigencia la fija la capa de aplicación (p. ej. el día en
     * curso); este método solo ejecuta la regla de adopción de datos.</p>
     */
    public ScheduleInterval ensureFreshSchedule(String studentId, String token, String period, LocalDate minSyncDate) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para sincronizar horario");
        }

        Optional<ScheduleInterval> fresh =
                repository.findByStudentIdAndPeriodSyncedSince(studentId, period, minSyncDate);
        if (fresh.isPresent()) {
            log.info("[GenerateSchedule] ⚡ Bootstrap local-first: horario vigente en BD para [{}/{}] (sincronizado ≥ {}), sin llamada a la pasarela",
                    studentId, period, minSyncDate);
            return fresh.get();
        }

        ScheduleInterval interval = null;
        if (token != null && !token.isBlank()) {
            interval = utpPortalGateway.fetchSchedule(token, period);
        }
        if (interval != null) {
            return repository.save(studentId, interval);
        }

        // La pasarela no respondió: se sirve el snapshot oficial previo (vencido)
        // para continuar el login; el refresco remoto es reintentable después.
        Optional<ScheduleInterval> stale = repository.findByStudentIdAndPeriod(studentId, period);
        if (stale.isPresent()) {
            log.warn("[GenerateSchedule] ⚠️ Pasarela sin respuesta en bootstrap [{}/{}]: se sirve el snapshot previo persistido",
                    studentId, period);
            return stale.get();
        }
        throw new ScheduleUnavailableException(
                "Horario no disponible para '" + period + "': la pasarela oficial no respondió. Reintenta en unos segundos.");
    }

    /**
     * Intervalo de ausencia: identifica al alumno y periodo consultados, sin clases,
     * cursos, fechas ni semanas inventadas. Es la representación honesta de "aún no
     * hay datos", no un horario fabricado.
     */
    private ScheduleInterval buildHonestEmptyInterval(String studentId, String period) {
        return ScheduleInterval.builder()
                .id("empty-" + studentId)
                .periodName(period)
                .classes(List.of())
                .courses(List.of())
                .build();
    }
}

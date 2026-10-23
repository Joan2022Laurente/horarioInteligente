package com.utp.horario.application.dtos;

public class SessionBootstrapDto {

    /**
     * Resumen del pipeline Auto-Bootstrap Integral de sesión (Fase 0.7).
     *
     * <p>Lo consume el Stepper del Frontend para reflejar el avance en tiempo real:
     * horario sincronizado → cursos detectados → sílabos listos → IA inicializada.</p>
     *
     * <ul>
     *   <li>{@code scheduleSynced}: si el horario lectures de la pasarela se obtuvo y persistió.</li>
     *   <li>{@code coursesCount}: cursos matriculados detectados en el horario sincronizado.</li>
     *   <li>{@code syllabiSynced}: sílabos confirmados en Read Model local (HIT) o descargados
     *       de la pasarela durante el bootstrap.</li>
     *   <li>{@code syllabiTotal}: total esperado (igual a {@code coursesCount}). Faltantes ≡
     *       sílabos pendientes por transitorios de pasarela; reintentable sin re-sincronizar el horario.</li>
     * </ul>
     */
    public record SessionBootstrapResult(
            boolean scheduleSynced,
            int coursesCount,
            int syllabiSynced,
            int syllabiTotal
    ) {}
}

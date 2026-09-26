/**
 * Logger de Diagnóstico Temporal para verificación de orígenes de datos y flujos de autenticación.
 * 
 * Para activar/desactivar en tiempo real:
 * window.ENABLE_DIAGNOSTIC_LOGS = true / false;
 */

export const DIAGNOSTIC_CONFIG = {
  enabled: true, // Cambiar a false o eliminar este import para apagar todos los logs de golpe
  prefix: '[DIAGNOSTICO-APP]'
};

export class AppDiagnosticLogger {
  static logAuthSource(data: {
    origin: 'API_LOGIN_GATEWAY' | 'LOCAL_CACHE_PROFILE' | 'SPRING_BOOT_SESSION';
    studentCode: string;
    studentName: string;
    career?: string;
    campus?: string;
    hasToken: boolean;
  }) {
    if (!DIAGNOSTIC_CONFIG.enabled) return;
    console.groupCollapsed(`%c${DIAGNOSTIC_CONFIG.prefix} 👤 Origen Datos Alumno: ${data.origin}`, 'color: #10b981; font-weight: bold;');
    console.log(`📌 Origen:`, data.origin);
    console.log(`🆔 Alumno:`, `${data.studentCode} - ${data.studentName}`);
    console.log(`🏫 Carrera/Sede:`, `${data.career || 'N/A'} | ${data.campus || 'N/A'}`);
    console.log(`🔑 Token UTP Presente:`, data.hasToken);
    console.groupEnd();
  }

  static logScheduleSource(data: {
    origin: 'LOCAL_CACHE_0MS' | 'SUPABASE_DAILY_GATE' | 'SUPABASE_CACHED' | 'HEROKU_ACADEMIC_GATEWAY';
    studentCode: string;
    period: string;
    weekNumber?: number;
    sessionsCount: number;
    coursesCount: number;
    courseList?: string[];
    isFreshToday?: boolean;
  }) {
    if (!DIAGNOSTIC_CONFIG.enabled) return;
    console.groupCollapsed(`%c${DIAGNOSTIC_CONFIG.prefix} 📅 Origen Horario & Cursos: ${data.origin}`, 'color: #38bdf8; font-weight: bold;');
    console.log(`📌 Origen Datos:`, data.origin);
    console.log(`👤 Alumno:`, data.studentCode);
    console.log(`📆 Periodo:`, `${data.period} (Semana ${data.weekNumber ?? 'N/A'})`);
    console.log(`📚 Resumen Académico:`, `${data.coursesCount} Cursos detectados | ${data.sessionsCount} Sesiones de clase`);
    if (data.courseList && data.courseList.length > 0) {
      console.log(`📖 Lista de Cursos:`, data.courseList);
    }
    if (data.isFreshToday !== undefined) {
      console.log(`🛡️ Sincronizado Hoy:`, data.isFreshToday);
    }
    console.groupEnd();
  }

  static logApiPayload(data: {
    endpoint: string;
    status: number | string;
    summary: string;
    itemCount?: number;
  }) {
    if (!DIAGNOSTIC_CONFIG.enabled) return;
    console.log(
      `%c${DIAGNOSTIC_CONFIG.prefix} 🌐 [${data.endpoint}] Status: ${data.status} -> ${data.summary}` +
      (data.itemCount !== undefined ? ` (${data.itemCount} items)` : ''),
      'color: #f59e0b; font-weight: 500;'
    );
  }
}

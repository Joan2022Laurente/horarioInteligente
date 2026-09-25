import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from, catchError, map, firstValueFrom } from 'rxjs';
import { ScheduleInterval, ApiResponse, UTPCurrentInterval, ProcessedCourse, UTPEvent } from '@domain/models/utp.model';
import { getProcessedCourses } from '@data/schedule-parser';
import { getCachedCalendarData, saveCachedCalendarData, getCachedStudentProfile } from '@data/syllabus/client-storage';
import { AppDiagnosticLogger } from '@data/diagnostic-logger';
import { environment } from '@env/environment';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

const DAILY_SYNC_KEY = 'utp_schedule_last_sync_date';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly feedback = inject(UiFeedbackService);
  private activeStudentCode: string = '';

  private readonly loadingSignal = signal<boolean>(false);
  readonly loading = this.loadingSignal.asReadonly();

  private scheduleSignal = signal<ScheduleInterval | null>(null);
  readonly currentSchedule = this.scheduleSignal.asReadonly();

  private intervalSignal = signal<UTPCurrentInterval | null>(null);
  readonly currentInterval = this.intervalSignal.asReadonly();

  readonly calendarData = computed(() => {
    const interval = this.intervalSignal();
    return interval ? { current_interval: interval } : null;
  });

  readonly processedCourses = computed<ProcessedCourse[]>(() => {
    const interval = this.intervalSignal();
    const events = interval?.events || [];
    return getProcessedCourses(events);
  });

  clearSchedule(): void {
    this.scheduleSignal.set(null);
    this.intervalSignal.set(null);
    this.activeStudentCode = '';
  }

  private mapToScheduleInterval(interval: UTPCurrentInterval): ScheduleInterval {
    return {
      id: interval.period_name || 'period-2026',
      periodName: interval.period_name || '2026 - Ciclo 2 Agosto',
      weekNumber: interval.week_number || 6,
      totalWeeks: interval.total_weeks || 18,
      startDate: interval.start_of_interval || new Date().toISOString(),
      endDate: interval.end_of_interval || new Date().toISOString(),
      courses: [],
      classes: (interval.events || []).map((e) => ({
        id: e.id,
        courseCode: e.metadata?.sectionCode || e.metadata?.courseId || '',
        courseName: e.metadata?.courseName || e.title,
        section: e.metadata?.sectionCode || '',
        classroom: e.metadata?.classroom || '',
        building: e.metadata?.building || '',
        floor: e.metadata?.floor,
        environmentType: e.metadata?.environmentType,
        teacher: e.metadata?.teacher,
        modality: e.modality,
        startAt: e.startAt,
        finishAt: e.finishAt,
        zoomLink: e.metadata?.zoomLink,
        classLink: e.metadata?.classLink,
      })),
    };
  }

  constructor(private http: HttpClient) {
    const profile = getCachedStudentProfile();
    this.activeStudentCode = (profile?.username || profile?.userId || localStorage.getItem('utp_current_student_code') || '').toUpperCase();

    // 1. Carga inmediata en 0ms desde caché local
    const cached = getCachedCalendarData();
    if (cached?.data?.current_interval && cached.data.current_interval.events && cached.data.current_interval.events.length > 0) {
      console.log('[ScheduleService] ⚡ Horario cargado instantáneamente desde caché (0ms):', {
        student: this.activeStudentCode,
        period: cached.data.current_interval.period_name,
        eventsCount: cached.data.current_interval.events.length,
      });

      const courses = getProcessedCourses(cached.data.current_interval.events);
      AppDiagnosticLogger.logScheduleSource({
        origin: 'LOCAL_CACHE_0MS',
        studentCode: this.activeStudentCode,
        period: cached.data.current_interval.period_name,
        weekNumber: cached.data.current_interval.week_number,
        sessionsCount: cached.data.current_interval.events.length,
        coursesCount: courses.length,
        courseList: courses.map(c => c.name)
      });

      this.intervalSignal.set(cached.data.current_interval);
      this.scheduleSignal.set(this.mapToScheduleInterval(cached.data.current_interval));
    }

    // 2. Comprobación de primera entrada del día en segundo plano
    this.checkAndSyncDaily();
  }

  /**
   * Obtiene la fecha actual en formato local 'YYYY-MM-DD'
   */
  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Verifica si es la primera vez en el día que el alumno abre la app.
   * Si es la primera vez, sincroniza silenciosamente en segundo plano con la API de UTP.
   * Si ya entró hoy, no realiza ninguna petición de red (0 llamadas adicionales).
   */
  private checkAndSyncDaily(): void {
    const today = this.getTodayDateString();
    const lastSync = localStorage.getItem(DAILY_SYNC_KEY);

    if (lastSync === today && this.intervalSignal()) {
      console.log(`[ScheduleService] 🛡️ Horario ya sincronizado hoy (${today}). 0 peticiones de red.`);
      return;
    }

    console.log(`[ScheduleService] 🌅 Verificando horario del día (${today}) en segundo plano...`);
    this.syncDailyInBackground(today);
  }

  private getSupabaseHeaders(): Record<string, string> {
    return {
      'apikey': environment.supabaseAnonKey,
      'Authorization': `Bearer ${environment.supabaseAnonKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Ejecuta la sincronización en segundo plano con persistencia en Supabase.
   * Aplica Daily Gate: Si ya se sincronizó hoy en Supabase, lee desde la BD (0 llamadas a UTP).
   */
  private async syncDailyInBackground(todayDateStr: string, tokenOverride?: string): Promise<ScheduleInterval | null> {
    this.loadingSignal.set(true);
    try {
      const profile = getCachedStudentProfile();
      const token = tokenOverride || profile?.token;
      const studentCode = (profile?.username || profile?.userId || localStorage.getItem('utp_current_student_code') || '').toUpperCase();

      if (!token && !studentCode) {
        console.log('[ScheduleService] ℹ️ No hay sesión activa de UTP para sincronizar horario.');
        return this.scheduleSignal();
      }

    // 1. GATEWAY SUPABASE: Verificar si ya existe horario del día en Supabase
    if (studentCode) {
      try {
        const sbCheckUrl = `${environment.supabaseUrl}/rest/v1/student_schedules?student_code=eq.${encodeURIComponent(studentCode)}&select=*`;
        const sbRes = await fetch(sbCheckUrl, { headers: this.getSupabaseHeaders() });
        if (sbRes.ok) {
          const sbRows = await sbRes.json();
          if (Array.isArray(sbRows) && sbRows.length > 0) {
            const row = sbRows[0];
            const isFreshToday = row.last_synced_date === todayDateStr;

            if (isFreshToday && row.schedule_data) {
              const rawData = typeof row.schedule_data === 'string' ? JSON.parse(row.schedule_data) : row.schedule_data;
              const interval: UTPCurrentInterval = rawData.events ? rawData : (rawData.current_interval || rawData);
              const scheduleData = this.mapToScheduleInterval(interval);

              this.activeStudentCode = studentCode;
              this.intervalSignal.set(interval);
              this.scheduleSignal.set(scheduleData);
              localStorage.setItem(`utp_schedule_last_sync_${studentCode}`, todayDateStr);
              localStorage.setItem(DAILY_SYNC_KEY, todayDateStr);
              saveCachedCalendarData({
                success: true,
                code: 200,
                message: 'OK',
                idTransaction: '',
                data: { current_interval: interval },
              });
              console.log(`[ScheduleService] 🛡️ Daily Gate Supabase: Horario del día recuperado (<20ms, 0 llamadas a API UTP) para ${studentCode}.`);

              const courses = getProcessedCourses(interval.events);
              AppDiagnosticLogger.logScheduleSource({
                origin: 'SUPABASE_DAILY_GATE',
                studentCode: studentCode,
                period: interval.period_name,
                weekNumber: interval.week_number,
                sessionsCount: interval.events.length,
                coursesCount: courses.length,
                courseList: courses.map(c => c.name),
                isFreshToday: true
              });

              return scheduleData;
            }
          } else {
            // Migración silenciosa: el alumno ya tenía horario en su navegador pero no en Supabase
            const localCached = getCachedCalendarData();
            if (localCached?.data?.current_interval?.events && localCached.data.current_interval.events.length > 0) {
              const localInterval = localCached.data.current_interval;
              console.log(`[ScheduleService] 🚀 Migrando automáticamente horario local previo de ${studentCode} a Supabase...`);
              this.persistScheduleToSupabase(studentCode, localInterval.period_name || '2026 - Ciclo 2 Agosto', localInterval, todayDateStr);
            }
          }
        }
      } catch (err: any) {
        console.warn('[ScheduleService] ℹ️ Verificación Supabase student_schedules omitida:', err.message);
      }
    }

    // 2. Si no estaba sincronizado hoy en Supabase, consultar UTP Academic Gateway
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<ScheduleInterval>>(`${environment.academicApiUrl}/schedule`)
      );

      if (res?.success && res.data?.classes && res.data.classes.length > 0) {
        const scheduleData: ScheduleInterval = res.data;
          const events: UTPEvent[] = scheduleData.classes.map((c: any) => ({
            id: c.id,
            title: `${c.courseName}${c.section && c.section !== 'Sección Única' ? ' (' + c.section + ')' : ''} (Semana ${scheduleData.weekNumber}) - Sesión`,
            modality: c.modality,
            type: 'SESSION',
            startAt: c.startAt,
            finishAt: c.finishAt,
            metadata: {
              courseId: c.courseCode,
              courseName: c.courseName,
              sectionCode: c.section,
              classroom: c.classroom,
              building: c.building,
              floor: c.floor,
              environmentType: c.environmentType,
              teacher: c.teacher,
              zoomLink: c.zoomLink,
              classLink: c.classLink,
            },
          }));

          const interval: UTPCurrentInterval = {
            period_name: scheduleData.periodName,
            week_number: scheduleData.weekNumber,
            total_weeks: scheduleData.totalWeeks,
            start_of_interval: scheduleData.startDate,
            end_of_interval: scheduleData.endDate,
            current_date: new Date().toISOString(),
            start_of_period: scheduleData.startDate,
            end_of_period: scheduleData.endDate,
            events: events,
          };

          // 3. Persistir en Supabase student_schedules (Daily Gate permanente)
          if (studentCode) {
            this.persistScheduleToSupabase(studentCode, scheduleData.periodName, interval, todayDateStr);
          }

          saveCachedCalendarData({
            success: true,
            code: 200,
            message: 'OK',
            idTransaction: '',
            data: { current_interval: interval },
          });

          this.activeStudentCode = studentCode;
          this.intervalSignal.set(interval);
          this.scheduleSignal.set(scheduleData);
          localStorage.setItem(`utp_schedule_last_sync_${studentCode}`, todayDateStr);
          localStorage.setItem(DAILY_SYNC_KEY, todayDateStr);
          console.log(`[ScheduleService] ✅ Horario (${scheduleData.periodName}) sincronizado vía Academic API Gateway (${events.length} sesiones) y guardado en Supabase.`);

          const courses = getProcessedCourses(events);
          AppDiagnosticLogger.logScheduleSource({
            origin: 'HEROKU_ACADEMIC_GATEWAY',
            studentCode: studentCode,
            period: scheduleData.periodName,
            weekNumber: scheduleData.weekNumber,
            sessionsCount: events.length,
            coursesCount: courses.length,
            courseList: courses.map(c => c.name),
            isFreshToday: true
          });

        }
      } catch (e: any) {
        console.warn('[ScheduleService] ℹ️ Academic Gateway offline o no disponible; sirviendo desde caché local:', e.message);
      }

      return this.scheduleSignal();
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Guarda o actualiza el horario en Supabase student_schedules
   */
  private async persistScheduleToSupabase(studentCode: string, periodName: string, interval: UTPCurrentInterval, todayDateStr: string): Promise<void> {
    try {
      const checkUrl = `${environment.supabaseUrl}/rest/v1/student_schedules?student_code=eq.${encodeURIComponent(studentCode)}&period_name=eq.${encodeURIComponent(periodName)}&select=id`;
      const checkRes = await fetch(checkUrl, { headers: this.getSupabaseHeaders() });
      const existing = checkRes.ok ? await checkRes.json() : [];

      const payload = {
        student_code: studentCode,
        period_name: periodName,
        week_number: interval.week_number || 1,
        total_weeks: interval.total_weeks || 18,
        schedule_data: interval,
        last_synced_date: todayDateStr,
        updated_at: new Date().toISOString()
      };

      if (Array.isArray(existing) && existing.length > 0) {
        const patchUrl = `${environment.supabaseUrl}/rest/v1/student_schedules?id=eq.${existing[0].id}`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: this.getSupabaseHeaders(),
          body: JSON.stringify(payload)
        });
        console.log(`[ScheduleService] ⚡ Horario de ${studentCode} actualizado en Supabase student_schedules.`);
      } else {
        const postUrl = `${environment.supabaseUrl}/rest/v1/student_schedules`;
        await fetch(postUrl, {
          method: 'POST',
          headers: this.getSupabaseHeaders(),
          body: JSON.stringify(payload)
        });
        console.log(`[ScheduleService] ⚡ Nuevo horario de ${studentCode} registrado en Supabase student_schedules.`);
      }
    } catch (err: any) {
      console.warn('[ScheduleService] ℹ️ No se pudo persistir horario en Supabase:', err.message);
    }
  }

  /**
   * Consulta el horario del estudiante con carga instantánea y verificación diaria.
   */
  getSchedule(studentId = 'current-student', period = '2026 - Ciclo 2 Agosto', token?: string): Observable<ApiResponse<ScheduleInterval | null>> {
    const profile = getCachedStudentProfile();
    const currentStudentCode = (profile?.username || profile?.userId || localStorage.getItem('utp_current_student_code') || '').toUpperCase();
    const today = this.getTodayDateString();
    const studentSyncKey = `utp_schedule_last_sync_${currentStudentCode}`;
    const lastSync = localStorage.getItem(studentSyncKey) || localStorage.getItem(DAILY_SYNC_KEY);

    if (this.intervalSignal() && (!currentStudentCode || this.activeStudentCode === currentStudentCode) && lastSync === today) {
      return of({
        success: true,
        message: 'Horario servido desde caché local fresca',
        data: this.scheduleSignal(),
      });
    }

    return from(this.syncDailyInBackground(today, token)).pipe(
      map((schedule) => ({
        success: true,
        message: 'Horario verificado del día',
        data: schedule,
      })),
      catchError(() => {
        this.feedback.show('Modo sin conexión: mostrando horario guardado localmente.', 'info');
        return of({
          success: true,
          message: 'Horario mantenido en caché',
          data: this.scheduleSignal(),
        });
      })
    );
  }

  /**
   * Sincronización explícita (para ajustes o reconexión de credenciales).
   */
  syncSchedule(token = '', period = '2026 - Ciclo 2 Agosto'): Observable<ApiResponse<ScheduleInterval | null>> {
    const today = this.getTodayDateString();
    return from(this.syncDailyInBackground(today, token || undefined)).pipe(
      map((schedule) => ({
        success: true,
        message: 'Horario sincronizado manualmente',
        data: schedule,
      })),
      catchError(() => {
        this.feedback.show('Modo sin conexión: mostrando horario guardado localmente.', 'info');
        return of({
          success: false,
          message: 'Error al sincronizar horario',
          data: this.scheduleSignal(),
        });
      })
    );
  }
}

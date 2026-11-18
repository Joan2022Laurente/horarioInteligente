import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';
import { ApiResponse } from '@domain/models/utp.model';
import {
  StudentNetworkingProfile,
  StudyBuddyMatch,
  StudyBeaconRow,
  FreeWindow
} from '@domain/models/matching';
import {
  calculateStudentFreeWindows,
  computeDualMatchScore,
  MOCK_STUDENTS_LIMA_CENTRO
} from '../networking/matching-engine';
import { environment } from '@env/environment';
import { UiFeedbackService } from '@core/services/ui-feedback.service';
import { ScheduleService } from './schedule.service';
import { getCachedStudentProfile } from '../syllabus/client-storage';

const NETWORKING_CACHE_KEY = 'utp_networking_matches_cache';
const NETWORKING_PROFILE_KEY = 'utp_my_networking_profile';
const NETWORKING_HASH_KEY = 'utp_networking_profile_hash';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos TTL

/**
 * Fase 1.0: servicio de Networking Universitario persistido.
 * Los beacons, candidatos y el perfil de networking viven en la base de datos
 * MySQL vía el módulo REST `/api/v1/networking` del backend Spring Boot. Ante
 * un error de red el servicio devuelve estados vacíos y notifica el fallo al
 * usuario; nunca inventa perfiles ni mesas de estudio.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkingService {
  private readonly uiFeedback = inject(UiFeedbackService);

  private matchesSignal = signal<StudyBuddyMatch[]>([]);
  readonly matches = this.matchesSignal.asReadonly();

  private beaconsSignal = signal<StudyBeaconRow[]>([]);
  readonly beacons = this.beaconsSignal.asReadonly();

  private myProfileSignal = signal<StudentNetworkingProfile | null>(null);
  readonly myProfile = this.myProfileSignal.asReadonly();

  constructor(
    private http: HttpClient,
    private scheduleService: ScheduleService
  ) {
    this.hydrateFromLocalCache();
    // Inicializar perfil una sola vez en el constructor (fuera del ciclo de renderizado de Angular)
    this.refreshProfile();
  }

  /** URL base del módulo de networking en el backend Spring Boot. */
  private get apiUrl(): string {
    return `${environment.academicApiUrl}/networking`;
  }

  private hydrateFromLocalCache(): void {
    try {
      const rawProf = localStorage.getItem(NETWORKING_PROFILE_KEY);
      if (rawProf) {
        this.myProfileSignal.set(JSON.parse(rawProf));
      }
      const rawMatches = localStorage.getItem(NETWORKING_CACHE_KEY);
      if (rawMatches) {
        const parsed = JSON.parse(rawMatches);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
          this.matchesSignal.set(parsed.data);
        }
      }
    } catch {}
  }

  /**
   * Obtiene el perfil de networking actual sin mutar señales en tiempo de renderizado (evita NG0600).
   */
  getMyProfile(): StudentNetworkingProfile {
    const current = this.myProfileSignal();
    if (current) {
      return current;
    }
    return this.refreshProfile();
  }

  /**
   * Regenera el perfil de networking del alumno autenticado calculando automáticamente sus ventanas libres.
   */
  refreshProfile(): StudentNetworkingProfile {
    const cached = this.myProfileSignal();
    const student = getCachedStudentProfile();
    const interval = this.scheduleService.currentInterval();
    const events = interval?.events || [];

    const enrolledCourses = Array.from(new Set(
      events.map(e => e.metadata?.courseName || e.title)
    ));

    const freeWindows = calculateStudentFreeWindows(events, student?.campus || '');

    const studentCode = (student?.studentCode || student?.username || '').toUpperCase();
    const fullName = student?.fullName || student?.name || studentCode || 'Estudiante UTP';

    const profile: StudentNetworkingProfile = {
      student_code: studentCode,
      full_name: fullName,
      avatar_letter: (fullName.charAt(0) || 'U').toUpperCase(),
      career: student?.career || '',
      campus: student?.campus || '',
      cycle: student?.currentCycle ?? 1,
      program: 'Pregrado',
      enrolled_courses: enrolledCourses,
      free_windows: freeWindows,
      skills: cached?.skills || ['Estudio', 'Colaboración'],
      match_intent: cached?.match_intent || 'PROJECT_TEAM',
      contact_channels: cached?.contact_channels || {
        whatsapp: '',
        discord: '',
        email: student?.email || ''
      },
      ghost_mode: cached?.ghost_mode || false,
      updated_at: new Date().toISOString()
    };

    this.myProfileSignal.set(profile);
    try {
      localStorage.setItem(NETWORKING_PROFILE_KEY, JSON.stringify(profile));
    } catch {}
    return profile;
  }

  /**
   * Sincroniza el perfil con el backend (dirty-checking local evita reposts
   * idénticos) y persiste en MySQL vía POST /networking/profile/sync.
   * La identidad la decide el token JWT del backend (anti-IDOR), no el cuerpo.
   */
  syncProfile(): Observable<boolean> {
    const profile = this.getMyProfile();
    const currentHash = JSON.stringify({
      courses: profile.enrolled_courses,
      windows: profile.free_windows,
      skills: profile.skills,
      intent: profile.match_intent,
      ghost: profile.ghost_mode
    });

    const lastHash = localStorage.getItem(NETWORKING_HASH_KEY);
    if (lastHash === currentHash) {
      return of(true);
    }

    return this.http.post<ApiResponse<StudentNetworkingProfile>>(
      `${this.apiUrl}/profile/sync`,
      profile
    ).pipe(
      map(res => {
        if (res.success) {
          // Solo se marca como sincronizado cuando el backend confirma la escritura.
          localStorage.setItem(NETWORKING_HASH_KEY, currentHash);
          console.log('[NetworkingService] Perfil de networking sincronizado en base de datos.');
          return true;
        }
        console.warn('[NetworkingService] El backend rechazó la sincronización del perfil:', res.error);
        this.uiFeedback.error('No se pudo sincronizar el perfil de networking.', res.error);
        return false;
      }),
      catchError(err => {
        console.warn('[NetworkingService] Error de red al sincronizar perfil:', err?.message || err);
        this.uiFeedback.error('No se pudo sincronizar el perfil de networking.', err?.message);
        return of(false);
      })
    );
  }

  /**
   * Obtiene compañeros compatibles mediante Matching Dual Multidimensional.
   * Los candidatos provienen de perfiles REALES de la base de datos
   * (GET /networking/profiles, sin ghost y excluyendo al consultante); ante
   * error de red degrada al pool local (vacío por diseño).
   * Aplica deduplicación en vuelo y caché TTL (5 min).
   */
  getDualMatches(forceRefresh = false): Observable<StudyBuddyMatch[]> {
    // 1. Verificar si hay caché fresca
    const cached = this.matchesSignal();
    if (!forceRefresh && cached.length > 0) {
      const raw = localStorage.getItem(NETWORKING_CACHE_KEY);
      if (raw) {
        const { timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          return of(cached);
        }
      }
    }

    const myProf = this.getMyProfile();
    const params = myProf.campus
      ? new HttpParams().set('campus', myProf.campus)
      : new HttpParams();

    return this.http.get<ApiResponse<StudentNetworkingProfile[]>>(
      `${this.apiUrl}/profiles`,
      { params }
    ).pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Perfiles de networking no disponibles.');
        }
        const candidates = res.data.filter(candidate =>
          candidate.student_code && candidate.student_code.toUpperCase() !== myProf.student_code.toUpperCase()
        );
        const matches = candidates
          .map(candidate => this.buildMatchFromCandidate(myProf, candidate))
          .sort((a, b) => b.compatibilityPercent - a.compatibilityPercent);
        this.publishMatches(matches);
        return matches;
      }),
      catchError(err => {
        console.warn('[NetworkingService] Sin conexión con perfiles reales; se muestran 0 candidatos:', err?.message || err);
        const matches = this.generateLocalFallbackMatches(myProf);
        this.publishMatches(matches);
        return of(matches);
      })
    );
  }

  private publishMatches(matches: StudyBuddyMatch[]): void {
    this.matchesSignal.set(matches);
    localStorage.setItem(NETWORKING_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: matches
    }));
  }

  private buildMatchFromCandidate(
    myProf: StudentNetworkingProfile,
    candidate: StudentNetworkingProfile
  ): StudyBuddyMatch {
    const score = computeDualMatchScore(myProf, candidate);

    const firstWindow: FreeWindow | null =
      (candidate.free_windows || []).find(win =>
        (myProf.free_windows || []).some(myWin => myWin.dayNumber === win.dayNumber)
      )
      || candidate.free_windows?.[0]
      || null;

    const matchedCourse = candidate.enrolled_courses?.[0] || 'Asignatura en curso';

    return {
      id: `match_${candidate.student_code}`,
      name: candidate.full_name,
      studentCode: candidate.student_code,
      avatarLetter: candidate.avatar_letter || candidate.full_name.charAt(0),
      career: candidate.career,
      cycle: candidate.cycle,
      campus: candidate.campus,
      program: candidate.program,
      courseName: matchedCourse,
      sharedWindow: {
        dayName: firstWindow?.dayName ?? 'Sin ventana registrada',
        start: firstWindow?.startTime ?? '00:00',
        end: firstWindow?.endTime ?? '00:00',
        durationMinutes: firstWindow ? 90 : 0,
        location: firstWindow
          ? `${firstWindow.building || 'Campus'} • ${firstWindow.floor || ''}`.trim()
          : candidate.campus,
        isNow: false
      },
      locationPreference: `${candidate.campus}${firstWindow?.building ? ` (${firstWindow.building})` : ''}`,
      currentGoal: score.reasons[0] || 'Preparando entregas de ciclo',
      skills: candidate.skills || [],
      matchScore: score,
      compatibilityPercent: score.overall,
      status: firstWindow ? 'WINDOW_OPEN' as const : 'STUDYING' as const,
      whatsappPhone: candidate.contact_channels?.whatsapp,
      discordTag: candidate.contact_channels?.discord,
      email: candidate.contact_channels?.email,
      modality: 'Presencial' as const
    };
  }

  private generateLocalFallbackMatches(myProf: StudentNetworkingProfile): StudyBuddyMatch[] {
    return MOCK_STUDENTS_LIMA_CENTRO.map(candidate => this.buildMatchFromCandidate(myProf, candidate));
  }

  /**
   * Consulta las mesas activas de estudio in-campus en base de datos
   * (GET /networking/beacons?campus=...). Ante error de red devuelve una lista
   * vacía y notifica el fallo; nunca recurre a mesas simuladas.
   */
  getBeacons(): Observable<StudyBeaconRow[]> {
    const myProf = this.getMyProfile();
    const params = myProf.campus
      ? new HttpParams().set('campus', myProf.campus)
      : new HttpParams();

    return this.http.get<ApiResponse<StudyBeaconRow[]>>(
      `${this.apiUrl}/beacons`,
      { params }
    ).pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Mesas de estudio no disponibles.');
        }
        this.beaconsSignal.set(res.data);
        return res.data;
      }),
      catchError(err => {
        console.warn('[NetworkingService] No se pudieron cargar las mesas de estudio:', err?.message || err);
        this.beaconsSignal.set([]);
        this.uiFeedback.error('No se pudieron cargar las mesas de estudio.', err?.message);
        return of([]);
      })
    );
  }

  /**
   * Crea una nueva mesa de estudio persistida (POST /networking/beacons).
   * El anfitrión lo dicta el token JWT del backend; el cuerpo solo describe la mesa.
   */
  createBeacon(beacon: Partial<StudyBeaconRow>): Observable<StudyBeaconRow | null> {
    const myProf = this.getMyProfile();
    const payload = {
      location_name: beacon.location_name ?? '',
      course_name: beacon.course_name ?? '',
      section_code: beacon.section_code ?? null,
      objective: beacon.objective ?? '',
      campus: myProf.campus || null,
      max_collaborators: beacon.max_collaborators ?? 4
    };

    return this.http.post<ApiResponse<StudyBeaconRow>>(`${this.apiUrl}/beacons`, payload).pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.error || 'La mesa no pudo crearse.');
        }
        const created = res.data;
        this.beaconsSignal.update(list => [created, ...list]);
        return created;
      }),
      catchError(err => {
        console.warn('[NetworkingService] No se pudo crear la mesa de estudio:', err?.message || err);
        this.uiFeedback.error('No se pudo crear la mesa de estudio.', err?.message);
        return throwError(() => err);
      })
    );
  }

  /**
   * El estudiante autenticado se une a una mesa (POST /networking/beacons/{id}/join).
   * El backend aplica el invariante de aforo del agregado (FULL/EXPIRED).
   */
  joinBeacon(beaconId: string): Observable<StudyBeaconRow | null> {
    return this.http.post<ApiResponse<StudyBeaconRow>>(
      `${this.apiUrl}/beacons/${encodeURIComponent(beaconId)}/join`,
      {}
    ).pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.error || 'No fue posible unirse a la mesa.');
        }
        const updated = res.data;
        this.beaconsSignal.update(list => list.map(b => (b.id === updated.id ? updated : b)));
        return updated;
      }),
      catchError(err => {
        console.warn('[NetworkingService] No se pudo unir a la mesa:', err?.message || err);
        return of(null);
      })
    );
  }

  /**
   * El estudiante autenticado abandona la mesa de estudio (POST /networking/beacons/{id}/leave).
   */
  leaveBeacon(beaconId: string): Observable<StudyBeaconRow | null> {
    return this.http.post<ApiResponse<StudyBeaconRow>>(
      `${this.apiUrl}/beacons/${encodeURIComponent(beaconId)}/leave`,
      {}
    ).pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.error || 'No fue posible abandonar la mesa.');
        }
        const updated = res.data;
        this.beaconsSignal.update(list => list.map(b => (b.id === updated.id ? updated : b)));
        return updated;
      }),
      catchError(err => {
        console.warn('[NetworkingService] No se pudo abandonar la mesa:', err?.message || err);
        return of(null);
      })
    );
  }

  /**
   * El anfitrión cancela y elimina la mesa de estudio convocada (DELETE /networking/beacons/{id}).
   */
  deleteBeacon(beaconId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/beacons/${encodeURIComponent(beaconId)}`
    ).pipe(
      map(res => {
        if (!res.success) {
          throw new Error(res.error || 'No fue posible cancelar la mesa.');
        }
        this.beaconsSignal.update(list => list.filter(b => b.id !== beaconId));
        return true;
      }),
      catchError(err => {
        console.warn('[NetworkingService] No se pudo cancelar la mesa:', err?.message || err);
        return of(false);
      })
    );
  }
}

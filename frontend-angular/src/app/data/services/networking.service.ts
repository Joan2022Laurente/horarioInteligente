import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
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
import { ScheduleService } from './schedule.service';
import { getCachedStudentProfile } from '../syllabus/client-storage';

const NETWORKING_CACHE_KEY = 'utp_networking_matches_cache';
const NETWORKING_PROFILE_KEY = 'utp_my_networking_profile';
const NETWORKING_HASH_KEY = 'utp_networking_profile_hash';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos TTL

/**
 * Fase 1.0: servicio de Networking Universitario persistido.
 * Los beacons, candidatos y el perfil de networking viven en la base de datos
 * MySQL vía el módulo REST `/api/v1/networking` del backend Spring Boot; ante
 * un error de red el servicio degrada a su última señal en memoria o al pool
 * local de mocks (vacío por diseño: nunca se inventan perfiles reales).
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkingService {
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
   * Genera o actualiza el perfil de networking del alumno autenticado calculando automáticamente sus ventanas libres.
   */
  getMyProfile(): StudentNetworkingProfile {
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
    localStorage.setItem(NETWORKING_PROFILE_KEY, JSON.stringify(profile));
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

    localStorage.setItem(NETWORKING_HASH_KEY, currentHash);
    return this.http.post<ApiResponse<StudentNetworkingProfile>>(
      `${this.apiUrl}/profile/sync`,
      profile
    ).pipe(
      map(res => {
        if (res.success) {
          console.log('[NetworkingService] ☁️ Perfil de networking sincronizado en base de datos.');
          return true;
        }
        console.warn('[NetworkingService] El backend rechazó la sincronización del perfil:', res.error);
        return true;
      }),
      catchError(err => {
        console.warn('[NetworkingService] ⚠️ Error de red al sincronizar perfil; se mantiene local:', err?.message || err);
        return of(true);
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
        console.warn('[NetworkingService] ⚠️ Sin conexión con perfiles reales; fallback local:', err?.message || err);
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
   * (GET /networking/beacons?campus=...); ante error de red degrada a la
   * última lista en memoria o al set demo local.
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
        console.warn('[NetworkingService] ⚠️ Fallback de beacons a estado local:', err?.message || err);
        const list = this.beaconsSignal().length > 0 ? this.beaconsSignal() : this.getMockBeacons(myProf.campus);
        this.beaconsSignal.set(list);
        return of(list);
      })
    );
  }

  private getMockBeacons(campus: string): StudyBeaconRow[] {
    return [
      {
        id: 'bcn-101',
        host_id: 'u23214589',
        host_name: 'Camila Rodriguez',
        campus: campus,
        location_name: 'Torre A - Piso 8 (Laboratorio PC)',
        course_name: 'Desarrollo Web Integrado',
        objective: 'Resolviendo laboratorio de Spring Boot + JPA para APF1',
        max_collaborators: 4,
        current_collaborators: 2,
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: 'bcn-102',
        host_id: 'u23109842',
        host_name: 'Sebastian Morales',
        campus: campus,
        location_name: 'Pabellón B - Piso 4 (Biblioteca Silenciosa)',
        course_name: 'Servicios Cloud',
        objective: 'Configurando VPC, Subnets y EC2 en AWS Academy',
        max_collaborators: 4,
        current_collaborators: 3,
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    ];
  }

  /**
   * Crea una nueva mesa de estudio persistida (POST /networking/beacons).
   * El anfitrión lo dicta el token JWT del backend; el cuerpo solo describe la mesa.
   */
  createBeacon(beacon: Partial<StudyBeaconRow>): Observable<StudyBeaconRow | null> {
    const myProf = this.getMyProfile();
    const payload = {
      location_name: beacon.location_name || 'Torre A - Piso 8',
      course_name: beacon.course_name || 'Desarrollo Web Integrado',
      section_code: beacon.section_code || null,
      objective: beacon.objective || 'Sesión de estudio colaborativo',
      campus: myProf.campus || null,
      max_collaborators: beacon.max_collaborators || 4
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
        console.warn('[NetworkingService] ⚠️ Fallback local al crear mesa:', err?.message || err);
        const localBeacon: StudyBeaconRow = {
          id: `bcn_local_${Date.now()}`,
          host_id: myProf.student_code,
          host_name: myProf.full_name,
          campus: myProf.campus || (beacon.campus ?? ''),
          location_name: payload.location_name,
          course_name: payload.course_name,
          section_code: payload.section_code ?? undefined,
          objective: payload.objective,
          max_collaborators: payload.max_collaborators,
          current_collaborators: 1,
          status: 'ACTIVE',
          expires_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
          created_at: new Date().toISOString()
        };
        this.beaconsSignal.update(list => [localBeacon, ...list]);
        return of(localBeacon);
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
        console.warn('[NetworkingService] ⚠️ No se pudo unir a la mesa:', err?.message || err);
        return of(null);
      })
    );
  }
}

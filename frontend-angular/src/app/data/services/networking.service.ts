import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, from, map, catchError, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  StudentNetworkingProfile, 
  StudyBuddyMatch, 
  StudyBeaconRow, 
  SquadRequestRow, 
  FreeWindow,
  MatchIntent
} from '@domain/models/matching';
import { 
  calculateStudentFreeWindows, 
  computeDualMatchScore, 
  MOCK_STUDENTS_LIMA_CENTRO 
} from '../networking/matching-engine';
import { ScheduleService } from './schedule.service';
import { getCachedStudentProfile } from '../syllabus/client-storage';
import { formatCourseName } from '../schedule-parser';

const NETWORKING_CACHE_KEY = 'utp_networking_matches_cache';
const NETWORKING_PROFILE_KEY = 'utp_my_networking_profile';
const NETWORKING_HASH_KEY = 'utp_networking_profile_hash';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos TTL

@Injectable({
  providedIn: 'root'
})
export class NetworkingService {
  private readonly supabaseUrl = environment.supabaseUrl;
  private readonly apiKey = environment.supabaseAnonKey;

  private matchesSignal = signal<StudyBuddyMatch[]>([]);
  readonly matches = this.matchesSignal.asReadonly();

  private beaconsSignal = signal<StudyBeaconRow[]>([]);
  readonly beacons = this.beaconsSignal.asReadonly();

  private myProfileSignal = signal<StudentNetworkingProfile | null>(null);
  readonly myProfile = this.myProfileSignal.asReadonly();

  // In-flight request deduplication map
  private inFlightMatches$: Observable<StudyBuddyMatch[]> | null = null;
  private inFlightBeacons$: Observable<StudyBeaconRow[]> | null = null;

  constructor(
    private http: HttpClient,
    private scheduleService: ScheduleService
  ) {
    this.hydrateFromLocalCache();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    });
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
    const schedule = this.scheduleService.currentSchedule();
    const interval = this.scheduleService.currentInterval();
    const events = interval?.events || [];

    const enrolledCourses = Array.from(new Set(
      events.map(e => e.metadata?.courseName || e.title)
    ));

    const freeWindows = calculateStudentFreeWindows(events, student?.campus || 'Lima Centro');

    const profile: StudentNetworkingProfile = {
      student_code: student?.username || student?.studentCode || 'U20210001',
      full_name: student?.fullName || student?.name || 'Estudiante UTP',
      avatar_letter: (student?.name || 'E').charAt(0).toUpperCase(),
      career: student?.career || 'Ingeniería de Sistemas e Informática',
      campus: student?.campus || 'Lima Centro',
      cycle: student?.currentCycle || 6,
      program: 'PST50',
      enrolled_courses: enrolledCourses.length > 0 ? enrolledCourses : [
        'DESARROLLO WEB INTEGRADO',
        'SERVICIOS CLOUD',
        'GESTIÓN DEL SERVICIO TI',
        'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS',
        'HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA',
        'LENGUAJES DE PROGRAMACIÓN'
      ],
      free_windows: freeWindows,
      skills: cached?.skills || ['Angular', 'Spring Boot', 'AWS Cloud', 'PostgreSQL', 'Microservicios'],
      match_intent: cached?.match_intent || 'PROJECT_TEAM',
      contact_channels: cached?.contact_channels || {
        whatsapp: 'https://wa.me/51987654321',
        discord: 'estudiante_utp',
        email: student?.email || 'estudiante@utp.edu.pe'
      },
      ghost_mode: cached?.ghost_mode || false,
      updated_at: new Date().toISOString()
    };

    this.myProfileSignal.set(profile);
    localStorage.setItem(NETWORKING_PROFILE_KEY, JSON.stringify(profile));
    return profile;
  }

  /**
   * Sincroniza el perfil en Supabase con Dirty-Checking para evitar escrituras innecesarias.
   */
  syncProfileToSupabase(): Observable<boolean> {
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
      // 0 writes: El estado no cambió
      return of(true);
    }

    const url = `${this.supabaseUrl}/rest/v1/student_networking_profiles`;
    return this.http.post(url, profile, { 
      headers: this.getHeaders().set('Prefer', 'resolution=merge-duplicates') 
    }).pipe(
      map(() => {
        localStorage.setItem(NETWORKING_HASH_KEY, currentHash);
        console.log('[NetworkingService] ⚡ Perfil de networking sincronizado en Supabase.');
        return true;
      }),
      catchError(err => {
        console.warn('[NetworkingService] ℹ️ Usando perfil local de networking:', err.message);
        return of(true);
      })
    );
  }

  /**
   * Obtiene la lista optimizada de compañeros compatibles mediante Matching Dual Multidimensional.
   * Aplica Deduplicación en Vuelo (In-Flight Sharing) y Caché TTL (5 min).
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

    // 2. Si ya hay una petición en curso, compartirla (0 llamadas extra)
    if (this.inFlightMatches$) {
      return this.inFlightMatches$;
    }

    const myProf = this.getMyProfile();
    const url = `${this.supabaseUrl}/rest/v1/student_networking_profiles?select=student_code,full_name,career,campus,cycle,program,enrolled_courses,free_windows,skills,match_intent,contact_channels,ghost_mode&campus=eq.${encodeURIComponent(myProf.campus)}&ghost_mode=eq.false&limit=20`;

    this.inFlightMatches$ = this.http.get<StudentNetworkingProfile[]>(url, { headers: this.getHeaders() }).pipe(
      map(remoteProfiles => {
        // Combinar perfiles remotos con el pool realista de la sede
        const candidateMap = new Map<string, StudentNetworkingProfile>();
        MOCK_STUDENTS_LIMA_CENTRO.forEach(p => candidateMap.set(p.student_code, p));
        (remoteProfiles || []).forEach(p => {
          if (p.student_code !== myProf.student_code) {
            candidateMap.set(p.student_code, p);
          }
        });

        const matches: StudyBuddyMatch[] = [];

        for (const candidate of candidateMap.values()) {
          if (candidate.student_code === myProf.student_code || candidate.ghost_mode) continue;

          const score = computeDualMatchScore(myProf, candidate);
          const firstWindow = candidate.free_windows[0] || myProf.free_windows[0] || {
            dayName: 'Jueves',
            startTime: '14:00',
            endTime: '16:00',
            building: 'SL02_TTA',
            floor: 'P08'
          };

          const matchedCourse = candidate.enrolled_courses.find((c: string) => 
            myProf.enrolled_courses.some((mc: string) => mc.toUpperCase().includes(c.toUpperCase()) || c.toUpperCase().includes(mc.toUpperCase()))
          ) || 'Desarrollo Web Integrado';

          matches.push({
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
              dayName: firstWindow.dayName,
              start: firstWindow.startTime,
              end: firstWindow.endTime,
              durationMinutes: 90,
              location: `${firstWindow.building || 'Torre A'} • ${firstWindow.floor || 'P08'}`,
              isNow: false
            },
            locationPreference: `${candidate.campus} (${firstWindow.building || 'Torre A'})`,
            currentGoal: score.reasons[0] || 'Coordinando proyectos y laboratorios',
            skills: candidate.skills,
            matchScore: score,
            compatibilityPercent: score.overall,
            status: 'WINDOW_OPEN' as const,
            whatsappPhone: candidate.contact_channels?.whatsapp,
            discordTag: candidate.contact_channels?.discord,
            email: candidate.contact_channels?.email,
            modality: (candidate.free_windows.some((w: FreeWindow) => !!w.campus) ? 'Presencial' : 'Virtual') as 'Presencial' | 'Virtual'
          });
        }

        // Ordenar por mayor compatibilidad
        matches.sort((a, b) => b.compatibilityPercent - a.compatibilityPercent);

        this.matchesSignal.set(matches);
        localStorage.setItem(NETWORKING_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: matches
        }));

        this.inFlightMatches$ = null;
        return matches;
      }),
      catchError(err => {
        console.warn('[NetworkingService] ℹ️ Error en Supabase, calculando matches locales:', err.message);
        // Fallback local con el pool
        const fallbackMatches = this.generateLocalFallbackMatches(myProf);
        this.matchesSignal.set(fallbackMatches);
        this.inFlightMatches$ = null;
        return of(fallbackMatches);
      }),
      shareReplay(1)
    );

    return this.inFlightMatches$;
  }

  private generateLocalFallbackMatches(myProf: StudentNetworkingProfile): StudyBuddyMatch[] {
    return MOCK_STUDENTS_LIMA_CENTRO.map(candidate => {
      const score = computeDualMatchScore(myProf, candidate);
      const firstWindow = candidate.free_windows[0] || {
        dayName: 'Jueves',
        startTime: '14:00',
        endTime: '16:00',
        building: 'SL02_TTA',
        floor: 'P08'
      };

      const matchedCourse = candidate.enrolled_courses[0] || 'Desarrollo Web Integrado';

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
          dayName: firstWindow.dayName,
          start: firstWindow.startTime,
          end: firstWindow.endTime,
          durationMinutes: 90,
          location: `${firstWindow.building || 'Torre A'} • ${firstWindow.floor || 'P08'}`,
          isNow: false
        },
        locationPreference: `${candidate.campus} (${firstWindow.building || 'Torre A'})`,
        currentGoal: score.reasons[0] || 'Preparando entregas de ciclo',
        skills: candidate.skills,
        matchScore: score,
        compatibilityPercent: score.overall,
        status: 'WINDOW_OPEN' as const,
        whatsappPhone: candidate.contact_channels?.whatsapp,
        discordTag: candidate.contact_channels?.discord,
        email: candidate.contact_channels?.email,
        modality: 'Presencial' as const
      };
    }).sort((a, b) => b.compatibilityPercent - a.compatibilityPercent);
  }

  /**
   * Consulta las mesas activas de estudio in-campus con filtro de expiración en servidor.
   */
  getBeacons(): Observable<StudyBeaconRow[]> {
    if (this.inFlightBeacons$) return this.inFlightBeacons$;

    const myProf = this.getMyProfile();
    const url = `${this.supabaseUrl}/rest/v1/study_beacons?select=*&campus=eq.${encodeURIComponent(myProf.campus)}&status=eq.ACTIVE&limit=15`;

    this.inFlightBeacons$ = this.http.get<StudyBeaconRow[]>(url, { headers: this.getHeaders() }).pipe(
      map(beacons => {
        const list = (beacons && beacons.length > 0) ? beacons : this.getMockBeacons(myProf.campus);
        this.beaconsSignal.set(list);
        this.inFlightBeacons$ = null;
        return list;
      }),
      catchError(() => {
        const list = this.getMockBeacons(myProf.campus);
        this.beaconsSignal.set(list);
        this.inFlightBeacons$ = null;
        return of(list);
      }),
      shareReplay(1)
    );

    return this.inFlightBeacons$;
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
   * Crea una nueva mesa de estudio in-campus.
   */
  createBeacon(beacon: Partial<StudyBeaconRow>): Observable<StudyBeaconRow | null> {
    const myProf = this.getMyProfile();
    const newBeacon: StudyBeaconRow = {
      id: `bcn_${Date.now()}`,
      host_id: myProf.student_code,
      host_name: myProf.full_name,
      campus: myProf.campus,
      location_name: beacon.location_name || 'Torre A - Piso 8',
      course_name: beacon.course_name || 'Desarrollo Web Integrado',
      objective: beacon.objective || 'Sesión de estudio colaborativo',
      max_collaborators: beacon.max_collaborators || 4,
      current_collaborators: 1,
      status: 'ACTIVE',
      expires_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    const url = `${this.supabaseUrl}/rest/v1/study_beacons`;
    return this.http.post<StudyBeaconRow[]>(url, newBeacon, { headers: this.getHeaders() }).pipe(
      map(res => {
        const created = (res && res.length > 0) ? res[0] : newBeacon;
        this.beaconsSignal.update(list => [created, ...list]);
        return created;
      }),
      catchError(() => {
        this.beaconsSignal.update(list => [newBeacon, ...list]);
        return of(newBeacon);
      })
    );
  }
}

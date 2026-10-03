import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
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
  private matchesSignal = signal<StudyBuddyMatch[]>([]);
  readonly matches = this.matchesSignal.asReadonly();

  private beaconsSignal = signal<StudyBeaconRow[]>([]);
  readonly beacons = this.beaconsSignal.asReadonly();

  private myProfileSignal = signal<StudentNetworkingProfile | null>(null);
  readonly myProfile = this.myProfileSignal.asReadonly();

  constructor(
    private scheduleService: ScheduleService
  ) {
    this.hydrateFromLocalCache();
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
   * Sincroniza el perfil en Supabase con Dirty-Checking para evitar escrituras innecesarias.
   */
  /**
   * Sincroniza el perfil en caché local con Dirty-Checking para evitar re-cálculos innecesarios.
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
      return of(true);
    }

    localStorage.setItem(NETWORKING_HASH_KEY, currentHash);
    console.log('[NetworkingService] ⚡ Perfil de networking actualizado localmente.');
    return of(true);
  }

  /**
   * Obtiene la lista optimizada de compañeros compatibles mediante Matching Dual Multidimensional.
   * Aplica Deduplicación en Vuelo y Caché TTL (5 min).
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
    const matches = this.generateLocalFallbackMatches(myProf);
    this.matchesSignal.set(matches);
    localStorage.setItem(NETWORKING_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: matches
    }));

    return of(matches);
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
   * Consulta las mesas activas de estudio in-campus.
   */
  getBeacons(): Observable<StudyBeaconRow[]> {
    const myProf = this.getMyProfile();
    const list = this.beaconsSignal().length > 0 ? this.beaconsSignal() : this.getMockBeacons(myProf.campus);
    this.beaconsSignal.set(list);
    return of(list);
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

    this.beaconsSignal.update(list => [newBeacon, ...list]);
    return of(newBeacon);
  }
}

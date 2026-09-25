import { FreeWindow, StudentNetworkingProfile, StudyBuddyMatch, DualMatchScore } from '@domain/models/matching';
import { UTPEvent } from '@domain/models/utp.model';
import { parseDate, DAYS_OF_WEEK, getCanonicalCourseKey, formatCourseName } from '@data/schedule-parser';

/**
 * Calcula dinámicamente las ventanas de tiempo libre (gaps) entre clases para cada día de la semana.
 */
export function calculateStudentFreeWindows(events: UTPEvent[], campus = 'Lima Centro'): FreeWindow[] {
  const windows: FreeWindow[] = [];
  const regularEvents = events.filter(e => !e.isLongLasting && e.modality !== 'VT');

  // Agrupar eventos por día de la semana (1 = Lunes .. 6 = Sábado)
  const eventsByDay = new Map<number, UTPEvent[]>();
  for (const evt of regularEvents) {
    const d = parseDate(evt.startAt);
    const day = d.getDay();
    if (!eventsByDay.has(day)) {
      eventsByDay.set(day, []);
    }
    eventsByDay.get(day)!.push(evt);
  }

  for (const [dayNum, dayEvts] of eventsByDay.entries()) {
    // Ordenar cronológicamente por hora de inicio
    dayEvts.sort((a, b) => parseDate(a.startAt).getTime() - parseDate(b.startAt).getTime());

    // 1. Detectar hueco antes de la primera clase (si empieza en la tarde)
    const firstEvt = dayEvts[0];
    const firstStart = parseDate(firstEvt.startAt);
    if (firstStart.getHours() >= 16) {
      const preStartH = Math.max(14, firstStart.getHours() - 2);
      windows.push({
        dayNumber: dayNum,
        dayName: DAYS_OF_WEEK[dayNum],
        startTime: `${preStartH.toString().padStart(2, '0')}:00`,
        endTime: `${firstStart.getHours().toString().padStart(2, '0')}:${firstStart.getMinutes().toString().padStart(2, '0')}`,
        campus: campus,
        building: firstEvt.metadata?.building || 'SL02_TTA',
        floor: firstEvt.metadata?.floor || 'P08',
      });
    }

    // 2. Detectar huecos (gaps >= 45 min) entre clases consecutivas del mismo día
    for (let i = 0; i < dayEvts.length - 1; i++) {
      const currFinish = parseDate(dayEvts[i].finishAt);
      const nextStart = parseDate(dayEvts[i + 1].startAt);
      const diffMinutes = Math.floor((nextStart.getTime() - currFinish.getTime()) / (1000 * 60));

      if (diffMinutes >= 45) {
        windows.push({
          dayNumber: dayNum,
          dayName: DAYS_OF_WEEK[dayNum],
          startTime: `${currFinish.getHours().toString().padStart(2, '0')}:${currFinish.getMinutes().toString().padStart(2, '0')}`,
          endTime: `${nextStart.getHours().toString().padStart(2, '0')}:${nextStart.getMinutes().toString().padStart(2, '0')}`,
          campus: campus,
          building: dayEvts[i].metadata?.building || 'SL02_TTA',
          floor: dayEvts[i].metadata?.floor || 'P08',
        });
      }
    }
  }

  return windows;
}

/**
 * Evalúa el matching dual y multidimensional entre el perfil del usuario y otro compañero.
 */
export function computeDualMatchScore(
  myProfile: StudentNetworkingProfile,
  other: StudentNetworkingProfile
): DualMatchScore {
  const reasons: string[] = [];

  // 1. Proximidad Geográfica / Sede (25 pts)
  let proximityScore = 0;
  const isSameCampus = (myProfile.campus || '').trim().toLowerCase() === (other.campus || '').trim().toLowerCase();
  if (isSameCampus) {
    proximityScore = 25;
    reasons.push(`Misma sede física (${myProfile.campus})`);
  } else {
    proximityScore = 10;
  }

  // 2. Alineación de Cursos y Metas Académicas (30 pts)
  let academicAlignmentScore = 0;
  const myCoursesNormalized = new Set((myProfile.enrolled_courses || []).map((c: string) => getCanonicalCourseKey(c)));
  const sharedCourses: string[] = [];

  for (const c of (other.enrolled_courses || [])) {
    const key = getCanonicalCourseKey(c);
    if (myCoursesNormalized.has(key)) {
      sharedCourses.push(formatCourseName(c));
    }
  }

  if (sharedCourses.length > 0) {
    academicAlignmentScore = Math.min(30, sharedCourses.length * 15);
    reasons.push(`Cursos en común: ${sharedCourses.slice(0, 2).join(', ')}`);
  }

  // 3. Coincidencia de Ventanas Libres / Horario (30 pts)
  let freeWindowScore = 0;
  let matchedWindow: FreeWindow | null = null;

  for (const myWin of (myProfile.free_windows || [])) {
    for (const otherWin of (other.free_windows || [])) {
      if (myWin.dayNumber === otherWin.dayNumber) {
        // Coinciden en día
        freeWindowScore = 30;
        matchedWindow = myWin;
        reasons.push(`Ventana libre compartida los ${myWin.dayName} (${myWin.startTime} - ${myWin.endTime})`);
        break;
      }
    }
    if (matchedWindow) break;
  }

  if (!matchedWindow && (other.free_windows || []).length > 0) {
    freeWindowScore = 10; // Hay flexibilidad horaria parcial
  }

  // 4. Complementariedad de Habilidades (15 pts)
  let skillsComplementarityScore = 0;
  const mySkillsSet = new Set((myProfile.skills || []).map((s: string) => s.toLowerCase().trim()));
  const newSkills = (other.skills || []).filter((s: string) => !mySkillsSet.has(s.toLowerCase().trim()));

  if (newSkills.length > 0) {
    skillsComplementarityScore = Math.min(15, newSkills.length * 5);
    reasons.push(`Aporte complementario en: ${newSkills.slice(0, 3).join(', ')}`);
  } else {
    skillsComplementarityScore = 10;
  }

  const overall = Math.min(100, Math.round(proximityScore + academicAlignmentScore + freeWindowScore + skillsComplementarityScore));

  return {
    overall,
    freeWindowScore,
    proximityScore,
    academicAlignmentScore,
    skillsComplementarityScore,
    reasons,
  };
}

/**
 * Pool de compañeros para matching.
 * Vacío por defecto: las coincidencias provienen de perfiles reales de estudiantes en Supabase.
 */
export const MOCK_STUDENTS_LIMA_CENTRO: StudentNetworkingProfile[] = [];

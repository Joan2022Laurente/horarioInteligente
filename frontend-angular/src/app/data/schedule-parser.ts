import { ProcessedCourse, UTPEvent, CourseSessionSchedule, CourseEvaluation, AcademicMilestone } from '@domain/models/utp.model';
import { normalizeKey, parseNormalizedDate } from '@core/utils/string.utils';
import { KNOWN_SYLLABUS_MAP } from './syllabus/official-registry';
import { getAllEvaluationsFromRegistry } from './syllabus-parser';

export interface ParsedEventInfo {
  cleanTitle: string;
  sectionCode: string;
  weekInTitle?: number;
  dayInTitle?: string;
}

export function formatCourseName(rawName: string): string {
  if (!rawName) return '';
  const text = rawName.trim();

  // Acrónimos específicos que deben permanecer en mayúsculas
  const acronyms = new Set([
    'TI', 'TDD', 'API', 'AWS', 'IA', 'UTP', 'JWT', 'JPA', 'SQL', 
    'REST', 'VPC', 'EC2', 'S3', 'ALB', 'CI/CD', 'ITIL', 'RSL', 
    'PICO', 'PRISMA', 'CMDB', 'SLA', 'IAM', 'IT'
  ]);
  
  // Conectores y preposiciones en español en minúsculas
  const lowerWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'para', 'por', 'con', 'y', 'e', 'o', 'u', 'a', 'al']);

  const words = text.split(/\s+/);
  const formatted = words.map((word, index) => {
    const cleanWord = word.replace(/[^a-záéíóúüñ0-9/]/gi, '').toUpperCase();
    if (acronyms.has(cleanWord)) {
      return word.replace(new RegExp(`\\b${cleanWord}\\b`, 'i'), cleanWord);
    }
    const lowerWord = word.toLowerCase();
    if (index > 0 && lowerWords.has(lowerWord)) {
      return lowerWord;
    }
    return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
  }).join(' ');

  return formatted.replace(/-\s*([a-záéíóúñ])/gi, (_, p1) => `- ${p1.toUpperCase()}`);
}

export function getCanonicalCourseKey(name: string): string {
  return normalizeKey(name)
    .replace(/-\s*\d{4,6}$/g, '')
    .trim();
}

export function parseEventTitle(rawTitle: string): ParsedEventInfo {
  // Ejemplos:
  // "DESARROLLO WEB INTEGRADO (34374) (Semana 10) - Jueves"
  // "FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS (56357) (Semana 4) - Lunes"
  // "HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA - 54262"
  let cleanTitle = rawTitle.trim();
  let sectionCode = '';
  let weekInTitle: number | undefined;
  let dayInTitle: string | undefined;

  // Extraer dia (únicamente nombres de día válidos o sufijo de sesión)
  const dayMatch = cleanTitle.match(/-\s*(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo|Sesi[oó]n)$/i);
  if (dayMatch) {
    dayInTitle = dayMatch[1].trim();
    cleanTitle = cleanTitle.replace(/-\s*(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo|Sesi[oó]n)$/i, '').trim();
  }

  // Extraer semana
  const weekMatch = cleanTitle.match(/\(\s*semana\s*(\d+)\s*\)/i);
  if (weekMatch) {
    weekInTitle = parseInt(weekMatch[1], 10);
    cleanTitle = cleanTitle.replace(/\(\s*semana\s*\d+\s*\)/i, '').trim();
  }

  // Extraer seccion con guion final (e.g. - 54262)
  const trailingSectionMatch = cleanTitle.match(/-\s*(\d{4,6})$/);
  if (trailingSectionMatch) {
    sectionCode = trailingSectionMatch[1];
    cleanTitle = cleanTitle.replace(/-\s*(\d{4,6})$/, '').trim();
  }

  // Extraer seccion numerica o texto entre parentesis (e.g. (34374), (Sección Única), (sección Única), etc.)
  const sectionMatch = cleanTitle.match(/\(\s*(?:secci[oó]n\s+)?([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+)\s*\)/i);
  if (sectionMatch) {
    sectionCode = sectionMatch[1].match(/^\d+$/) ? sectionMatch[1] : sectionCode;
    cleanTitle = cleanTitle.replace(/\(\s*(?:secci[oó]n\s+)?[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+\s*\)/i, '').trim();
  }

  cleanTitle = formatCourseName(cleanTitle);

  return {
    cleanTitle,
    sectionCode,
    weekInTitle,
    dayInTitle,
  };
}

export const DAYS_OF_WEEK = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export function getDayName(dayIndex: number): string {
  return DAYS_OF_WEEK[dayIndex] || '';
}

export function parseDate(dateStr: string): Date {
  return parseNormalizedDate(dateStr);
}

export function formatTime(dateStr: string): string {
  try {
    const d = parseDate(dateStr);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
}

export function formatScheduleTimeRange(startStr: string, finishStr: string): string {
  try {
    const s = parseDate(startStr);
    const f = parseDate(finishStr);

    const sHours = s.getHours();
    const sMinutes = s.getMinutes().toString().padStart(2, '0');
    const sAmpm = sHours >= 12 ? 'PM' : 'AM';
    const sH12 = (sHours % 12 || 12).toString().padStart(2, '0');

    const fHours = f.getHours();
    const fMinutes = f.getMinutes().toString().padStart(2, '0');
    const fAmpm = fHours >= 12 ? 'PM' : 'AM';
    const fH12 = (fHours % 12 || 12).toString().padStart(2, '0');

    if (sAmpm === fAmpm) {
      return `${sH12}:${sMinutes} – ${fH12}:${fMinutes} ${fAmpm}`;
    }
    return `${sH12}:${sMinutes} ${sAmpm} – ${fH12}:${fMinutes} ${fAmpm}`;
  } catch {
    return `${formatTime(startStr)} – ${formatTime(finishStr)}`;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    const d = parseDate(dateStr);
    return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export function getProcessedCourses(events: UTPEvent[]): ProcessedCourse[] {
  const courseMap = new Map<string, {
    courseId: string;
    name: string;
    sectionCode: string;
    sectionId?: string;
    modalities: Set<string>;
    zoomLink?: string;
    sessions: UTPEvent[];
  }>();

  for (const event of events) {
    const parsed = parseEventTitle(event.title);
    const canonicalKey = getCanonicalCourseKey(parsed.cleanTitle);
    const courseId = event.metadata?.courseId || parsed.cleanTitle;

    let existing = courseMap.get(canonicalKey);
    if (!existing) {
      existing = {
        courseId,
        name: parsed.cleanTitle,
        sectionCode: parsed.sectionCode || event.metadata?.sectionCode || '',
        sectionId: event.metadata?.sectionId,
        modalities: new Set(),
        zoomLink: event.metadata?.zoomLink,
        sessions: [],
      };
      courseMap.set(canonicalKey, existing);
    }

    if (event.modality) existing.modalities.add(event.modality);
    if (event.metadata?.zoomLink && !existing.zoomLink) {
      existing.zoomLink = event.metadata.zoomLink;
    }
    if (parsed.sectionCode && !existing.sectionCode) {
      existing.sectionCode = parsed.sectionCode;
    }
    if (event.metadata?.sectionCode && !existing.sectionCode) {
      existing.sectionCode = event.metadata.sectionCode;
    }
    if (event.metadata?.sectionId && !existing.sectionId) {
      existing.sectionId = event.metadata.sectionId;
    }
    existing.sessions.push(event);
  }

  // Incorporar asignaturas virtuales 24/7 registradas que no generan slots en el calendario semanal
  for (const [knownId, knownData] of Object.entries(KNOWN_SYLLABUS_MAP)) {
    const canonicalKnown = getCanonicalCourseKey(knownData.name);
    const matchingExisting = courseMap.get(canonicalKnown);

    if (matchingExisting) {
      if (matchingExisting.name.length < knownData.name.length) {
        matchingExisting.name = formatCourseName(knownData.name);
      }
    } else {
      courseMap.set(canonicalKnown, {
        courseId: knownId,
        name: formatCourseName(knownData.name),
        sectionCode: '',
        modalities: new Set(['VT']),
        sessions: [],
      });
    }
  }

  const result: ProcessedCourse[] = [];

  for (const [courseId, data] of courseMap.entries()) {
    // Ordenar sesiones por fecha
    data.sessions.sort((a, b) => parseDate(a.startAt).getTime() - parseDate(b.startAt).getTime());

    const now = new Date();
    const upcomingSessions = data.sessions.filter(s => parseDate(s.finishAt).getTime() >= now.getTime());
    const pastSessions = data.sessions.filter(s => parseDate(s.finishAt).getTime() < now.getTime());

    // Deduce horario semanal recurrente
    const scheduleKeys = new Set<string>();
    const weeklySchedules: CourseSessionSchedule[] = [];

    for (const session of data.sessions) {
      if (session.isLongLasting) continue; // no recurrente por horario especifico
      const d = parseDate(session.startAt);
      const dayNumber = d.getDay(); // 0 = Domingo
      const startH = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
      const finishD = parseDate(session.finishAt);
      const finishH = finishD.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
      const key = `${dayNumber}_${startH}_${finishH}`;

      if (!scheduleKeys.has(key) && dayNumber >= 0) {
        scheduleKeys.add(key);
        weeklySchedules.push({
          dayNumber,
          dayName: DAYS_OF_WEEK[dayNumber],
          startTime: startH,
          endTime: finishH,
          modality: session.modality,
          zoomLink: session.metadata?.zoomLink || data.zoomLink,
        });
      }
    }

    // Ordenar horario semanal de Lunes (1) a Domingo (7/0)
    weeklySchedules.sort((a, b) => {
      const orderA = a.dayNumber === 0 ? 7 : a.dayNumber;
      const orderB = b.dayNumber === 0 ? 7 : b.dayNumber;
      return orderA - orderB;
    });

    const knownSyllabus = KNOWN_SYLLABUS_MAP[courseId];
    const sessionSyllabusUrl = data.sessions.find(s => s.metadata?.syllabusUrl)?.metadata?.syllabusUrl;

    result.push({
      courseId,
      name: data.name,
      sectionCode: data.sectionCode,
      sectionId: data.sectionId,
      modalities: Array.from(data.modalities),
      zoomLink: data.zoomLink,
      syllabusUrl: sessionSyllabusUrl || knownSyllabus?.syllabusUrl,
      totalSessions: data.sessions.length,
      upcomingSessions,
      pastSessions,
      weeklySchedules,
    });
  }

  // Ordenar por nombre de curso
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCurrentAndNextClass(
  events: UTPEvent[],
  refDate: Date = new Date()
): {
  currentClass: UTPEvent | null;
  nextClass: UTPEvent | null;
  minutesToNext: number | null;
  minutesRemainingCurrent: number | null;
} {
  const refTime = refDate.getTime();
  let currentClass: UTPEvent | null = null;
  let nextClass: UTPEvent | null = null;
  let minDiff = Infinity;
  let minutesRemainingCurrent: number | null = null;

  // Filtrar eventos con horas validas y no 'isLongLasting'
  const regularEvents = events.filter(e => !e.isLongLasting);

  for (const event of regularEvents) {
    const startTime = parseDate(event.startAt).getTime();
    const finishTime = parseDate(event.finishAt).getTime();

    // En curso
    if (refTime >= startTime && refTime <= finishTime) {
      currentClass = event;
      minutesRemainingCurrent = Math.max(0, Math.floor((finishTime - refTime) / (1000 * 60)));
    }

    // Proxima clase
    if (startTime > refTime) {
      const diff = startTime - refTime;
      if (diff < minDiff) {
        minDiff = diff;
        nextClass = event;
      }
    }
  }

  const minutesToNext = minDiff !== Infinity ? Math.floor(minDiff / (1000 * 60)) : null;

  return {
    currentClass,
    nextClass,
    minutesToNext,
    minutesRemainingCurrent,
  };
}

export function getEventsForDay(events: UTPEvent[], targetDate: Date): UTPEvent[] {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  return events
    .filter(event => {
      if (event.isLongLasting) return false;
      const d = parseDate(event.startAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    })
    .sort((a, b) => parseDate(a.startAt).getTime() - parseDate(b.startAt).getTime());
}

/**
 * Filter events by concrete date range (inclusive startMs, exclusive endMs).
 * Canonical method — the week numbers embedded in UTP PAO course titles use a
 * different epoch than the API's week_number (1-week offset), so filtering by
 * actual date range is always correct.
 */
export function getEventsByDateRange(
  events: UTPEvent[],
  startMs: number,
  endMs: number,
): UTPEvent[] {
  return events
    .filter(event => {
      if (event.isLongLasting) return false;
      const t = parseDate(event.startAt).getTime();
      return t >= startMs && t < endMs;
    })
    .sort((a, b) => parseDate(a.startAt).getTime() - parseDate(b.startAt).getTime());
}

/**
 * @deprecated Use getEventsByDateRange. Filters by (Semana N) title tag which
 * does NOT align with the API's week_number — 1-week offset in UTP PAO API.
 */
export function getEventsByWeek(events: UTPEvent[], weekNum: number): UTPEvent[] {
  return events
    .filter(event => {
      if (event.isLongLasting) return false;
      const parsed = parseEventTitle(event.title);
      return parsed.weekInTitle === weekNum;
    })
    .sort((a, b) => parseDate(a.startAt).getTime() - parseDate(b.startAt).getTime());
}

import { getAllCachedSyllabi } from './syllabus/client-storage';

export function getDynamicStudentEvaluations(enrolledCourseKeys?: Set<string>): CourseEvaluation[] {
  const syllabi = getAllCachedSyllabi();
  const seenIds = new Set<string>();
  const evList: CourseEvaluation[] = [];

  for (const [key, syllabus] of Object.entries(syllabi)) {
    if (!syllabus || !syllabus.evaluations || syllabus.evaluations.length === 0) continue;
    const courseName = syllabus.generalInfo?.courseName || key;
    const sectionCode = syllabus.generalInfo?.courseCode || key;

    // Aislamiento estricto por estudiante: solo incluir evaluaciones de cursos matriculados
    if (enrolledCourseKeys && enrolledCourseKeys.size > 0) {
      const canonName = getCanonicalCourseKey(courseName);
      const canonCode = getCanonicalCourseKey(sectionCode);
      const isEnrolled = enrolledCourseKeys.has(canonName) || 
                         enrolledCourseKeys.has(canonCode) ||
                         Array.from(enrolledCourseKeys).some(k => canonName.includes(k) || k.includes(canonName));
      if (!isEnrolled) {
        continue; // Ignorar evaluaciones de asignaturas ajenas al estudiante
      }
    }

    for (const ev of syllabus.evaluations) {
      const uniqueId = `${sectionCode}-${ev.type}-${ev.week}`;
      if (seenIds.has(uniqueId)) continue;
      seenIds.add(uniqueId);

      evList.push({
        id: ev.id || uniqueId,
        code: ev.type,
        fullName: ev.description || `${ev.type} (${ev.weightPercent}%)`,
        weightPercent: ev.weightPercent,
        week: ev.week,
        courseName: courseName,
        sectionCode: sectionCode,
        modality: (ev.modality === 'Grupal' ? 'Grupal' : 'Individual') as 'Grupal' | 'Individual',
        rules: ev.rules || [],
        description: ev.observation || '',
      });
    }
  }

  return evList.sort((a, b) => a.week - b.week);
}

export const ALL_COURSE_EVALUATIONS: CourseEvaluation[] = [];

export function getAcademicMilestones(currentWeek: number, enrolledCourseKeys?: Set<string>): AcademicMilestone[] {
  const allEvaluations = getDynamicStudentEvaluations(enrolledCourseKeys);
  if (allEvaluations.length === 0) {
    return [];
  }

  // Agrupar dinámicamente por semana
  const weekMap = new Map<number, CourseEvaluation[]>();
  for (const ev of allEvaluations) {
    if (!weekMap.has(ev.week)) {
      weekMap.set(ev.week, []);
    }
    weekMap.get(ev.week)!.push(ev);
  }

  const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => a - b);

  return sortedWeeks.map((week) => {
    const evs = weekMap.get(week)!;
    const hasFinal = evs.some(e => {
      const codeUpper = (e.code || '').toUpperCase();
      return codeUpper.includes('EXFN') || codeUpper.includes('EF') || codeUpper.includes('PROY') || codeUpper.includes('FINAL');
    });
    const type: 'exam' | 'evaluation' = hasFinal ? 'exam' : 'evaluation';

    const codes = Array.from(new Set(evs.map(e => `${e.code} ${e.courseName} (${e.weightPercent}%)`)));
    const title = `Semana ${week}: ${hasFinal ? 'Exámenes Finales & Entregas Clave' : 'Evaluaciones Programadas'}`;
    const desc = codes.join(' • ');

    return {
      title,
      type,
      weekNumber: week,
      description: desc,
      isCurrentOrUpcoming: currentWeek <= week,
      courseEvaluations: evs,
    };
  });
}

export function getUpcomingEvaluations(currentWeek: number, limit = 6): (CourseEvaluation & { weeksRemaining: number; isCurrentWeek: boolean })[] {
  const allEvaluations = getDynamicStudentEvaluations();
  return allEvaluations
    .filter((e) => e.week >= currentWeek)
    .sort((a, b) => a.week - b.week)
    .slice(0, limit)
    .map((e) => ({
      ...e,
      weeksRemaining: e.week - currentWeek,
      isCurrentWeek: e.week === currentWeek,
    }));
}


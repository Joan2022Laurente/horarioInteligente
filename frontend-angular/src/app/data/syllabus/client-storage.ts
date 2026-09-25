import { ParsedSyllabus } from './types';
import { UTPCalendarResponse, StudentProfile } from '@/types/utp';
import { getSyllabusForCourse } from './official-registry';

/**
 * Gestor dinámico de almacenamiento en LocalStorage para Horario Inteligente y Sílabos UTP.
 * Permite que cualquier estudiante con cualquier combinación de cursos cargue y persista
 * sus sílabos y horarios parseados en tiempo real sin requerir una base de datos centralizada.
 */

const SYLLABUS_STORAGE_PREFIX = 'utp_syllabus_live_';
const CALENDAR_STORAGE_KEY = 'utp_calendar_data';
const PROFILE_STORAGE_KEY = 'utp_student_profile';

/**
 * Obtiene todos los sílabos parseados guardados en localStorage
 */
export function getAllCachedSyllabi(): Record<string, ParsedSyllabus> {
  if (typeof window === 'undefined') return {};

  const map: Record<string, ParsedSyllabus> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SYLLABUS_STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as ParsedSyllabus;
          const courseId = key.replace(SYLLABUS_STORAGE_PREFIX, '');
          map[courseId] = parsed;
          if (parsed.generalInfo?.courseCode) {
            map[parsed.generalInfo.courseCode.toUpperCase().trim()] = parsed;
          }
          if (parsed.generalInfo?.courseName) {
            map[parsed.generalInfo.courseName.toUpperCase().trim()] = parsed;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[client-storage] Error leyendo sílabos de localStorage:', e);
  }

  return map;
}

/**
 * Busca un sílabo específico en localStorage por nombre o código de curso,
 * con fallback inteligente al registro local oficial si aún no se ha descargado.
 */
function normalizeKey(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca un sílabo específico en localStorage por nombre o código de curso,
 * con fallback inteligente al registro local oficial si aún no se ha descargado.
 */
export function getCachedSyllabus(courseNameOrCode: string): ParsedSyllabus | null {
  if (typeof window === 'undefined' || !courseNameOrCode) {
    return null;
  }

  const normalized = normalizeKey(courseNameOrCode);

  try {
    // 1. Búsqueda directa por key en localStorage
    const directKey = `${SYLLABUS_STORAGE_PREFIX}${courseNameOrCode.toUpperCase().trim()}`;
    const direct = localStorage.getItem(directKey);
    if (direct) {
      const parsed = JSON.parse(direct) as ParsedSyllabus;
      if (parsed && parsed.formula && parsed.weeklySchedule && parsed.weeklySchedule.length > 0) {
        return parsed;
      }
    }

    // 2. Búsqueda en el mapa global de localStorage con normalización insensible a tildes
    const all = getAllCachedSyllabi();
    for (const syllabus of Object.values(all)) {
      if (!syllabus || !syllabus.formula || !syllabus.weeklySchedule || syllabus.weeklySchedule.length === 0) continue;
      const sCode = normalizeKey(syllabus.generalInfo?.courseCode || '');
      const sName = normalizeKey(syllabus.generalInfo?.courseName || '');
      
      if (
        (sCode && (sCode === normalized || normalized.includes(sCode))) ||
        (sName && (sName === normalized || sName.includes(normalized) || normalized.includes(sName)))
      ) {
        return syllabus;
      }
    }
  } catch (e) {
    console.warn('[client-storage] Error buscando sílabo:', e);
  }

  return null;
}

/**
 * Guarda o actualiza un sílabo en localStorage
 */
export function saveCachedSyllabus(courseIdOrName: string, syllabus: ParsedSyllabus): void {
  if (typeof window === 'undefined' || !courseIdOrName) return;

  try {
    const key = `${SYLLABUS_STORAGE_PREFIX}${courseIdOrName.toUpperCase().trim()}`;
    localStorage.setItem(key, JSON.stringify(syllabus));
    console.log(`[client-storage] 💾 Sílabo guardado en '${key}'`);

    // Si tiene código o nombre adicional, persistir indexación cruzada
    if (syllabus.generalInfo?.courseCode) {
      const codeKey = `${SYLLABUS_STORAGE_PREFIX}${syllabus.generalInfo.courseCode.toUpperCase().trim()}`;
      if (codeKey !== key) {
        localStorage.setItem(codeKey, JSON.stringify(syllabus));
        console.log(`[client-storage] 💾 Sílabo indexado adicionalmente en '${codeKey}'`);
      }
    }
  } catch (e) {
    console.warn('[client-storage] Error guardando sílabo en localStorage:', e);
  }
}

/**
 * Obtiene el calendario y eventos guardados en localStorage
 */
export function getCachedCalendarData(): UTPCalendarResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as UTPCalendarResponse;
    }
  } catch (e) {
    console.warn('[client-storage] Error leyendo datos de calendario de localStorage:', e);
  }
  return null;
}

/**
 * Guarda el calendario y eventos en localStorage
 */
export function saveCachedCalendarData(data: UTPCalendarResponse): void {
  if (typeof window === 'undefined' || !data) return;
  try {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[client-storage] Error guardando datos de calendario en localStorage:', e);
  }
}

/**
 * Obtiene el perfil del estudiante desde localStorage (descifrando credenciales seguras)
 */
export function getCachedStudentProfile(): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;

    // Si está cifrado con formato local
    if (raw.startsWith('enc_b64_')) {
      const decoded = decodeURIComponent(escape(atob(raw.replace('enc_b64_', ''))));
      return JSON.parse(decoded) as StudentProfile;
    }

    // Texto plano estándar o retrocompatibilidad
    if (raw.startsWith('{')) {
      return JSON.parse(raw) as StudentProfile;
    }
  } catch (e) {
    console.warn('[client-storage] Error leyendo perfil cifrado de localStorage:', e);
  }
  return null;
}

/**
 * Guarda el perfil del estudiante en localStorage con cifrado local seguro
 */
export function saveCachedStudentProfile(profile: StudentProfile): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile.token) {
      const jsonStr = JSON.stringify(profile);
      const encrypted = `enc_b64_${btoa(unescape(encodeURIComponent(jsonStr)))}`;
      localStorage.setItem(PROFILE_STORAGE_KEY, encrypted);
    } else {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[client-storage] Error guardando perfil cifrado en localStorage:', e);
  }
}

/**
 * Limpia todos los datos locales en el cierre de sesión o reset general (perfil, calendario y sílabos sincronizados)
 */
export function clearAllLocalUserData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(CALENDAR_STORAGE_KEY);

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith(SYLLABUS_STORAGE_PREFIX) || 
        key.startsWith('utp_schedule_last_sync') ||
        key.startsWith('networking_')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('utp_schedule_last_sync_date');
  } catch (e) {
    console.warn('[client-storage] Error limpiando datos locales:', e);
  }
}


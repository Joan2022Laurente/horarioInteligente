import { ParsedSyllabus } from './types';
import { UTPCalendarResponse, StudentProfile } from '@domain/models/utp.model';
import { normalizeKey } from '@core/utils/string.utils';

/**
 * Gestor dinámico de almacenamiento en LocalStorage para Horario Inteligente y Sílabos UTP.
 * Centraliza operaciones seguras con tipado genérico y aislamiento por estudiante.
 */

const SYLLABUS_STORAGE_PREFIX = 'utp_syllabus_live_';
const CALENDAR_STORAGE_KEY = 'utp_calendar_data';
const PROFILE_STORAGE_KEY = 'utp_student_profile';

/**
 * Lectura genérica y segura de LocalStorage con tipado estricto y fallback.
 */
export function getStorageItem<T>(key: string, fallback: T | null = null): T | null {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    console.warn(`[client-storage] Error al leer '${key}':`, e);
    return fallback;
  }
}

/**
 * Escritura genérica y segura en LocalStorage serializando a JSON.
 */
export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[client-storage] Error al guardar '${key}':`, e);
  }
}

/**
 * Eliminación segura de clave en LocalStorage.
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[client-storage] Error al eliminar '${key}':`, e);
  }
}

/**
 * Obtiene el código del estudiante actualmente autenticado.
 */
export function getActiveStudentCode(): string {
  if (typeof window === 'undefined') return '';
  const profile = getCachedStudentProfile();
  return (profile?.studentCode || profile?.username || profile?.userId || localStorage.getItem('utp_current_student_code') || '').toUpperCase().trim();
}

/**
 * Clave particionada por estudiante para el calendario/horario.
 */
export function getTenantCalendarKey(studentCode?: string): string {
  const code = (studentCode || getActiveStudentCode()).toUpperCase().trim();
  return code ? `utp_${code}_calendar_data` : CALENDAR_STORAGE_KEY;
}

/**
 * Obtiene todos los sílabos parseados guardados en localStorage.
 */
export function getAllCachedSyllabi(): Record<string, ParsedSyllabus> {
  if (typeof window === 'undefined') return {};
  const map: Record<string, ParsedSyllabus> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SYLLABUS_STORAGE_PREFIX)) {
        const parsed = getStorageItem<ParsedSyllabus>(key);
        if (parsed) {
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
 * Busca un sílabo específico en localStorage por nombre o código de curso.
 */
export function getCachedSyllabus(courseNameOrCode: string): ParsedSyllabus | null {
  if (typeof window === 'undefined' || !courseNameOrCode) return null;

  const normalized = normalizeKey(courseNameOrCode);

  // 1. Búsqueda directa por clave
  const directKey = `${SYLLABUS_STORAGE_PREFIX}${courseNameOrCode.toUpperCase().trim()}`;
  const direct = getStorageItem<ParsedSyllabus>(directKey);
  if (direct?.formula && direct.weeklySchedule && direct.weeklySchedule.length > 0) {
    return direct;
  }

  // 2. Búsqueda en el mapa global con normalización insensible a tildes
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

  return null;
}

/**
 * Guarda o actualiza un sílabo en localStorage.
 */
export function saveCachedSyllabus(courseIdOrName: string, syllabus: ParsedSyllabus): void {
  if (typeof window === 'undefined' || !courseIdOrName) return;

  const key = `${SYLLABUS_STORAGE_PREFIX}${courseIdOrName.toUpperCase().trim()}`;
  setStorageItem(key, syllabus);

  if (syllabus.generalInfo?.courseCode) {
    const codeKey = `${SYLLABUS_STORAGE_PREFIX}${syllabus.generalInfo.courseCode.toUpperCase().trim()}`;
    if (codeKey !== key) {
      setStorageItem(codeKey, syllabus);
    }
  }
}

/**
 * Obtiene el calendario y eventos guardados en localStorage para el estudiante actual.
 */
export function getCachedCalendarData(studentCode?: string): UTPCalendarResponse | null {
  const key = getTenantCalendarKey(studentCode);
  let data = getStorageItem<UTPCalendarResponse>(key);
  if (!data && key !== CALENDAR_STORAGE_KEY) {
    data = getStorageItem<UTPCalendarResponse>(CALENDAR_STORAGE_KEY);
  }
  return data;
}

/**
 * Guarda el calendario y eventos en localStorage particionado por estudiante.
 */
export function saveCachedCalendarData(data: UTPCalendarResponse, studentCode?: string): void {
  const key = getTenantCalendarKey(studentCode);
  setStorageItem(key, data);
}

/**
 * Obtiene el perfil del estudiante desde localStorage (descifrando credenciales).
 */
export function getCachedStudentProfile(): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;

    if (raw.startsWith('enc_b64_')) {
      const decoded = decodeURIComponent(escape(atob(raw.replace('enc_b64_', ''))));
      return JSON.parse(decoded) as StudentProfile;
    }

    if (raw.startsWith('{')) {
      return JSON.parse(raw) as StudentProfile;
    }
  } catch (e) {
    console.warn('[client-storage] Error leyendo perfil de localStorage:', e);
  }
  return null;
}

/**
 * Guarda el perfil del estudiante en localStorage con codificación local.
 */
export function saveCachedStudentProfile(profile: StudentProfile): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile.token) {
      const jsonStr = JSON.stringify(profile);
      const encrypted = `enc_b64_${btoa(unescape(encodeURIComponent(jsonStr)))}`;
      localStorage.setItem(PROFILE_STORAGE_KEY, encrypted);
    } else {
      removeStorageItem(PROFILE_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[client-storage] Error guardando perfil en localStorage:', e);
  }
}

/**
 * Limpia todos los datos locales en el cierre de sesión o cambio de cuenta.
 */
export function clearAllLocalUserData(): void {
  if (typeof window === 'undefined') return;
  try {
    removeStorageItem(PROFILE_STORAGE_KEY);
    removeStorageItem(CALENDAR_STORAGE_KEY);
    removeStorageItem('utp_auth_profile');
    removeStorageItem('utp_current_student_code');
    removeStorageItem('utp_schedule_last_sync_date');
    removeStorageItem('utp_community_posts_cache');
    removeStorageItem('utp_networking_matches_cache');
    removeStorageItem('utp_my_networking_profile');
    removeStorageItem('utp_networking_profile_hash');

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith(SYLLABUS_STORAGE_PREFIX) || 
        key.startsWith('utp_') ||
        key.startsWith('networking_')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => removeStorageItem(k));
  } catch (e) {
    console.warn('[client-storage] Error limpiando datos locales:', e);
  }
}

import { CourseEvaluation } from '@domain/models/utp.model';
import { ParsedSyllabus } from './types';
import { getAllCachedSyllabi } from './client-storage';

/**
 * Registro dinámico de sílabos UTP en memoria.
 * Cero datos hardcodeados: los sílabos se sincronizan y persisten dinámicamente según la carrera
 * y cursos reales del estudiante autenticado.
 */
export const OFFICIAL_SYLLABUS_REGISTRY: Record<string, ParsedSyllabus> = {};

/**
 * Busca el sílabo en el registro en memoria o en el almacenamiento local del estudiante.
 */
export function getSyllabusForCourse(courseIdentifier: string): ParsedSyllabus | null {
  if (!courseIdentifier) return null;
  const normalized = courseIdentifier.toUpperCase().trim();

  // 1. Verificar registro en memoria
  if (OFFICIAL_SYLLABUS_REGISTRY[courseIdentifier]) {
    return OFFICIAL_SYLLABUS_REGISTRY[courseIdentifier];
  }
  if (OFFICIAL_SYLLABUS_REGISTRY[normalized]) {
    return OFFICIAL_SYLLABUS_REGISTRY[normalized];
  }

  // 2. Verificar almacenamiento local dinámico del estudiante
  const cached = getAllCachedSyllabi();
  if (cached[courseIdentifier]) return cached[courseIdentifier];
  if (cached[normalized]) return cached[normalized];

  for (const syllabus of Object.values(cached)) {
    const sCode = syllabus.generalInfo?.courseCode?.toUpperCase() || '';
    const sName = syllabus.generalInfo?.courseName?.toUpperCase() || '';
    if (
      (sCode && sCode === normalized) ||
      (sName && (sName.includes(normalized) || normalized.includes(sName)))
    ) {
      return syllabus;
    }
  }

  return null;
}

/**
 * Convierte los sílabos registrados dinámicamente en la lista de CourseEvaluation
 * para que TodayView, el Horario y el Copilot usen los datos reales del estudiante.
 */
export function getAllEvaluationsFromRegistry(): CourseEvaluation[] {
  const result: CourseEvaluation[] = [];
  const allSyllabi = { ...OFFICIAL_SYLLABUS_REGISTRY, ...getAllCachedSyllabi() };

  for (const syllabus of Object.values(allSyllabi)) {
    if (!syllabus.evaluations) continue;
    for (const ev of syllabus.evaluations) {
      if (!result.some((r) => r.id === ev.id && r.courseName === syllabus.generalInfo.courseName)) {
        result.push({
          id: ev.id,
          courseName: syllabus.generalInfo.courseName,
          code: ev.type,
          fullName: ev.description,
          week: ev.week,
          weightPercent: ev.weightPercent,
          modality: ev.modality,
          description: ev.observation || ev.description,
          rules: ev.rules || syllabus.rules,
        });
      }
    }
  }

  return result;
}

export const KNOWN_SYLLABUS_MAP: Record<string, { syllabusUrl: string; name: string }> = {};

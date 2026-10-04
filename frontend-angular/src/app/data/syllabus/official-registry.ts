import { CourseEvaluation } from '@domain/models/utp.model';
import { ParsedSyllabus } from './types';
import { getAllCachedSyllabi } from './client-storage';

/**
 * Registro dinámico de sílabos UTP sincronizados en el cliente.
 * Cero datos hardcodeados: los sílabos se sincronizan 100% dinámicamente
 * desde la API v2.0 según la matrícula real del estudiante autenticado.
 */
export const OFFICIAL_SYLLABUS_REGISTRY: Record<string, ParsedSyllabus> = {};

/**
 * Busca el sílabo en memoria o en el almacenamiento local dinámico del estudiante.
 */
export function getSyllabusForCourse(courseIdentifier: string): ParsedSyllabus | null {
  if (!courseIdentifier) return null;
  const rawClean = courseIdentifier.trim().toUpperCase();

  // 1. Verificar en registro en memoria
  if (OFFICIAL_SYLLABUS_REGISTRY[rawClean]) {
    return OFFICIAL_SYLLABUS_REGISTRY[rawClean];
  }

  // 2. Verificar almacenamiento local dinámico del estudiante
  const cached = getAllCachedSyllabi();
  if (cached[courseIdentifier]) return cached[courseIdentifier];
  if (cached[rawClean]) return cached[rawClean];

  for (const syllabus of Object.values(cached)) {
    const sCode = syllabus.generalInfo?.courseCode?.toUpperCase() || '';
    const sName = syllabus.generalInfo?.courseName?.toUpperCase() || '';
    if (
      (sCode && sCode === rawClean) ||
      (sName && (sName === rawClean || sName.includes(rawClean) || rawClean.includes(sName)))
    ) {
      return syllabus;
    }
  }

  return null;
}

/**
 * Extrae las evaluaciones sincronizadas dinámicamente para los widgets del dashboard.
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

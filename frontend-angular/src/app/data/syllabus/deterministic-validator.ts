import { ParsedSyllabus, SyllabusEvaluationItem, SyllabusWeeklySession } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalWeeks: number;
    evaluationsCount: number;
    totalWeightPercent: number;
    totalTopicsCount: number;
  };
}

/**
 * Validador determinístico estricto de integridad académica para sílabos.
 * Actúa como Quality Gate antes de permitir la persistencia.
 */
export function validateParsedSyllabus(syllabus: Partial<ParsedSyllabus>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validar Datos Generales
  if (!syllabus.generalInfo) {
    errors.push("Falta el objeto generalInfo.");
  } else {
    const { courseCode, courseName, credits } = syllabus.generalInfo;
    if (!courseCode || courseCode.trim().length < 4) {
      errors.push(`Código de curso inválido o vacío: "${courseCode || ''}"`);
    }
    if (!courseName || courseName.trim().length < 3) {
      errors.push(`Nombre de curso inválido o vacío: "${courseName || ''}"`);
    }
    if (typeof credits !== 'number' || credits <= 0) {
      warnings.push(`Créditos inusuales o no especificados: ${credits}`);
    }
  }

  // 2. Validar Logro de Aprendizaje
  if (!syllabus.learningGoal || syllabus.learningGoal.trim().length < 20) {
    errors.push("El logro general de aprendizaje está ausente o es demasiado corto (< 20 caracteres).");
  }

  // 3. Validar Evaluaciones y Ponderaciones
  const evals = syllabus.evaluations || [];
  let totalWeight = 0;

  if (!Array.isArray(evals) || evals.length === 0) {
    errors.push("No se extrajo ninguna evaluación en el arreglo evaluations.");
  } else {
    for (let i = 0; i < evals.length; i++) {
      const ev = evals[i];
      if (!ev.type || ev.type.trim().length < 2) {
        errors.push(`Evaluación #${i + 1} no tiene un tipo/código válido (ej. PC1, APF1).`);
      }
      if (typeof ev.week !== 'number' || ev.week < 1) {
        errors.push(`Evaluación "${ev.type || i}" tiene una semana inválida: ${ev.week}`);
      }
      if (typeof ev.weightPercent !== 'number' || ev.weightPercent <= 0) {
        errors.push(`Evaluación "${ev.type || i}" tiene un porcentaje inválido: ${ev.weightPercent}`);
      } else {
        totalWeight += ev.weightPercent;
      }
    }

    // Comprobación de suma total del 100% (con margen de ±2% por redondeos)
    if (Math.abs(totalWeight - 100) > 2) {
      errors.push(`La suma de ponderaciones de las evaluaciones es ${totalWeight}%, pero debe sumar exactamente 100%.`);
    }
  }

  // 4. Validar Programación Semanal / Clase a Clase
  const schedule = syllabus.weeklySchedule || [];
  let totalTopics = 0;

  if (!Array.isArray(schedule) || schedule.length === 0) {
    errors.push("El cronograma semanal (weeklySchedule) está vacío.");
  } else {
    if (schedule.length < 4) {
      warnings.push(`El curso tiene solo ${schedule.length} semanas extraídas (verificar si es modular/intensivo).`);
    }

    let lastWeek = 0;
    for (let i = 0; i < schedule.length; i++) {
      const session = schedule[i];

      if (typeof session.week !== 'number' || session.week < 1) {
        errors.push(`Sesión #${i + 1} tiene número de semana inválido: ${session.week}`);
      } else {
        if (session.week < lastWeek) {
          errors.push(`Desorden cronológico en weeklySchedule: semana ${session.week} aparece después de semana ${lastWeek}.`);
        }
        lastWeek = session.week;
      }

      // Validar temas (topics)
      const topics = session.topics || (session.topic ? [session.topic] : []);
      if (!Array.isArray(topics) || topics.length === 0 || topics.every(t => t.trim().length === 0)) {
        errors.push(`La semana ${session.week} no tiene ningún tema (topics) asignado.`);
      } else {
        totalTopics += topics.length;
      }

      // Validar unidad
      if (!session.unit || session.unit.trim().length < 2) {
        warnings.push(`La semana ${session.week} no tiene unidad asignada.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalWeeks: schedule.length,
      evaluationsCount: evals.length,
      totalWeightPercent: totalWeight,
      totalTopicsCount: totalTopics
    }
  };
}

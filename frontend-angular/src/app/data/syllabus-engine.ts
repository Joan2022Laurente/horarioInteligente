import { 
  CourseAssignment, 
  SyllabusWeekSyncContext, 
  TaskWithSyllabusContext 
} from '@/types/utp';
import { getSyllabusForCourse, ParsedSyllabus } from './syllabus-parser';
import { getCachedSyllabus } from './syllabus/client-storage';
import { VERIFIED_ASSIGNMENT_RUBRICS } from './rubrics/verified-rubrics';
import { ACTIVE_STUDENT_TASKS } from './tasks/active-tasks';

// Re-export for backward compatibility
export { VERIFIED_ASSIGNMENT_RUBRICS } from './rubrics/verified-rubrics';
export { ACTIVE_STUDENT_TASKS } from './tasks/active-tasks';

/**
 * Resuelve y sincroniza el contexto del sílabo oficial para una semana dada en cualquier curso.
 * Este motor permite vincular automáticamente los temas teóricos, unidades y fórmulas a las tareas.
 */
export function getSyllabusWeekContext(
  courseNameOrId: string, 
  weekNumber: number,
  customSyllabus?: ParsedSyllabus
): SyllabusWeekSyncContext {
  const syllabus = customSyllabus || getCachedSyllabus(courseNameOrId) || getSyllabusForCourse(courseNameOrId);

  // 1. Detección Dinámica de Sesión en el Cronograma Semanal
  const session = syllabus?.weeklySchedule?.find(s => s.week === weekNumber);

  // 2. Detección Dinámica de Unidad y Logro de Aprendizaje
  const parsedUnitNum = session?.unit ? parseInt(session.unit.replace(/\D/g, ''), 10) : NaN;
  const unitNumber = !isNaN(parsedUnitNum) && parsedUnitNum > 0
    ? parsedUnitNum
    : (weekNumber <= 4 ? 1 : weekNumber <= 8 ? 2 : weekNumber <= 13 ? 3 : 4);

  const unitTitle = `Unidad ${unitNumber}: ${session?.unit || 'Temario y Desarrollo Curricular'}`;
  const learningOutcome = syllabus?.learningGoal || 'Desarrollo de competencias técnicas y conceptuales según cronograma.';

  // 3. Extracción Dinámica de Temas y Actividades
  let sessionTopics: string[] = [];
  if (session?.topics && session.topics.length > 0) {
    sessionTopics = session.topics;
  } else if (session?.topic) {
    sessionTopics = session.topic.split(/;|\n|\.\s+/).map(t => t.trim()).filter(Boolean);
  }

  let activities: string[] = [];
  if (Array.isArray(session?.activities)) {
    activities = session.activities;
  } else if (typeof session?.activities === 'string' && session.activities.trim().length > 0) {
    activities = [session.activities];
  } else {
    activities = ['Sesión síncrona en vivo', 'Taller práctico de resolución de ejercicios'];
  }

  // 4. Buscar si en esta semana hay evaluación oficial en el sílabo
  const officialEval = syllabus?.evaluations?.find(e => e.week === weekNumber) || (session?.evaluation ? {
    id: `eval-w${weekNumber}`,
    type: session.evaluation,
    description: `Evaluación ${session.evaluation}`,
    week: weekNumber,
    weightPercent: 20,
    modality: 'Individual' as const,
    rules: syllabus?.rules
  } : undefined);

  return {
    week: weekNumber,
    unitNumber,
    unitTitle,
    learningOutcome,
    sessionTopics,
    activities,
    officialEvaluation: officialEval ? {
      id: officialEval.id,
      courseName: syllabus?.generalInfo?.courseName || courseNameOrId,
      code: officialEval.type,
      fullName: officialEval.description,
      week: officialEval.week,
      weightPercent: officialEval.weightPercent,
      modality: officialEval.modality,
      description: officialEval.observation || officialEval.description,
      rules: officialEval.rules || syllabus?.rules,
    } : undefined,
    formulaWeight: officialEval?.weightPercent,
    rules: syllabus?.rules,
    antiPlagiarismThreshold: syllabus?.antiPlagiarismPolicy?.maxSimilarityPercent,
  };
}

/**
 * Sincroniza una tarea con el contexto del sílabo oficial de su semana.
 */
export function syncTaskWithSyllabus(task: CourseAssignment): TaskWithSyllabusContext {
  const syllabusContext = getSyllabusWeekContext(task.courseName, task.week);
  return {
    task,
    syllabusContext,
  };
}

/**
 * Obtiene todas las tareas activas enriquecidas con su contexto de sílabo sincronizado.
 */
export function getSynchronizedStudentTasks(): TaskWithSyllabusContext[] {
  return ACTIVE_STUDENT_TASKS.map(task => syncTaskWithSyllabus(task));
}

/**
 * Filtra tareas sincronizadas por semana académica.
 */
export function getTasksByWeek(weekNumber: number): TaskWithSyllabusContext[] {
  return getSynchronizedStudentTasks().filter(item => item.task.week === weekNumber);
}

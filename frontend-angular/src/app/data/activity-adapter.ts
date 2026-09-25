import { 
  CourseAssignment, 
  TaskWithSyllabusContext, 
  UTPRawPendingActivity,
  AssignmentRubric 
} from '@domain/models/utp.model';
import { getSyllabusWeekContext } from './syllabus-engine';
import { getOfficialHomeworkResume } from './tasks/homework-resumes';

/**
 * Fixture de actividades pendientes oficiales extraídas en vivo desde Canvas / UTP+class (PAO).
 */
export const DEFAULT_UTP_PENDING_ACTIVITIES: UTPRawPendingActivity[] = [];

/**
 * Mapea títulos de tareas a rúbricas cuando la plataforma UTP realmente cuente con una.
 * Las tareas con evaluación flexible o indicaciones directas del docente (como APF1 en DWI)
 * reportan 'rubric: null' en el servidor y no deben inventar criterios sintéticos.
 */
function resolveRubricForActivity(
  _activityTitle: string, 
  _courseName: string, 
  _isQualificated: boolean
): AssignmentRubric | undefined {
  // Únicamente retornar rúbricas cuando la plataforma oficial UTP las provea.
  // En APF1 de DWI y demás actividades de la semana 5, el servidor UTP reporta 'rubric: null'.
  return undefined;
}

/**
 * Convierte las actividades nativas de la API UTP (activities/pending/resume)
 * en el modelo de dominio enriquecido con contexto oficial del sílabo.
 */
export function adaptUTPActivitiesToTasks(
  rawActivities: UTPRawPendingActivity[] = DEFAULT_UTP_PENDING_ACTIVITIES
): TaskWithSyllabusContext[] {
  return rawActivities.map((raw) => {
    // 1. Contexto oficial del sílabo para este curso y semana
    const syllabusContext = getSyllabusWeekContext(raw.courseName, raw.weekNumber);

    // 2. Normalizar tipo de actividad
    const isForum = raw.type === 'FORUM';
    const isGraded = raw.isQualificated === true;
    const taskType: CourseAssignment['type'] = isForum 
      ? 'practice' 
      : isGraded 
        ? 'evaluation' 
        : 'homework';

    // 3. Rúbrica oficial (si cuenta con ella)
    const rubric = resolveRubricForActivity(raw.activityTitle, raw.courseName, isGraded);

    // 4. Mapeo al dominio CourseAssignment enriquecido con consignas oficiales
    const resume = getOfficialHomeworkResume(raw.activityId);
    const instructionsHtml = raw.content || resume?.content;
    const deliverablesHtml = raw.deliverables || resume?.deliverables;
    const files = raw.files || resume?.files || [];

    // Verificación integral de entrega: status de la actividad o payload oficial de intentos
    const isSubmitted = 
      raw.activityStatusFinal === 'COMPLETED' || 
      resume?.homeworkStatus === 'DELIVERED' || 
      resume?.assignmentProgress === 'FINISHED' || 
      Boolean(resume?.homeworkLastAttempt?.deliveredDate);

    const task: CourseAssignment = {
      id: raw.activityId,
      activityId: raw.activityId,
      contentId: raw.contentId,
      courseId: raw.courseId,
      courseName: raw.courseName,
      sectionId: raw.sectionId,
      sectionCode: raw.sectionCode,
      title: raw.activityTitle,
      week: raw.weekNumber,
      type: taskType,
      dueDate: raw.finishAt ? raw.finishAt.replace(' ', 'T') : undefined,
      isGraded: isGraded,
      status: isSubmitted ? 'submitted' : 'pending',
      homeworkStatus: resume?.homeworkStatus || (isSubmitted ? 'DELIVERED' : 'NOT_DELIVERED'),
      deliveredDate: resume?.homeworkLastAttempt?.deliveredDate,
      attemptNumber: resume?.homeworkLastAttempt?.attemptNumber,
      score: resume?.homeworkLastAttempt?.score,
      rubric: rubric,
      instructionsHtml,
      deliverablesHtml,
      files,
      isGroup: resume?.isGroup,
      attempts: resume?.attempts,
      availableFrom: resume?.availableFrom,
      availableUntil: resume?.availableUntil || (raw.finishAt ? raw.finishAt.replace(' ', 'T') : undefined)
    };

    return {
      task,
      syllabusContext
    };
  });
}

export interface ActivityUrgency {
  status: 'urgent' | 'today' | 'upcoming' | 'overdue';
  label: string;
  hoursRemaining?: number;
  badgeVariant: 'iron' | 'orange' | 'neutral';
}

/**
 * Calcula el estado de urgencia y tiempo restante para entregar una tarea.
 */
export function calculateActivityUrgency(dueDateString?: string): ActivityUrgency | null {
  if (!dueDateString) return null;

  const due = new Date(dueDateString);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) {
    return {
      status: 'overdue',
      label: 'Plazo culminado',
      badgeVariant: 'neutral'
    };
  }

  if (diffHours <= 6) {
    return {
      status: 'urgent',
      label: `Te queda(n) ${Math.max(1, diffHours)}h para enviar`,
      hoursRemaining: diffHours,
      badgeVariant: 'iron'
    };
  }

  if (diffHours <= 24) {
    return {
      status: 'today',
      label: 'Vence hoy 23:59',
      hoursRemaining: diffHours,
      badgeVariant: 'orange'
    };
  }

  const days = Math.ceil(diffHours / 24);
  return {
    status: 'upcoming',
    label: `Vence en ${days} días`,
    hoursRemaining: diffHours,
    badgeVariant: 'neutral'
  };
}

/**
 * Obtiene todas las tareas activas enriquecidas con su contexto oficial del sílabo sincronizado.
 * Utiliza las actividades oficiales reportadas por la API UTP+class.
 */
export function getSynchronizedStudentTasks(): TaskWithSyllabusContext[] {
  return adaptUTPActivitiesToTasks(DEFAULT_UTP_PENDING_ACTIVITIES);
}

/**
 * Filtra tareas oficiales sincronizadas por semana académica.
 */
export function getTasksByWeek(weekNumber: number): TaskWithSyllabusContext[] {
  return getSynchronizedStudentTasks().filter(item => item.task.week === weekNumber);
}


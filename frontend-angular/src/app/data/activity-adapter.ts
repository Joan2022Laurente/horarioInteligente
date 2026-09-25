import { 
  CourseAssignment, 
  TaskWithSyllabusContext, 
  UTPRawPendingActivity,
  AssignmentRubric 
} from '@/types/utp';
import { getSyllabusWeekContext, VERIFIED_ASSIGNMENT_RUBRICS } from './syllabus-engine';
import { getOfficialHomeworkResume } from './tasks/homework-resumes';

/**
 * Fixture de actividades pendientes oficiales extraídas en vivo desde Canvas / UTP+class (PAO).
 */
export const DEFAULT_UTP_PENDING_ACTIVITIES: UTPRawPendingActivity[] = [
  {
    contentId: "0454defa-206e-475d-963f-5ad961599531",
    type: "HOMEWORK",
    activityId: "bac442d4-87a6-4702-8c33-70106e600d7a",
    activityTitle: "S05.s1 - 1er Entregable del Proyecto",
    evaluationTopScore: 20,
    publishAt: "2026-09-10 16:15:28.000",
    finishAt: "2026-09-11 23:59:00.000",
    isQualificated: true,
    courseId: "29b3fddb-e8dc-50cc-8e5c-9a3a2d3cd1bb",
    sectionId: "4853a86a-4e82-5d4f-b14b-10ec8addcc91",
    weekNumber: 5,
    themeId: "905c1079-03fa-44e9-986b-40766035be93",
    unityId: "4853a86a-4e82-5d4f-b14b-10ec8addcc91",
    activityStatusFinal: "IN_PROCESS",
    courseName: "DESARROLLO WEB INTEGRADO",
    sectionCode: "2263100000ST6134374"
  },
  {
    contentId: "b6d91b4b-0ef1-4061-af99-22bf7f5cd3b1",
    type: "HOMEWORK",
    activityId: "3423c65b-5d1c-4f81-b986-549427986f99",
    activityTitle: "S05.s1-Material - Ejercicios repaso",
    evaluationTopScore: 1,
    publishAt: "2026-09-07 06:00:00.000",
    finishAt: "2026-09-13 23:59:00.000",
    isQualificated: false,
    courseId: "f45653b4-1406-5e58-9f75-47e5d3a7b82a",
    sectionId: "0939d725-36eb-5751-a131-0216bc74cfc8",
    weekNumber: 5,
    themeId: "bc15c3f1-a256-44f1-a88f-2fdc6f7ca17e",
    unityId: "0939d725-36eb-5751-a131-0216bc74cfc8",
    activityStatusFinal: "IN_PROCESS",
    courseName: "LENGUAJES DE PROGRAMACIÓN",
    sectionCode: "2263100000SI6834384"
  },
  {
    contentId: "dd70960d-5cd5-5ac8-97de-c4b203a8ccb7",
    type: "HOMEWORK",
    activityId: "dd70960d-5cd5-5ac8-97de-c4b203a8ccb7",
    activityTitle: "(AC-S05-PA02) - Participación en clase 02",
    evaluationTopScore: 20,
    publishAt: "2026-09-07 00:00:00.000",
    finishAt: "2026-09-14 23:59:00.000",
    isQualificated: false,
    courseId: "24577268-593a-5db7-a592-d676a656f171",
    sectionId: "7eddf3c8-98eb-5d6e-a295-856ce4ee6c3c",
    weekNumber: 5,
    themeId: "bbaa30e9-33ff-57d7-945a-bc2daaed0bb3",
    unityId: "7eddf3c8-98eb-5d6e-a295-856ce4ee6c3c",
    activityStatusFinal: "IN_PROCESS",
    courseName: "HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA",
    sectionCode: "2263100000S72V54262"
  },
  {
    contentId: "d104f0f2-39ce-58aa-86a6-f7ee0f317104",
    type: "HOMEWORK",
    activityId: "d104f0f2-39ce-58aa-86a6-f7ee0f317104",
    activityTitle: "Tarea - Actividad del narrador oral: entrena tu voz y cuenta un cuento",
    evaluationTopScore: 20,
    publishAt: "2026-09-07 00:00:00.000",
    finishAt: "2026-09-14 23:59:00.000",
    isQualificated: false,
    courseId: "24577268-593a-5db7-a592-d676a656f171",
    sectionId: "7eddf3c8-98eb-5d6e-a295-856ce4ee6c3c",
    weekNumber: 5,
    themeId: "bbaa30e9-33ff-57d7-945a-bc2daaed0bb3",
    unityId: "7eddf3c8-98eb-5d6e-a295-856ce4ee6c3c",
    activityStatusFinal: "IN_PROCESS",
    courseName: "HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA",
    sectionCode: "2263100000S72V54262"
  },
  {
    contentId: "0ac351d5-2f83-5cef-94d4-be6500c43332",
    type: "HOMEWORK",
    activityId: "0ac351d5-2f83-5cef-94d4-be6500c43332",
    activityTitle: "Tarea: Entrega de avances de la semana",
    evaluationTopScore: 20,
    publishAt: "2026-09-08 21:42:54.000",
    finishAt: "2026-09-14 20:00:00.000",
    isQualificated: false,
    courseId: "49613f79-5bd6-5a23-a774-973aff3dbc48",
    sectionId: "2421dd0b-b5ee-5193-8190-902ec8403745",
    weekNumber: 5,
    themeId: "de865158-f6b6-5a35-a33c-8d2e799f5bc8",
    unityId: "2421dd0b-b5ee-5193-8190-902ec8403745",
    activityStatusFinal: "IN_PROCESS",
    courseName: "FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS",
    sectionCode: "2263100000SI8256357"
  },
  {
    contentId: "51493ade-6e82-4d0d-b607-f58a813aab45",
    type: "FORUM",
    activityId: "5aaa440d-e69c-4840-94ef-44ebfc841cc9",
    activityTitle: "Foro Semana 05",
    evaluationTopScore: 20,
    publishAt: "2026-09-07 00:01:00.000",
    finishAt: "2026-09-11 23:59:00.000",
    isQualificated: false,
    courseId: "f45653b4-1406-5e58-9f75-47e5d3a7b82a",
    sectionId: "0939d725-36eb-5751-a131-0216bc74cfc8",
    weekNumber: 5,
    themeId: "bc15c3f1-a256-44f1-a88f-2fdc6f7ca17e",
    unityId: "0939d725-36eb-5751-a131-0216bc74cfc8",
    activityStatusFinal: "IN_PROCESS",
    courseName: "LENGUAJES DE PROGRAMACIÓN",
    sectionCode: "2263100000SI6834384"
  },
  {
    contentId: "8c3c9477-81fd-5f23-9649-16f1a7ab1969",
    type: "FORUM",
    activityId: "8c3c9477-81fd-5f23-9649-16f1a7ab1969",
    activityTitle: "Situación inicial",
    evaluationTopScore: 20,
    publishAt: "2026-09-07 00:00:00.000",
    finishAt: "2026-09-13 23:59:00.000",
    isQualificated: false,
    courseId: "24577268-593a-5db7-a592-d676a656f171",
    sectionId: "7eddf3c8-98eb-5d6e-a295-856ce4ee6c3c",
    weekNumber: 5,
    themeId: "923335b9-9085-5396-a3e5-84ba2752e195",
    unityId: "7eddf3c8-98eb-5d6e-a295-856ce4ee6c3c",
    activityStatusFinal: "IN_PROCESS",
    courseName: "HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA",
    sectionCode: "2263100000S72V54262"
  },
  {
    contentId: "9455565a-5a06-5612-b5c2-e1772a3ae2e5",
    type: "FORUM",
    activityId: "9455565a-5a06-5612-b5c2-e1772a3ae2e5",
    activityTitle: "Foro de Consultas - Semana 5",
    evaluationTopScore: 20,
    publishAt: "2026-09-07 00:00:00.000",
    finishAt: "2026-09-13 23:59:59.000",
    isQualificated: false,
    courseId: "49613f79-5bd6-5a23-a774-973aff3dbc48",
    sectionId: "2421dd0b-b5ee-5193-8190-902ec8403745",
    weekNumber: 5,
    themeId: "ed8a546e-4a43-507a-9288-407b936e44c5",
    unityId: "2421dd0b-b5ee-5193-8190-902ec8403745",
    activityStatusFinal: "IN_PROCESS",
    courseName: "FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS",
    sectionCode: "2263100000SI8256357"
  },
  {
    contentId: "603a81c6-195a-576d-98cf-2898712a605c",
    type: "FORUM",
    activityId: "603a81c6-195a-576d-98cf-2898712a605c",
    activityTitle: "Foro de Consultas - Semana 5",
    evaluationTopScore: 20,
    publishAt: "2026-09-07 00:00:00.000",
    finishAt: "2026-09-13 23:59:59.000",
    isQualificated: false,
    courseId: "c6341c15-436c-59af-8803-ce512fb45697",
    sectionId: "9fc26189-8030-5263-a048-96a2290effa4",
    weekNumber: 5,
    themeId: "3976ed4c-4477-5783-8509-948b9b3a56a9",
    unityId: "9fc26189-8030-5263-a048-96a2290effa4",
    activityStatusFinal: "IN_PROCESS",
    courseName: "GESTIÓN DEL SERVICIO TI",
    sectionCode: "2263100000S74T20731"
  }
];

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


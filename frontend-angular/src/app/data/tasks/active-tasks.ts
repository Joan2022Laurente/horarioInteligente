import { CourseAssignment } from '@/types/utp';
import { VERIFIED_ASSIGNMENT_RUBRICS } from '@/lib/rubrics/verified-rubrics';

/**
 * Tareas reales activas detectadas en la plataforma del estudiante para el ciclo actual.
 */
export const ACTIVE_STUDENT_TASKS: CourseAssignment[] = [
  // 1. DESARROLLO WEB INTEGRADO - Semana 5
  {
    id: 'task-dwi-s05',
    courseId: '29b3fddb-e8dc-50cc-8e5c-9a3a2d3cd1bb',
    courseName: 'DESARROLLO WEB INTEGRADO',
    sectionCode: '34374',
    title: 'S05.s1 - 1er Entregable del Proyecto',
    week: 5,
    type: 'evaluation',
    isGraded: true,
    status: 'pending',
    rubric: VERIFIED_ASSIGNMENT_RUBRICS['rubric-dwi-apf1'],
    contentId: '0454defa-206e-475d-963f-5ad961599531',
    dueDate: '2026-09-27T23:59:00'
  },

  // 2. FORMACIÓN PARA LA INVESTIGACIÓN - Semana 4
  {
    id: 'task-inv-s04',
    courseId: '49613f79-5bd6-5a23-a774-973aff3dbc48',
    courseName: 'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS',
    sectionCode: '56357',
    title: 'ATI1: Ficha de Investigación e Introducción de la RSL',
    week: 4,
    type: 'evaluation',
    isGraded: true,
    status: 'pending',
    rubric: VERIFIED_ASSIGNMENT_RUBRICS['rubric-inv-ati1'],
    dueDate: '2026-09-20T23:59:00'
  },

  // 3. HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA - Semana 5 (Participación en Clase)
  {
    id: 'task-com-pa02',
    courseId: '24577268-593a-5db7-a592-d676a656f171',
    courseName: 'HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA',
    sectionCode: '54262',
    title: '(AC-S05-PA02) - Participación en clase 02',
    week: 5,
    type: 'homework',
    isGraded: true,
    status: 'pending',
    contentId: 'dd70960d-5cd5-5ac8-97de-c4b203a8ccb7',
    dueDate: '2026-09-28T23:59:00'
  },

  // 4. HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA - Semana 5 (Narrador Oral)
  {
    id: 'task-com-narrador',
    courseId: '24577268-593a-5db7-a592-d676a656f171',
    courseName: 'HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA',
    sectionCode: '54262',
    title: 'Tarea - Actividad del narrador oral: entrena tu voz y cuenta un cuento',
    week: 5,
    type: 'homework',
    isGraded: true,
    status: 'pending',
    rubric: VERIFIED_ASSIGNMENT_RUBRICS['rubric-com-s05'],
    contentId: 'd104f0f2-39ce-58aa-86a6-f7ee0f317104',
    dueDate: '2026-09-28T23:59:00'
  },

  // 5. LENGUAJES DE PROGRAMACIÓN - Semana 5
  {
    id: 'task-lp-s05',
    courseId: 'f45653b4-1406-5e58-9f75-47e5d3a7b82a',
    courseName: 'LENGUAJES DE PROGRAMACIÓN',
    sectionCode: '34384',
    title: 'S05.s1-Material - Ejercicios repaso',
    week: 5,
    type: 'practice',
    isGraded: true,
    status: 'pending',
    rubric: VERIFIED_ASSIGNMENT_RUBRICS['rubric-lp-pc1'],
    contentId: 'b6d91b4b-0ef1-4061-af99-22bf7f5cd3b1',
    dueDate: '2026-09-29T23:59:00'
  },

  // 6. SERVICIOS CLOUD - Semana 5
  {
    id: 'task-cloud-s05',
    courseId: 'efab3b1e-7f8b-5d82-af6b-49f09d748a0b',
    courseName: 'SERVICIOS CLOUD',
    sectionCode: '45104',
    title: 'PC1: Laboratorio de Redes Virtuales VPC y Cómputo EC2',
    week: 5,
    type: 'evaluation',
    isGraded: true,
    status: 'pending',
    dueDate: '2026-09-27T23:59:00'
  }
];

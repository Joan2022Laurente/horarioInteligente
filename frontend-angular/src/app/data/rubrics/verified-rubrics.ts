import { AssignmentRubric } from '@domain/models/utp.model';

/**
 * Registro de rúbricas verificadas.
 * Vacío por defecto: las rúbricas se resuelven dinámicamente desde el sílabo y la plataforma oficial.
 */
export const VERIFIED_ASSIGNMENT_RUBRICS: Record<string, AssignmentRubric> = {};

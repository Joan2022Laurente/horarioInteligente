export interface SyllabusEvaluationItem {
  id: string;
  type: string;
  description: string;
  week: number;
  weightPercent: number;
  modality: 'Individual' | 'Grupal';
  observation?: string;
  rules?: string[];
}

export interface SyllabusWeeklySession {
  week: number;
  session?: number;
  unit: string;
  topic?: string;
  activities?: string;
  evaluation?: string;
}

export interface Syllabus {
  id: string;
  courseCode: string;
  courseName: string;
  semester: string;
  credits: number;
  modality: string;
  weeklyHours: number;
  careers: string[];
  learningGoal: string;
  formula: string;
  evaluations: SyllabusEvaluationItem[];
  rules: string[];
  maxSimilarityPercent?: number;
  aiPolicy?: string;
  weeklySchedule: SyllabusWeeklySession[];
}

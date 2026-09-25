export interface SyllabusGeneralInfo {
  courseCode: string;
  courseName: string;
  semester: string;
  credits: number;
  modality: string;
  weeklyHours: number;
  careers: string[];
}

export interface SyllabusEvaluationItem {
  id: string;
  type: string; // ej. ATI1, PC1, APF1, PROY
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
  topics?: string[];
  activities?: string | string[];
  evaluation?: string;
  isDeliverableForClassScore?: boolean;
}

export interface ParsedSyllabus {
  id: string;
  generalInfo: SyllabusGeneralInfo;
  learningGoal: string;
  methodologySummary?: string;
  formula: string;
  evaluations: SyllabusEvaluationItem[];
  rules: string[];
  antiPlagiarismPolicy?: {
    maxSimilarityPercent: number;
    aiPolicy: string;
    repositoryDelivery: string;
  };
  weeklySchedule: SyllabusWeeklySession[];
}

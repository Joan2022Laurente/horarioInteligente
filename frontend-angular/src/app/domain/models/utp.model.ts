export interface UTPEventMetadata {
  sectionId?: string;
  sectionCode?: string;
  syllabusUrl?: string;
  zoomLink?: string;
  courseId?: string;
  classroom?: string;
  building?: string;
  floor?: string;
  environmentType?: string;
  teacher?: string;
  classLink?: string;
  courseName?: string;
  latestZoomRecordingId?: string | null;
  isLive?: boolean;
}

export interface UTPEvent {
  id: string;
  title: string;
  modality: 'P' | 'R' | 'VT' | string;
  type: string;
  startAt: string;
  finishAt: string;
  metadata?: UTPEventMetadata;
  isLongLasting?: boolean;
}

export interface UTPCurrentInterval {
  period_name: string;
  week_number: number;
  total_weeks: number;
  current_date: string;
  start_of_interval: string;
  end_of_interval: string;
  start_of_period: string;
  end_of_period: string;
  type_proximity_period?: string;
  events: UTPEvent[];
}

export interface UTPCalendarData {
  current_interval: UTPCurrentInterval;
  next_interval?: unknown;
  previous_interval?: unknown;
}

export interface UTPCalendarResponse {
  success: boolean;
  code: number;
  message: string;
  data: UTPCalendarData;
  idTransaction: string;
}

export interface UTPSyllabusData {
  courseId: string;
  period: string;
  syllabusUrl: string;
}

export interface UTPSyllabusResponse {
  success: boolean;
  code: number;
  message: string;
  data: UTPSyllabusData;
  idTransaction: string;
}

export interface StudentProfile {
  id?: string;
  name: string;
  fullName?: string;
  studentCode?: string;
  username: string; // ej. uXXXXXXX
  email: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  token?: string;
  avatarUrl?: string;
  dni?: string;
  career?: string;
  campus?: string;
  currentCycle?: number;
  peopleCode?: string;
  enrolledCourseCodes?: string[];
}

export interface CourseSessionSchedule {
  dayNumber: number; // 1 = Lunes, 2 = Martes, ...
  dayName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  modality: string;
  zoomLink?: string;
}

export interface ProcessedCourse {
  courseId: string;
  name: string;
  sectionCode: string;
  sectionId?: string;
  modalities: string[];
  zoomLink?: string;
  syllabusUrl?: string;
  totalSessions: number;
  upcomingSessions: UTPEvent[];
  pastSessions: UTPEvent[];
  weeklySchedules: CourseSessionSchedule[];
}

export interface CourseEvaluation {
  id: string;
  courseName: string;
  sectionCode?: string;
  code: string;           // ej. APF1, PC1, EP, EC1, PROY, EF, ATI1
  fullName: string;       // ej. Avance de Proyecto Final 1
  week: number;
  weightPercent: number;  // ej. 20 (para 20%)
  modality: 'Grupal' | 'Individual';
  description: string;
  rules?: string[];       // ej. ["No aplica rezagado", "Nota mínima 12"]
}

export interface AcademicMilestone {
  title: string;
  type: 'evaluation' | 'exam' | 'closure' | 'project';
  weekNumber: number;
  description: string;
  isCurrentOrUpcoming: boolean;
  courseEvaluations?: CourseEvaluation[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  suggestions?: string[];
  action?: { type: string; payload: Record<string, unknown> };
  contextInfo?: {
    courseName?: string;
    weekNumber?: number;
    zoomLink?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface RubricLevel {
  name: string;         // ej. 'Sobresaliente', 'Notable', 'En proceso', 'Insuficiente'
  description: string;
  points: number;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface AssignmentRubric {
  id: string;
  title: string;
  totalPoints: number;
  criteria: RubricCriterion[];
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  courseName: string;
  sectionCode?: string;
  title: string;
  week: number;
  type: 'homework' | 'evaluation' | 'practice';
  dueDate?: string;
  isGraded: boolean;
  rubric?: AssignmentRubric;
  status: 'pending' | 'submitted' | 'graded';
  submissionUrl?: string;
  contentId?: string;
  sectionId?: string;
  activityId?: string;
  instructionsHtml?: string;
  deliverablesHtml?: string;
  files?: Array<{ id?: string; name: string; url: string; size?: number }>;
  isGroup?: boolean;
  attempts?: number;
  availableFrom?: string;
  availableUntil?: string;
  homeworkStatus?: string;
  deliveredDate?: string;
  attemptNumber?: number;
  score?: number;
}

export interface SyllabusWeekSyncContext {
  week: number;
  unitNumber: number;
  unitTitle: string;
  learningOutcome: string;
  sessionTopics: string[];
  activities: string[];
  officialEvaluation?: CourseEvaluation;
  formulaWeight?: number;
  rules?: string[];
  antiPlagiarismThreshold?: number;
}

export interface TaskWithSyllabusContext {
  task: CourseAssignment;
  syllabusContext: SyllabusWeekSyncContext;
}

export interface ClassSession {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  classroom: string;
  building: string;
  floor?: string;
  environmentType?: string;
  teacher?: string;
  modality: 'P' | 'R' | 'V' | 'VT' | string;
  startAt: string;
  finishAt: string;
  zoomLink?: string;
  classLink?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  section: string;
  credits: number;
  teacher: string;
  modality: string;
  weeklyHours: number;
  sessions?: ClassSession[];
}

export interface ScheduleInterval {
  id: string;
  periodName: string;
  weekNumber: number;
  totalWeeks: number;
  startDate: string;
  endDate: string;
  courses: Course[];
  classes: ClassSession[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

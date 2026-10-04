export interface SyllabusCorrelation {
  courseCode: string;
  evaluationType?: string;
  weightPercent?: number;
  evaluationDescription?: string;
  syllabusWeek?: number;
  syllabusUnit?: string;
  syllabusTopic?: string;
  isSyllabusMatched?: boolean;
  syllabusUrl?: string;
  syllabusMarkdownUrl?: string;
}

export interface TaskRubricLevel {
  name: string;
  score: number;
  description: string;
}

export interface TaskRubricCriterion {
  name: string;
  score: number;
  levels: TaskRubricLevel[];
}

export interface TaskDetail {
  id: string;
  title: string;
  courseCode?: string;
  sectionId: string;
  descriptionMarkdown?: string;
  deliverablesMarkdown?: string;
  maxAttempts?: number;
  submissionTypes?: string[];
  evaluationTopScore?: number;
  dueAt?: string;
  evaluationSystem?: string;
  syllabusCorrelation?: SyllabusCorrelation;
  gradingRubric?: TaskRubricCriterion[];
}

export interface TaskSyncItem {
  id: string;
  courseName: string;
  courseId?: string;
  courseCode?: string;
  sectionId: string;
  contentId?: string;
  homeworkId: string;
  title: string;
  type: string;
  week: number;
  homeworkStatus: 'DELIVERED' | 'PENDING' | 'GRADED' | string;
  assignmentProgress: 'FINISHED' | 'IN_PROGRESS' | 'NOT_STARTED' | string;
  dueDate: string;
  deliveredDate?: string;
  maxScore: number;
  score?: number;
  isDelivered: boolean;
  evaluationSystem?: string | null;
  isQualified?: boolean;
  classificationCategory?: string;
  urgency?: string;
  daysRemaining?: number;
  syllabusCorrelation?: SyllabusCorrelation;
}


export interface TaskSyncItem {
  id: string;
  courseName: string;
  courseId?: string;
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
}

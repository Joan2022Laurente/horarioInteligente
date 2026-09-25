export interface TaskSyncItem {
  id: string;
  courseName: string;
  sectionId: string;
  homeworkId: string;
  title: string;
  type: string;
  week: number;
  homeworkStatus: 'DELIVERED' | 'PENDING' | 'GRADED';
  assignmentProgress: 'FINISHED' | 'IN_PROGRESS' | 'NOT_STARTED';
  dueDate: string;
  deliveredDate?: string;
  maxScore: number;
  score?: number;
  isDelivered: boolean;
}

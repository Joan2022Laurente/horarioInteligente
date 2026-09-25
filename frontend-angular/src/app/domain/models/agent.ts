export type NavigationTab = 'today' | 'weekly' | 'courses' | 'networking' | 'community' | 'marketplace' | 'ai';

export type AgentIntent =
  | { type: 'ANALYZE_COURSE'; courseName: string }
  | { type: 'EXPLAIN_SYLLABUS'; courseName: string }
  | { type: 'CHECK_EVALUATION'; courseName: string; evaluationCode?: string }
  | { type: 'FIND_MENTOR'; courseName?: string; serviceType?: string }
  | { type: 'FIND_NETWORKING_BEACON'; courseName?: string }
  | { type: 'SUMMARIZE_WEEK'; weekNumber?: number }
  | { type: 'PREPARE_CLASS'; courseName: string }
  | { type: 'FREE_QUERY'; query: string };

export type AgentAction =
  | { type: 'NAVIGATE_TAB'; payload: { tab: NavigationTab } }
  | { type: 'OPEN_SYLLABUS'; payload: { courseName: string } }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'FILTER_WEEK'; payload: { weekNumber: number } };

export interface AgentLiveContext {
  activeTab: NavigationTab;
  currentWeek: number;
  totalWeeks: number;
  periodName: string;
  coursesCount: number;
  currentClass?: {
    title: string;
    modality: string;
    zoomLink?: string;
    classroom?: string;
  } | null;
  nextClass?: {
    title: string;
    minutesToStart: number | null;
    modality: string;
  } | null;
  pendingTasksCount: number;
  selectedCourseName?: string | null;
}

export interface AgentResponseData {
  answer: string;
  suggestedActions: string[];
  action?: AgentAction;
  modelUsed?: string;
  keyIndexUsed?: number;
}

export interface DailyQuotaStatus {
  userIdentifier?: string;
  date?: string;
  used: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  allowed?: boolean;
  dateKey?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestions?: string[];
  suggestedActions?: string[];
  action?: { type: string; payload: Record<string, unknown> };
  contextInfo?: {
    courseName?: string;
    weekNumber?: number;
    zoomLink?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface AiChatRequest {
  message: string;
  userId?: string;
  studentProfile?: unknown;
  calendarData?: unknown;
  syllabiData?: unknown;
  liveContext?: unknown;
  schedule?: unknown;
  syllabi?: unknown;
}


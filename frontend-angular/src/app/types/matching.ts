import { StudentProfileRow } from './profile';

export type MatchIntent = 'PROJECT_TEAM' | 'STUDY_BUDDY' | 'COFFEE_CHAT';
export type BeaconStatus = 'ACTIVE' | 'FULL' | 'EXPIRED' | 'CANCELLED';
export type SquadRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface NetworkingProfileRow {
  student_id: string;
  skills: string[];
  interests: string[];
  match_intent: MatchIntent;
  ghost_mode: boolean;
  updated_at: string;
}

export interface StudyBeaconRow {
  id: string;
  host_id: string;
  host?: StudentProfileRow;
  course_id?: string | null;
  location_name: string;
  objective: string;
  max_collaborators: number;
  current_collaborators: number;
  status: BeaconStatus;
  expires_at: string;
  created_at: string;
}

export interface SquadRequestRow {
  id: string;
  sender_id: string;
  sender?: StudentProfileRow;
  receiver_id: string;
  receiver?: StudentProfileRow;
  course_id?: string | null;
  message?: string | null;
  status: SquadRequestStatus;
  created_at: string;
}

export interface StudyBuddyMatch {
  id: string;
  name: string;
  studentCode: string;
  avatarLetter: string;
  career: string;
  cycle: number;
  campus: string;
  courseName: string;
  sectionCode?: string;
  sharedWindow: {
    start: string;
    end: string;
    durationMinutes: number;
    isNow: boolean;
  };
  locationPreference: string;
  currentGoal: string;
  skills: string[];
  reputationScore: number;
  compatibilityPercent: number;
  status: 'ONLINE_NOW' | 'STUDYING' | 'WINDOW_OPEN';
  whatsappPhone?: string;
  discordTag?: string;
  modality: 'Presencial' | 'Virtual';
}

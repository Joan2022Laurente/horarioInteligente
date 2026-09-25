import { StudentProfileRow } from './profile';

export type MatchIntent = 'PROJECT_TEAM' | 'STUDY_BUDDY' | 'EXAM_PREP' | 'COFFEE_CHAT';
export type BeaconStatus = 'ACTIVE' | 'FULL' | 'EXPIRED' | 'CANCELLED';
export type SquadRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface FreeWindow {
  dayNumber: number; // 1 = Lunes, 2 = Martes, ...
  dayName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  campus?: string;
  building?: string;
  floor?: string;
}

export interface StudentNetworkingProfile {
  student_code: string;
  full_name: string;
  avatar_letter?: string;
  career: string;
  campus: string;
  cycle: number;
  program?: string;
  enrolled_courses: string[];
  free_windows: FreeWindow[];
  skills: string[];
  match_intent: MatchIntent;
  contact_channels?: {
    whatsapp?: string;
    discord?: string;
    email?: string;
  };
  ghost_mode: boolean;
  updated_at?: string;
}

export interface DualMatchScore {
  overall: number; // 0 - 100
  freeWindowScore: number;
  proximityScore: number;
  academicAlignmentScore: number;
  skillsComplementarityScore: number;
  reasons: string[];
}

export interface StudyBeaconRow {
  id: string;
  host_id: string;
  host_name?: string;
  host_avatar?: string;
  campus: string;
  location_name: string;
  course_name: string;
  section_code?: string;
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
  sender_name?: string;
  receiver_id: string;
  receiver_name?: string;
  course_name?: string;
  shared_window?: string;
  message?: string;
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
  program?: string;
  courseName: string;
  sectionCode?: string;
  sharedWindow: {
    dayName: string;
    start: string;
    end: string;
    durationMinutes: number;
    location: string;
    isNow: boolean;
  };
  locationPreference: string;
  currentGoal: string;
  skills: string[];
  matchScore: DualMatchScore;
  compatibilityPercent: number;
  status: 'ONLINE_NOW' | 'STUDYING' | 'WINDOW_OPEN';
  whatsappPhone?: string;
  discordTag?: string;
  email?: string;
  modality: 'Presencial' | 'Virtual';
}

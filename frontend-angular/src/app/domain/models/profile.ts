export interface StudentProfileRow {
  id: string;
  student_code: string;
  full_name: string;
  email: string;
  career: string;
  campus: string;
  cycle: number;
  avatar_url?: string | null;
  bio?: string | null;
  reputation_score: number;
  created_at: string;
  updated_at: string;
}

export interface StudentWalletRow {
  student_id: string;
  balance_cents: number;
  locked_balance_cents: number;
  phone_yape_plin?: string | null;
  updated_at: string;
}

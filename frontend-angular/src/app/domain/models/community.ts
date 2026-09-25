export type PostCategory = 
  | 'CAMPUS_LIFE' 
  | 'ACADEMIC_QUESTION' 
  | 'POLL'
  | 'PROJECT_RECRUITMENT' 
  | 'STUDY_TIPS' 
  | 'GENERAL';

export type PostSortBy = 'POPULAR' | 'RECENT' | 'UNRESOLVED';

export interface AuthorSummary {
  id: string;
  student_code: string;
  full_name: string;
  avatar_letter?: string;
  career?: string;
  campus?: string;
  cycle?: number;
  reputation_score?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes_count: number;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  user_voted_option_id?: string | null;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author: AuthorSummary;
  content: string;
  upvotes_count: number;
  has_user_upvoted: boolean;
  is_verified_solution: boolean;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  author: AuthorSummary;
  course_name?: string;
  section_code?: string;
  category: PostCategory;
  title: string;
  content: string;
  image_url?: string;
  media_urls?: string[];
  poll?: PollData | null;
  tags: string[];
  upvotes_count: number;
  has_user_upvoted: boolean;
  has_user_bookmarked: boolean;
  comments_count: number;
  comments: CommunityComment[];
  solution_comment_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CommunityFilter {
  category: PostCategory | 'ALL';
  courseName: string | 'ALL';
  searchQuery: string;
  sortBy: PostSortBy;
  onlyBookmarked?: boolean;
  onlySolved?: boolean;
}

export interface CreatePostDto {
  title: string;
  content: string;
  category: PostCategory;
  course_name?: string;
  image_url?: string;
  poll_question?: string;
  poll_options?: string[];
  tags: string[];
}

export type PostRow = CommunityPost;
export type PostCommentRow = CommunityComment;

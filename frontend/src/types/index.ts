export type UserRole = "candidate" | "recruiter";

export interface AuthUser {
  user_id: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  refresh_expires_at: string;
}

export interface RecruiterProfile {
  id: string;
  user_id: string;
  company_name: string;
  position?: string;
  company_description?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  city?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  bio?: string;
  city?: string;
  country?: string;
  linkedin_url?: string;
  github_url?: string;
  avatar_url?: string;
  is_open_to_work: boolean;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  skill_name: string;
  level?: string;
  years_experience?: number;
}

export interface JobPosting {
  id: string;
  recruiter_id: string;
  company_name?: string;
  title: string;
  description: string;
  requirements?: string;
  employment_type: string;
  location?: string;
  is_remote: boolean;
  salary_min?: number;
  salary_max?: number;
  currency: string;
  status: "draft" | "published" | "paused" | "closed";
  published_at?: string;
  expires_at?: string;
  views_count: number;
  skills?: Skill[];
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  candidate_id: string;
  file_uuid: string;
  original_filename: string;
  file_size_bytes?: number;
  mime_type: string;
  is_primary: boolean;
  parse_status: string;
  uploaded_at: string;
  parsed_data?: Record<string, unknown>;
  education?: Record<string, unknown>[];
  work_experience?: Record<string, unknown>[];
  skills?: Skill[];
}

export interface Application {
  id: string;
  candidate_id: string;
  job_posting_id: string;
  resume_id?: string;
  status: "pending" | "reviewing" | "shortlisted" | "interview_scheduled" | "rejected" | "hired";
  cover_letter?: string;
  applied_at: string;
  updated_at: string;
  job_title?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  candidate_email?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}
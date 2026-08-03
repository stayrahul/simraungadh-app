// @ts-nocheck
// ============================================================
// Simraungadh Civic Hub — TypeScript Type Definitions
// ============================================================

export type UserRole = 'citizen' | 'official';
export type IssueStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  department: string | null;
  civic_points: number;
  phone_number: string | null;
  home_ward: number | null;
  gender?: string | null;
  age?: number | null;
  push_token?: string | null;
  created_at: string;
}

export interface Issue {
  id: string;
  author_id: string;
  title: string;
  description: string;
  category: string;
  ward_number: number;
  image_url: string | null;
  image_urls?: string[] | null;
  is_anonymous?: boolean;
  status: IssueStatus;
  upvotes_count: number;
  created_at: string;
  
  // Joined
  author?: Profile;
  issue_comments?: { count: number }[];
}

export interface IssueComment {
  id: string;
  issue_id: string;
  author_id: string;
  content: string;
  parent_id?: string | null;
  is_official_response: boolean;
  created_at: string;
  author?: Profile; // Joined data
}

export interface Notice {
  id: string;
  author_id: string | null;
  category: string;
  title: string;
  content: string;
  pdf_url: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  is_emergency: boolean;
  created_at: string;
  author?: Profile;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'status_update' | 'new_comment' | 'new_like' | 'new_follow' | 'broadcast';
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

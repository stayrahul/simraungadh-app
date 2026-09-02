// @ts-nocheck
// ============================================================
// Simraungadh Civic Hub — TypeScript Type Definitions
// ============================================================

export type UserRole = 'citizen' | 'official' | 'moderator' | 'admin';
export type BadgeType = 'none' | 'verified' | 'gold' | 'contributor' | 'leader';
export type IssueStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  department: string | null;
  phone_number: string | null;
  home_ward: number | null;
  gender?: string | null;
  age?: number | null;
  tole?: string | null;
  push_token?: string | null;
  badge_type?: BadgeType | null;
  badges?: string[];
  is_verified?: boolean;
  is_banned?: boolean;
  civic_points?: number;
  created_at: string;
}

export interface Issue {
  id: string;
  author_id: string;
  title?: string;
  description: string;
  category: string;
  ward_number: number;
  image_url: string | null;
  image_urls?: string[] | null;
  is_anonymous?: boolean;
  post_type?: string | null;
  status: IssueStatus;
  upvotes_count: number;
  is_locked?: boolean;
  is_pinned?: boolean;
  is_deleted?: boolean;
  urgency?: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  replies?: IssueComment[]; // For threaded display
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
  is_deleted?: boolean;
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

// ============================================================
// New Feature Types
// ============================================================

export interface Poll {
  id: string;
  author_id: string;
  question: string;
  options: string[];
  votes: Record<string, string>; // userId -> optionIndex
  category: string;
  ward_number?: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  author?: Profile;
}

export interface CivicEvent {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  end_date: string | null;
  category: string;
  image_url: string | null;
  is_official: boolean;
  attendees_count: number;
  created_at: string;
  author?: Profile;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  admin?: Profile;
}

export interface Feedback {
  id: string;
  user_id: string;
  category: string;
  message: string;
  rating: number;
  screenshot_url: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  user?: Profile;
}

/**
 * Removes legacy "📍 Location: ... [Priority: ...]" prefix from issue descriptions
 */
export function cleanCivicDescription(desc?: string | null): string {
  if (!desc) return '';
  // 1. Remove [Priority: ...] tag
  let cleaned = desc.replace(/\[Priority:\s*[^\]]+\]/gi, '').trim();

  // 2. Match leading 📍 Location: <landmark>\n\n<body text>
  const match = cleaned.match(/^📍\s*Location:\s*([^\n]*)(?:\n+([\s\S]*))?$/i);
  if (match) {
    const landmark = match[1]?.trim();
    const body = match[2]?.trim();
    if (body) return body;
    if (landmark) return landmark;
  }

  // 3. Fallback: strip any remaining "📍 Location:" prefix
  return cleaned.replace(/^📍\s*Location:\s*/i, '').trim();
}

export type Role = "admin" | "officer" | "operator";
export type ComplaintStatus =
  | "submitted"
  | "acknowledged"
  | "assigned"
  | "in_progress"
  | "needs_review"
  | "resolved"
  | "closed"
  | "reopened";
export type SubmissionChannel = "voice" | "assisted" | "web";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
  department_id: string | null;
  department_name: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_kn: string;
  description: string | null;
  default_department_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  officer_count: number;
}

export interface Hospital {
  id: string;
  name: string;
  code: string;
  district: string | null;
  address: string | null;
  phone: string | null;
  followup_hours: number;
  escalation_hours: number;
  is_active: boolean;
}

export interface PublicMeta {
  hospital: Hospital;
  categories: Category[];
  departments: Department[];
}

export interface ComplaintListItem {
  reference_id: string;
  status: ComplaintStatus;
  submission_channel: SubmissionChannel;
  language_code: string;
  created_at: string;
  updated_at: string;
  category: Category;
  department: Department | null;
  assigned_officer_name: string | null;
  assigned_officer_id: string | null;
  is_overdue: boolean;
  age_hours: number;
  description_preview: string;
}

export interface HistoryEntry {
  id: string;
  old_status: ComplaintStatus | null;
  new_status: ComplaintStatus;
  event_type: string;
  action_note: string | null;
  is_public: boolean;
  updated_by_name: string | null;
  created_at: string;
}

export interface ComplaintDetail {
  id: string;
  reference_id: string;
  status: ComplaintStatus;
  submission_channel: SubmissionChannel;
  language_code: string;
  description_original: string;
  description_translated: string | null;
  translation_provider: string | null;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  hospital: Hospital;
  department: Department | null;
  category: Category;
  complainant_name: string | null;
  contact_number: string | null;
  consent_to_contact: boolean;
  assigned_officer: User | null;
  created_by_name: string | null;
  resolution_summary: string | null;
  category_confidence: number | null;
  is_overdue: boolean;
  age_hours: number;
  history: HistoryEntry[];
}

export interface ComplaintListResponse {
  items: ComplaintListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface RegistrationResponse {
  reference_id: string;
  status: ComplaintStatus;
  created_at: string;
  category_name: string;
  department_name: string | null;
  submission_channel: SubmissionChannel;
  acknowledgement: string;
}

export interface PublicTimelineEntry {
  new_status: ComplaintStatus;
  action_note: string | null;
  created_at: string;
}

export interface PublicTracking {
  reference_id: string;
  status: ComplaintStatus;
  category_name: string;
  category_name_kn: string;
  department_name: string | null;
  submission_channel: SubmissionChannel;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  hospital_name: string;
  timeline: PublicTimelineEntry[];
  language_code: string;
}

export interface DashboardSummary {
  total: number;
  new: number;
  in_progress: number;
  pending: number;
  overdue: number;
  resolved: number;
  closed: number;
  unassigned: number;
  escalated: number;
  resolved_rate: number;
  avg_resolution_hours: number | null;
  followup_hours: number;
  escalation_hours: number;
}

export interface NamedCount {
  name: string;
  name_kn?: string | null;
  value: number;
}

export interface TrendPoint {
  date: string;
  received: number;
  resolved: number;
}

export interface Trends {
  range_days: number;
  points: TrendPoint[];
  by_category: NamedCount[];
  by_department: NamedCount[];
  by_status: NamedCount[];
}

export interface ActivityItem {
  reference_id: string;
  category_name: string;
  status: ComplaintStatus;
  action: string;
  actor: string | null;
  created_at: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  trends: Trends;
  recent: ComplaintListItem[];
  pending: ComplaintListItem[];
  overdue: ComplaintListItem[];
  activity: ActivityItem[];
}

export interface FollowUpItem {
  reference_id: string;
  status: ComplaintStatus;
  category_name: string;
  category_name_kn: string;
  department_name: string | null;
  assigned_officer_name: string | null;
  created_at: string;
  updated_at: string;
  age_hours: number;
  hours_since_update: number;
  is_overdue: boolean;
  escalation_level: number;
  escalation_status: string;
  last_escalation_at: string | null;
}

export interface FollowUpResponse {
  followup_hours: number;
  escalation_hours: number;
  pending: FollowUpItem[];
  overdue: FollowUpItem[];
  counts: Record<string, number>;
}

export interface FilterOptions {
  categories: { id: string; name_en: string; name_kn: string }[];
  departments: { id: string; name: string; code: string }[];
  officers: { id: string; name: string; department_id: string | null; email: string }[];
}

export interface NotificationItem {
  id: string;
  complaint_id: string | null;
  channel: string;
  template: string;
  subject: string | null;
  body: string;
  status: string;
  provider_name: string | null;
  created_at: string;
  read_at: string | null;
}

export interface VoiceStatus {
  live: boolean;
  provider: string | null;
  speech_to_text_provider: string | null;
  text_to_speech_provider: string | null;
  phone_number: string | null;
  mode: string;
  message: string;
}

export interface VoiceSession {
  id: string;
  provider_call_id: string;
  provider: string;
  language_code: string;
  status: string;
  step: string;
  transcript: string | null;
  transcript_confidence: number | null;
  suggested_category: Category | null;
  suggested_department: Department | null;
  complaint_reference: string | null;
  failure_reason: string | null;
  demo_mode: boolean;
}

export interface StaffAccount {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  department_id: string | null;
  department_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

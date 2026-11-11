import axios, { AxiosError } from "axios";
import type {
  AuditEntry,
  Category,
  ComplaintDetail,
  ComplaintListResponse,
  ComplaintStatus,
  DashboardData,
  DashboardSummary,
  Department,
  FilterOptions,
  FollowUpResponse,
  Hospital,
  NotificationItem,
  PublicMeta,
  PublicTracking,
  RegistrationResponse,
  StaffAccount,
  SubmissionChannel,
  Trends,
  VoiceSession,
  VoiceStatus,
  User,
} from "../types";

const TOKEN_KEY = "janaseva.token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const tokenStore = {
  get: () => window.localStorage.getItem(TOKEN_KEY),
  set: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !String(error.config?.url).includes("/auth/login")) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent("janaseva:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "The server could not be reached. Check that the backend is running and try again.";
    }
    const data = error.response.data as { detail?: unknown; errors?: { message: string }[] } | undefined;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      const first = data.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
    if (data?.errors?.length) return data.errors[0].message;
    return `Request failed (HTTP ${error.response.status}).`;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string) =>
    (await api.post<LoginResponse>("/auth/login", { email, password })).data,
  me: async () => (await api.get<User>("/auth/me")).data,
  changePassword: async (current_password: string, new_password: string) =>
    api.post("/auth/change-password", { current_password, new_password }),
};

export interface ComplaintQuery {
  search?: string;
  status?: ComplaintStatus[];
  category_id?: string;
  department_id?: string;
  channel?: SubmissionChannel;
  assigned_to_me?: boolean;
  overdue_only?: boolean;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export const publicApi = {
  meta: async () => (await api.get<PublicMeta>("/public/meta")).data,
  track: async (reference: string) =>
    (await api.get<PublicTracking>(`/public/complaints/${encodeURIComponent(reference)}`)).data,
};

export interface ComplaintPayload {
  hospital_id: string;
  category_id: string;
  description: string;
  language_code: string;
  complainant_name?: string;
  contact_number?: string;
  consent_to_contact?: boolean;
  department_id?: string;
  emergency_acknowledged?: boolean;
}

export const complaintApi = {
  create: async (payload: ComplaintPayload) =>
    (await api.post<RegistrationResponse>("/complaints", payload)).data,
  list: async (params: ComplaintQuery) =>
    (
      await api.get<ComplaintListResponse>("/complaints", {
        params: {
          ...params,
          status: params.status?.length ? params.status : undefined,
        },
        paramsSerializer: { indexes: null },
      })
    ).data,
  get: async (reference: string) => (await api.get<ComplaintDetail>(`/complaints/${reference}`)).data,
  filterOptions: async () => (await api.get<FilterOptions>("/complaints/filter-options")).data,
  updateStatus: async (
    reference: string,
    payload: { status: ComplaintStatus; note?: string; resolution_summary?: string; is_public?: boolean },
  ) => (await api.patch<ComplaintDetail>(`/complaints/${reference}/status`, payload)).data,
  assign: async (reference: string, officer_id: string | null, note?: string) =>
    (await api.patch<ComplaintDetail>(`/complaints/${reference}/assign`, { officer_id, note })).data,
  addNote: async (reference: string, note: string, is_public: boolean) =>
    (await api.post<ComplaintDetail>(`/complaints/${reference}/notes`, { note, is_public })).data,
};

export const dashboardApi = {
  all: async (days = 30) => (await api.get<DashboardData>("/dashboard", { params: { days } })).data,
  summary: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
  trends: async (days = 30) => (await api.get<Trends>("/dashboard/trends", { params: { days } })).data,
};

export const followUpApi = {
  list: async () => (await api.get<FollowUpResponse>("/follow-ups")).data,
  remind: async (reference: string, reason: string) =>
    (await api.post(`/follow-ups/${reference}/remind`, { reason })).data,
  escalate: async (reference: string, reason: string) =>
    (await api.post(`/follow-ups/${reference}/escalate`, { reason })).data,
};

export const notificationApi = {
  list: async (unreadOnly = false) =>
    (await api.get<NotificationItem[]>("/notifications", { params: { unread_only: unreadOnly } })).data,
  markRead: async (id: string) => (await api.post<NotificationItem>(`/notifications/${id}/read`)).data,
  test: async (payload: { channel: string; recipient?: string; message?: string }) =>
    (await api.post("/notifications/test", payload)).data,
};

export const voiceApi = {
  status: async () => (await api.get<VoiceStatus>("/voice/status")).data,
  start: async (payload: { language_code: string; caller_number?: string; consent_to_contact?: boolean }) =>
    (await api.post<VoiceSession>("/voice/sessions", payload)).data,
  transcript: async (sessionId: string, transcript: string, confidence?: number) =>
    (await api.post<VoiceSession>(`/voice/sessions/${sessionId}/transcript`, { transcript, confidence })).data,
  submit: async (
    sessionId: string,
    payload: {
      hospital_id: string;
      description: string;
      category_id?: string;
      complainant_name?: string;
      consent_to_contact?: boolean;
    },
  ) => (await api.post<VoiceSession>(`/voice/sessions/${sessionId}/submit`, payload)).data,
};

export const adminApi = {
  systemStatus: async () =>
    (
      await api.get<{ status: string; database: string; voice_mode: string; sms_mode: string; environment: string }>(
        "/health",
      )
    ).data,
  users: async () => (await api.get<StaffAccount[]>("/admin/users")).data,
  createUser: async (payload: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    department_id?: string | null;
  }) => (await api.post<StaffAccount>("/admin/users", payload)).data,
  updateUser: async (
    id: string,
    payload: Partial<{ full_name: string; role: string; department_id: string | null; is_active: boolean; password: string }>,
  ) => (await api.patch<StaffAccount>(`/admin/users/${id}`, payload)).data,
  departments: async () => (await api.get<Department[]>("/admin/departments")).data,
  createDepartment: async (payload: { name: string; code: string; description?: string }) =>
    (await api.post<Department>("/admin/departments", payload)).data,
  categories: async () => (await api.get<Category[]>("/admin/categories")).data,
  updateCategory: async (
    id: string,
    payload: Partial<{ name_en: string; name_kn: string; default_department_id: string | null; is_active: boolean; keywords: string }>,
  ) => (await api.patch<Category>(`/admin/categories/${id}`, payload)).data,
  settings: async () =>
    (await api.get<{ hospital: Hospital; thresholds: { followup_hours: number; escalation_hours: number }; note: string }>(
      "/admin/settings",
    )).data,
  updateSettings: async (payload: { followup_hours: number; escalation_hours: number }) =>
    (await api.put("/admin/settings", payload)).data,
  auditLogs: async (limit = 60) => (await api.get<AuditEntry[]>("/admin/audit-logs", { params: { limit } })).data,
};

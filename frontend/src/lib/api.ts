const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function refreshToken(): Promise<string | null> {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const { access_token, refresh_token } = data.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    return access_token;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry && getToken()) {
    const newToken = await refreshToken();
    if (newToken) return request<T>(path, options, false);
    localStorage.clear();
    window.location.href = "/login";
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    // err.detail  — FastAPI HTTPException format
    // err.message — EDSServiceException format: [{lang, name}] or plain string
    const message: string =
      err.detail ??
      (Array.isArray(err.message)
        ? (err.message.find((m: { lang: string; name: string }) => m.lang === "en")?.name ?? err.message[0]?.name)
        : typeof err.message === "string"
        ? err.message
        : null) ??
      "Something went wrong";
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  registerCandidate: (data: Record<string, string>) =>
    request("/auth/register/candidate", { method: "POST", body: JSON.stringify(data) }),

  registerRecruiter: (data: Record<string, string>) =>
    request("/auth/register/recruiter", { method: "POST", body: JSON.stringify(data) }),

  verifyEmail: (email: string, code: string) =>
    request<{ access_token: string; refresh_token: string; token_type: string; user: { id: string; email: string; role: string } }>(
      "/auth/verify-email",
      { method: "POST", body: JSON.stringify({ email, code }) }
    ),

  resendCode: (email: string) =>
    request("/auth/resend-code", { method: "POST", body: JSON.stringify({ email }) }),

  login: (email: string, password: string) =>
    request<{ status: string; data: { access_token: string; refresh_token: string; refresh_expires_at: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  me: () => request<{ status: string; data: { user_id: string; email: string; role: string } }>("/auth/me"),

  logout: () => request("/auth/logout", { method: "POST" }),

  forgotPasswordRequest: (email: string) =>
    request("/auth/forgot-password/request-code", { method: "POST", body: JSON.stringify({ email }) }),

  forgotPasswordConfirm: (email: string, code: string, new_password: string) =>
    request("/auth/forgot-password/confirm", { method: "POST", body: JSON.stringify({ email, code, new_password }) }),

  changePassword: (current_password: string, new_password: string) =>
    request("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),

  changeEmailRequest: (new_email: string) =>
    request("/auth/change-email/request", { method: "POST", body: JSON.stringify({ new_email }) }),

  changeEmailConfirm: (new_email: string, code: string) =>
    request("/auth/change-email/confirm", { method: "POST", body: JSON.stringify({ new_email, code }) }),

  // Recruiter
  getRecruiterProfile: () => request<{ status: string; data: Record<string, unknown> }>("/recruiters/me"),
  updateRecruiterProfile: (data: Record<string, unknown>) =>
    request("/recruiters/me", { method: "PUT", body: JSON.stringify(data) }),

  // Candidate
  getCandidateProfile: () => request<{ status: string; data: Record<string, unknown> }>("/candidates/me"),
  updateCandidateProfile: (data: Record<string, unknown>) =>
    request("/candidates/me", { method: "PUT", body: JSON.stringify(data) }),
  getCandidateSkills: () => request<{ status: string; data: Record<string, unknown>[] }>("/candidates/me/skills"),
  addCandidateSkill: (data: Record<string, unknown>) =>
    request("/candidates/me/skills", { method: "POST", body: JSON.stringify(data) }),
  removeCandidateSkill: (id: string) =>
    request(`/candidates/me/skills/${id}`, { method: "DELETE" }),

  // Jobs
  listJobs: (limit = 50, offset = 0, search = "", employmentType = "", location = "") => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) params.set("search", search);
    if (employmentType) params.set("employment_type", employmentType);
    if (location) params.set("location", location);
    return request<{ status: string; data: Record<string, unknown>[] }>(`/jobs?${params}`);
  },
  getJob: (id: string) => request<{ status: string; data: Record<string, unknown> }>(`/jobs/${id}`),
  getMyJobs: () => request<{ status: string; data: Record<string, unknown>[] }>("/jobs/my"),
  createJob: (data: Record<string, unknown>) =>
    request("/jobs", { method: "POST", body: JSON.stringify(data) }),
  updateJob: (id: string, data: Record<string, unknown>) =>
    request(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  changeJobStatus: (id: string, status: string) =>
    request(`/jobs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteJob: (id: string) => request(`/jobs/${id}`, { method: "DELETE" }),
  addJobSkill: (jobId: string, data: Record<string, unknown>) =>
    request(`/jobs/${jobId}/skills`, { method: "POST", body: JSON.stringify(data) }),
  removeJobSkill: (jobId: string, skillId: string) =>
    request(`/jobs/${jobId}/skills/${skillId}`, { method: "DELETE" }),

  // Resumes
  uploadResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request("/resumes", { method: "POST", body: form });
  },
  listResumes: () => request<{ status: string; data: Record<string, unknown>[] }>("/resumes"),
  getResume: (id: string) => request<{ status: string; data: Record<string, unknown> }>(`/resumes/${id}`),
  setPrimaryResume: (id: string) => request(`/resumes/${id}/primary`, { method: "PATCH" }),
  deleteResume: (id: string) => request(`/resumes/${id}`, { method: "DELETE" }),

  // Applications
  apply: (data: Record<string, unknown>) =>
    request("/applications", { method: "POST", body: JSON.stringify(data) }),
  listApplications: (jobPostingId?: string) =>
    request<{ status: string; data: Record<string, unknown>[] }>(
      `/applications${jobPostingId ? `?job_posting_id=${jobPostingId}` : ""}`
    ),
  getApplication: (id: string) =>
    request<{ status: string; data: Record<string, unknown> }>(`/applications/${id}`),
  withdrawApplication: (id: string) =>
    request(`/applications/${id}`, { method: "DELETE" }),
  updateApplicationStatus: (id: string, status: string) =>
    request(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getApplicationCandidate: (applicationId: string) =>
    request<{ status: string; data: Record<string, unknown> }>(`/applications/${applicationId}/candidate`),
  analyzeResume: (applicationId: string) =>
    request<{ status: string; data: Record<string, unknown> }>(`/applications/${applicationId}/analyze`, { method: "POST" }),

  // Video
  uploadVideo: (applicationId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/video/${applicationId}`, { method: "POST", body: form });
  },
  getVideo: (applicationId: string) =>
    request<{ status: string; data: Record<string, unknown> }>(`/video/${applicationId}`),
  analyzeVideo: (applicationId: string) =>
    request<{ status: string; data: Record<string, unknown> }>(`/video/${applicationId}/analyze`, { method: "POST" }),

  // Notifications
  listNotifications: () =>
    request<{ status: string; data: Record<string, unknown>[] }>("/notifications"),
  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request("/notifications/read-all", { method: "PATCH" }),

};
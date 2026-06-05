// API client — Better Auth handles session via cookies automatically
// No more manual token storage in localStorage


async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
   try {
    const res = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    return res.json();
  } catch {
    return { success: false, error: "Network error - is the backend running?" };
  }
}

export const api = {
  getEmployees: (params?: Record<string, string>) =>
    request(`/api/employees?${new URLSearchParams(params)}`),
  createEmployee: (data: Record<string, unknown>) =>
    request("/api/employees", { method: "POST", body: JSON.stringify(data) }),
  deactivateEmployee: (id: number) =>
    request(`/api/employees/${id}`, { method: "DELETE" }),
  getDepartments: () => request("/api/departments"),
  createDepartment: (data: Record<string, unknown>) =>
    request("/api/departments", { method: "POST", body: JSON.stringify(data) }),
  getLeaves: (params?: Record<string, string>) =>
    request(`/api/leaves${params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`),
  applyLeave: (data: Record<string, unknown>) =>
    request("/api/leaves", { method: "POST", body: JSON.stringify(data) }),
  actingResponse: (id: number, actingOfficerStatus: string) =>
    request(`/api/leaves/${id}/acting`, { method: "PUT", body: JSON.stringify({ actingOfficerStatus }) }),
  hodReview: (id: number, hodStatus: string, reviewNote?: string) =>
    request(`/api/leaves/${id}/hod`, { method: "PUT", body: JSON.stringify({ hodStatus, reviewNote }) }),
  mdReview: (id: number, mdStatus: string, reviewNote?: string) =>
    request(`/api/leaves/${id}/md`, { method: "PUT", body: JSON.stringify({ mdStatus, reviewNote }) }),
  getEmployeesForDropdown: () =>
    request("/api/leaves/employees"),
  getAttendanceToday: () => request("/api/attendance/today"),
  checkIn: () =>
    request("/api/attendance/check-in", { method: "POST", body: JSON.stringify({}) }),
  checkOut: () =>
    request("/api/attendance/check-out", { method: "PUT", body: JSON.stringify({}) }),
  getAttendanceReport: (date?: string) =>
    request(`/api/attendance/report${date ? `?date=${date}` : ""}`),
  getDashboardStats: () => request("/api/dashboard/stats"),
  getUsers: () => request("/api/users"),
  updateUser: (id: string, data: Record<string, unknown>) =>
    request(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

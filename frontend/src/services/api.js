const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

async function classRequest(teacherId, classId, path, method, payload) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}${path}`, {
    method, headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body?.message ?? "Không thể cập nhật lớp. Vui lòng thử lại."); error.status = response.status; throw error; }
  return body;
}
export const previewClassSchedule = (teacherId, classId, schedule) => classRequest(teacherId, classId, "/schedule/preview", "POST", schedule);
export const rescheduleClassSession = (teacherId, classId, sessionId, slot) => classRequest(teacherId, classId, `/sessions/${sessionId}`, "PATCH", slot);
export const removeClassStudent = (teacherId, classId, studentId) => classRequest(teacherId, classId, `/students/${studentId}`, "DELETE");
export const applyClassSchedule = (teacherId, classId, schedule) => classRequest(teacherId, classId, "/schedule", "PUT", schedule);

async function materialRequest(teacherId, path, method = "GET", body) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}${path}`, { method, body });
  if (response.status === 204) return;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message ?? "Không thể xử lý bài giảng. Vui lòng thử lại.");
  return result;
}
export const searchMaterials = (teacherId, query = "", library = "all") => materialRequest(teacherId, `/materials?query=${encodeURIComponent(query)}&library=${encodeURIComponent(library)}`);
export const createMaterial = (teacherId, form) => materialRequest(teacherId, "/materials", "POST", form);
export const updateMaterial = (teacherId, id, form) => materialRequest(teacherId, `/materials/${id}`, "PUT", form);
export const deleteMaterial = (teacherId, id) => materialRequest(teacherId, `/materials/${id}`, "DELETE");
const sessionMaterialPath = (classId, sessionId) => `/classes/${classId}/sessions/${sessionId}/materials`;
export const getSessionMaterials = (teacherId, classId, sessionId) => materialRequest(teacherId, sessionMaterialPath(classId, sessionId));
export const attachSessionMaterial = (teacherId, classId, sessionId, id) => materialRequest(teacherId, `${sessionMaterialPath(classId, sessionId)}/${id}`, "POST");
export const createSessionMaterial = (teacherId, classId, sessionId, form) => materialRequest(teacherId, sessionMaterialPath(classId, sessionId), "POST", form);
export const detachSessionMaterial = (teacherId, classId, sessionId, id) => materialRequest(teacherId, `${sessionMaterialPath(classId, sessionId)}/${id}`, "DELETE");
export const materialFileUrl = (teacherId, id) => `${API_BASE_URL}/api/v1/teachers/${teacherId}/materials/${id}/file`;

async function apiFetch(url, options = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfResponse = await fetch(`${API_BASE_URL}/api/v1/auth/csrf`, { credentials: "include" });
    if (!csrfResponse.ok) throw new Error("Không thể khởi tạo phiên bảo mật.");
    const csrf = await csrfResponse.json();
    headers.set(csrf.headerName, csrf.token);
  }
  const response = await fetch(url, { ...options, credentials: "include", headers });
  if (response.status === 401 && !url.includes("/api/v1/auth/")) {
    window.dispatchEvent(new Event("chesshub-session-expired"));
  }
  return response;
}

export async function getHealth() {
  const response = await apiFetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error("API_UNAVAILABLE");
  return response.json();
}

async function postAuth(path, payload) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể xử lý yêu cầu. Vui lòng thử lại.");
  return body;
}

export function login(credentials) { return postAuth("login", credentials); }
export function registerAccount(account) { return postAuth("register", account); }
export function completeInitialPassword(payload) { return postAuth("initial-password", payload); }
export function updateAccountEmail(payload) { return postAuth("email", payload); }
export function updateAccountPassword(payload) { return postAuth("password", payload); }
export function updateAccountGoogleMeet(googleMeetUrl) { return postAuth("google-meet", { googleMeetUrl }); }

export async function getAuthProviders() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/providers`);
  if (!response.ok) throw new Error("Không thể tải phương thức đăng nhập.");
  return response.json();
}

export function startGoogleLogin() {
  window.location.assign(`${API_BASE_URL}/oauth2/authorization/google`);
}

export async function getSessionUser() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/me`);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Không thể kiểm tra phiên đăng nhập.");
  return response.json();
}

export async function logoutSession() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: "POST" });
  if (response.ok || response.status === 401) return;
  throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
}

async function centerRequest(userId, path = "", payload, method = payload === undefined ? "GET" : "POST") {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/users/${userId}/center${path}`, {
    method,
    headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể xử lý trung tâm. Vui lòng thử lại.");
  return body;
}

export function getCenterDashboard(userId) { return centerRequest(userId); }
export function getCenterMemberClasses(userId, memberId) { return centerRequest(userId, `/members/${memberId}/classes`); }
export function removeCenterMember(userId, memberId) { return centerRequest(userId, `/members/${memberId}`, undefined, "DELETE"); }
export function createCenter(userId, name) { return centerRequest(userId, "", { name }); }
export function inviteCenterMember(userId, email) { return centerRequest(userId, "/invitations", { email }); }
export function respondToCenterInvitation(userId, invitationId, accept) {
  return centerRequest(userId, `/invitations/${invitationId}/${accept ? "accept" : "decline"}`, {});
}

export async function getAccountDeletionEligibility(userId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/users/${userId}/deletion-eligibility`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể kiểm tra điều kiện xóa tài khoản.");
  return body;
}

export async function deleteUnusedAccount(userId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/users/${userId}`, { method: "DELETE" });
  if (response.status === 204 || response.ok) return;
  const body = await response.json().catch(() => ({}));
  throw new Error(body.message ?? "Không thể xóa tài khoản.");
}

export async function getTeacherClasses(teacherId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes`);
  if (!response.ok) throw new Error("Không thể tải danh sách lớp học.");
  return response.json();
}

export async function getStudentNameSuggestions(teacherId, query) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/students/name-suggestions?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Không thể tải gợi ý học sinh.");
  return response.json();
}

export async function createTeacherClass(teacherId, classroom) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(classroom),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tạo lớp học.");
  return body;
}

export async function updateTeacherClass(teacherId, classId, classroom) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(classroom) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể cập nhật lớp học.");
  return body;
}

export async function addClassStudent(teacherId, classId, student) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(student) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể thêm học sinh.");
  return body;
}

export async function updateFutureClassSchedule(teacherId, classId, schedule) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/schedule`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(schedule) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể cập nhật lịch học.");
  return body;
}

export async function getTeacherSessions(teacherId, from, to) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/sessions?from=${from}&to=${to}`);
  if (!response.ok) throw new Error("Không thể tải lịch dạy.");
  return response.json();
}

export async function getAttendanceSummary(teacherId, month) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/attendance-summary?month=${encodeURIComponent(month)}`);
  if (!response.ok) throw new Error("Không thể tải tổng hợp điểm danh.");
  return response.json();
}

export async function getTeacherClassDetail(teacherId, classId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}`);
  if (!response.ok) throw new Error("Không thể tải thông tin lớp học.");
  return response.json();
}

export async function getSessionAttendance(teacherId, classId, sessionId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/sessions/${sessionId}/attendance`);
  if (!response.ok) throw new Error("Không thể tải điểm danh của buổi học.");
  return response.json();
}

export async function saveSessionAttendance(teacherId, classId, sessionId, records) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/sessions/${sessionId}/attendance`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể lưu điểm danh.");
  return body;
}

export async function getTournamentCreation(teacherId, classId, sessionId) {
  const base = classId ? `/api/v1/teachers/${teacherId}/classes/${classId}${sessionId ? `/sessions/${sessionId}` : ""}/tournaments` : `/api/v1/teachers/${teacherId}/tournaments`;
  const response = await apiFetch(`${API_BASE_URL}${base}/creation`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tải dữ liệu tạo giải đấu.");
  return body;
}

export async function createTournament(teacherId, classId, sessionId, tournament) {
  const base = classId ? `/api/v1/teachers/${teacherId}/classes/${classId}${sessionId ? `/sessions/${sessionId}` : ""}/tournaments` : `/api/v1/teachers/${teacherId}/tournaments`;
  const response = await apiFetch(`${API_BASE_URL}${base}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tournament),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tạo giải đấu.");
  return body;
}

export async function getTeacherTournaments(teacherId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments`);
  if (!response.ok) throw new Error("Không thể tải danh sách giải đấu.");
  return response.json();
}

export async function getTournament(teacherId, tournamentId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tải giải đấu.");
  return body;
}

export async function saveTournamentResults(teacherId, tournamentId, roundNumber, results) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}/rounds/${roundNumber}/results`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ results }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể lưu kết quả.");
  return body;
}

export async function finalizeTournamentRound(teacherId, tournamentId, roundNumber) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}/rounds/${roundNumber}/finalize`, { method: "POST" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể chốt vòng đấu.");
  return body;
}

export async function createNextTournamentRound(teacherId, tournamentId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}/rounds/next`, { method: "POST" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể chia cặp vòng tiếp theo.");
  return body;
}

export async function deleteTournament(teacherId, tournamentId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}`, { method: "DELETE" });
  if (response.status === 204 || response.ok) return;
  const body = await response.json().catch(() => ({}));
  throw new Error(body.message ?? "Không thể xóa giải đấu.");
}

export async function completeTournament(teacherId, tournamentId) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}/complete`, { method: "POST" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể kết thúc giải đấu.");
  return body;
}

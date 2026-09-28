const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error("API_UNAVAILABLE");
  return response.json();
}

async function postAuth(path, payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/${path}`, {
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

export async function getTeacherClasses(teacherId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes`);
  if (!response.ok) throw new Error("Không thể tải danh sách lớp học.");
  return response.json();
}

export async function getStudentNameSuggestions(teacherId, query) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/students/name-suggestions?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Không thể tải gợi ý học sinh.");
  return response.json();
}

export async function createTeacherClass(teacherId, classroom) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(classroom),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tạo lớp học.");
  return body;
}

export async function updateTeacherClass(teacherId, classId, classroom) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(classroom) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể cập nhật lớp học.");
  return body;
}

export async function addClassStudent(teacherId, classId, student) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(student) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể thêm học sinh.");
  return body;
}

export async function updateFutureClassSchedule(teacherId, classId, schedule) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/schedule`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(schedule) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể cập nhật lịch học.");
  return body;
}

export async function getTeacherSessions(teacherId, from, to) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/sessions?from=${from}&to=${to}`);
  if (!response.ok) throw new Error("Không thể tải lịch dạy.");
  return response.json();
}

export async function getAttendanceSummary(teacherId, month) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/attendance-summary?month=${encodeURIComponent(month)}`);
  if (!response.ok) throw new Error("Không thể tải tổng hợp điểm danh.");
  return response.json();
}

export async function getTeacherClassDetail(teacherId, classId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}`);
  if (!response.ok) throw new Error("Không thể tải thông tin lớp học.");
  return response.json();
}

export async function getSessionAttendance(teacherId, classId, sessionId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/sessions/${sessionId}/attendance`);
  if (!response.ok) throw new Error("Không thể tải điểm danh của buổi học.");
  return response.json();
}

export async function saveSessionAttendance(teacherId, classId, sessionId, records) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/sessions/${sessionId}/attendance`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể lưu điểm danh.");
  return body;
}

export async function getTournamentCreation(teacherId, classId, sessionId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/sessions/${sessionId}/tournaments/creation`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tải dữ liệu tạo giải đấu.");
  return body;
}

export async function createTournament(teacherId, classId, sessionId, tournament) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/classes/${classId}/sessions/${sessionId}/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tournament),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tạo giải đấu.");
  return body;
}

export async function getTeacherTournaments(teacherId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments`);
  if (!response.ok) throw new Error("Không thể tải danh sách giải đấu.");
  return response.json();
}

export async function getTournament(teacherId, tournamentId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể tải giải đấu.");
  return body;
}

export async function saveTournamentResults(teacherId, tournamentId, roundNumber, results) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}/rounds/${roundNumber}/results`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ results }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể lưu kết quả.");
  return body;
}

export async function finalizeTournamentRound(teacherId, tournamentId, roundNumber) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}/rounds/${roundNumber}/finalize`, { method: "POST" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể chốt vòng đấu.");
  return body;
}

export async function createNextTournamentRound(teacherId, tournamentId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}/rounds/next`, { method: "POST" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Không thể chia cặp vòng tiếp theo.");
  return body;
}

export async function deleteTournament(teacherId, tournamentId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${teacherId}/tournaments/${tournamentId}`, { method: "DELETE" });
  if (response.status === 204 || response.ok) return;
  const body = await response.json().catch(() => ({}));
  throw new Error(body.message ?? "Không thể xóa giải đấu.");
}

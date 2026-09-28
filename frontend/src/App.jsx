import { useEffect, useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { Homepage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { CreateClassPage } from "./pages/CreateClassPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ClassDetailPage } from "./pages/ClassDetailPage";
import { CreateTournamentPage } from "./pages/CreateTournamentPage";
import { ClassManagementPage } from "./pages/ClassManagementPage";
import { TournamentDetailPage } from "./pages/TournamentDetailPage";
import { AttendanceSummaryPage } from "./pages/AttendanceSummaryPage";

const VALID_PATHS = new Set(["/", "/login", "/register", "/homepage", "/classes/new", "/calendar", "/attendance-summary"]);
const TOURNAMENT_CREATION_PATH = /^\/classes\/([0-9a-f-]{36})\/sessions\/([0-9a-f-]{36})\/tournaments\/new$/i;
const CLASS_MANAGEMENT_PATH = /^\/classes\/([0-9a-f-]{36})\/manage$/i;
const TOURNAMENT_DETAIL_PATH = /^\/tournaments\/([0-9a-f-]{36})$/i;

function getPathname() {
  const path = window.location.pathname;
  if (VALID_PATHS.has(path)) return path;
  if (TOURNAMENT_CREATION_PATH.test(path)) return path;
  if (CLASS_MANAGEMENT_PATH.test(path)) return path;
  if (TOURNAMENT_DETAIL_PATH.test(path)) return path;
  if (/^\/classes\/[0-9a-f-]{36}$/i.test(path)) return path;
  window.history.replaceState({}, "", "/");
  return "/";
}

export default function App() {
  const [path, setPath] = useState(getPathname);
  const [teacher, setTeacher] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("chesshub_teacher")); }
    catch { return null; }
  });

  useEffect(() => {
    const handlePopState = () => setPath(getPathname());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if ((path === "/homepage" || path === "/classes/new" || path === "/calendar" || path === "/attendance-summary" || path.startsWith("/classes/") || path.startsWith("/tournaments/")) && !teacher) {
      window.history.replaceState({}, "", "/login");
      setPath("/login");
    }
  }, [path, teacher]);

  function navigate(to) {
    const destination = new URL(to, window.location.origin);
    window.history.pushState({}, "", `${destination.pathname}${destination.search}`);
    setPath(destination.pathname);
  }

  function handleAuthenticated(account) {
    setTeacher(account);
    sessionStorage.setItem("chesshub_teacher", JSON.stringify(account));
    navigate("/homepage");
  }

  function logout() {
    sessionStorage.removeItem("chesshub_teacher");
    setTeacher(null);
    navigate("/");
  }

  if (path === "/") return <LandingPage onNavigate={navigate} />;
  if (path === "/register") return <RegisterPage onNavigate={navigate} onRegistered={handleAuthenticated} />;
  if (path === "/homepage" && teacher) return <Homepage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/classes/new" && teacher) return <CreateClassPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/calendar" && teacher) return <CalendarPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/attendance-summary" && teacher) return <AttendanceSummaryPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  const tournamentPath = path.match(TOURNAMENT_CREATION_PATH);
  if (tournamentPath && teacher) return <CreateTournamentPage classId={tournamentPath[1]} sessionId={tournamentPath[2]} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  const managementPath = path.match(CLASS_MANAGEMENT_PATH);
  if (managementPath && teacher) return <ClassManagementPage classId={managementPath[1]} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  const tournamentDetailPath = path.match(TOURNAMENT_DETAIL_PATH);
  if (tournamentDetailPath && teacher) return <TournamentDetailPage tournamentId={tournamentDetailPath[1]} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path.startsWith("/classes/") && path !== "/classes/new" && teacher) return <ClassDetailPage classId={path.split("/").at(-1)} sessionId={new URLSearchParams(window.location.search).get("sessionId")} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  return <LoginPage onNavigate={navigate} onAuthenticated={handleAuthenticated} />;
}

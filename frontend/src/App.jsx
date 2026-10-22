import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RegisterPage } from "./pages/RegisterPage";
import { Homepage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { CreateClassPage } from "./pages/CreateClassPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ClassDetailPage } from "./pages/ClassDetailPage";
import { CreateTournamentPage } from "./pages/CreateTournamentPage";
import { TournamentDetailPage } from "./pages/TournamentDetailPage";
import { AttendanceSummaryPage } from "./pages/AttendanceSummaryPage";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { CenterPage } from "./pages/CenterPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { legacyStudentDetailUrl } from "./services/studentNavigation";
import { InitialPasswordPage } from "./pages/InitialPasswordPage";
import { getSessionUser, logoutSession } from "./services/api";
import { createNavigation } from "./services/navigation";
import { canonicalClassUrl } from "./components/workspaceState";

const BoardEditorPage = lazy(() => import("./pages/BoardEditorPage").then((module) => ({ default: module.BoardEditorPage })));

const VALID_PATHS = new Set(["/", "/login", "/register", "/forgot-password", "/reset-password", "/homepage", "/classes/new", "/tournaments/new", "/calendar", "/attendance-summary", "/settings", "/center", "/materials", "/students"]);
const TOURNAMENT_CREATION_PATH = /^\/classes\/([0-9a-f-]{36})\/sessions\/([0-9a-f-]{36})\/tournaments\/new$/i;
const CLASS_TOURNAMENT_CREATION_PATH = /^\/classes\/([0-9a-f-]{36})\/tournaments\/new$/i;
const CLASS_MANAGEMENT_PATH = /^\/classes\/([0-9a-f-]{36})\/manage$/i;
const TOURNAMENT_DETAIL_PATH = /^\/tournaments\/([0-9a-f-]{36})$/i;
const STUDENT_DETAIL_PATH = /^\/students\/(new|[0-9a-f-]{36})$/i;

function getPathname() {
  let path = window.location.pathname;
  if (path === "/students") {
    const detailUrl = legacyStudentDetailUrl(window.location.search);
    if (detailUrl) { window.history.replaceState(window.history.state, "", detailUrl); path = window.location.pathname; }
  }
  if (CLASS_MANAGEMENT_PATH.test(path)) {
    window.history.replaceState(window.history.state, "", canonicalClassUrl(`${path}${window.location.search}`, window.location.origin));
    path = window.location.pathname;
  }
  if (path === "/board-lab" || VALID_PATHS.has(path)) return path;
  if (TOURNAMENT_CREATION_PATH.test(path)) return path;
  if (CLASS_TOURNAMENT_CREATION_PATH.test(path)) return path;
  if (TOURNAMENT_DETAIL_PATH.test(path)) return path;
  if (STUDENT_DETAIL_PATH.test(path)) return path;
  if (/^\/classes\/[0-9a-f-]{36}$/i.test(path)) return path;
  window.history.replaceState({}, "", "/");
  return "/";
}

export default function App() {
  const [path, setPath] = useState(getPathname);
  const [locationSearch, setLocationSearch] = useState(() => window.location.search);
  const navigation = useRef(null);
  if (!navigation.current) navigation.current = createNavigation(window, () => { setPath(getPathname()); setLocationSearch(window.location.search); });
  const registerNavigationGuard = useCallback((guard) => navigation.current.setGuard(guard), []);
  const syncNavigationLocation = useCallback(() => navigation.current.sync(), []);
  const [teacher, setTeacher] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const sessionVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    getSessionUser()
      .then((account) => { if (active && version === sessionVersion.current) setTeacher(account); })
      .catch(() => { if (active && version === sessionVersion.current) setTeacher(null); })
      .finally(() => { if (active) setSessionChecked(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expired = () => { sessionVersion.current += 1; setTeacher(null); navigation.current.navigate("/login", true); };
    window.addEventListener("chesshub-session-expired", expired);
    return () => window.removeEventListener("chesshub-session-expired", expired);
  }, []);

  useEffect(() => {
    const handlePopState = () => navigation.current.popstate();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (sessionChecked && path === "/" && teacher) {
      window.history.replaceState({}, "", "/homepage");
      setPath("/homepage");
      navigation.current.sync();
      return;
    }
    if (sessionChecked && (path === "/board-lab" || path === "/students" || path.startsWith("/students/") || path === "/materials" || path === "/homepage" || path === "/classes/new" || path === "/calendar" || path === "/attendance-summary" || path === "/settings" || path === "/center" || path.startsWith("/classes/") || path.startsWith("/tournaments/")) && !teacher) {
      window.history.replaceState({}, "", "/login");
      setPath("/login");
      navigation.current.sync();
    }
  }, [path, teacher, sessionChecked]);

  function navigate(to) {
    navigation.current.navigate(canonicalClassUrl(to, window.location.origin));
  }

  function handleAuthenticated(account) {
    sessionVersion.current += 1;
    setTeacher(account);
    setSessionChecked(true);
    navigate("/homepage");
  }

  function logout() { navigation.current.request(performLogout); }
  async function performLogout() {
    try { await logoutSession(); }
    catch (error) { window.alert(error.message); return; }
    sessionVersion.current += 1;
    setTeacher(null);
    navigation.current.navigate("/", true);
  }

  if (path === "/") return <LandingPage onNavigate={navigate} />;
  if (path === "/forgot-password") return <ForgotPasswordPage onNavigate={navigate} locationSearch={locationSearch} />;
  if (path === "/reset-password") return <ResetPasswordPage onNavigate={navigate} onReset={() => { sessionVersion.current += 1; setTeacher(null); setSessionChecked(true); }} />;
  const publicPath = path === "/login" || path === "/register";
  if (!sessionChecked && !publicPath) return <main className="session-loading">Đang kiểm tra phiên đăng nhập…</main>;
  if (teacher?.mustChangePassword) return <InitialPasswordPage account={teacher} onLogout={logout} onCompleted={(account) => { setTeacher(account); navigate("/center"); }} />;
  if (path === "/register") return <RegisterPage onNavigate={navigate} onRegistered={handleAuthenticated} />;
  if (path === "/homepage" && teacher) return <Homepage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/classes/new" && teacher) return <CreateClassPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/calendar" && teacher) return <CalendarPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/attendance-summary" && teacher) return <AttendanceSummaryPage locationSearch={locationSearch} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/settings" && teacher) return <AccountSettingsPage account={teacher} onAccountUpdated={setTeacher} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/center" && teacher) return <CenterPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/materials" && teacher) return <MaterialsPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/board-lab" && teacher) return <Suspense fallback={<p className="page-loading" role="status">Đang tải bàn cờ…</p>}><BoardEditorPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} /></Suspense>;
  if (path === "/students" && teacher) return <StudentsPage teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} locationSearch={locationSearch} syncNavigationLocation={syncNavigationLocation} />;
  const studentPath = path.match(STUDENT_DETAIL_PATH);
  if (studentPath && teacher) return <StudentDetailPage key={path} studentId={studentPath[1]} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} locationSearch={locationSearch} registerNavigationGuard={registerNavigationGuard} />;
  const tournamentPath = path.match(TOURNAMENT_CREATION_PATH);
  if (tournamentPath && teacher) return <CreateTournamentPage key={path} classId={tournamentPath[1]} sessionId={tournamentPath[2]} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  const classTournamentPath = path.match(CLASS_TOURNAMENT_CREATION_PATH);
  if (classTournamentPath && teacher) return <CreateTournamentPage key={path} classId={classTournamentPath[1]} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path === "/tournaments/new" && teacher) return <CreateTournamentPage key={path} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  const tournamentDetailPath = path.match(TOURNAMENT_DETAIL_PATH);
  if (tournamentDetailPath && teacher) return <TournamentDetailPage tournamentId={tournamentDetailPath[1]} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  if (path.startsWith("/classes/") && path !== "/classes/new" && teacher) return <ClassDetailPage key={path} classId={path.split("/").at(-1)} locationSearch={locationSearch} registerNavigationGuard={registerNavigationGuard} googleMeetUrl={teacher.googleMeetUrl} teacherId={teacher.id} teacherName={teacher.fullName} onLogout={logout} onNavigate={navigate} />;
  return <LoginPage onNavigate={navigate} onAuthenticated={handleAuthenticated} />;
}

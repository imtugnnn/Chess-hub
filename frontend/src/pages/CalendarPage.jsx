import { useEffect, useMemo, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { getTeacherSessions } from "../services/api";

const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

export function CalendarPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const from = formatDate(days[0]);
  const to = formatDate(days[6]);
  const sessionsByDate = useMemo(() => sessions.reduce((grouped, session) => ({ ...grouped, [session.date]: [...(grouped[session.date] ?? []), session] }), {}), [sessions]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTeacherSessions(teacherId, from, to).then((result) => {
      if (active) setSessions(result);
    }).catch(() => {
      if (active) setSessions([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [teacherId, from, to]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return <div className="app-shell">
    <AppSidebar activeSection="calendar" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard calendar-page">
      <AppPageHeader className="calendar-header" breadcrumb="Lịch dạy" title="Lịch học trong tuần" description="Theo dõi tất cả buổi dạy của bạn theo từng ngày." actions={<button className="secondary-button" onClick={() => onNavigate("/classes/new")}>＋ Tạo lớp mới</button>} />
      <section className="calendar-panel" aria-label="Lịch tuần">
        <div className="calendar-toolbar"><div><h2>{formatWeekRange(days[0], days[6])}</h2><p>{sessions.length} buổi học trong tuần này</p></div><div className="calendar-navigation"><button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))} aria-label="Tuần trước">←</button><button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))}>Hôm nay</button><button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))} aria-label="Tuần sau">→</button></div></div>
        <div className="week-grid">{days.map((date, index) => { const dateKey = formatDate(date); const dailySessions = sessionsByDate[dateKey] ?? []; return <article className={`calendar-day ${isToday(date) ? "calendar-day--today" : ""}`} key={dateKey}><header><small>{dayNames[index]}</small><strong>{date.getDate()}</strong></header><div className="calendar-day__sessions">{loading ? <span className="calendar-loading">Đang tải…</span> : dailySessions.length ? dailySessions.map((session) => { const attendanceStatus = getAttendanceStatus(session, now); return <a className="calendar-session" href={`/classes/${session.classId}?sessionId=${session.id}`} key={session.id} onClick={(event) => { event.preventDefault(); onNavigate(`/classes/${session.classId}?sessionId=${session.id}`); }} aria-label={`Mở buổi học ${session.className}, ${formatTime(session.startTime)} đến ${formatTime(session.endTime)}. ${attendanceStatus.label}`}><time>{formatTime(session.startTime)} – {formatTime(session.endTime)}</time><strong>{session.className}</strong><span className={`calendar-session__status calendar-session__status--${attendanceStatus.type}`}>{attendanceStatus.label}</span></a>; }) : <span className="calendar-empty">Chưa có lịch</span>}</div></article>; })}</div>
      </section>
    </main>
  </div>;
}

function startOfWeek(date) { const result = new Date(date); const day = result.getDay(); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day)); return result; }
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function formatDate(date) { const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return offsetDate.toISOString().slice(0, 10); }
function formatTime(time) { return time.slice(0, 5); }
function getAttendanceStatus(session, now) {
  if (session.studentCount > 0 && session.attendanceCount >= session.studentCount) return { type: "complete", label: "Đã điểm danh" };
  const sessionStart = new Date(`${session.date}T${session.startTime}`);
  return now < sessionStart ? { type: "upcoming", label: "Chưa đến giờ" } : { type: "pending", label: "Chưa điểm danh" };
}
function isToday(date) { return formatDate(date) === formatDate(new Date()); }
function formatWeekRange(start, end) { return `${start.toLocaleDateString("vi-VN", { day: "numeric", month: "long" })} – ${end.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}`; }

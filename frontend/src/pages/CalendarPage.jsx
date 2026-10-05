import { useEffect, useMemo, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { CalendarFilter } from "../components/CalendarFilter";
import { UiIcon } from "../components/UiIcon";
import { formatSessionDuration, getAttendanceStatus, sortDaySessions } from "../components/calendarLayout";
import { getTeacherSessions } from "../services/api";
import "./calendar.css";

const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
const shortDayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const attendanceOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chưa điểm danh" },
  { value: "upcoming", label: "Chưa đến giờ" },
  { value: "complete", label: "Đã điểm danh" },
];

export function CalendarPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [view, setView] = useState("week");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const from = formatDate(days[0]);
  const to = formatDate(days[6]);
  const today = formatDate(now);
  const classOptions = useMemo(() => [
    { value: "all", label: "Tất cả lớp học" },
    ...[...new Map(sessions.map((session) => [session.classId, { value: session.classId, label: session.className }])).values()].sort((first, second) => first.label.localeCompare(second.label, "vi-VN")),
  ], [sessions]);
  // Keep the selected class available even when it has no lessons next week.
  const [selectedClass, setSelectedClass] = useState(null);
  const availableClasses = selectedClass && !classOptions.some((option) => option.value === selectedClass.value) ? [...classOptions, selectedClass] : classOptions;
  const filteredSessions = useMemo(() => sessions.filter((session) => (classFilter === "all" || session.classId === classFilter) && (statusFilter === "all" || getAttendanceStatus(session, now).type === statusFilter)), [sessions, classFilter, statusFilter, now]);
  const sessionsByDate = useMemo(() => {
    const grouped = {};
    for (const session of sortDaySessions(filteredSessions)) {
      (grouped[session.date] ??= []).push(session);
    }
    return grouped;
  }, [filteredSessions]);
  const hasFilters = classFilter !== "all" || statusFilter !== "all";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getTeacherSessions(teacherId, from, to).then((result) => {
      if (active) setSessions(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message || "Không thể tải lịch dạy.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [teacherId, from, to, retry]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function changeWeek(offset) {
    setWeekStart((current) => addDays(current, offset));
    setSelectedDate((current) => formatDate(addDays(new Date(`${current}T12:00:00`), offset)));
  }
  function goToday() {
    const current = new Date();
    setWeekStart(startOfWeek(current));
    setSelectedDate(formatDate(current));
    setNow(current);
  }
  function clearFilters() { setClassFilter("all"); setStatusFilter("all"); setSelectedClass(null); }

  return <div className="app-shell">
    <AppSidebar activeSection="calendar" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard calendar-page">
      <AppPageHeader section="Lịch dạy" title="Lịch dạy" description="Theo dõi giờ học và điểm danh các buổi dạy của bạn." actions={<button className="secondary-button" onClick={() => onNavigate("/classes/new")}><UiIcon name="plus" size={18} />Tạo lớp mới</button>} />
      <section className={`calendar-panel schedule-panel schedule-panel--${view}`} aria-label="Lịch dạy">
        <div className="schedule-toolbar">
          <div className="schedule-toolbar__heading"><h2>{formatWeekRange(days[0], days[6])}</h2><p role="status" aria-live="polite">{loading ? "Đang tải lịch dạy…" : error ? "Lịch dạy chưa tải được" : hasFilters ? `${filteredSessions.length} / ${sessions.length} buổi học trong tuần` : `${sessions.length} buổi học trong tuần`}</p></div>
          <div className="schedule-toolbar__controls">
            <div className="schedule-navigation"><button type="button" onClick={() => changeWeek(-7)} aria-label="Tuần trước"><span className="schedule-previous"><UiIcon name="chevron" size={18} /></span></button><button type="button" onClick={goToday}>Hôm nay</button><button type="button" onClick={() => changeWeek(7)} aria-label="Tuần sau"><UiIcon name="chevron" size={18} /></button></div>
            <div className="schedule-view-switch" role="group" aria-label="Cách xem lịch"><button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Tuần</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>Danh sách</button></div>
          </div>
        </div>
        <div className="schedule-filters">
          <CalendarFilter label="Lớp học" value={classFilter} options={availableClasses} searchable={availableClasses.length > 8} disabled={loading || Boolean(error)} onChange={(value) => { setClassFilter(value); setSelectedClass(availableClasses.find((option) => option.value === value)); }} />
          <CalendarFilter label="Điểm danh" value={statusFilter} options={attendanceOptions} onChange={setStatusFilter} disabled={loading || Boolean(error)} />
          {hasFilters && <button className="schedule-clear" type="button" onClick={clearFilters}>Xóa bộ lọc</button>}
        </div>
        <div className="schedule-content" aria-busy={loading}>
          {error ? <div className="schedule-feedback ui-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>
            : loading ? <div className="schedule-feedback" role="status"><UiIcon name="calendar" size={28} /><p>Đang tải lịch dạy…</p></div>
              : <>
                <div className="schedule-day-picker" role="group" aria-label="Chọn ngày xem lịch">{days.map((date, index) => { const dateKey = formatDate(date); return <button type="button" key={dateKey} aria-pressed={dateKey === selectedDate} aria-current={dateKey === today ? "date" : undefined} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}, ${(sessionsByDate[dateKey] ?? []).length} buổi học`} onClick={() => setSelectedDate(dateKey)}><span>{shortDayNames[index]}</span><strong>{date.getDate()}</strong><i className={(sessionsByDate[dateKey] ?? []).length ? "schedule-day-picker__dot" : ""} aria-hidden="true" /></button>; })}</div>
                {view === "week" && filteredSessions.length > 0 && <WeekSchedule days={days} sessionsByDate={sessionsByDate} now={now} onNavigate={onNavigate} />}
                {!filteredSessions.length && <div className="schedule-empty-week"><UiIcon name="calendar" size={24} /><div><strong>{hasFilters ? "Không có buổi học phù hợp" : "Tuần này chưa có buổi học"}</strong><p>{hasFilters ? "Thử chọn lớp học hoặc trạng thái khác." : "Tạo lớp học để bắt đầu sắp xếp lịch dạy."}</p></div>{hasFilters ? <button type="button" className="secondary-button" onClick={clearFilters}>Xóa bộ lọc</button> : <button type="button" className="secondary-button" onClick={() => onNavigate(`/classes/new?date=${selectedDate}`)}>Tạo lớp mới</button>}</div>}
                {filteredSessions.length > 0 && <div className="schedule-agenda" aria-label="Danh sách buổi học">{days.map((date, index) => {
                  const dateKey = formatDate(date);
                  const dailySessions = sessionsByDate[dateKey] ?? [];
                  return <section key={dateKey} className={`schedule-agenda-day ${dateKey === selectedDate ? "schedule-agenda-day--selected" : ""} ${!dailySessions.length ? "schedule-agenda-day--empty" : ""}`} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}`}>
                    <header><div><h3>{dayNames[index]}, {date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}{dateKey === today && <span>Hôm nay</span>}</h3><p>{dailySessions.length} buổi học</p></div><button type="button" className="schedule-add" aria-label={`Tạo lớp học ngày ${date.toLocaleDateString("vi-VN")}`} onClick={() => onNavigate(`/classes/new?date=${dateKey}`)}><UiIcon name="plus" size={18} /><span>Tạo lớp</span></button></header>
                    {dailySessions.length ? dailySessions.map((session) => <SessionLink key={session.id} session={session} now={now} onNavigate={onNavigate} className="schedule-agenda-session" />) : <p className="schedule-empty-day">{hasFilters ? "Không có buổi học phù hợp trong ngày này." : "Chưa có buổi học trong ngày này."}</p>}
                  </section>;
                })}</div>}
              </>}
        </div>
      </section>
    </main>
  </div>;
}

function WeekSchedule({ days, sessionsByDate, now, onNavigate }) {
  const today = formatDate(now);
  return <div className="schedule-week-scroll" tabIndex={0} role="region" aria-label="Lịch tuần, buổi học xếp theo giờ bắt đầu trong từng ngày">
    <div className="schedule-week">
      <div className="schedule-week__header">{days.map((date, index) => <div key={formatDate(date)} className={formatDate(date) === today ? "schedule-week__day--today" : ""}><span>{dayNames[index]}</span><strong>{date.getDate()}</strong></div>)}</div>
      <div className="schedule-week__body">{days.map((date, index) => {
        const dateKey = formatDate(date);
        const dailySessions = sessionsByDate[dateKey] ?? [];
        return <section className={`schedule-week-day ${dateKey === today ? "schedule-week-day--today" : ""}`} key={dateKey} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}`}>
          {dailySessions.length ? dailySessions.map((session) => <SessionLink key={session.id} session={session} now={now} onNavigate={onNavigate} className="schedule-week-session" />) : <p className="schedule-week-day__empty">Chưa có buổi học</p>}
        </section>;
      })}</div>
      <div className="schedule-week__footer">{days.map((date) => <button type="button" className="schedule-add" key={formatDate(date)} aria-label={`Tạo lớp học ngày ${date.toLocaleDateString("vi-VN")}`} onClick={() => onNavigate(`/classes/new?date=${formatDate(date)}`)}><UiIcon name="plus" size={16} /><span>Tạo lớp</span></button>)}</div>
    </div>
  </div>;
}

function SessionLink({ session, now, onNavigate, className }) {
  const status = getAttendanceStatus(session, now);
  const time = `${session.startTime.slice(0, 5)} – ${session.endTime.slice(0, 5)}`;
  const duration = formatSessionDuration(session);
  const description = `${session.className}, ${time}. Thời lượng ${duration}. ${status.label}`;
  const href = `/classes/${session.classId}?sessionId=${session.id}`;
  return <a href={href} className={`${className} schedule-session--${status.type}`} aria-label={`Mở buổi học ${description}`} title={description} onClick={(event) => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(href); }}>
    <div className="schedule-session-timing"><time>{time}</time><span className="schedule-session-duration">{duration}</span></div>
    <strong>{session.className}</strong>
    <span className={`schedule-session-status schedule-session-status--${status.type}`}><i aria-hidden="true" /><span>{status.label}</span></span>
    {className === "schedule-agenda-session" && <span className="schedule-session-open"><UiIcon name="chevron" size={18} /></span>}
  </a>;
}

function startOfWeek(date) { const result = new Date(date); const day = result.getDay(); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day)); return result; }
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function formatDate(date) { const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return offsetDate.toISOString().slice(0, 10); }
function formatWeekRange(start, end) { return `${start.toLocaleDateString("vi-VN", { day: "numeric", month: "long" })} – ${end.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}`; }

import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "../components/layout/AppChrome";
import { CalendarFilter } from "../components/CalendarFilter";
import { CalendarSessionLink as SessionLink, CalendarSessionPreview } from "../components/CalendarSessionLink";
import { UiIcon } from "../components/UiIcon";
import { getAttendanceStatus, sortDaySessions } from "../components/calendarLayout";
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
  const [weekDirection, setWeekDirection] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [expandedDay, setExpandedDay] = useState(null);
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

  useEffect(() => { setExpandedDay(null); }, [from, view, classFilter, statusFilter]);
  useEffect(() => { if (expandedDay) document.getElementById("schedule-expanded-heading")?.focus(); }, [expandedDay]);

  function closeExpandedDay() {
    const dateKey = expandedDay;
    setExpandedDay(null);
    requestAnimationFrame(() => document.getElementById(`schedule-more-${dateKey}`)?.focus());
  }

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
    setWeekDirection(offset > 0 ? 'next' : 'previous');
    setWeekStart((current) => addDays(current, offset));
    setSelectedDate((current) => formatDate(addDays(new Date(`${current}T12:00:00`), offset)));
  }
  function goToday() {
    const current = new Date();
    const target = startOfWeek(current);
    setWeekDirection(target > weekStart ? 'next' : target < weekStart ? 'previous' : null);
    setWeekStart(startOfWeek(current));
    setSelectedDate(formatDate(current));
    setNow(current);
  }
  function clearFilters() { setClassFilter("all"); setStatusFilter("all"); setSelectedClass(null); }

  return <div className="app-shell">
    <AppChrome title="Lịch dạy" activeSection="calendar" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard calendar-page">
      <div className="calendar-intro">
        <p>Theo dõi giờ học và điểm danh các buổi dạy của bạn.</p>
        <button type="button" className="calendar-create" onClick={() => onNavigate("/classes/new")}><UiIcon name="plus" size={18} />Tạo lớp mới</button>
      </div>
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
          {hasFilters && <button className="secondary-button schedule-clear" type="button" onClick={clearFilters}>Đặt lại bộ lọc</button>}
        </div>
        <div className="schedule-content" aria-busy={loading}>
          {error ? <div className="schedule-feedback ui-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>
            : loading ? <div className="schedule-feedback" role="status"><UiIcon name="calendar" size={28} /><p>Đang tải lịch dạy…</p></div>
              : <CalendarSessionPreview key={`${from}:${view}:${classFilter}:${statusFilter}:${selectedDate}:${expandedDay}`} now={now}><div key={from} className={`schedule-week-transition ${weekDirection ? `schedule-week-transition--${weekDirection}` : ''}`}>
                <div className="schedule-day-picker" role="group" aria-label="Chọn ngày xem lịch">{days.map((date, index) => { const dateKey = formatDate(date); return <button type="button" key={dateKey} aria-pressed={dateKey === selectedDate} aria-current={dateKey === today ? "date" : undefined} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}, ${(sessionsByDate[dateKey] ?? []).length} buổi học`} onClick={() => setSelectedDate(dateKey)}><span>{shortDayNames[index]}</span><strong>{date.getDate()}</strong><i className={(sessionsByDate[dateKey] ?? []).length ? "schedule-day-picker__dot" : ""} aria-hidden="true" /></button>; })}</div>
                {view === "week" && <WeekSchedule days={days} sessionsByDate={sessionsByDate} now={now} onNavigate={onNavigate} hasFilters={hasFilters} expandedDay={expandedDay} onOpenDay={setExpandedDay} onCloseDay={closeExpandedDay} />}
                <div className={`schedule-agenda ${!filteredSessions.length ? "schedule-agenda--empty" : ""}`} aria-label="Danh sách buổi học">{days.map((date, index) => {
                  const dateKey = formatDate(date);
                  const dailySessions = sessionsByDate[dateKey] ?? [];
                  return <section key={dateKey} className={`schedule-agenda-day ${dateKey === selectedDate ? "schedule-agenda-day--selected" : ""} ${!dailySessions.length ? "schedule-agenda-day--empty" : ""}`} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}`}>
                    <header><div><h3>{dayNames[index]}, {date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}{dateKey === today && <span>Hôm nay</span>}</h3><p>{dailySessions.length} buổi học</p></div><CreateClassForDate date={date} onNavigate={onNavigate} /></header>
                    {dailySessions.length ? dailySessions.map((session) => <SessionLink key={session.id} session={session} now={now} onNavigate={onNavigate} className="schedule-agenda-session" />) : <p className="schedule-empty-day">{hasFilters ? "Không có buổi học phù hợp trong ngày này." : "Chưa có buổi học trong ngày này."}</p>}
                  </section>;
                })}</div>
              </div></CalendarSessionPreview>}
        </div>
      </section>
    </main>
  </div>;
}

function WeekSchedule({ days, sessionsByDate, now, onNavigate, hasFilters, expandedDay, onOpenDay, onCloseDay }) {
  const today = formatDate(now);
  if (expandedDay) {
    const date = new Date(`${expandedDay}T12:00:00`);
    const dailySessions = sessionsByDate[expandedDay] ?? [];
    return <section className="schedule-expanded-day" aria-label="Tất cả buổi học trong ngày">
      <header><div><h3 id="schedule-expanded-heading" tabIndex={-1}>{date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}</h3><p>{dailySessions.length} buổi học</p></div><button type="button" className="secondary-button" onClick={onCloseDay}><span className="schedule-previous"><UiIcon name="chevron" size={16} /></span>Về lịch tuần</button></header>
      <div className="schedule-expanded-day__sessions">{dailySessions.map((session) => <SessionLink key={session.id} session={session} now={now} onNavigate={onNavigate} className="schedule-agenda-session" />)}</div>
    </section>;
  }
  return <div className="schedule-week-scroll" tabIndex={0} role="region" aria-label="Lịch tuần, buổi học xếp theo giờ bắt đầu trong từng ngày">
    <div className="schedule-week">
      <div className="schedule-week__header">{days.map((date, index) => <div key={formatDate(date)} className={formatDate(date) === today ? "schedule-week__day--today" : ""}><div className="schedule-week__day-label"><span>{shortDayNames[index]} · {(sessionsByDate[formatDate(date)] ?? []).length} buổi</span><strong>{date.getDate()}</strong></div><CreateClassForDate date={date} onNavigate={onNavigate} /></div>)}</div>
      <div className="schedule-week__body">{days.map((date, index) => {
        const dateKey = formatDate(date);
        const dailySessions = sessionsByDate[dateKey] ?? [];
        return <section className={`schedule-week-day ${dateKey === today ? "schedule-week-day--today" : ""}`} key={dateKey} aria-label={`${dayNames[index]}, ${date.toLocaleDateString("vi-VN")}`}>
          {dailySessions.length ? <>{dailySessions.slice(0, 3).map((session) => <SessionLink key={session.id} session={session} now={now} onNavigate={onNavigate} className="schedule-week-session" />)}{dailySessions.length > 3 && <button type="button" id={`schedule-more-${dateKey}`} className="schedule-more" aria-label={`Xem tất cả ${dailySessions.length} buổi ngày ${date.toLocaleDateString("vi-VN")}`} onClick={() => onOpenDay(dateKey)}>+{dailySessions.length - 3} buổi khác</button>}</> : <p className="schedule-week-day__empty">{hasFilters ? "Không có buổi học phù hợp" : "Chưa có buổi học"}</p>}
        </section>;
      })}</div>
    </div>
  </div>;
}

function CreateClassForDate({ date, onNavigate }) {
  const label = `Tạo lớp ngày ${date.toLocaleDateString("vi-VN")}`;
  return <button type="button" className="schedule-create-class" aria-label={label} title={label} onClick={() => onNavigate(`/classes/new?date=${formatDate(date)}`)}><UiIcon name="plus" size={18} /></button>;
}

function startOfWeek(date) { const result = new Date(date); const day = result.getDay(); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day)); return result; }
function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function formatDate(date) { const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return offsetDate.toISOString().slice(0, 10); }
function formatWeekRange(start, end) { return `${start.toLocaleDateString("vi-VN", { day: "numeric", month: "long" })} – ${end.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}`; }

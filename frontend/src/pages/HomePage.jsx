import { useEffect, useState } from "react";
import { AppChrome } from "../components/layout/AppChrome";
import { consumeCreatedClass, useRowHighlight } from "../components/useRowHighlight";
import { UiIcon } from "../components/UiIcon";
import { getTeacherClasses, getTeacherSessions } from "../services/api";
import "./homepage.css";

const vietnamDate = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const startsAt = (session) => new Date(`${session.date}T${session.startTime}+07:00`);
const endsAt = (session) => new Date(`${session.date}T${session.endTime}+07:00`);
const needsAttendance = (session, now) => session.studentCount > 0 && session.attendanceCount < session.studentCount && startsAt(session) <= now;

export function Homepage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [classes, setClasses] = useState([]);
  const { highlightedIds, highlight } = useRowHighlight(teacherId);
  const [sessions, setSessions] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [classError, setClassError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [classRetry, setClassRetry] = useState(0);
  const [sessionRetry, setSessionRetry] = useState(0);
  const [classQuery, setClassQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [today, setToday] = useState(vietnamDate);
  useEffect(() => {
    const timer = window.setInterval(() => { setNow(new Date()); setToday(vietnamDate()); }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setClassesLoading(true); setClassError(""); setClasses([]);
    getTeacherClasses(teacherId)
      .then((nextClasses) => {
        if (!active) return;
        setClasses(nextClasses);
        const createdId = consumeCreatedClass(teacherId);
        if (createdId) highlight([createdId]);
      })
      .catch(() => { if (active) setClassError("Không thể tải danh sách lớp. Thử tải lại để mở lớp học."); })
      .finally(() => { if (active) setClassesLoading(false); });
    return () => { active = false; };
  }, [teacherId, classRetry, highlight]);
  useEffect(() => {
    let active = true;
    setSessionsLoading(true); setSessionError(""); setSessions([]);
    getTeacherSessions(teacherId, today, today)
      .then((nextSessions) => { if (active) setSessions([...nextSessions].sort((a, b) => a.startTime.localeCompare(b.startTime))); })
      .catch(() => { if (active) setSessionError("Không thể tải lịch dạy hôm nay. Thử tải lại hoặc mở lịch tuần."); })
      .finally(() => { if (active) setSessionsLoading(false); });
    return () => { active = false; };
  }, [teacherId, today, sessionRetry]);

  const pending = sessions.filter((session) => needsAttendance(session, now));
  const openSession = (session) => onNavigate(`/classes/${session.classId}?sessionId=${session.id}`);
  const firstName = teacherName.trim().split(/\s+/).at(-1);
  const visibleClasses = classes.filter((classroom) => classroom.name.toLocaleLowerCase("vi-VN").includes(classQuery.trim().toLocaleLowerCase("vi-VN")));
  const nextSession = sessions.find((session) => endsAt(session) > now);
  const ongoing = nextSession && startsAt(nextSession) <= now;
  const metrics = [
    { tone: "rose", icon: "classes", label: "Lớp học", value: classes.length, busy: classesLoading, error: classError },
    { tone: "mint", icon: "calendar", label: "Buổi hôm nay", value: sessions.length, busy: sessionsLoading, error: sessionError },
    { tone: "peach", icon: "check", label: "Cần điểm danh", value: pending.length, busy: sessionsLoading, error: sessionError, hint: "Buổi đã bắt đầu, có học sinh và chưa ghi nhận đủ điểm danh" },
  ];
  return <div className="app-shell home-reference">
    <AppChrome title="Tổng quan" activeSection="home" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard overview-page" id="tong-quan">      <div className="home-content">
      <div className="home-welcome"><div><h2>Chào {firstName}!</h2><p>Cùng chuẩn bị cho một ngày dạy cờ hiệu quả.</p></div><span className="home-date"><UiIcon name="calendar" size={18} />{new Date(`${today}T12:00:00+07:00`).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</span></div>
      <div className="home-upper-grid">
      <section className="home-summary" aria-labelledby="home-summary-title"><header><div><h2 id="home-summary-title">Tổng quan hôm nay</h2><p>Không gian giảng dạy của bạn</p></div><button className="home-create" onClick={() => onNavigate("/classes/new")}><UiIcon name="plus" size={17} />Tạo lớp mới</button></header>
      <section className="overview-metrics" aria-label="Tổng quan hôm nay">
        {metrics.map(({ tone, icon, label, value, busy, error, hint }) => <div className="overview-metric" data-tone={tone} key={icon} aria-busy={busy} title={hint}>
          <span className="overview-metric-icon"><UiIcon name={icon} /></span><div><strong aria-label={error ? `${label}: chưa tải được` : busy ? `${label}: đang tải` : hint ? `${value} buổi cần hoàn tất điểm danh đã đến giờ học` : undefined}>{busy || error ? "—" : value}</strong><p>{label}</p></div>
        </div>)}
      </section>
      </section>
      <section className="home-next" aria-labelledby="home-next-title" aria-busy={sessionsLoading}>
        <header><h2 id="home-next-title">{ongoing ? "Buổi học đang diễn ra" : "Buổi học tiếp theo"}</h2><span className="home-next-icon"><UiIcon name="calendar" size={20} /></span></header>
        {sessionsLoading ? <p role="status">Đang tải buổi học…</p> : sessionError ? <><p>Chưa tải được buổi học.</p><button className="home-next-button" onClick={() => setSessionRetry(v => v + 1)}>Thử tải lại</button></> : nextSession ? <>
          <h3>{nextSession.className}</h3><p className="home-next-time">{nextSession.startTime.slice(0, 5)} – {nextSession.endTime.slice(0, 5)}<span>{nextSession.studentCount} học sinh</span></p>
          <button className="home-next-button" onClick={() => openSession(nextSession)}>{ongoing ? "Mở buổi đang diễn ra" : "Mở buổi tiếp theo"}<UiIcon name="arrow" size={18} /></button>
        </> : <><h3>{sessions.length ? "Đã hết lịch dạy hôm nay" : "Hôm nay chưa có buổi học"}</h3><p>Xem lịch tuần để chuẩn bị cho buổi tới.</p><button className="home-next-button" onClick={() => onNavigate("/calendar")}>Xem lịch tuần<UiIcon name="arrow" size={18} /></button></>}
      </section>
      </div>
      <div className="overview-columns">
        <section className="overview-panel overview-panel--schedule" aria-labelledby="today-schedule-title" aria-busy={sessionsLoading}>
          <header><div><h2 id="today-schedule-title">Lịch dạy hôm nay</h2><p>{new Date(`${today}T12:00:00+07:00`).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "numeric", month: "long" })}</p></div><button className="overview-link" onClick={() => onNavigate("/calendar")}>Xem cả tuần <UiIcon name="chevron" size={16} /></button></header>
          {sessionsLoading ? <LoadingRows /> : sessionError ? <PanelError message={sessionError} onRetry={() => setSessionRetry((value) => value + 1)} /> : sessions.length ? <div className="overview-list">{sessions.map((session) => {
            const started = startsAt(session) <= now;
            const ended = endsAt(session) <= now;
            const done = session.studentCount > 0 && session.attendanceCount >= session.studentCount;
            const attendance = session.studentCount === 0 ? "Chưa có học sinh" : done ? "Đã điểm danh" : needsAttendance(session, now) ? "Cần điểm danh" : "Chưa điểm danh";
            const phase = ended ? "Đã kết thúc" : started ? "Đang diễn ra" : nextSession?.id === session.id ? "Buổi tiếp theo" : "Sắp diễn ra";
            return <button className={`overview-row ${nextSession?.id === session.id ? "overview-row--next" : ""}`} key={session.id} onClick={() => openSession(session)}>
              <span className="overview-time">{session.startTime.slice(0, 5)}<small>{session.endTime.slice(0, 5)}</small></span>
              <span className="overview-row-text"><strong>{session.className}</strong><small>{phase} · {session.studentCount} học sinh</small>{session.studentCount > 0 && <small>{session.attendanceCount}/{session.studentCount} đã ghi nhận điểm danh</small>}</span>
              <span className={`overview-status ${done ? "overview-status--done" : needsAttendance(session, now) ? "overview-status--pending" : ""}`}>{attendance}</span><UiIcon name="chevron" size={16} />
            </button>;
          })}</div> : <div className="workspace-empty"><UiIcon name="calendar" size={32} /><h3>Hôm nay chưa có lịch dạy</h3><p>Xem lịch tuần hoặc tạo lớp để lên lịch buổi học đầu tiên.</p><button className="secondary-button" onClick={() => onNavigate("/calendar")}>Xem lịch tuần</button></div>}
        </section>
        <section id="your-classes-list" className="overview-panel overview-panel--classes" aria-labelledby="your-classes-title" aria-busy={classesLoading}>
          <header><div><h2 id="your-classes-title">Lớp học của bạn</h2><p>{classesLoading ? "Đang tải…" : classError ? "Danh sách lớp chưa tải được" : `${classes.length} lớp · Mở lớp để bắt đầu`}</p></div></header>
          {classes.length > 0 && <div className="home-class-search"><label htmlFor="class-search">Tìm lớp học</label><div><UiIcon name="search" size={18} /><input id="class-search" type="search" value={classQuery} onChange={event => setClassQuery(event.target.value)} />{classQuery && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { setClassQuery(""); document.getElementById("class-search")?.focus(); }}><UiIcon name="close" size={18} /></button>}</div></div>}
          {classesLoading ? <LoadingRows /> : classError ? <PanelError message={classError} onRetry={() => setClassRetry((value) => value + 1)} /> : visibleClasses.length ? <div className="overview-list">{visibleClasses.map((classroom) => <button className={`overview-row ${highlightedIds.has(classroom.id) ? "row-added" : ""}`} key={classroom.id} onClick={() => onNavigate(`/classes/${classroom.id}`)}><span className="overview-class-icon"><UiIcon name="classes" /></span><span className="overview-row-text"><strong>{classroom.name}</strong><small>{classroom.studentCount} học sinh</small></span><UiIcon name="chevron" size={16} /></button>)}</div> : classes.length ? <div className="workspace-empty"><h3>Không tìm thấy lớp phù hợp</h3><p>Thử tên khác hoặc xóa tìm kiếm để xem tất cả lớp.</p><button className="secondary-button" onClick={() => { setClassQuery(""); document.getElementById("class-search")?.focus(); }}>Xóa tìm kiếm</button></div> : <div className="workspace-empty"><UiIcon name="classes" size={32} /><h3>Chưa có lớp học</h3><p>Tạo lớp, thêm học sinh và thiết lập lịch dạy của bạn.</p><button className="secondary-button" onClick={() => onNavigate("/classes/new")}>Tạo lớp đầu tiên</button></div>}
        </section>
      </div>
      </div>
    </main>
  </div>;
}

function PanelError({ message, onRetry }) {
  return <div className="overview-panel-error"><p role="alert">{message}</p><button className="secondary-button" type="button" onClick={onRetry}>Thử tải lại</button></div>;
}
function LoadingRows() { return <div className="overview-skeleton" role="status" aria-label="Đang tải dữ liệu">{[1, 2, 3].map((item) => <div key={item}><span /><span /></div>)}</div>; }

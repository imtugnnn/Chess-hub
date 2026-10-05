import { useEffect, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { UiIcon } from "../components/UiIcon";
import { getTeacherClasses, getTeacherSessions } from "../services/api";

export function Homepage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [classQuery, setClassQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [today, setToday] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }));
  useEffect(() => {
    const timer = window.setInterval(() => { setNow(new Date()); setToday(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })); }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([getTeacherClasses(teacherId), getTeacherSessions(teacherId, today, today)])
      .then(([nextClasses, nextSessions]) => { if (active) { setClasses(nextClasses); setSessions([...nextSessions].sort((a, b) => a.startTime.localeCompare(b.startTime))); } })
      .catch(() => { if (active) setError("Không thể tải tổng quan. Vui lòng thử lại."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, today, retry]);

  const pending = sessions.filter((session) => session.studentCount > 0 && session.attendanceCount < session.studentCount);
  const openSession = (session) => onNavigate(`/classes/${session.classId}?sessionId=${session.id}`);
  const firstName = teacherName.split(" ").at(-1);
  const visibleClasses = classes.filter((classroom) => classroom.name.toLocaleLowerCase("vi-VN").includes(classQuery.trim().toLocaleLowerCase("vi-VN")));
  const nextSession = sessions.find((session) => new Date(`${session.date}T${session.endTime}+07:00`) > now);
  return <div className="app-shell"><AppSidebar activeSection="home" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard overview-page" id="tong-quan">
      <AppPageHeader section="Không gian giảng dạy" title={`Chào ${firstName}, hôm nay dạy lớp nào?`} description="Theo dõi lịch dạy, mở lớp và hoàn tất điểm danh trong một nơi." actions={<button className="primary-button" onClick={() => onNavigate("/classes/new")}><UiIcon name="plus" size={18} /> Tạo lớp mới</button>} />
      {error ? <div className="ui-error" role="alert">{error}<button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div> : <>
        <section className="overview-metrics" aria-label="Tổng quan hôm nay" aria-busy={loading}>
          {[['classes', 'Lớp học', classes.length], ['calendar', 'Buổi học hôm nay', sessions.length], ['check', 'Buổi chưa đủ điểm danh hôm nay', pending.length]].map(([icon, label, value]) => <div className="overview-metric" key={icon}><span className="overview-metric-icon"><UiIcon name={icon} /></span><div><p>{label}</p><strong>{loading ? '—' : value}</strong></div></div>)}
        </section>
        <div className="overview-columns">
          <section className="overview-panel overview-panel--schedule" aria-busy={loading}><header><div><p className="eyebrow">Lịch của bạn</p><h2>Lịch dạy hôm nay</h2><p>{new Date(`${today}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}</p></div><button className="overview-link" onClick={() => onNavigate('/calendar')}>Xem cả tuần <UiIcon name="chevron" size={16} /></button></header>
            {loading ? <LoadingRows /> : sessions.length ? <div className="overview-list">{sessions.map((session) => { const done = session.studentCount > 0 && session.attendanceCount >= session.studentCount; const started = new Date(`${session.date}T${session.startTime}+07:00`) <= now; return <button className={`overview-row ${nextSession?.id === session.id ? "overview-row--next" : ""}`} key={session.id} onClick={() => openSession(session)}><span className="overview-time">{session.startTime.slice(0, 5)}<small>{session.endTime.slice(0, 5)}</small></span><span className="overview-row-text"><strong>{session.className}</strong><small>{session.studentCount} học sinh{nextSession?.id === session.id ? started ? " · Buổi đang diễn ra" : " · Buổi tiếp theo" : ""}</small></span><span className={`overview-status ${done ? 'overview-status--done' : started ? 'overview-status--pending' : ''}`}>{done ? 'Đã điểm danh' : started ? 'Cần điểm danh' : 'Sắp diễn ra'}</span><UiIcon name="chevron" size={16} /></button>; })}</div> : <div className="workspace-empty"><UiIcon name="calendar" size={32} /><h3>Hôm nay chưa có lịch dạy</h3><p>Xem lịch tuần hoặc tạo lớp để lên lịch buổi học đầu tiên.</p><button className="secondary-button" onClick={() => onNavigate("/calendar")}>Xem lịch tuần</button></div>}
          </section>
          <section className="overview-panel overview-panel--classes" aria-busy={loading}><header><div><p className="eyebrow">Không gian lớp học</p><h2>Lớp học của bạn</h2><p>{loading ? "Đang tải…" : `${classes.length} lớp · Mở lớp để bắt đầu`}</p></div></header>{classes.length > 0 && <div className="workspace-search"><label htmlFor="class-search">Tìm lớp học</label><div><input id="class-search" value={classQuery} onChange={(event) => setClassQuery(event.target.value)} placeholder="Nhập tên lớp…" />{classQuery && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setClassQuery("")}><UiIcon name="close" size={16} /></button>}</div></div>}{loading ? <LoadingRows /> : visibleClasses.length ? <div className="overview-list">{visibleClasses.map((classroom) => <button className="overview-row" key={classroom.id} onClick={() => onNavigate(`/classes/${classroom.id}`)}><span className="overview-class-icon"><UiIcon name="classes" /></span><span className="overview-row-text"><strong>{classroom.name}</strong><small>{classroom.studentCount} học sinh</small></span><UiIcon name="chevron" size={16} /></button>)}</div> : classes.length ? <div className="workspace-empty"><h3>Không tìm thấy lớp phù hợp</h3><p>Thử tên khác hoặc xóa tìm kiếm để xem tất cả lớp.</p><button className="secondary-button" onClick={() => setClassQuery("")}>Xóa tìm kiếm</button></div> : <div className="workspace-empty"><UiIcon name="classes" size={32} /><h3>Chưa có lớp học</h3><p>Tạo lớp, thêm học sinh và thiết lập lịch dạy của bạn.</p><button className="secondary-button" onClick={() => onNavigate("/classes/new")}>Tạo lớp đầu tiên</button></div>}</section>
        </div>
      </>}
    </main>
  </div>;
}

function LoadingRows() { return <div className="overview-skeleton" role="status" aria-label="Đang tải dữ liệu">{[1, 2, 3].map((item) => <div key={item}><span /><span /></div>)}</div>; }


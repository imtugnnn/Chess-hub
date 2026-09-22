import { useEffect, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { getTeacherClasses } from "../services/api";

const overview = [
  { icon: "♚", value: "04", label: "Lớp đang hoạt động", trend: "+1 lớp tháng này", tone: "blue" },
  { icon: "✓", value: "86%", label: "Chuyên cần tháng này", trend: "Tăng 4% so với tháng trước", tone: "green" },
  { icon: "₫", value: "12,4tr", label: "Học phí đã thu", trend: "8 khoản chưa thanh toán", tone: "amber" },
  { icon: "♜", value: "02", label: "Bảng đấu đang diễn ra", trend: "Vòng mới nhất: 3", tone: "violet" },
];

const upcoming = [
  ["Hôm nay", "17:30 – 19:00", "Lớp Nâng cao A", "12 học sinh", "Đã sẵn sàng"],
  ["T6, 20/09", "17:30 – 19:00", "Lớp Căn bản B", "10 học sinh", "Đã lên lịch"],
  ["T7, 21/09", "08:00 – 09:30", "Lớp Thiếu nhi 1", "14 học sinh", "Đã lên lịch"],
];

export function Homepage({ teacherId, teacherName, onLogout, onNavigate }) {
  const firstName = teacherName.split(" ").at(-1);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    let active = true;
    getTeacherClasses(teacherId).then((teacherClasses) => {
      if (active) setClasses(teacherClasses);
    }).catch(() => {
      if (active) setClasses([]);
    });
    return () => { active = false; };
  }, [teacherId]);
  return (
    <div className="app-shell">
      <AppSidebar activeSection="home" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
      <main className="dashboard" id="tong-quan">
        <AppPageHeader breadcrumb="Tổng quan" title={<>Chào buổi sáng, {firstName}! <span aria-hidden="true">♟</span></>} description="Đây là tình hình lớp học của bạn hôm nay, Thứ Tư 18 tháng 9." actions={<><button className="icon-button" aria-label="Thông báo">♧<i /></button><button className="secondary-button" onClick={() => onNavigate("/classes/new")}>＋ Tạo lớp mới</button></>} />
        <section className="stats-grid" aria-label="Tổng quan hoạt động">
          {overview.map((item) => <article className={`stat-card stat-card--${item.tone}`} key={item.label}><span className="stat-icon">{item.icon}</span><div><p>{item.label}</p><strong>{item.value}</strong><small>{item.trend}</small></div></article>)}
        </section>
        <section className="dashboard-grid">
          <article className="panel panel--schedule" id="lich-hoc">
            <div className="panel-heading"><div><p className="eyebrow">Hôm nay · 18 tháng 9</p><h2>Lịch dạy sắp tới</h2></div><a href="#xem-lich">Xem lịch <span>→</span></a></div>
            <div className="session-list">
              {upcoming.map((session, index) => <div className="session-row" key={session[2]}><span className={`session-date ${index === 0 ? "session-date--today" : ""}`}><b>{index === 0 ? "18" : index === 1 ? "20" : "21"}</b><small>{session[0].split(",")[0]}</small></span><div className="session-info"><strong>{session[2]}</strong><span>{session[1]} · {session[3]}</span></div><span className={`session-status ${index === 0 ? "session-status--ready" : ""}`}>{session[4]}</span><button className="more-button" aria-label={`Tùy chọn ${session[2]}`}>•••</button></div>)}
            </div>
          </article>
          <article className="panel panel--attention">
            <div className="panel-heading"><div><p className="eyebrow">Cần xử lý</p><h2>Việc cần làm</h2></div><span className="count-badge">3</span></div>
            <div className="attention-list">
              <button><span className="attention-icon attention-icon--rose">!</span><span><strong>Xác nhận điểm danh</strong><small>Lớp Căn bản A · 16/09</small></span><i>→</i></button>
              <button><span className="attention-icon attention-icon--amber">₫</span><span><strong>8 khoản học phí chưa thu</strong><small>Tháng 9 · Tổng 3.600.000 ₫</small></span><i>→</i></button>
              <button><span className="attention-icon attention-icon--violet">♜</span><span><strong>Nhập kết quả vòng 3</strong><small>Giải mùa thu · Lớp Nâng cao A</small></span><i>→</i></button>
            </div>
          </article>
        </section>
        <section className="panel panel--classes" id="lop-hoc">
          <div className="panel-heading"><div><p className="eyebrow">Lớp học</p><h2>Lớp đang hoạt động</h2></div><a href="#tat-ca-lop">Xem tất cả <span>→</span></a></div>
          <div className="class-grid">
            {classes.map((classroom) => <ClassCard key={classroom.id} {...classroom} onOpen={() => onNavigate(`/classes/${classroom.id}`)} />)}
            <button className="add-class-card" onClick={() => onNavigate("/classes/new")}><span>＋</span><strong>Tạo lớp mới</strong><small>Thêm lớp học của bạn</small></button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ClassCard({ name, schedule, studentCount, tone, onOpen }) {
  const badge = name.split(" ").map((word) => word[0]).join("").slice(0, 2);
  return <button type="button" className="class-card" onClick={onOpen} aria-label={`Mở lớp ${name}`}><div className="class-card__top"><span className={`class-badge class-badge--${tone}`}>{badge}</span><span className="class-card__arrow">→</span></div><h3>{name}</h3><p>{schedule}</p><div><small>{studentCount} học sinh</small><span>Danh sách buổi học</span></div></button>;
}

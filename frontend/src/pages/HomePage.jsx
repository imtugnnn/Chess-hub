import { Brand } from "../components/Brand";

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

export function Homepage({ teacherName, onLogout }) {
  const firstName = teacherName.split(" ").at(-1);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Điều hướng chính">
          <a className="nav-item nav-item--active" href="#tong-quan"><span>⌂</span>Tổng quan</a>
          <a className="nav-item" href="#lop-hoc"><span>♙</span>Lớp học <b>4</b></a>
          <a className="nav-item" href="#lich-hoc"><span>□</span>Lịch học</a>
          <a className="nav-item" href="#diem-danh"><span>✓</span>Điểm danh</a>
          <a className="nav-item" href="#hoc-phi"><span>₫</span>Học phí</a>
          <a className="nav-item" href="#bang-dau"><span>♜</span>Bảng đấu</a>
          <a className="nav-item" href="#hoc-sinh"><span>♧</span>Học sinh</a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="#cai-dat"><span>⚙</span>Cài đặt</a>
          <button className="profile-card" onClick={onLogout} title="Đăng xuất"><span className="avatar">MA</span><span><strong>{teacherName}</strong><small>Giáo viên</small></span><i aria-hidden="true">⌄</i></button>
        </div>
      </aside>
      <main className="dashboard" id="tong-quan">
        <header className="dashboard-header">
          <div><p className="breadcrumb">Tổng quan</p><h1>Chào buổi sáng, {firstName}! <span aria-hidden="true">♟</span></h1><p>Đây là tình hình lớp học của bạn hôm nay, Thứ Tư 18 tháng 9.</p></div>
          <div className="header-actions"><button className="icon-button" aria-label="Thông báo">♧<i></i></button><button className="secondary-button">＋ Tạo lớp mới</button></div>
        </header>
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
            <ClassCard badge="NA" name="Nâng cao A" schedule="T4, T7 · 17:30 – 19:00" count="12" tone="blue" avatars={["LN", "TM", "+10"]} />
            <ClassCard badge="CB" name="Căn bản B" schedule="T3, T6 · 17:30 – 19:00" count="10" tone="green" avatars={["TH", "AM", "+8"]} />
            <ClassCard badge="TN" name="Thiếu nhi 1" schedule="T7, CN · 08:00 – 09:30" count="14" tone="orange" avatars={["BG", "KH", "+12"]} />
            <button className="add-class-card"><span>＋</span><strong>Tạo lớp mới</strong><small>Thêm lớp học của bạn</small></button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ClassCard({ badge, name, schedule, count, tone, avatars }) {
  return <article className="class-card"><div className="class-card__top"><span className={`class-badge class-badge--${tone}`}>{badge}</span><button aria-label={`Tùy chọn lớp ${name}`}>•••</button></div><h3>{name}</h3><p>{schedule}</p><div><span className="avatar-stack">{avatars.map((avatar) => <i key={avatar}>{avatar}</i>)}</span><small>{count} học sinh</small></div></article>;
}

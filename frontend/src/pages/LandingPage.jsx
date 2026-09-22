import { Brand } from "../components/Brand";

const benefits = [
  ["♙", "Quản lý lớp học", "Tạo lớp, xếp lịch và theo dõi học sinh ở cùng một nơi."],
  ["✓", "Điểm danh & học phí", "Ghi nhận chuyên cần và tự tổng hợp các khoản cần thu."],
  ["♜", "Bảng đấu Swiss", "Tổ chức giải nội bộ nhiều vòng ngay trong lớp của bạn."],
];

export function LandingPage({ onNavigate }) {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Điều hướng công khai">
          <a href="#tinh-nang">Tính năng</a>
          <a href="#danh-cho-ai">Dành cho giáo viên</a>
          <button className="landing-login" onClick={() => onNavigate("/login")}>Đăng nhập</button>
          <button className="landing-register" onClick={() => onNavigate("/register")}>Bắt đầu miễn phí <span>→</span></button>
        </nav>
      </header>

      <section className="landing-hero" id="danh-cho-ai">
        <div className="landing-copy">
          <p className="landing-kicker"><span>♞</span> Nền tảng dành cho giáo viên cờ vua</p>
          <h1>Dành thời gian <em>cho việc dạy cờ.</em></h1>
          <p className="landing-lede">ChessHub giúp bạn quản lý lớp học, lịch dạy, chuyên cần và học phí một cách rõ ràng, để mỗi buổi học là một trải nghiệm tốt hơn.</p>
          <div className="landing-actions">
            <button className="landing-register landing-register--large" onClick={() => onNavigate("/register")}>Tạo tài khoản giáo viên <span>→</span></button>
            <button className="landing-demo" onClick={() => onNavigate("/login")}><i>▶</i> Xem cách hoạt động</button>
          </div>
          <div className="landing-proof"><span className="proof-avatars"><i>MA</i><i>HN</i><i>TA</i></span><p><strong>Được xây dựng cho giáo viên.</strong><br />Không cần quản lý trung tâm hay vai trò phức tạp.</p></div>
        </div>
        <div className="landing-visual" aria-label="Minh họa bảng điều khiển ChessHub">
          <div className="hero-orbit hero-orbit--one"></div><div className="hero-orbit hero-orbit--two"></div>
          <div className="hero-board" aria-hidden="true"><span>♜</span><span>♞</span><span>♟</span><span>♙</span><span>♕</span><span>♙</span><span>♞</span><span>♜</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span></div>
          <div className="hero-dashboard-card"><div className="hero-card-top"><span className="mini-brand">♞</span><span></span><span></span><span></span></div><p>Hôm nay, 18 tháng 9</p><h2>Chào buổi sáng, Minh Anh!</h2><div className="hero-mini-stats"><span><b>04</b>Lớp học</span><span><b>86%</b>Chuyên cần</span></div><div className="hero-session"><i>18<br /><small>T4</small></i><span><strong>Lớp Nâng cao A</strong><small>17:30 - 19:00 · 12 học sinh</small></span><b>•••</b></div></div>
          <div className="hero-float hero-float--attendance"><span>✓</span><p><strong>Điểm danh hoàn tất</strong><small>12/12 học sinh</small></p></div>
          <div className="hero-float hero-float--tuition"><span>₫</span><p><strong>Học phí tháng 9</strong><small>12.400.000 ₫ đã thu</small></p></div>
        </div>
      </section>

      <section className="landing-benefits" id="tinh-nang"><p className="landing-section-label">Mọi việc cần thiết cho một lớp cờ</p><h2>Đơn giản để bắt đầu.<br />Đủ sâu để vận hành.</h2><div>{benefits.map(([icon, title, body]) => <article key={title}><span>{icon}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    </main>
  );
}

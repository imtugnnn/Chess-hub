import { Brand } from "../components/Brand";
import "./landing.css";

const questions = [
  ["ChessHub dành cho ai?", "ChessHub dành cho giáo viên cờ vua muốn quản lý lớp học, lịch dạy, chuyên cần, học phí và tổ chức giải nội bộ ở cùng một nơi."],
  ["Tôi dạy độc lập, có sử dụng được không?", "Có. Bạn có thể tạo tài khoản giáo viên và quản lý lớp của mình, không cần có trung tâm hay thiết lập nhiều vai trò."],
  ["Tôi bắt đầu như thế nào?", "Tạo tài khoản giáo viên, tạo lớp học, thêm học sinh và thiết lập lịch dạy. Sau đó bạn có thể theo dõi các buổi học và điểm danh trong lớp."],
  ["Có thể tổ chức giải cờ trong lớp không?", "Có. ChessHub có bảng đấu Swiss để hỗ trợ tổ chức giải nội bộ nhiều vòng. Bạn có thể quản lý danh sách người chơi, cặp đấu và kết quả trong sản phẩm."],
];
function SchedulePreview() {
  return <div className="lp-preview lp-schedule" aria-label="Lịch lớp học mẫu">
    <div className="lp-preview-heading"><span>Lịch dạy trong tuần</span><span>Tháng 10</span></div>
    <div className="lp-calendar-event"><span>17:30</span><div><strong>Lớp Nâng cao A</strong><small>12 học sinh · 90 phút</small></div><i>♞</i></div>
    <div className="lp-calendar-event lp-calendar-event--gold"><span>19:00</span><div><strong>Lớp Cơ bản B</strong><small>8 học sinh · 60 phút</small></div><i>♙</i></div>
    <div className="lp-preview-note">Thông tin minh họa</div>
  </div>;
}
function AttendancePreview() {
  return <div className="lp-preview" aria-label="Danh sách điểm danh mẫu">
    <div className="lp-preview-heading"><span>Lớp Nâng cao A</span><span className="lp-status">Đã điểm danh</span></div>
    {[["AK", "An Khang"], ["ML", "Mai Linh"]].map(([initials, name]) => <div className="lp-student" key={name}><span className="lp-avatar">{initials}</span><strong>{name}</strong><span className="lp-present">✓ Có mặt</span></div>)}
    <div className="lp-preview-note">Thông tin minh họa</div>
  </div>;
}
export function LandingPage({ onNavigate }) {
  return (
    <main className="landing-page lp-refresh" id="dau-trang">
      <header className="landing-nav"><Brand /><nav aria-label="Điều hướng công khai">
        <a href="#tinh-nang">Tính năng</a><a href="#cau-hoi">Câu hỏi thường gặp</a>
        <button className="landing-login" onClick={() => onNavigate("/login")}>Đăng nhập</button>
        <button className="landing-register" onClick={() => onNavigate("/register")}><span className="lp-register-desktop">Bắt đầu miễn phí</span><span className="lp-register-mobile">Bắt đầu</span><span className="lp-register-arrow" aria-hidden="true">→</span></button>
      </nav></header>
      <section className="landing-hero" id="danh-cho-ai">
        <div className="landing-copy">
          <p className="landing-kicker"><span aria-hidden="true">♞</span> Dành cho giáo viên cờ vua</p>
          <h1>Dành thời gian<br />cho việc <em>dạy cờ.</em></h1>
          <p className="landing-lede">Quản lý lớp học, lịch dạy, điểm danh, học phí và giải nội bộ trong một nơi.</p>
          <div className="landing-actions"><button className="landing-register landing-register--large" onClick={() => onNavigate("/register")}>Tạo tài khoản giáo viên <span aria-hidden="true">→</span></button><a className="landing-demo" href="#tinh-nang">Khám phá tính năng <span aria-hidden="true">↓</span></a></div>
          <p className="lp-hero-note"><span aria-hidden="true">✓</span> Dạy độc lập hay có nhiều lớp, đều bắt đầu thật đơn giản.</p>
        </div>
        <div className="lp-hero-visual" aria-label="Minh họa một ngày dạy cờ với ChessHub">
          <div className="lp-dashboard">
            <div className="lp-dashboard-top"><Brand compact /><span className="lp-sample">Giao diện minh họa</span></div>
            <p className="lp-overline">LỚP HỌC CỦA BẠN</p><h2>Sẵn sàng cho buổi học hôm nay?</h2>
            <div className="lp-dashboard-stats"><div><span>Lớp học</span><strong>04 <small>lớp</small></strong></div><div><span>Học sinh</span><strong>36 <small>học sinh</small></strong></div></div>
            <div className="lp-next-class"><span className="lp-date">07<small>THÁNG 10</small></span><div><strong>Lớp Nâng cao A</strong><span>17:30 – 19:00 · 12 học sinh</span></div><span aria-hidden="true">↗</span></div>
            <div className="lp-dashboard-bottom"><span><i /> Lịch dạy đã sẵn sàng</span><span aria-hidden="true">♞</span></div>
          </div>
        </div>
      </section>
      <section className="lp-features" id="tinh-nang"><div className="lp-section" id="cach-hoat-dong">
        <div className="lp-section-heading"><p className="lp-overline">GỌN GÀNG Ở MỘT NƠI</p><h2>Bốn công cụ cho lớp cờ của bạn.</h2><p>Những công cụ thiết thực cho công việc hằng ngày của giáo viên.</p></div>
        <div className="lp-feature-grid">
          <article className="lp-feature-card"><div className="lp-feature-copy"><span className="lp-feature-icon" aria-hidden="true">▦</span><h3>Lịch dạy &amp; lớp học</h3><p>Tạo lớp, xếp lịch và biết buổi học nào đang chờ bạn.</p></div><SchedulePreview /></article>
          <article className="lp-feature-card"><div className="lp-feature-copy"><span className="lp-feature-icon" aria-hidden="true">✓</span><h3>Điểm danh</h3><p>Ghi nhận điểm danh và xem lại thông tin từng buổi học.</p></div><AttendancePreview /></article>
          <article className="lp-feature-card lp-feature-card--tuition"><div className="lp-feature-copy"><span className="lp-feature-icon" aria-hidden="true">₫</span><h3>Học phí</h3><p>Theo dõi khoản đã thu và khoản cần thu của từng lớp.</p></div><div className="lp-tuition-preview"><span>Học phí của lớp · Minh họa</span><div><strong>8 học sinh</strong><span className="lp-status">Đã đóng</span></div><div><strong>4 học sinh</strong><span className="lp-pending">Cần theo dõi</span></div><div className="lp-preview-note">Thông tin minh họa</div></div></article>
          <article className="lp-feature-card"><div className="lp-feature-copy"><span className="lp-feature-icon" aria-hidden="true">♜</span><h3>Giải Swiss</h3><p>Tổ chức giải nội bộ, theo dõi cặp đấu và kết quả từng vòng.</p></div><div className="lp-preview lp-match-preview" aria-label="Cặp đấu Swiss mẫu"><div className="lp-preview-heading"><span>Giải cờ của lớp</span><span>Vòng 1</span></div>{[["An Khang", "Mai Linh", "1 – 0"], ["Gia Phúc", "Minh Anh", "½ – ½"]].map(([a, b, score], i) => <div className="lp-match" key={a}><small>{String(i + 1).padStart(2, "0")}</small><span>{a}</span><b>{score}</b><span>{b}</span></div>)}<div className="lp-preview-note">Thông tin minh họa</div></div></article>
        </div>
      </div></section>
      <section className="lp-section lp-faq" id="cau-hoi"><div className="lp-section-heading"><p className="lp-overline">TRƯỚC KHI BẮT ĐẦU</p><h2>Câu hỏi thường gặp</h2></div><div className="lp-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section className="lp-final-cta"><div className="lp-cta-inner"><h2>Sẵn sàng tạo lớp cờ đầu tiên?</h2><button className="landing-register landing-register--large" onClick={() => onNavigate("/register")}>Tạo tài khoản giáo viên <span aria-hidden="true">→</span></button></div></section>
      <footer className="lp-footer"><Brand compact /><p>Đồng hành cùng giáo viên cờ vua.</p><nav aria-label="Điều hướng cuối trang"><a href="#cau-hoi">Câu hỏi thường gặp</a><button onClick={() => onNavigate("/login")}>Đăng nhập</button><a href="#dau-trang">Về đầu trang ↑</a></nav></footer>
    </main>
  );
}

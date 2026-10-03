import { Brand } from "../components/Brand";
import "./landing.css";

const steps = [
  ["01", "Trước buổi học", "Một lịch dạy rõ ràng", "Biết hôm nay dạy lớp nào, lúc mấy giờ và có những học sinh nào. Bắt đầu buổi học với mọi thứ đã sẵn sàng.", "Lịch dạy & lớp học"],
  ["02", "Trong buổi học", "Gọn việc điểm danh", "Ghi nhận học sinh có mặt ngay trong lớp. Lưu lại chuyên cần để dễ theo dõi qua từng buổi học.", "Điểm danh học sinh"],
  ["03", "Sau buổi học", "Dễ theo dõi học phí", "Xem lại các buổi học và tình trạng học phí ở cùng một nơi. Thông tin rõ ràng để bạn chủ động quản lý.", "Tổng hợp học phí"],
];
const questions = [
  ["ChessHub dành cho ai?", "ChessHub dành cho giáo viên cờ vua muốn quản lý lớp học, lịch dạy, chuyên cần, học phí và tổ chức giải nội bộ ở cùng một nơi."],
  ["Tôi dạy độc lập, có sử dụng được không?", "Có. Bạn có thể tạo tài khoản giáo viên và quản lý lớp của mình, không cần có trung tâm hay thiết lập nhiều vai trò."],
  ["Tôi bắt đầu như thế nào?", "Tạo tài khoản giáo viên, tạo lớp học, thêm học sinh và thiết lập lịch dạy. Sau đó bạn có thể theo dõi các buổi học và điểm danh trong lớp."],
  ["Có thể tổ chức giải cờ trong lớp không?", "Có. ChessHub có bảng đấu Swiss để hỗ trợ tổ chức giải nội bộ nhiều vòng. Bạn có thể quản lý danh sách người chơi, cặp đấu và kết quả trong sản phẩm."],
];
function SchedulePreview() {
  return <div className="lp-preview lp-schedule" aria-label="Lịch lớp học mẫu">
    <div className="lp-preview-heading"><span>Lịch dạy trong tuần</span><span>Tháng 10</span></div>
    <div className="lp-week">{["T2", "T3", "T4", "T5", "T6"].map((day, i) => <span className={i === 2 ? "is-today" : ""} key={day}>{day}<b>{5 + i}</b></span>)}</div>
    <div className="lp-calendar-event"><span>17:30</span><div><strong>Lớp Nâng cao A</strong><small>12 học sinh · 90 phút</small></div><i>♞</i></div>
    <div className="lp-calendar-event lp-calendar-event--gold"><span>19:00</span><div><strong>Lớp Cơ bản B</strong><small>8 học sinh · 60 phút</small></div><i>♙</i></div>
    <div className="lp-preview-note">Thông tin minh họa</div>
  </div>;
}
function AttendancePreview() {
  return <div className="lp-preview" aria-label="Danh sách điểm danh mẫu">
    <div className="lp-preview-heading"><span>Lớp Nâng cao A</span><span className="lp-status">Đã điểm danh</span></div>
    {[["AK", "An Khang"], ["ML", "Mai Linh"], ["GP", "Gia Phúc"]].map(([initials, name]) => <div className="lp-student" key={name}><span className="lp-avatar">{initials}</span><strong>{name}</strong><span className="lp-present">✓ Có mặt</span></div>)}
    <div className="lp-preview-note">Thông tin minh họa</div>
  </div>;
}
export function LandingPage({ onNavigate }) {
  return (
    <main className="landing-page lp-refresh" id="dau-trang">
      <header className="landing-nav"><Brand /><nav aria-label="Điều hướng công khai">
        <a href="#cach-hoat-dong">Cách hoạt động</a><a href="#tinh-nang">Tính năng</a>
        <button className="landing-login" onClick={() => onNavigate("/login")}>Đăng nhập</button>
        <button className="landing-register" onClick={() => onNavigate("/register")}>Bắt đầu miễn phí <span aria-hidden="true">→</span></button>
      </nav></header>
      <section className="landing-hero" id="danh-cho-ai">
        <div className="landing-copy">
          <p className="landing-kicker"><span aria-hidden="true">♞</span> Dành cho giáo viên cờ vua</p>
          <h1>Dành thời gian<br />cho việc <em>dạy cờ.</em></h1>
          <p className="landing-lede">Từ lịch dạy đến điểm danh và học phí, ChessHub giúp bạn quản lý lớp học gọn gàng hơn. Để tâm trí dành cho những nước đi tiếp theo.</p>
          <div className="landing-actions"><button className="landing-register landing-register--large" onClick={() => onNavigate("/register")}>Tạo tài khoản giáo viên <span aria-hidden="true">→</span></button><a className="landing-demo" href="#cach-hoat-dong"><i aria-hidden="true">▶</i> Xem cách hoạt động</a></div>
          <p className="lp-hero-note"><span aria-hidden="true">✓</span> Dạy độc lập hay có nhiều lớp, đều bắt đầu thật đơn giản.</p>
        </div>
        <div className="lp-hero-visual" aria-label="Minh họa một ngày dạy cờ với ChessHub">
          <div className="lp-visual-label"><span aria-hidden="true">✦</span> Một ngày dạy cờ, nhẹ nhàng hơn.</div>
          <div className="lp-dashboard">
            <div className="lp-dashboard-top"><Brand compact /><span className="lp-sample">Giao diện minh họa</span></div>
            <p className="lp-overline">LỚP HỌC CỦA BẠN</p><h2>Sẵn sàng cho buổi học hôm nay?</h2>
            <div className="lp-dashboard-stats"><div><span>Lớp học</span><strong>04 <small>lớp</small></strong></div><div><span>Học sinh</span><strong>36 <small>học sinh</small></strong></div></div>
            <div className="lp-next-class"><span className="lp-date">07<small>THÁNG 10</small></span><div><strong>Lớp Nâng cao A</strong><span>17:30 – 19:00 · 12 học sinh</span></div><span aria-hidden="true">↗</span></div>
            <div className="lp-dashboard-bottom"><span><i /> Lịch dạy đã sẵn sàng</span><span aria-hidden="true">♞</span></div>
          </div>
          <div className="lp-attendance-float"><span aria-hidden="true">✓</span><div><strong>Điểm danh hoàn tất</strong><small>Thêm thời gian cho bài học mới.</small></div></div>
          <div className="lp-chess-scene" aria-hidden="true"><div className="lp-chessboard">{Array.from({ length: 16 }, (_, i) => <span key={i}>{({ 2: "♚", 5: "♙", 8: "♞", 14: "♔" })[i]}</span>)}</div><span className="lp-scene-caption">Mỗi buổi học. Một nước tiến.</span></div>
        </div>
      </section>
      <div className="lp-ribbon"><span>Ít việc quản lý hơn.</span><strong>Nhiều khoảnh khắc trên bàn cờ hơn.</strong><span aria-hidden="true">♙ &nbsp; ♞ &nbsp; ♜</span></div>
      <section className="lp-section lp-journey" id="cach-hoat-dong">
        <div className="lp-section-heading"><p className="lp-overline">ĐỒNG HÀNH CÙNG MỖI BUỔI DẠY</p><h2>Một ngày của bạn.<br /><em>Mọi việc đã có chỗ.</em></h2><p>Từ lúc chuẩn bị đến khi kết thúc buổi học, thông tin luôn ở trong tầm tay.</p></div>
        <div className="lp-steps">{steps.map(([number, time, title, body, label]) => <article key={number}><div className="lp-step-top"><span>{number}</span><small>{time}</small></div><h3>{title}</h3><p>{body}</p><div className="lp-step-tag"><span aria-hidden="true">✓</span> {label}</div></article>)}</div>
      </section>
      <section className="lp-features" id="tinh-nang"><div className="lp-section">
        <div className="lp-section-heading"><p className="lp-overline">GỌN GÀNG Ở MỘT NƠI</p><h2>Việc quản lý bớt rối.<br />Lớp học thêm nhịp nhàng.</h2><p>Những công cụ thiết thực cho công việc hằng ngày của giáo viên.</p></div>
        <div className="lp-feature-grid">
          <article className="lp-feature-card lp-feature-card--schedule"><div className="lp-feature-copy"><span className="lp-feature-icon" aria-hidden="true">▦</span><h3>Lịch dạy rõ ràng,<br />không bỏ lỡ buổi học.</h3><p>Tạo lớp, xếp lịch và theo dõi học sinh. Nhìn nhanh tuần dạy để chủ động chuẩn bị.</p></div><SchedulePreview /></article>
          <article className="lp-feature-card"><div className="lp-feature-copy"><span className="lp-feature-icon" aria-hidden="true">✓</span><h3>Chuyên cần dễ theo dõi.</h3><p>Ghi nhận điểm danh và xem lại thông tin từng buổi học.</p></div><AttendancePreview /></article>
          <article className="lp-feature-card lp-feature-card--tuition"><div className="lp-feature-copy"><span className="lp-feature-icon" aria-hidden="true">₫</span><h3>Học phí minh bạch.</h3><p>Theo dõi khoản đã thu và khoản cần thu, không phải tìm lại từng ghi chú.</p></div><div className="lp-tuition-preview"><span>Học phí của lớp · Minh họa</span><div><strong>8 học sinh</strong><span className="lp-status">Đã đóng</span></div><div><strong>4 học sinh</strong><span className="lp-pending">Cần theo dõi</span></div><div className="lp-tuition-bar"><span /></div></div></article>
        </div>
      </div></section>
      <section className="lp-section lp-tournament"><div className="lp-tournament-copy"><p className="lp-overline">MANG TINH THẦN THI ĐẤU VÀO LỚP</p><h2>Từ bài học<br />đến <em>ván đấu đầu tiên.</em></h2><p>Một giải cờ nhỏ là dịp để học sinh thử sức. Với bảng đấu Swiss, bạn có thể tổ chức giải nội bộ, theo dõi cặp đấu và ghi nhận kết quả ngay trong ChessHub.</p><div className="lp-tournament-tags"><span>Danh sách người chơi</span><span>Cặp đấu từng vòng</span><span>Kết quả thi đấu</span></div></div><div className="lp-match-preview"><div className="lp-match-heading"><span aria-hidden="true">♜</span><div><strong>Giải cờ của lớp</strong><small>Bảng đấu minh họa · Vòng 1</small></div></div>{[["An Khang", "Mai Linh", "1 – 0"], ["Gia Phúc", "Minh Anh", "½ – ½"], ["Bảo An", "Tuấn Minh", "0 – 1"]].map(([a, b, score], i) => <div className="lp-match" key={a}><small>{String(i + 1).padStart(2, "0")}</small><span>{a}</span><b>{score}</b><span>{b}</span></div>)}<p>Những nước đi nhỏ. Những trải nghiệm lớn.</p></div></section>
      <section className="lp-section lp-faq" id="cau-hoi"><div className="lp-section-heading"><p className="lp-overline">TRƯỚC KHI BẮT ĐẦU</p><h2>Có thể bạn đang thắc mắc.</h2></div><div className="lp-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section className="lp-final-cta"><span className="lp-cta-piece" aria-hidden="true">♞</span><p className="lp-overline">BẮT ĐẦU CÙNG CHESSHUB</p><h2>Lớp cờ của bạn.<br />Một khởi đầu gọn gàng hơn.</h2><p>Tạo lớp học đầu tiên và dành nhiều thời gian hơn cho điều bạn yêu thích.</p><button className="landing-register landing-register--large" onClick={() => onNavigate("/register")}>Tạo tài khoản giáo viên <span aria-hidden="true">→</span></button></section>
      <footer className="lp-footer"><Brand compact /><p>Đồng hành cùng giáo viên cờ vua.</p><nav aria-label="Điều hướng cuối trang"><a href="#cau-hoi">Câu hỏi thường gặp</a><button onClick={() => onNavigate("/login")}>Đăng nhập</button><a href="#dau-trang">Về đầu trang ↑</a></nav></footer>
    </main>
  );
}

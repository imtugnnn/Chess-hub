import { useEffect, useRef, useState } from "react";
import { Brand } from "../components/Brand";
import "./landing.css";

const steps = [
  { key: "register", label: "Tạo tài khoản", title: "Bắt đầu với tài khoản giáo viên.", description: "Tạo tài khoản để có không gian quản lý lớp của riêng bạn. Giáo viên độc lập có thể bắt đầu mà không cần thiết lập trung tâm.", outcome: "Một nơi dành riêng cho lớp học của bạn.", alt: "Form tạo tài khoản giáo viên ChessHub với họ tên, email và mật khẩu." },
  { key: "create", label: "Tạo lớp", title: "Đặt lịch cho lớp cờ đầu tiên.", description: "Nhập tên lớp, học phí mỗi buổi và chọn lịch dạy. Bạn có thể chọn từng ngày hoặc thiết lập lịch định kỳ hàng tuần.", outcome: "Lớp học và các buổi dạy đã sẵn sàng.", alt: "Màn hình tạo lớp cờ với tên lớp, đơn giá mỗi buổi và lịch học." },
  { key: "students", label: "Thêm học sinh", title: "Đưa học sinh vào cùng một danh sách.", description: "Thêm học sinh ngay khi tạo lớp hoặc bổ sung sau. Hồ sơ và thông tin liên hệ phụ huynh nằm ngay trong lớp học.", outcome: "Danh sách lớp rõ ràng, dễ cập nhật.", alt: "Tab học sinh của lớp Cờ vua căn bản với form thêm học sinh và danh sách lớp." },
  { key: "attendance", label: "Điểm danh", title: "Ghi nhận từng buổi học.", description: "Chọn buổi học, đánh dấu có mặt, muộn hoặc vắng và lưu điểm danh. Bạn có thể mở lại buổi cũ để xem thông tin.", outcome: "Biết học sinh đã tham gia những buổi nào.", alt: "Giao diện điểm danh lớp Cờ vua căn bản với ba học sinh có mặt và một học sinh đi muộn." },
  { key: "tuition", label: "Tổng hợp học phí", title: "Cuối tháng, xem học phí tạm tính.", description: "Theo dõi lượt đi học và học phí của từng lớp, từng học sinh theo tháng. Có mặt và đi muộn đều được tính là buổi đã học.", outcome: "Học phí tạm tính = buổi đã học × đơn giá.", alt: "Báo cáo tháng của lớp Cờ vua căn bản, gồm lượt đi học và tổng học phí tạm tính." },
  { key: "swiss", label: "Giải Swiss", title: "Tạo sân chơi ngay trong lớp.", description: "Chọn người chơi, tổ chức giải Swiss và cập nhật kết quả từng vòng. Xem cặp đấu và bảng xếp hạng trong cùng một màn hình.", outcome: "Hoạt động mở rộng · Có thể tổ chức khi lớp đã sẵn sàng.", alt: "Giải cờ cuối tuần với cặp đấu vòng một, kết quả và bảng xếp hạng." },
];
const questions = [
  ["ChessHub dành cho ai?", "ChessHub dành cho giáo viên và chủ trung tâm cờ vua muốn quản lý lớp học, lịch dạy, học sinh, chuyên cần và giải nội bộ ở cùng một nơi."],
  ["Tôi dạy độc lập, có sử dụng được không?", "Có. Bạn có thể tạo tài khoản giáo viên và quản lý lớp của mình, không cần có trung tâm hay thiết lập nhiều vai trò."],
  ["Học phí được tính như thế nào?", "Học phí tạm tính được tổng hợp theo tháng: số buổi đã học nhân với đơn giá của lớp. Có mặt và đi muộn đều được tính là buổi đã học. Báo cáo này không xác nhận học sinh đã thanh toán."],
  ["Có bắt buộc tổ chức giải không?", "Không. Giải Swiss là hoạt động mở rộng của lớp. Bạn có thể chỉ quản lý lớp, điểm danh và tổng hợp học phí, hoặc tổ chức giải khi cần."],
];
const imagePath = (key) => `/images/landing/${key}.png`;

function ProductWalkthrough() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const section = useRef(null);
  const buttons = useRef([]);
  const touchStart = useRef(null);
  const step = steps[active];
  const autoPlaying = playing && visible && pageVisible && !hovered && !focused && !reducedMotion;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(section.current);
    const onVisibility = () => setPageVisible(!document.hidden);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference = () => setReducedMotion(preference.matches);
    document.addEventListener("visibilitychange", onVisibility);
    preference.addEventListener("change", onPreference);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); preference.removeEventListener("change", onPreference); };
  }, []);

  useEffect(() => {
    if (!autoPlaying) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % steps.length), 6000);
    return () => window.clearTimeout(timer);
  }, [active, autoPlaying]);

  function select(index, focus = false) {
    setPlaying(false);
    setActive((index + steps.length) % steps.length);
    if (focus) buttons.current[index]?.focus({ preventScroll: true });
  }
  function handleKey(event, index) {
    const target = event.key === "ArrowRight" ? (index + 1) % steps.length : event.key === "ArrowLeft" ? (index + steps.length - 1) % steps.length : event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : null;
    if (target !== null) { event.preventDefault(); select(target, true); }
  }
  return <section ref={section} className="lp-workflow" id="cach-hoat-dong" aria-labelledby="workflow-title">
    <div className="lp-section">
      <div className="lp-section-heading"><p className="lp-overline">TỪ THIẾT LẬP ĐẾN VẬN HÀNH</p><h2 id="workflow-title">Một lớp cờ, từ buổi học đầu tiên<br className="lp-desktop-break" /> đến báo cáo cuối tháng.</h2><p>Xem cách tạo lớp, quản lý học sinh và theo dõi từng buổi dạy trong ChessHub.</p></div>
      <div className="lp-workflow-panel" id="workflow-panel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <div className="lp-workflow-copy" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; setPlaying(false); }} onTouchEnd={(event) => { if (touchStart.current !== null) { const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 60) select(active + (distance < 0 ? 1 : -1)); touchStart.current = null; } }}>
          <div className="lp-workflow-text" key={step.key} aria-live={autoPlaying ? "off" : "polite"} aria-atomic="true"><h3>{step.title}</h3><p>{step.description}</p><div className="lp-workflow-outcome"><span aria-hidden="true">↳</span>{step.outcome}</div></div>
          <div className="lp-carousel-controls">
            <div className="lp-carousel-heading"><span>{step.label}</span><div className="lp-carousel-actions"><button type="button" aria-label="Ảnh trước" onClick={() => select(active - 1)}>←</button><button type="button" aria-label={playing && !reducedMotion ? "Tạm dừng tự động chuyển ảnh" : "Bật tự động chuyển ảnh"} aria-pressed={playing && !reducedMotion} disabled={reducedMotion} onClick={() => setPlaying((value) => !value)}><svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">{playing && !reducedMotion ? <path d="M5 4h3v12H5zm7 0h3v12h-3z" /> : <path d="m6 3 10 7-10 7z" />}</svg></button><button type="button" aria-label="Ảnh tiếp theo" onClick={() => select(active + 1)}>→</button></div></div>
            <nav className="lp-carousel-track" aria-label="Chọn ảnh trong luồng sử dụng">{steps.map((item, index) => <button key={item.key} ref={(node) => { buttons.current[index] = node; }} type="button" aria-label={item.label} aria-pressed={active === index} aria-controls="workflow-panel" onClick={() => select(index)} onKeyDown={(event) => handleKey(event, index)}><span /></button>)}</nav>
          </div>
        </div>
        <figure className="lp-product-figure"><div className="lp-product-image-scroll" role="region" aria-label={`Ảnh giao diện: ${step.label}`} tabIndex={0}>{steps.map((item, index) => <img key={item.key} data-screen={item.key} hidden={index !== active} src={imagePath(item.key)} alt={item.alt} width="1265" height="1000" />)}</div></figure>
      </div>
    </div>
  </section>;
}
export function LandingPage({ onNavigate }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("chesshub-landing");
    return () => root.classList.remove("chesshub-landing");
  }, []);
  return <main className="landing-page lp-refresh" id="dau-trang">
    <a className="lp-skip-link" href="#noi-dung">Đến nội dung chính</a>
    <header className="landing-nav"><Brand /><nav aria-label="Điều hướng công khai"><a href="#cach-hoat-dong">Cách hoạt động</a><a href="#cau-hoi">Câu hỏi</a><button className="landing-login" onClick={() => onNavigate("/login")}>Đăng nhập</button><button className="landing-register" onClick={() => onNavigate("/register")}><span className="lp-register-desktop">Tạo tài khoản</span><span className="lp-register-mobile">Bắt đầu</span><span aria-hidden="true">→</span></button></nav></header>
    <section className="landing-hero" id="noi-dung"><div className="landing-copy"><h1>Dành thời gian<br />cho việc <em>dạy cờ.</em></h1><p className="landing-lede">Từ tạo lớp, thêm học sinh đến điểm danh và tổng hợp học phí. Mọi việc vận hành lớp cờ trong một nơi.</p><div className="landing-actions"><button className="landing-register landing-register--large" onClick={() => onNavigate("/register")}>Tạo tài khoản giáo viên <span aria-hidden="true">→</span></button><a className="landing-demo" href="#cach-hoat-dong">Xem cách hoạt động <span aria-hidden="true">↓</span></a></div><p className="lp-hero-note">Dạy độc lập hay quản lý trung tâm, bắt đầu từ lớp học của bạn.</p></div><figure className="lp-hero-product"><img src={imagePath("board")} alt="Không gian xếp thế cờ ChessHub với bàn cờ và bảng chọn quân cờ." width="1265" height="820" fetchPriority="high" /></figure></section>
    <ProductWalkthrough />
    <section className="lp-section lp-audience" aria-labelledby="audience-title"><div><p className="lp-overline">DẠY THEO CÁCH CỦA BẠN</p><h2 id="audience-title">Lớp riêng hay một trung tâm,<br />đều có chỗ trong ChessHub.</h2></div><div className="lp-audience-list"><article><h3>Cho giáo viên độc lập</h3><p>Tạo lớp riêng, xếp lịch và theo dõi học sinh. Bắt đầu trực tiếp từ tài khoản giáo viên của bạn.</p></article><article><h3>Cho chủ trung tâm</h3><p>Quản lý thành viên và mời giáo viên tham gia trung tâm, cùng các công cụ vận hành lớp học.</p></article></div></section>
    <section className="lp-section lp-faq" id="cau-hoi"><div className="lp-section-heading"><p className="lp-overline">TRƯỚC KHI BẮT ĐẦU</p><h2>Câu hỏi thường gặp</h2></div><div className="lp-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="lp-final-cta"><div className="lp-cta-inner"><div><p className="lp-overline">BẮT ĐẦU TỪ MỘT LỚP HỌC</p><h2>Tạo lớp cờ đầu tiên của bạn.</h2></div><button className="landing-register landing-register--large" onClick={() => onNavigate("/register")}>Tạo tài khoản giáo viên <span aria-hidden="true">→</span></button></div></section>
    <footer className="lp-footer"><Brand compact /><p>Đồng hành cùng giáo viên cờ vua.</p><nav aria-label="Điều hướng cuối trang"><a href="#cau-hoi">Câu hỏi thường gặp</a><button onClick={() => onNavigate("/login")}>Đăng nhập</button><a href="#dau-trang">Về đầu trang ↑</a></nav></footer>
  </main>;
}

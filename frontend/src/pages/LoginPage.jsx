import { useState } from "react";
import { Brand } from "../components/Brand";
import { login } from "../services/api";

export function LoginPage({ onNavigate, onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const account = await login({ email, password });
      onAuthenticated(account);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase" aria-label="Giới thiệu ChessHub">
        <Brand />
        <div className="auth-showcase__copy">
          <p className="eyebrow">Dành riêng cho giáo viên cờ vua</p>
          <h1>Quản lý lớp cờ<br />gọn trong một nước đi.</h1>
          <p>Theo dõi lịch học, chuyên cần, học phí và bảng đấu nội bộ từ một nơi duy nhất.</p>
        </div>
        <div className="chessboard" aria-hidden="true">
          <span>♜</span><span>♟</span><span>♞</span><span>♟</span><span>♛</span><span>♟</span><span>♜</span><span>♟</span>
          <span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span><span>♟</span>
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <p className="auth-showcase__note"><span>✓</span> Dữ liệu lớp học của bạn luôn được tách riêng và bảo mật.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__inner">
          <div className="mobile-brand"><Brand compact /></div>
          <p className="eyebrow">Chào mừng trở lại</p>
          <h2>Đăng nhập vào ChessHub</h2>
          <p className="auth-subtitle">Tiếp tục quản lý những lớp cờ của bạn.</p>
          <form className="auth-form" onSubmit={submit}>
            <label>Email<span className="input-wrap"><span aria-hidden="true">✉</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" required /></span></label>
            <label>Mật khẩu<span className="input-wrap"><span aria-hidden="true">⌑</span><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required /></span></label>
            <div className="form-row"><label className="check-label"><input type="checkbox" /> <span>Ghi nhớ đăng nhập</span></label><button type="button" className="text-button" onClick={() => setShowPassword(!showPassword)}>Hiện mật khẩu</button></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Đang kiểm tra…" : <>Đăng nhập <span aria-hidden="true">→</span></>}</button>
          </form>
          <p className="auth-switch">Chưa có tài khoản? <button type="button" className="text-button text-button--strong" onClick={() => onNavigate("/register")}>Đăng ký ngay</button></p>
        </div>
      </section>
    </main>
  );
}

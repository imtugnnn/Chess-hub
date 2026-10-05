import { useEffect, useState } from "react";
import { Brand } from "../components/Brand";
import { getAuthProviders, login, startGoogleLogin } from "../services/api";

export function LoginPage({ onNavigate, onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleStatus, setGoogleStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    getAuthProviders().then((providers) => {
      if (active) setGoogleStatus(providers.google === true ? "enabled" : "unavailable");
    }).catch(() => {
      if (active) setGoogleStatus("unavailable");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("oauthError")) {
      setError("Không thể đăng nhập bằng Google. Hãy thử lại hoặc dùng email và mật khẩu.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const account = await login({ email, password, rememberMe });
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
            <div className="form-row login-options">
              <div className="remember-login-control">
                <button id="remember-login" type="button" className="remember-login-button" aria-pressed={rememberMe}
                  aria-labelledby="remember-login-label" disabled={submitting} onClick={() => setRememberMe((value) => !value)}>
                  <span className="remember-login-button__indicator" aria-hidden="true">{rememberMe ? "✓" : ""}</span>
                </button>
                <label id="remember-login-label" htmlFor="remember-login">Lưu đăng nhập</label>
              </div>
              <button type="button" className="text-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Đang kiểm tra…" : <>Đăng nhập <span aria-hidden="true">→</span></>}</button>
          </form>
          <div className="auth-divider"><span>hoặc</span></div>
          <button className="oauth-button" type="button" onClick={startGoogleLogin}
            disabled={googleStatus !== "enabled"}
            aria-describedby={googleStatus === "unavailable" ? "google-unavailable" : undefined}>
            <span aria-hidden="true" className="google-mark">G</span> Đăng nhập bằng Google
          </button>
          {googleStatus === "unavailable" && <p className="oauth-note" id="google-unavailable">Đăng nhập bằng Google hiện chưa khả dụng.</p>}
          <p className="auth-switch">Chưa có tài khoản? <button type="button" className="text-button text-button--strong" onClick={() => onNavigate("/register")}>Đăng ký ngay</button></p>
        </div>
      </section>
    </main>
  );
}

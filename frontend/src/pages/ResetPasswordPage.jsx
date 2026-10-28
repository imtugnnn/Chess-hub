import { useEffect, useState } from "react";
import { Brand } from "../components/Brand";
import { PasswordInput } from "../components/PasswordInput";
import { resetPassword } from "../services/api";

export function ResetPasswordPage({ onNavigate, onReset }) {
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    return value;
  });
  useEffect(() => { window.history.replaceState(window.history.state, "", window.location.pathname); }, []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token);
  async function submit(event) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Mật khẩu xác nhận chưa khớp."); return; }
    if (new TextEncoder().encode(password).length > 72) { setError("Mật khẩu không được vượt quá 72 byte."); return; }
    setSubmitting(true);
    try { const result = await resetPassword({ token, password }); setMessage(result.message); setPassword(""); setConfirmation(""); onReset(); }
    catch (error) { setError(error.message); }
    finally { setSubmitting(false); }
  }
  return <main className="auth-page password-recovery-page"><section className="auth-panel"><div className="auth-panel__inner">
    <div className="password-recovery-brand"><Brand compact /></div>
    <h1>Đặt lại mật khẩu</h1>
    {message ? <p className="password-recovery-success" role="status">{message}</p> : !validToken ? <p className="form-error" role="alert">Link đặt lại mật khẩu bị thiếu hoặc không hợp lệ. Hãy yêu cầu link mới.</p> : <>
      <p className="auth-subtitle">Tạo mật khẩu mới có ít nhất 8 ký tự cho tài khoản ChessHub.</p>
      <form className="auth-form" onSubmit={submit}>
        <label>Mật khẩu mới<PasswordInput aria-label="Mật khẩu mới" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required disabled={submitting} /></label>
        <label>Xác nhận mật khẩu mới<PasswordInput aria-label="Xác nhận mật khẩu mới" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required disabled={submitting} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Đang cập nhật…" : "Lưu mật khẩu mới"}</button>
      </form>
    </>}
    {!message && <p className="auth-switch"><button type="button" className="text-button" onClick={() => onNavigate("/forgot-password")}>Yêu cầu link mới</button></p>}
    <p className="auth-switch"><button type="button" className="text-button" onClick={() => onNavigate("/login")}>Quay lại đăng nhập</button></p>
  </div></section></main>;
}

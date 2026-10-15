import { useState } from "react";
import { Brand } from "../components/Brand";
import { requestPasswordReset } from "../services/api";
import "../components/password-input.css";

export function ForgotPasswordPage({ onNavigate, locationSearch = "" }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const changing = new URLSearchParams(locationSearch).get("intent") === "change";
  async function submit(event) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { const result = await requestPasswordReset(email); setMessage(result.message); }
    catch (error) { setError(error.message); }
    finally { setSubmitting(false); }
  }
  return <main className="auth-page password-recovery-page"><section className="auth-panel"><div className="auth-panel__inner">
    <div className="password-recovery-brand"><Brand compact /></div>
    <h1>{changing ? "Thay đổi mật khẩu" : "Quên mật khẩu?"}</h1>
    <p className="auth-subtitle">Nhập email của tài khoản. ChessHub sẽ gửi link để bạn tạo mật khẩu mới. Link có hiệu lực trong 30 phút.</p>
    {message ? <p className="password-recovery-success" role="status">{message}</p> : <form className="auth-form" onSubmit={submit}>
      <label>Email<span className="input-wrap"><span aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg></span><input aria-label="Email" type="email" autoComplete="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} required disabled={submitting} /></span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}</button>
    </form>}
    <p className="auth-switch"><button type="button" className="text-button" onClick={() => onNavigate("/login")}>Quay lại đăng nhập</button></p>
  </div></section></main>;
}

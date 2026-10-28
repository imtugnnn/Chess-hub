import { useState } from "react";
import { Brand } from "../components/Brand";
import { completeInitialPassword } from "../services/api";
import "./initial-password.css";

export function InitialPasswordPage({ account, onCompleted, onLogout }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) { setError("Hai mật khẩu chưa trùng khớp."); return; }
    setBusy(true); setError("");
    try { onCompleted(await completeInitialPassword({ password })); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-page initial-password-page"><section className="auth-panel"><div className="auth-panel__inner">
    <Brand compact />
    <h2>Tạo mật khẩu mới</h2>
    <p className="auth-subtitle">Tài khoản {account.email} đang dùng mật khẩu tạm. Tạo mật khẩu riêng để tiếp tục.</p>
    <form className="auth-form" onSubmit={submit}>
      <label>Mật khẩu mới<span className="input-wrap"><input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></span></label>
      <label>Nhập lại mật khẩu mới<span className="input-wrap"><input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></span></label>
      <p>Tự động giữ đăng nhập đến khi đăng xuất.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mật khẩu và tiếp tục"}</button>
      <button type="button" className="text-button" disabled={busy} onClick={onLogout}>Đăng xuất</button>
    </form>
  </div></section></main>;
}

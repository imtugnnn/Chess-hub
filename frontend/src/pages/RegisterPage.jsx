import { useState } from "react";
import { Brand } from "../components/Brand";
import { registerAccount } from "../services/api";

export function RegisterPage({ onNavigate, onRegistered }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) return setError("Mật khẩu xác nhận chưa khớp.");
    setError("");
    setSubmitting(true);
    try {
      const account = await registerAccount({ fullName: form.name, email: form.email, password: form.password });
      onRegistered(account);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="auth-page auth-page--register">
      <section className="auth-showcase auth-showcase--register" aria-label="Lợi ích ChessHub">
        <Brand />
        <div className="auth-showcase__copy"><p className="eyebrow">Bắt đầu thật đơn giản</p><h1>Tập trung vào<br />việc dạy cờ.</h1><p>ChessHub giữ mọi việc vận hành lớp học của bạn rõ ràng, để bạn có thêm thời gian cho học sinh.</p></div>
        <div className="benefit-list">
          <p><b>01</b><span><strong>Lớp học & lịch dạy</strong>Không bỏ sót bất kỳ buổi học nào.</span></p>
          <p><b>02</b><span><strong>Điểm danh & học phí</strong>Nắm rõ chuyên cần và học phí tạm tính.</span></p>
          <p><b>03</b><span><strong>Bảng đấu Swiss</strong>Tạo sân chơi ngay trong lớp của bạn.</span></p>
        </div>
      </section>
      <section className="auth-panel auth-panel--register">
        <div className="auth-panel__inner">
          <div className="mobile-brand"><Brand compact /></div>
          <p className="eyebrow">Tạo tài khoản giáo viên</p><h2>Bắt đầu với ChessHub</h2><p className="auth-subtitle">Tạo tài khoản để bắt đầu quản lý lớp cờ của bạn.</p>
          <form className="auth-form" onSubmit={submit}>
            <label>Họ và tên<span className="input-wrap"><span aria-hidden="true">♙</span><input value={form.name} onChange={update("name")} required /></span></label>
            <label>Email<span className="input-wrap"><span aria-hidden="true">✉</span><input type="email" value={form.email} onChange={update("email")} required /></span></label>
            <div className="form-grid"><label>Mật khẩu<span className="input-wrap"><span aria-hidden="true">⌑</span><input type="password" value={form.password} onChange={update("password")} minLength="8" required /></span></label><label>Xác nhận mật khẩu<span className="input-wrap"><span aria-hidden="true">⌑</span><input type="password" value={form.confirmPassword} onChange={update("confirmPassword")} minLength="8" required /></span></label></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <label className="check-label check-label--terms"><input type="checkbox" required /><span>Tôi đồng ý với <button type="button" className="text-button">Điều khoản sử dụng</button> và <button type="button" className="text-button">Chính sách bảo mật</button>.</span></label>
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Đang tạo tài khoản…" : <>Tạo tài khoản <span aria-hidden="true">→</span></>}</button>
          </form>
          <p className="auth-switch">Đã có tài khoản? <button type="button" className="text-button text-button--strong" onClick={() => onNavigate("/login")}>Đăng nhập</button></p>
        </div>
      </section>
    </main>
  );
}

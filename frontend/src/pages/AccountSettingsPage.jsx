import { useEffect, useState } from "react";
import { AppChrome } from "../components/layout/AppChrome";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { deleteUnusedAccount, getAccountDeletionEligibility, updateAccountEmail, updateAccountPassword, updateAccountGoogleMeet } from "../services/api";
import "./accountSettings.css";

export function AccountSettingsPage({ account, onAccountUpdated, teacherId, teacherName, onLogout, onNavigate }) {
  const [email, setEmail] = useState(account.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [meetUrl, setMeetUrl] = useState(account.googleMeetUrl ?? "");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState({});
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#google-meet") document.getElementById("google-meet-url")?.focus();
  }, []);

  async function submit(section, event) {
    event.preventDefault();
    if (busy) return;
    setFeedback((previous) => ({ ...previous, [section]: null }));
    if (section === "password" && newPassword !== confirmPassword) {
      setFeedback((previous) => ({ ...previous, password: { error: true, text: "Mật khẩu xác nhận không khớp." } }));
      return;
    }
    setBusy(section);
    try {
      const updated = section === "email" ? await updateAccountEmail({ email })
        : section === "password" ? await updateAccountPassword({ currentPassword, newPassword })
        : await updateAccountGoogleMeet(meetUrl);
      onAccountUpdated(updated);
      if (section === "email") setEmail(updated.email);
      if (section === "meet") setMeetUrl(updated.googleMeetUrl ?? "");
      if (section === "password") { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
      setFeedback((previous) => ({ ...previous, [section]: { text: section === "email" ? "Đã cập nhật email." : section === "password" ? "Đã lưu mật khẩu mới." : "Đã lưu link Google Meet." } }));
    } catch (reason) {
      setFeedback((previous) => ({ ...previous, [section]: { error: true, text: reason.message } }));
    } finally { setBusy(""); }
  }

  useEffect(() => {
    let active = true;
    getAccountDeletionEligibility(teacherId)
      .then((result) => { if (active) setEligibility(result); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [teacherId]);

  async function removeAccount() {
    if (removing || !eligibility?.eligible) return;
    if (!window.confirm("Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan?\n\nLớp học, buổi học, điểm danh, giải đấu và hồ sơ học viên riêng sẽ bị xóa. Trung tâm do bạn sở hữu cùng dữ liệu học viên, thành viên và lời mời của trung tâm cũng sẽ bị xóa. Tài khoản của thành viên khác vẫn được giữ.\n\nThao tác không thể hoàn tác.")) return;
    setRemoving(true);
    setError("");
    try {
      await deleteUnusedAccount(teacherId);
      onLogout();
    } catch (reason) {
      setError(reason.message);
      setRemoving(false);
    }
  }

  const blockers = eligibility?.blockers ?? [];
  return <div className="app-shell"><AppChrome title="Cài đặt tài khoản" activeSection="settings" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard settings-page">
      <AppPageHeader section="Cài đặt" title="Cài đặt tài khoản" description="Quản lý email, mật khẩu và phòng học Google Meet của bạn." />
      <div className="settings-grid">
      <section className="settings-card account-settings-card settings-email" aria-labelledby="account-email-heading">
        <h2 id="account-email-heading">Email</h2>
        <p>Email dùng để đăng nhập và nhận lời mời từ trung tâm.</p>
        <form onSubmit={(event) => submit("email", event)}>
          <SettingsField id="account-email" label="Email"><input id="account-email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} disabled={!!busy} /></SettingsField>
          <SettingsFormFooter feedback={feedback.email}><button className="secondary-button" type="submit" disabled={!!busy || email.trim().toLowerCase() === account.email} aria-busy={busy === "email"}>{busy === "email" ? "Đang lưu…" : "Lưu email"}</button></SettingsFormFooter>
        </form>
      </section>
      <section id="google-meet" className="settings-card account-settings-card settings-meet" aria-labelledby="account-meet-heading">
        <h2 id="account-meet-heading">Google Meet</h2>
        <p>Dùng chung một link cho các lớp học.</p>
        <form onSubmit={(event) => submit("meet", event)}>
          <SettingsField id="google-meet-url" label="Link phòng học"><input id="google-meet-url" type="url" autoComplete="off" maxLength={512} value={meetUrl} onChange={(event) => setMeetUrl(event.target.value)} disabled={!!busy} aria-describedby="meet-url-hint" /><p id="meet-url-hint" className="settings-hint">Dùng link meet.google.com/abc-defg-hij. Để trống nếu muốn gỡ.</p></SettingsField>
          <SettingsFormFooter feedback={feedback.meet}><button className="secondary-button" type="submit" disabled={!!busy || meetUrl.trim() === (account.googleMeetUrl ?? "")} aria-busy={busy === "meet"}>{busy === "meet" ? "Đang lưu…" : "Lưu link Meet"}</button></SettingsFormFooter>
        </form>
      </section>
      <section className="settings-card account-settings-card settings-password" aria-labelledby="account-password-heading">
        <h2 id="account-password-heading">{account.hasPassword ? "Đổi mật khẩu" : "Tạo mật khẩu"}</h2>
        <p>Ít nhất 8 ký tự, tối đa 72 byte.</p>
        <form onSubmit={(event) => submit("password", event)}>
          {account.hasPassword && <SettingsField id="current-password" label="Mật khẩu hiện tại"><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={!!busy} /></SettingsField>}
          <SettingsField id="new-password" label="Mật khẩu mới"><input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={!!busy} /></SettingsField>
          <SettingsField id="confirm-password" label="Xác nhận mật khẩu"><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={!!busy} /></SettingsField>
          <SettingsFormFooter feedback={feedback.password}><button className="secondary-button" type="submit" disabled={!!busy} aria-busy={busy === "password"}>{busy === "password" ? "Đang lưu…" : "Lưu mật khẩu"}</button></SettingsFormFooter>
        </form>
      </section>
      <section className="settings-card settings-delete">
        <h2>Xóa tài khoản & dữ liệu</h2>
        <div className="settings-delete-copy">
        <p>Lớp học, buổi học, điểm danh, giải đấu và hồ sơ học viên riêng sẽ bị xóa vĩnh viễn.</p>
        <p>Nếu bạn sở hữu trung tâm, trung tâm cùng dữ liệu học viên, thành viên và lời mời cũng sẽ bị xóa. Tài khoản của thành viên khác được giữ. Thao tác không thể hoàn tác.</p>
        {error && <p className="settings-message settings-message--error">{error}</p>}
        {!eligibility && !error && <p className="settings-message">Đang kiểm tra dữ liệu liên quan…</p>}
        {blockers.length > 0 && <div className="settings-blockers"><strong>Dữ liệu liên quan sẽ được dọn dẹp khi xóa:</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
        {eligibility?.eligible && <p className="settings-message">Bạn sẽ được yêu cầu xác nhận trước khi xóa tài khoản và dữ liệu.</p>}
        </div>
        <button className="danger-button" type="button" disabled={!eligibility?.eligible || removing} onClick={removeAccount}>{removing ? "Đang xóa…" : "Xóa tài khoản"}</button>
      </section>
      </div>
    </main>
  </div>;
}

function SettingsField({ id, label, children }) {
  return <div className="settings-field"><label htmlFor={id}>{label}</label><div>{children}</div></div>;
}

function SettingsFormFooter({ feedback, children }) {
  return <div className="settings-form-footer"><p className={`settings-form-feedback ${feedback?.error ? "settings-form-feedback--error" : ""}`} role={feedback?.error ? "alert" : "status"}>{feedback?.text ?? ""}</p>{children}</div>;
}

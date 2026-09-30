import { useEffect, useState } from "react";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { deleteUnusedAccount, getAccountDeletionEligibility } from "../services/api";

export function AccountSettingsPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let active = true;
    getAccountDeletionEligibility(teacherId)
      .then((result) => { if (active) setEligibility(result); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [teacherId]);

  async function removeAccount() {
    if (!window.confirm("Xóa vĩnh viễn tài khoản này? Thao tác không thể hoàn tác.")) return;
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
  return <div className="app-shell"><AppSidebar activeSection="settings" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard settings-page">
      <AppPageHeader breadcrumb="Cài đặt" title="Tài khoản & dữ liệu" description="Quản lý vòng đời tài khoản để tránh lưu dữ liệu không còn cần thiết." />
      <section className="settings-card">
        <p className="eyebrow">Dọn dẹp dữ liệu</p>
        <h2>Xóa tài khoản không sử dụng</h2>
        <p>Việc xóa là vĩnh viễn và chỉ khả dụng khi tài khoản không còn dữ liệu nghiệp vụ cần lưu.</p>
        {error && <p className="settings-message settings-message--error">{error}</p>}
        {!eligibility && !error && <p className="settings-message">Đang kiểm tra dữ liệu liên quan…</p>}
        {blockers.length > 0 && <div className="settings-blockers"><strong>Chưa thể xóa vì tài khoản còn:</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
        {eligibility?.eligible && <p className="settings-message settings-message--ready">Tài khoản không còn dữ liệu nghiệp vụ; có thể xóa an toàn.</p>}
        <button className="danger-button" type="button" disabled={!eligibility?.eligible || removing} onClick={removeAccount}>{removing ? "Đang xóa…" : "Xóa vĩnh viễn tài khoản"}</button>
      </section>
    </main>
  </div>;
}

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
  return <div className="app-shell"><AppSidebar activeSection="settings" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard settings-page">
      <AppPageHeader breadcrumb="Cài đặt" title="Tài khoản & dữ liệu" description="Quản lý vòng đời tài khoản để tránh lưu dữ liệu không còn cần thiết." />
      <section className="settings-card">
        <p className="eyebrow">Dọn dẹp dữ liệu</p>
        <h2>Xóa tài khoản & dữ liệu</h2>
        <p>Sau khi bạn xác nhận, tài khoản và dữ liệu liên quan sẽ được xóa vĩnh viễn: lớp học, buổi học, điểm danh, giải đấu và hồ sơ học viên riêng.</p>
        <p>Nếu bạn sở hữu trung tâm, trung tâm và dữ liệu học viên, thành viên, lời mời của trung tâm cũng sẽ bị xóa. Tài khoản của các thành viên khác vẫn được giữ. Thao tác này không thể hoàn tác.</p>
        {error && <p className="settings-message settings-message--error">{error}</p>}
        {!eligibility && !error && <p className="settings-message">Đang kiểm tra dữ liệu liên quan…</p>}
        {blockers.length > 0 && <div className="settings-blockers"><strong>Dữ liệu liên quan sẽ được dọn dẹp khi xóa:</strong><ul>{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
        {eligibility?.eligible && <p className="settings-message">Bạn sẽ được yêu cầu xác nhận trước khi xóa tài khoản và dữ liệu.</p>}
        <button className="danger-button" type="button" disabled={!eligibility?.eligible || removing} onClick={removeAccount}>{removing ? "Đang xóa…" : "Xóa vĩnh viễn tài khoản"}</button>
      </section>
    </main>
  </div>;
}

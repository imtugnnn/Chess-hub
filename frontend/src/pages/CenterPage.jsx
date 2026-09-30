import { useEffect, useState } from "react";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { createCenter, getCenterDashboard, inviteCenterMember, respondToCenterInvitation } from "../services/api";
import "./center.css";

export function CenterPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getCenterDashboard(teacherId)
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [teacherId]);

  async function perform(action, success) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setData(await action());
      window.dispatchEvent(new Event("center-invitations-updated"));
      setNotice(success);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  const isOwner = data?.center?.ownerUserId === teacherId;

  return <div className="app-shell">
    <AppSidebar activeSection="center" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard center-page">
      <AppPageHeader breadcrumb="Trung tâm" title="Trung tâm của bạn" description="Mời giáo viên cùng sử dụng danh sách học sinh. Mỗi người vẫn quản lý lớp học của riêng mình." />
      {error && <p className="settings-message settings-message--error" role="alert">{error}</p>}
      {notice && <p className="settings-message settings-message--ready" role="status">{notice}</p>}
      {!data && !error && <p>Đang tải thông tin trung tâm…</p>}

      {data?.incomingInvitations?.length > 0 && <section className="center-card" aria-labelledby="center-invites-title">
        <h2 id="center-invites-title">Lời mời của bạn <span className="center-count">{data.incomingInvitations.length}</span></h2>
        <div className="center-list">{data.incomingInvitations.map((invitation) => <div className="center-row" key={invitation.id}>
          <div><strong>{invitation.centerName}</strong><small>{invitation.personName} ({invitation.personEmail}) đã mời bạn tham gia.</small></div>
          <div className="center-row-actions">
            <button type="button" className="primary-button" disabled={busy || Boolean(data.center)} onClick={() => perform(() => respondToCenterInvitation(teacherId, invitation.id, true), "Đã tham gia trung tâm.")}>Chấp nhận</button>
            <button type="button" className="center-secondary-button" disabled={busy} onClick={() => perform(() => respondToCenterInvitation(teacherId, invitation.id, false), "Đã từ chối lời mời.")}>Từ chối</button>
          </div>
        </div>)}</div>
        {data.center && <p className="center-hint">Bạn đã thuộc một trung tâm, nên không thể nhận thêm lời mời.</p>}
      </section>}

      {data && !data.center && <section className="center-card" aria-labelledby="center-create-title">
        <h2 id="center-create-title">Tạo trung tâm</h2>
        <p>Học sinh hiện có của bạn sẽ trở thành danh sách dùng chung khi tạo trung tâm.</p>
        <form className="center-form" onSubmit={(event) => { event.preventDefault(); perform(() => createCenter(teacherId, name), "Đã tạo trung tâm."); }}>
          <label htmlFor="center-name">Tên trung tâm</label>
          <div className="center-form-line"><input id="center-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} placeholder="Ví dụ: Trung tâm cờ vua" /><button type="submit" className="primary-button" disabled={busy}>Tạo trung tâm</button></div>
        </form>
      </section>}

      {data?.center && <section className="center-card" aria-labelledby="center-name-title">
        <div className="center-card-heading"><div><span className="eyebrow">Dữ liệu học sinh dùng chung</span><h2 id="center-name-title">{data.center.name}</h2><p>Chủ trung tâm: {data.center.ownerName}</p></div><span className="center-count">{data.members.length} thành viên</span></div>
        <div className="center-list">{data.members.map((member) => <div className="center-row" key={member.id}><div><strong>{member.fullName}</strong><small>{member.email}</small></div><span className="center-role">{member.role === "OWNER" ? "Chủ trung tâm" : "Giáo viên"}</span></div>)}</div>
      </section>}

      {isOwner && <section className="center-card" aria-labelledby="center-invite-title">
        <h2 id="center-invite-title">Mời giáo viên</h2>
        <p>Nhập email của người đã có tài khoản ChessHub. Lời mời sẽ xuất hiện trong ứng dụng của họ.</p>
        <form className="center-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { setData(await inviteCenterMember(teacherId, email)); setEmail(""); setNotice("Đã gửi lời mời trong ứng dụng."); } catch (reason) { setError(reason.message); } finally { setBusy(false); } }}>
          <label htmlFor="center-invite-email">Email</label>
          <div className="center-form-line"><input id="center-invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="giaovien@example.com" /><button type="submit" className="primary-button" disabled={busy}>Gửi lời mời</button></div>
        </form>
        {data.outgoingInvitations.length > 0 && <div className="center-pending"><h3>Đang chờ chấp nhận</h3><div className="center-list">{data.outgoingInvitations.map((invitation) => <div className="center-row" key={invitation.id}><div><strong>{invitation.personName}</strong><small>{invitation.personEmail}</small></div><span className="center-role">Đang chờ</span></div>)}</div></div>}
      </section>}
    </main>
  </div>;
}

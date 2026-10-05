import { useEffect, useState } from "react";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { UiIcon } from "../components/UiIcon";
import { createCenter, getCenterDashboard, getCenterMemberClasses, inviteCenterMember, removeCenterMember, respondToCenterInvitation } from "../services/api";
import { MaterialDialog } from "../components/materials/MaterialDialog";
import "./center.css";

export function CenterPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [memberClasses, setMemberClasses] = useState(null);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState("");
  const [section, setSection] = useState("members");
  const [removingMember, setRemovingMember] = useState(null);
  const [removalError, setRemovalError] = useState("");

  async function removeMember() {
    setBusy(true); setRemovalError(""); setError(""); setNotice("");
    try {
      setData(await removeCenterMember(teacherId, removingMember.id));
      if (memberClasses?.member.id === removingMember.id) setMemberClasses(null);
      setRemovingMember(null);
      setNotice("Đã xóa thành viên khỏi trung tâm.");
      window.dispatchEvent(new Event("center-invitations-updated"));
    } catch (reason) { setRemovalError(reason.message); }
    finally { setBusy(false); }
  }

  async function showClasses(member) {
    setMemberClasses({ member, classes: [] }); setClassesLoading(true); setClassesError("");
    try { const classes = await getCenterMemberClasses(teacherId, member.id); setMemberClasses({ member, classes }); }
    catch (reason) { setClassesError(reason.message); }
    finally { setClassesLoading(false); }
  }

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
      <AppPageHeader section="Trung tâm" title="Trung tâm của bạn" description="Mời giáo viên cùng sử dụng danh sách học sinh. Mỗi người vẫn quản lý lớp học của riêng mình." />
      {error && <p className="settings-message settings-message--error" role="alert">{error}</p>}
      {notice && <p className="settings-message settings-message--ready" role="status">{notice}</p>}
      {!data && !error && <p>Đang tải thông tin trung tâm…</p>}

      {data?.center && <nav className="class-workspace-nav" aria-label="Nội dung trung tâm"><button type="button" aria-pressed={section === "members"} onClick={() => setSection("members")}><UiIcon name="classes" size={18} />Thành viên <small>{data.members.length}</small></button><button type="button" aria-pressed={section === "invitations"} onClick={() => setSection("invitations")}><UiIcon name="center" size={18} />Lời mời <small>{data.incomingInvitations.length + data.outgoingInvitations.length}</small></button></nav>}
      {(!data?.center || section === "invitations") && data?.incomingInvitations?.length > 0 && <section className="center-card" aria-labelledby="center-invites-title">
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

      {data?.center && section === "members" && <section className="center-card" aria-labelledby="center-name-title">
        <div className="center-card-heading"><div><span className="eyebrow">Dữ liệu học sinh dùng chung</span><h2 id="center-name-title">{data.center.name}</h2><p>Chủ trung tâm: {data.center.ownerName}</p></div><span className="center-count">{data.members.length} thành viên</span></div>
        <div className="center-list">{data.members.map((member) => <div className="center-row" key={member.id}><div><strong>{member.fullName}</strong><small>{member.email}</small></div><div className="center-row-actions"><span className="center-role">{member.role === "OWNER" ? "Chủ trung tâm" : "Giáo viên"}</span>{isOwner && <button type="button" className="center-secondary-button" disabled={busy || classesLoading} onClick={() => showClasses(member)}>Xem lớp học</button>}{isOwner && member.role !== "OWNER" && member.id !== teacherId && <button type="button" className="center-remove-button" disabled={busy || classesLoading} onClick={() => { setRemovalError(""); setRemovingMember(member); }}>Xóa khỏi trung tâm</button>}</div></div>)}</div>
      </section>}

      {isOwner && section === "members" && memberClasses && <section className="center-card" aria-labelledby="member-classes-title">
        <div className="center-card-heading"><h2 id="member-classes-title">Lớp của {memberClasses.member.fullName}</h2><button type="button" className="text-button" disabled={classesLoading} onClick={() => setMemberClasses(null)}>Đóng</button></div>
        {classesLoading ? <p role="status">Đang tải lớp học…</p> : classesError ? <p role="alert">{classesError}<button className="text-button" onClick={() => showClasses(memberClasses.member)}>Thử lại</button></p> : memberClasses.classes.length ? <div className="center-list">{memberClasses.classes.map((item) => <div className="center-row" key={item.id}><div><strong>{item.name}</strong><small>{item.schedule}</small></div><span className="center-role">{item.studentCount} học sinh</span></div>)}</div> : <p>Thành viên này chưa có lớp học.</p>}
      </section>}

      {isOwner && section === "invitations" && <section className="center-card" aria-labelledby="center-invite-title">
        <h2 id="center-invite-title">Mời giáo viên</h2>
        <p>Nhập email giáo viên. Người đã có tài khoản nhận lời mời trong ứng dụng; người mới nhận email kèm tài khoản và mật khẩu tạm thời.</p>
        <form className="center-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { const result = await inviteCenterMember(teacherId, email); setData(result.dashboard); setEmail(""); setNotice(result.delivery === "EMAIL" ? "Đã gửi email mời kèm tài khoản và mật khẩu tạm thời." : "Đã gửi lời mời trong ứng dụng."); } catch (reason) { setError(reason.message); } finally { setBusy(false); } }}>
          <label htmlFor="center-invite-email">Email</label>
          <div className="center-form-line"><input id="center-invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="giaovien@example.com" /><button type="submit" className="primary-button" disabled={busy}>Gửi lời mời</button></div>
        </form>
        {data.outgoingInvitations.length > 0 && <div className="center-pending"><h3>Đang chờ chấp nhận</h3><div className="center-list">{data.outgoingInvitations.map((invitation) => <div className="center-row" key={invitation.id}><div><strong>{invitation.personName}</strong><small>{invitation.personEmail}</small></div><span className="center-role">Đang chờ</span></div>)}</div></div>}
      </section>}
      {data?.center && !isOwner && section === "invitations" && data.incomingInvitations.length === 0 && <section className="workspace-card workspace-empty"><UiIcon name="center" size={32} /><h3>Không có lời mời đang chờ</h3><p>Bạn đang là thành viên của {data.center.name}.</p></section>}
      {removingMember && <MaterialDialog title="Xóa thành viên khỏi trung tâm?" busy={busy} className="center-remove-dialog" onClose={() => setRemovingMember(null)}>
        <p>Xóa <strong>{removingMember.fullName}</strong> khỏi {data.center.name}? Thành viên sẽ mất quyền sử dụng danh sách học sinh chung. Tài khoản, lớp học và lịch sử giảng dạy vẫn được giữ. Bạn có thể mời họ tham gia lại sau.</p>
        {removalError && <p className="settings-message settings-message--error" role="alert">{removalError}</p>}
        <div className="center-row-actions"><button type="button" className="center-secondary-button" disabled={busy} data-dialog-autofocus onClick={() => setRemovingMember(null)}>Hủy</button><button type="button" className="center-remove-button" disabled={busy} onClick={removeMember}>{busy ? "Đang xóa…" : "Xóa khỏi trung tâm"}</button></div>
      </MaterialDialog>}
    </main>
  </div>;
}

import { useEffect, useState } from "react";
import { AppChrome } from "../components/layout/AppChrome";
import { ActionFeedback } from "../components/ActionFeedback";
import { useRowHighlight } from "../components/useRowHighlight";
import { UiIcon } from "../components/UiIcon";
import { createCenter, getCenterDashboard, getCenterMemberClasses, inviteCenterMember, removeCenterMember, respondToCenterInvitation } from "../services/api";
import { MaterialDialog } from "../components/materials/MaterialDialog";
import "./center.css";

export function CenterPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [data, setData] = useState(null);
  const { highlightedIds, highlight } = useRowHighlight(teacherId);
  const [inviteState, setInviteState] = useState("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [memberClasses, setMemberClasses] = useState(null);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState("");
  const [query, setQuery] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
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
    setError("");
    getCenterDashboard(teacherId)
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [teacherId, loadAttempt]);

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
  const searchText = query.trim().toLocaleLowerCase("vi");
  const visibleMembers = data?.members.filter((member) => `${member.fullName} ${member.email}`.toLocaleLowerCase("vi").includes(searchText)) ?? [];

  return <div className="app-shell">
    <AppChrome title="Quản lý trung tâm" activeSection="center" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard center-page">
      {error && <div className="settings-message settings-message--error" role="alert">{error}{!data && <button type="button" className="center-secondary-button" onClick={() => setLoadAttempt((value) => value + 1)}>Thử lại</button>}</div>}
      {notice && <p className="settings-message settings-message--ready" role="status">{notice}</p>}
      {!data && !error && <section className="center-card center-loading" role="status" aria-label="Đang tải thông tin trung tâm"><p>Đang tải thông tin trung tâm…</p><span /><span /><span /></section>}

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
          <div className="center-form-line"><input id="center-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} /><button type="submit" className="primary-button" disabled={busy}>Tạo trung tâm</button></div>
        </form>
      </section>}

      {data?.center && <section className="center-identity" aria-labelledby="center-name-title"><h2 id="center-name-title">{data.center.name}</h2><p>Danh sách học sinh dùng chung · Lớp học do từng giáo viên quản lý</p></section>}

      {data?.center && <div className={`center-workspace ${!isOwner ? "center-workspace--member" : ""}`}>

      <div className="center-members-column">
      <section className="center-card center-members" aria-labelledby="center-members-title">
        <div className="center-members-toolbar"><h2 id="center-members-title">Thành viên <span className="center-count">{data.members.length}</span></h2>
        <div className="center-search"><label className="center-sr-only" htmlFor="center-member-search">Tìm thành viên</label><div><UiIcon name="search" size={18} /><input id="center-member-search" type="search" placeholder="Tìm theo tên hoặc email" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}><UiIcon name="close" size={16} /></button>}</div></div></div>
        <div className="center-list">{visibleMembers.map((member) => <div className="center-row center-member-row" key={member.id}><div className="center-member-info"><span className="center-avatar" aria-hidden="true">{member.fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("")}</span><div><div className="center-member-name"><strong>{member.fullName}{member.id === teacherId && <span className="center-self"> (bạn)</span>}</strong><span className="center-role">{member.role === "OWNER" ? "Chủ trung tâm" : "Giáo viên"}</span></div><small>{member.email}</small></div></div><div className="center-row-actions">{isOwner && <button type="button" className="center-secondary-button" disabled={busy || classesLoading} onClick={() => showClasses(member)}>Xem lớp học</button>}{isOwner && member.role !== "OWNER" && member.id !== teacherId && <button type="button" className="center-remove-button center-remove-button--quiet" disabled={busy || classesLoading} onClick={() => { setRemovalError(""); setRemovingMember(member); }}>Xóa khỏi trung tâm</button>}</div></div>)}</div>
        {visibleMembers.length === 0 && <div className="center-empty"><h3>{query ? "Không tìm thấy thành viên" : "Chưa có thành viên"}</h3><p>{query ? "Thử tên hoặc email khác để tìm giáo viên." : "Mời giáo viên tham gia để cùng quản lý học sinh."}</p>{query && <button type="button" className="center-secondary-button" onClick={() => setQuery("")}>Xóa tìm kiếm</button>}</div>}
        {isOwner && <div className="center-pending"><h3>Lời mời đang chờ <span className="center-count">{data.outgoingInvitations.length}</span></h3><p>Giáo viên sẽ xuất hiện trong danh sách thành viên sau khi chấp nhận.</p>{data.outgoingInvitations.length > 0 ? <div className="center-list">{data.outgoingInvitations.map((invitation) => <div className={`center-row ${highlightedIds.has(invitation.id) ? "row-added" : ""}`} key={invitation.id}><div><strong>{invitation.personName || invitation.personEmail}</strong>{invitation.personName && <small>{invitation.personEmail}</small>}</div><span className="center-status">Chờ chấp nhận</span></div>)}</div> : <p className="center-pending-empty">Chưa có lời mời đang chờ.</p>}</div>}
      </section>

      {isOwner && memberClasses && <section className="center-card center-class-detail" aria-labelledby="member-classes-title">
        <div className="center-card-heading"><h2 id="member-classes-title">Lớp của {memberClasses.member.fullName}</h2><button type="button" className="center-secondary-button" aria-label="Đóng lớp học" disabled={classesLoading} onClick={() => setMemberClasses(null)}>Đóng</button></div>
        {classesLoading ? <p role="status">Đang tải lớp học…</p> : classesError ? <p role="alert">{classesError}<button className="text-button" onClick={() => showClasses(memberClasses.member)}>Thử lại</button></p> : memberClasses.classes.length ? <div className="center-list">{memberClasses.classes.map((item) => <div className="center-row" key={item.id}><div><strong>{item.name}</strong><small>{item.schedule}</small></div><span className="center-role">{item.studentCount} học sinh</span></div>)}</div> : <p>Thành viên này chưa có lớp học.</p>}
      </section>}
      </div>

      {isOwner && <aside className="center-card center-invite" aria-labelledby="center-invite-title">
        <h2 id="center-invite-title">Mời giáo viên</h2>
        <form className="center-form" onSubmit={async (event) => { event.preventDefault(); setInviteState("busy"); setBusy(true); setError(""); setNotice(""); try { const result = await inviteCenterMember(teacherId, email); const previous = new Set(data.outgoingInvitations.map(item => item.id)); highlight(result.dashboard.outgoingInvitations.filter(item => !previous.has(item.id)).map(item => item.id)); setData(result.dashboard); setInviteState("success"); setEmail(""); setNotice(result.delivery === "EMAIL" ? "Đã gửi email mời kèm tài khoản và mật khẩu tạm thời." : "Đã gửi lời mời trong ứng dụng."); } catch (reason) { setInviteState("idle"); setError(reason.message); } finally { setBusy(false); } }}>
          <label htmlFor="center-invite-email">Email giáo viên</label>
          <div className="center-form-line"><input id="center-invite-email" disabled={busy} type="email" value={email} onChange={(event) => { setEmail(event.target.value); setInviteState("idle"); }} required maxLength={255} autoComplete="email" /><button type="submit" className="primary-button" aria-busy={inviteState === "busy"} disabled={busy}><ActionFeedback busy={inviteState === "busy"} success={inviteState === "success"} busyLabel="Đang gửi…" successLabel="Đã gửi lời mời">Gửi lời mời</ActionFeedback></button></div>
        </form>
        <details className="center-invite-help"><summary>Cách nhận lời mời</summary><p>Người đã có tài khoản nhận lời mời trong ứng dụng; người mới nhận email kèm tài khoản và mật khẩu tạm thời.</p></details>
      </aside>}


      </div>}
      {removingMember && <MaterialDialog title="Xóa thành viên khỏi trung tâm?" busy={busy} className="center-remove-dialog" onClose={() => setRemovingMember(null)}>
        <p>Xóa <strong>{removingMember.fullName}</strong> khỏi {data.center.name}? Thành viên sẽ mất quyền sử dụng danh sách học sinh chung. Tài khoản, lớp học và lịch sử giảng dạy vẫn được giữ. Bạn có thể mời họ tham gia lại sau.</p>
        {removalError && <p className="settings-message settings-message--error" role="alert">{removalError}</p>}
        <div className="center-row-actions"><button type="button" className="center-secondary-button" disabled={busy} data-dialog-autofocus onClick={() => setRemovingMember(null)}>Hủy</button><button type="button" className="center-remove-button" disabled={busy} onClick={removeMember}>{busy ? "Đang xóa…" : "Xóa khỏi trung tâm"}</button></div>
      </MaterialDialog>}
    </main>
  </div>;
}

import { useEffect, useRef, useState } from "react";
import { UiIcon } from "../UiIcon";
import { Brand } from "../Brand";
import { getCenterDashboard, getTeacherClasses, getTeacherTournaments } from "../../services/api";

export function AppSidebar({ activeSection, teacherId, teacherName, onLogout, onNavigate }) {
  const [classesOpen, setClassesOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [tournamentsOpen, setTournamentsOpen] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [invitationCount, setInvitationCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [classError, setClassError] = useState(false);
  const [tournamentError, setTournamentError] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const profileRef = useRef(null);
  const profileTrigger = useRef(null);
  const mobileTrigger = useRef(null);

  useEffect(() => {
    function dismiss(event) {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "keydown") {
        if (profileOpen) profileTrigger.current?.focus();
        else if (mobileOpen) mobileTrigger.current?.focus();
        setProfileOpen(false); setMobileOpen(false);
      } else if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, [profileOpen, mobileOpen]);

  useEffect(() => {
    let active = true;
    const refresh = () => getCenterDashboard(teacherId).then((result) => { if (active) setInvitationCount(result.incomingInvitations.length); }).catch(() => {});
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("center-invitations-updated", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); window.removeEventListener("center-invitations-updated", refresh); };
  }, [teacherId]);

  useEffect(() => {
    let active = true;
    setClassesLoading(true); setClassError(false);
    getTeacherClasses(teacherId).then((result) => { if (active) setClasses(result); }).catch(() => { if (active) setClassError(true); }).finally(() => { if (active) setClassesLoading(false); });
    return () => { active = false; };
  }, [teacherId, retry]);

  useEffect(() => {
    let active = true;
    setTournamentsLoading(true); setTournamentError(false);
    const refresh = () => getTeacherTournaments(teacherId).then((result) => { if (active) { setTournaments(result); setTournamentError(false); } }).catch(() => { if (active) setTournamentError(true); }).finally(() => { if (active) setTournamentsLoading(false); });
    refresh();
    window.addEventListener("tournaments-updated", refresh);
    return () => { active = false; window.removeEventListener("tournaments-updated", refresh); };
  }, [teacherId, retry]);

  return <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
    <Brand />
    <button ref={mobileTrigger} type="button" className="mobile-nav-toggle" aria-label={mobileOpen ? "Đóng điều hướng" : "Mở điều hướng"} aria-expanded={mobileOpen} aria-controls="app-navigation" onClick={() => setMobileOpen((open) => !open)}><UiIcon name={mobileOpen ? "close" : "menu"} /></button>
    <nav id="app-navigation" aria-label="Điều hướng chính">
      <p className="nav-group-label">Giảng dạy</p>
      <button className={`nav-item ${activeSection === "home" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/homepage")}><span><UiIcon name="home" /></span>Tổng quan</button>
      <button className={`nav-item ${activeSection === "calendar" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/calendar")}><span><UiIcon name="calendar" /></span>Lịch</button>
      <button className={`nav-item ${activeSection === "attendance" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/attendance-summary")}><span><UiIcon name="check" /></span>Điểm danh</button>
      <div className="class-menu">
        <div className={`sidebar-menu-row ${classesOpen ? "sidebar-menu-row--open" : ""} ${activeSection === "classes" ? "sidebar-menu-row--active" : ""}`}><button className={`nav-item class-menu__trigger ${classesOpen ? "class-menu__trigger--open" : ""} ${activeSection === "classes" ? "nav-item--active" : ""}`} type="button" onClick={() => setClassesOpen((open) => !open)} aria-expanded={classesOpen} aria-controls="teacher-classes"><span><UiIcon name="classes" /></span>Lớp học <b>{classesLoading || classError ? "—" : classes.length}</b></button><button className="sidebar-quick-create" type="button" title="Tạo lớp mới" aria-label="Tạo lớp mới" onClick={() => { setMobileOpen(false); onNavigate("/classes/new"); }}><UiIcon name="plus" size={18} /></button><button className="sidebar-menu-chevron" type="button" aria-label={classesOpen ? "Thu gọn lớp học" : "Mở danh sách lớp học"} aria-expanded={classesOpen} aria-controls="teacher-classes" onClick={() => setClassesOpen((open) => !open)}><UiIcon name="chevron" size={16} /></button></div>
        {classesOpen && <div className="class-menu__list" id="teacher-classes">{classesLoading ? <p role="status">Đang tải lớp học…</p> : classError ? <div className="nav-load-error"><p>Không thể tải lớp học.</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div> : classes.length ? classes.map((classroom) => <a key={classroom.id} href={`/classes/${classroom.id}`} onClick={(event) => { event.preventDefault(); setClassesOpen(false); onNavigate(`/classes/${classroom.id}`); }}><span>{classroom.name}</span><small>{classroom.studentCount} học sinh</small></a>) : <p>Chưa có lớp học</p>}</div>}
      </div>
      <p className="nav-group-label">Tổ chức</p>
      <button className={`nav-item ${activeSection === "center" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/center")}><span><UiIcon name="center" /></span>Trung tâm {invitationCount > 0 && <b className="center-nav-badge" aria-label={`${invitationCount} lời mời đang chờ`}>{invitationCount}</b>}</button>
      <div className="class-menu">
        <div className={`sidebar-menu-row ${tournamentsOpen ? "sidebar-menu-row--open" : ""} ${activeSection === "tournaments" ? "sidebar-menu-row--active" : ""}`}><button className={`nav-item class-menu__trigger ${tournamentsOpen ? "class-menu__trigger--open" : ""} ${activeSection === "tournaments" ? "nav-item--active" : ""}`} type="button" onClick={() => setTournamentsOpen((open) => !open)} aria-expanded={tournamentsOpen} aria-controls="teacher-tournaments"><span><UiIcon name="trophy" /></span>Giải đấu <b>{tournamentsLoading || tournamentError ? "—" : tournaments.length}</b></button><button className="sidebar-quick-create" type="button" title="Tạo giải đấu mới" aria-label="Tạo giải đấu mới" onClick={() => { setMobileOpen(false); onNavigate("/tournaments/new"); }}><UiIcon name="plus" size={18} /></button><button className="sidebar-menu-chevron" type="button" aria-label={tournamentsOpen ? "Thu gọn giải đấu" : "Mở danh sách giải đấu"} aria-expanded={tournamentsOpen} aria-controls="teacher-tournaments" onClick={() => setTournamentsOpen((open) => !open)}><UiIcon name="chevron" size={16} /></button></div>
        {tournamentsOpen && <div className="class-menu__list" id="teacher-tournaments">{tournamentsLoading ? <p role="status">Đang tải giải đấu…</p> : tournamentError ? <div className="nav-load-error"><p>Không thể tải giải đấu.</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div> : tournaments.length ? tournaments.map((tournament) => <a key={tournament.id} href={`/tournaments/${tournament.id}`} onClick={(event) => { event.preventDefault(); setTournamentsOpen(false); onNavigate(`/tournaments/${tournament.id}`); }}><span>{tournament.name ?? tournament.className}</span><small>{tournament.status === "COMPLETED" ? "Đã hoàn thành" : `${tournament.roundCount} vòng`}</small></a>) : <p>Chưa có giải đấu</p>}</div>}
      </div>
    </nav>
    <div className="sidebar-bottom"><button className={`nav-item ${activeSection === "settings" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/settings")}><span><UiIcon name="settings" /></span>Cài đặt</button><div className="profile-control" ref={profileRef}><button ref={profileTrigger} type="button" className="profile-card" onClick={() => setProfileOpen((open) => !open)} aria-label={`Tài khoản ${teacherName}`} aria-expanded={profileOpen} aria-controls="profile-actions"><span className="avatar">{initials(teacherName)}</span><span><strong>{teacherName}</strong><small>Giáo viên</small></span><i aria-hidden="true">⌄</i></button>{profileOpen && <div className="profile-actions" id="profile-actions"><p>{teacherName}</p><button type="button" onClick={() => { setProfileOpen(false); onNavigate("/settings"); }}><UiIcon name="settings" size={18} />Cài đặt tài khoản</button><button type="button" onClick={() => { setProfileOpen(false); onLogout(); }}><UiIcon name="logout" size={18} />Đăng xuất</button></div>}</div></div>
  </aside>;
}

function initials(name) { return name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UiIcon } from "../UiIcon";
import { Brand } from "../Brand";
import { getCenterDashboard, getTeacherClasses, getTeacherTournaments } from "../../services/api";
import "./sidebar.css";

export function AppSidebar({ activeSection, teacherId, teacherName, onLogout, onNavigate, variant = "default" }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("chesshub-sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [wideScreen, setWideScreen] = useState(() => window.matchMedia("(min-width: 761px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 761px)");
    const update = () => { setWideScreen(query.matches); setClassesOpen(false); setTournamentsOpen(false); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
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
  const classesTrigger = useRef(null);
  const tournamentsTrigger = useRef(null);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next); setClassesOpen(false); setTournamentsOpen(false); setProfileOpen(false);
    try { localStorage.setItem("chesshub-sidebar-collapsed", String(next)); } catch { /* The sidebar still works without storage. */ }
  }

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
    const refresh = () => getTeacherClasses(teacherId).then((result) => { if (active) { setClasses(result); setClassError(false); } }).catch(() => { if (active) setClassError(true); }).finally(() => { if (active) setClassesLoading(false); });
    refresh();
    window.addEventListener("classes-updated", refresh);
    return () => { active = false; window.removeEventListener("classes-updated", refresh); };
  }, [teacherId, retry]);

  useEffect(() => {
    let active = true;
    setTournamentsLoading(true); setTournamentError(false);
    const refresh = () => getTeacherTournaments(teacherId).then((result) => { if (active) { setTournaments(result); setTournamentError(false); } }).catch(() => { if (active) setTournamentError(true); }).finally(() => { if (active) setTournamentsLoading(false); });
    refresh();
    window.addEventListener("tournaments-updated", refresh);
    return () => { active = false; window.removeEventListener("tournaments-updated", refresh); };
  }, [teacherId, retry]);

  return <aside className={`sidebar ${variant === "reference" ? "sidebar--reference" : ""} ${collapsed ? "sidebar--collapsed" : ""} ${mobileOpen ? "sidebar--open" : ""}`}>
    <div className="sidebar-header"><Brand /><button type="button" className="sidebar-collapse-toggle" aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} aria-expanded={!collapsed} aria-controls="app-navigation" onClick={toggleCollapsed}><UiIcon name="chevron" /></button></div>
    <button ref={mobileTrigger} type="button" className="mobile-nav-toggle" aria-label={mobileOpen ? "Đóng điều hướng" : "Mở điều hướng"} aria-expanded={mobileOpen} aria-controls="app-navigation" onClick={() => setMobileOpen((open) => !open)}><UiIcon name={mobileOpen ? "close" : "menu"} /></button>
    <nav id="app-navigation" aria-label="Điều hướng chính">
      <p className="nav-group-label" aria-hidden={collapsed && wideScreen}>Giảng dạy</p>
      <button aria-current={activeSection === "home" ? "page" : undefined} aria-label="Tổng quan" title="Tổng quan" className={`nav-item ${activeSection === "home" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/homepage")}><span><UiIcon name="home" /></span><span className="sidebar-nav-label">Tổng quan</span></button>
      <button aria-current={activeSection === "calendar" ? "page" : undefined} aria-label="Lịch" title="Lịch" className={`nav-item ${activeSection === "calendar" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/calendar")}><span><UiIcon name="calendar" /></span><span className="sidebar-nav-label">Lịch</span></button>
      <button aria-current={activeSection === "students" ? "page" : undefined} aria-label="Học sinh" title="Học sinh" className={`nav-item ${activeSection === "students" ? "nav-item--active" : ""}`} type="button" onClick={() => { setMobileOpen(false); onNavigate("/students"); }}><span><UiIcon name="students" /></span><span className="sidebar-nav-label">Học sinh</span></button>
      <button aria-current={activeSection === "attendance" ? "page" : undefined} aria-label="Điểm danh" title="Điểm danh" className={`nav-item ${activeSection === "attendance" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/attendance-summary")}><span><UiIcon name="check" /></span><span className="sidebar-nav-label">Điểm danh</span></button>
      <button aria-current={activeSection === "materials" ? "page" : undefined} aria-label="Quản lý bài giảng" title="Quản lý bài giảng" className={`nav-item ${activeSection === "materials" ? "nav-item--active" : ""}`} type="button" onClick={() => { setMobileOpen(false); onNavigate("/materials"); }}><span><UiIcon name="book" /></span><span className="sidebar-nav-label">Quản lý bài giảng</span></button>
      <button aria-current={activeSection === "board" ? "page" : undefined} aria-label="Xếp thế cờ" title="Xếp thế cờ" className={`nav-item ${activeSection === "board" ? "nav-item--active" : ""}`} type="button" onClick={() => { setMobileOpen(false); onNavigate("/board-lab"); }}><span><UiIcon name="board" /></span><span className="sidebar-nav-label">Xếp thế cờ</span></button>
      <div className="class-menu">
        <div className={`sidebar-menu-row ${classesOpen ? "sidebar-menu-row--open" : ""} ${activeSection === "classes" ? "sidebar-menu-row--active" : ""}`}><button ref={classesTrigger} aria-current={activeSection === "classes" ? "page" : undefined} aria-label="Lớp học" title="Lớp học" className={`nav-item class-menu__trigger ${classesOpen ? "class-menu__trigger--open" : ""} ${activeSection === "classes" ? "nav-item--active" : ""}`} type="button" onClick={() => setClassesOpen((open) => !open)} aria-expanded={classesOpen} aria-controls="teacher-classes"><span><UiIcon name="classes" /></span><span className="sidebar-nav-label">Lớp học</span> <b>{classesLoading || classError ? "—" : classes.length}</b></button><button className="sidebar-quick-create" type="button" title="Tạo lớp mới" aria-label="Tạo lớp mới" onClick={() => { setMobileOpen(false); onNavigate("/classes/new"); }}><UiIcon name="plus" size={18} /></button><button className="sidebar-menu-chevron" type="button" aria-label={classesOpen ? "Thu gọn lớp học" : "Mở danh sách lớp học"} aria-expanded={classesOpen} aria-controls="teacher-classes" onClick={() => setClassesOpen((open) => !open)}><UiIcon name="chevron" size={16} /></button></div>
        {classesOpen && <SidebarMenu collapsed={collapsed && wideScreen} triggerRef={classesTrigger} onClose={() => setClassesOpen(false)} label="Lớp học"><div className="class-menu__list" id="teacher-classes">{classesLoading ? <p role="status">Đang tải lớp học…</p> : classError ? <div className="nav-load-error"><p>Không thể tải lớp học.</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div> : classes.length ? classes.map((classroom) => <a key={classroom.id} href={`/classes/${classroom.id}`} onClick={(event) => { event.preventDefault(); setClassesOpen(false); onNavigate(`/classes/${classroom.id}`); }}><span>{classroom.name}</span><small>{classroom.studentCount} học sinh</small></a>) : <p>Chưa có lớp học</p>}</div></SidebarMenu>}
      </div>
      <p className="nav-group-label" aria-hidden={collapsed && wideScreen}>Tổ chức</p>
      <button aria-current={activeSection === "center" ? "page" : undefined} aria-label="Trung tâm" title="Trung tâm" className={`nav-item ${activeSection === "center" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/center")}><span><UiIcon name="center" /></span><span className="sidebar-nav-label">Trung tâm</span> {invitationCount > 0 && <b className="center-nav-badge" aria-label={`${invitationCount} lời mời đang chờ`}>{invitationCount}</b>}</button>
      <div className="class-menu">
        <div className={`sidebar-menu-row ${tournamentsOpen ? "sidebar-menu-row--open" : ""} ${activeSection === "tournaments" ? "sidebar-menu-row--active" : ""}`}><button ref={tournamentsTrigger} aria-current={activeSection === "tournaments" ? "page" : undefined} aria-label="Giải đấu" title="Giải đấu" className={`nav-item class-menu__trigger ${tournamentsOpen ? "class-menu__trigger--open" : ""} ${activeSection === "tournaments" ? "nav-item--active" : ""}`} type="button" onClick={() => setTournamentsOpen((open) => !open)} aria-expanded={tournamentsOpen} aria-controls="teacher-tournaments"><span><UiIcon name="trophy" /></span><span className="sidebar-nav-label">Giải đấu</span> <b>{tournamentsLoading || tournamentError ? "—" : tournaments.length}</b></button><button className="sidebar-quick-create" type="button" title="Tạo giải đấu mới" aria-label="Tạo giải đấu mới" onClick={() => { setMobileOpen(false); onNavigate("/tournaments/new"); }}><UiIcon name="plus" size={18} /></button><button className="sidebar-menu-chevron" type="button" aria-label={tournamentsOpen ? "Thu gọn giải đấu" : "Mở danh sách giải đấu"} aria-expanded={tournamentsOpen} aria-controls="teacher-tournaments" onClick={() => setTournamentsOpen((open) => !open)}><UiIcon name="chevron" size={16} /></button></div>
        {tournamentsOpen && <SidebarMenu collapsed={collapsed && wideScreen} triggerRef={tournamentsTrigger} onClose={() => setTournamentsOpen(false)} label="Giải đấu"><div className="class-menu__list" id="teacher-tournaments">{tournamentsLoading ? <p role="status">Đang tải giải đấu…</p> : tournamentError ? <div className="nav-load-error"><p>Không thể tải giải đấu.</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div> : tournaments.length ? tournaments.map((tournament) => <a key={tournament.id} href={`/tournaments/${tournament.id}`} onClick={(event) => { event.preventDefault(); setTournamentsOpen(false); onNavigate(`/tournaments/${tournament.id}`); }}><span>{tournament.name ?? tournament.className}</span><small>{tournament.status === "COMPLETED" ? "Đã hoàn thành" : `${tournament.roundCount} vòng`}</small></a>) : <p>Chưa có giải đấu</p>}</div></SidebarMenu>}
      </div>
    </nav>
    {variant === "reference" ? <div className="reference-sidebar-footer"><UiIcon name="classes" size={28} /><strong>Sẵn sàng cho lớp mới?</strong><p>Tạo lớp và bắt đầu lên lịch giảng dạy.</p><button type="button" aria-label="Tạo lớp mới từ thanh điều hướng" onClick={() => { setMobileOpen(false); onNavigate("/classes/new"); }}><UiIcon name="plus" size={18} /><span>Tạo lớp mới</span></button></div> : <div className="sidebar-bottom"><div className="profile-control" ref={profileRef}><button ref={profileTrigger} type="button" className="profile-card" onClick={() => setProfileOpen((open) => !open)} aria-label={`Tài khoản ${teacherName}`} aria-expanded={profileOpen} aria-controls="profile-actions"><span className="avatar">{initials(teacherName)}</span><span><strong>{teacherName}</strong><small>Giáo viên</small></span><i aria-hidden="true">⌄</i></button>{profileOpen && <div className="profile-actions" id="profile-actions"><p>{teacherName}</p><button type="button" onClick={() => { setProfileOpen(false); onNavigate("/settings"); }}><UiIcon name="settings" size={18} />Cài đặt tài khoản</button><button type="button" onClick={() => { setProfileOpen(false); onLogout(); }}><UiIcon name="logout" size={18} />Đăng xuất</button></div>}</div></div>}
  </aside>;
}

function SidebarMenu({ collapsed, triggerRef, onClose, label, children }) {
  const popup = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    if (!collapsed) return;
    function place() {
      const bounds = triggerRef.current.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 32);
      setPosition({ left: Math.min(bounds.right + 12, window.innerWidth - width - 16), top: Math.max(16, Math.min(bounds.top, window.innerHeight - 320)), width, maxHeight: Math.min(320, window.innerHeight - 32) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [collapsed, triggerRef]);
  useEffect(() => {
    if (!collapsed) return;
    function dismiss(event) {
      if (event.type === "keydown") {
        if (event.key === "Escape") { onClose(); triggerRef.current?.focus(); }
      } else if (!popup.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) onClose();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", dismiss); document.removeEventListener("keydown", dismiss); };
  }, [collapsed, onClose, triggerRef]);
  useEffect(() => {
    if (collapsed && position) popup.current?.querySelector("a, button")?.focus();
  }, [collapsed, Boolean(position)]);
  return collapsed ? createPortal(<div ref={popup} className="sidebar-flyout" style={position} aria-label={label}>{children}</div>, document.body) : children;
}

function initials(name) { return name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }

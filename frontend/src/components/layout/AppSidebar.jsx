import { useEffect, useState } from "react";
import { Brand } from "../Brand";
import { getTeacherClasses, getTeacherTournaments } from "../../services/api";

export function AppSidebar({ activeSection, teacherId, teacherName, onLogout, onNavigate }) {
  const [classesOpen, setClassesOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [tournamentsOpen, setTournamentsOpen] = useState(false);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    let active = true;
    getTeacherClasses(teacherId).then((result) => { if (active) setClasses(result); }).catch(() => { if (active) setClasses([]); });
    return () => { active = false; };
  }, [teacherId]);

  useEffect(() => {
    let active = true;
    getTeacherTournaments(teacherId).then((result) => { if (active) setTournaments(result); }).catch(() => { if (active) setTournaments([]); });
    return () => { active = false; };
  }, [teacherId]);

  return <aside className="sidebar">
    <Brand />
    <nav aria-label="Điều hướng chính">
      <button className={`nav-item ${activeSection === "home" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/homepage")}><span>⌂</span>Màn hình chính</button>
      <button className={`nav-item ${activeSection === "calendar" ? "nav-item--active" : ""}`} type="button" onClick={() => onNavigate("/calendar")}><span>□</span>Lịch</button>
      <div className="class-menu">
        <button className={`nav-item class-menu__trigger ${classesOpen ? "class-menu__trigger--open" : ""} ${activeSection === "classes" ? "nav-item--active" : ""}`} type="button" onClick={() => setClassesOpen((open) => !open)} aria-expanded={classesOpen} aria-controls="teacher-classes"><span>♙</span>Lớp học <b>{classes.length}</b><i aria-hidden="true">⌄</i></button>
        {classesOpen && <div className="class-menu__list" id="teacher-classes">{classes.length ? classes.map((classroom) => <a key={classroom.id} href={`/classes/${classroom.id}`} onClick={(event) => { event.preventDefault(); setClassesOpen(false); onNavigate(`/classes/${classroom.id}`); }}><span>{classroom.name}</span><small>{classroom.studentCount} học sinh</small></a>) : <p>Chưa có lớp học</p>}</div>}
      </div>
      <div className="class-menu">
        <button className={`nav-item class-menu__trigger ${tournamentsOpen ? "class-menu__trigger--open" : ""} ${activeSection === "tournaments" ? "nav-item--active" : ""}`} type="button" onClick={() => setTournamentsOpen((open) => !open)} aria-expanded={tournamentsOpen} aria-controls="teacher-tournaments"><span>♜</span>Giải đấu <b>{tournaments.length}</b><i aria-hidden="true">⌄</i></button>
        {tournamentsOpen && <div className="class-menu__list" id="teacher-tournaments">{tournaments.length ? tournaments.map((tournament) => <a key={tournament.id} href={`/tournaments/${tournament.id}`} onClick={(event) => { event.preventDefault(); setTournamentsOpen(false); onNavigate(`/tournaments/${tournament.id}`); }}><span>{tournament.className}</span><small>{tournament.status === "COMPLETED" ? "Đã hoàn thành" : `${tournament.roundCount} vòng`}</small></a>) : <p>Chưa có giải đấu</p>}</div>}
      </div>
    </nav>
    <div className="sidebar-bottom"><a className="nav-item" href="#cai-dat"><span>⚙</span>Cài đặt</a><button className="profile-card" onClick={onLogout} title="Đăng xuất"><span className="avatar">{initials(teacherName)}</span><span><strong>{teacherName}</strong><small>Giáo viên</small></span><i aria-hidden="true">⌄</i></button></div>
  </aside>;
}

function initials(name) { return name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }

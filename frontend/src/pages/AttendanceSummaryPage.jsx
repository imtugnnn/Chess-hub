import { useEffect, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { getAttendanceSummary } from "../services/api";
import "./attendanceSummary.css";

export function AttendanceSummaryPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [classes, setClasses] = useState([]);
  const [collapsedClasses, setCollapsedClasses] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAttendanceSummary(teacherId, month).then((result) => {
      if (active) setClasses(result);
    }).catch((requestError) => {
      if (active) { setClasses([]); setError(requestError.message); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, month]);

  const totalStudents = classes.reduce((total, classroom) => total + classroom.students.length, 0);
  function toggleClass(classId) {
    setCollapsedClasses((current) => {
      const next = new Set(current);
      if (next.has(classId)) next.delete(classId); else next.add(classId);
      return next;
    });
  }
  return <div className="app-shell">
    <AppSidebar activeSection="attendance" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard attendance-summary-page">
      <AppPageHeader breadcrumb="Điểm danh" title="Tổng hợp điểm danh" description="Theo dõi số ngày đi học của từng học sinh theo tháng." />
      <section className="attendance-summary-toolbar" aria-label="Chọn tháng báo cáo">
        <div><p className="eyebrow">BÁO CÁO THEO THÁNG</p><h2>{formatMonth(month)}</h2><p>{loading ? "Đang tải dữ liệu…" : `${classes.length} lớp · ${totalStudents} học sinh`}</p></div>
        <label>Tháng<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      </section>
      {error && <p className="attendance-summary-error">{error}</p>}
      {!loading && !error && classes.length === 0 && <section className="attendance-summary-empty"><strong>Chưa có lớp học</strong><p>Hãy tạo lớp học để bắt đầu theo dõi điểm danh.</p></section>}
      <div className="attendance-summary-list">
        {classes.map((classroom) => { const collapsed = collapsedClasses.has(classroom.classId); return <section className="attendance-class-card" key={classroom.classId}>
          <header><div><h2>{classroom.className}</h2><p>{classroom.sessionCount} buổi học · {formatCurrency(classroom.feePerSession)}/buổi</p></div><div className="attendance-class-card__actions"><span>{classroom.students.length} học sinh</span><button type="button" onClick={() => toggleClass(classroom.classId)} aria-expanded={!collapsed} aria-controls={`attendance-class-${classroom.classId}`}>{collapsed ? "Mở rộng" : "Thu gọn"}<i aria-hidden="true">⌃</i></button></div></header>
          {!collapsed && <div id={`attendance-class-${classroom.classId}`}>{loading ? <p className="attendance-summary-loading">Đang tải dữ liệu…</p> : classroom.students.length ? <div className="attendance-table-wrap"><table><thead><tr><th>Học sinh</th><th>Số ngày đi học</th><th>Tiền học</th></tr></thead><tbody>{classroom.students.map((student) => <tr key={student.studentId}><td>{student.studentName}</td><td><strong>{student.attendedDays}</strong> ngày</td><td><strong>{formatCurrency(student.tuitionAmount)}</strong></td></tr>)}</tbody></table></div> : <p className="attendance-summary-loading">Lớp chưa có học sinh.</p>}</div>}
        </section>; })}
      </div>
    </main>
  </div>;
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  return `Tháng ${Number(month)} năm ${year}`;
}

function formatCurrency(value) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value ?? 0); }

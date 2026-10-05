import { useEffect, useState } from "react";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { CalendarFilter } from "../components/CalendarFilter";
import { UiIcon } from "../components/UiIcon";
import { filterAttendanceClasses, getAttendanceTotals, getReportMonth, shiftReportMonth } from "../components/attendanceReport";
import { getAttendanceSummary } from "../services/api";
import "./calendar.css";
import "./attendanceSummary.css";
import "../components/classSchedule.css";

export function AttendanceSummaryPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [month, setMonth] = useState(getReportMonth);
  const [report, setReport] = useState({ month: "", status: "loading", classes: [], error: "" });
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [collapsedClasses, setCollapsedClasses] = useState(() => new Set());
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setReport((current) => ({ ...current, month, status: "loading", error: "" }));
    getAttendanceSummary(teacherId, month).then((classes) => {
      if (!active) return;
      setReport({ month, status: "ready", classes, error: "" });
      setClassFilter((current) => current === "all" || classes.some((classroom) => classroom.classId === current) ? current : "all");
    }).catch((requestError) => {
      if (active) setReport((current) => ({ ...current, month, status: "error", error: requestError.message }));
    });
    return () => { active = false; };
  }, [teacherId, month, retry]);

  const loading = report.month !== month || report.status === "loading";
  const error = loading ? "" : report.error;
  const { classes } = report;
  const visibleClasses = filterAttendanceClasses(classes, classFilter, query);
  const totals = getAttendanceTotals(visibleClasses);
  const filtered = classFilter !== "all" || Boolean(query.trim());
  const allCollapsed = visibleClasses.length > 0 && visibleClasses.every((classroom) => collapsedClasses.has(classroom.classId));
  const classOptions = [{ value: "all", label: "Tất cả lớp học" }, ...classes.map((classroom) => ({ value: classroom.classId, label: classroom.className }))];
  const year = Number(month.slice(0, 4));
  const monthOptions = [];
  for (let optionYear = Math.max(1, year - 1); optionYear <= Math.min(9999, year + 1); optionYear++) {
    for (let number = 1; number <= 12; number++) monthOptions.push({ value: `${String(optionYear).padStart(4, "0")}-${String(number).padStart(2, "0")}`, label: `Tháng ${number}/${optionYear}` });
  }

  function toggleClass(classId) {
    setCollapsedClasses((current) => {
      const next = new Set(current);
      if (next.has(classId)) next.delete(classId); else next.add(classId);
      return next;
    });
  }
  function toggleAll() {
    setCollapsedClasses((current) => {
      const next = new Set(current);
      for (const classroom of visibleClasses) {
        if (allCollapsed) next.delete(classroom.classId); else next.add(classroom.classId);
      }
      return next;
    });
  }
  function clearFilters() { setClassFilter("all"); setQuery(""); }

  return <div className="app-shell">
    <AppSidebar activeSection="attendance" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard attendance-summary-page">
      <AppPageHeader section="Điểm danh" title="Tổng hợp điểm danh" description="Theo dõi số buổi đã học và học phí tạm tính của từng học sinh theo tháng." />
      <section className="attendance-report-panel" aria-label="Bộ lọc tổng hợp điểm danh">
        <div className="attendance-report-toolbar">
          <h2>{formatMonth(month)}</h2>
          <div className="attendance-month-navigation">
            <button type="button" aria-label="Tháng trước" disabled={month === "0001-01"} onClick={() => setMonth((current) => shiftReportMonth(current, -1))}><span className="attendance-previous"><UiIcon name="chevron" size={18} /></span></button>
            <CalendarFilter label="Tháng báo cáo" options={monthOptions} value={month} selectedLabel={`${Number(month.slice(5))}/${month.slice(0, 4)}`} onChange={setMonth} searchable emptyLabel="Không tìm thấy tháng." />
            <button type="button" aria-label="Tháng sau" disabled={month === "9999-12"} onClick={() => setMonth((current) => shiftReportMonth(current, 1))}><UiIcon name="chevron" size={18} /></button>
            <button type="button" className="attendance-current-month" onClick={() => setMonth(getReportMonth())}>Tháng này</button>
          </div>
        </div>
        <div className="attendance-report-filters">
          <CalendarFilter label="Lớp học" options={classOptions} value={classFilter} onChange={setClassFilter} searchable={classes.length > 8} disabled={loading || Boolean(error)} />
          <label className="attendance-student-search">Tìm học sinh<input type="search" placeholder="Nhập tên học sinh…" value={query} onChange={(event) => setQuery(event.target.value)} disabled={loading || Boolean(error)} /></label>
          {filtered && <button type="button" className="attendance-text-button" onClick={clearFilters}>Xóa bộ lọc</button>}
        </div>
        {!loading && !error && <div className="attendance-report-overview" role="status">
          <span className="attendance-overview-caption">{filtered ? "Theo bộ lọc hiện tại" : "Tổng hợp trong tháng"}</span>
          <p><span><strong>{visibleClasses.length}</strong> lớp</span><span><strong>{totals.attendedSessions}</strong> lượt đi học</span><span><strong>{formatCurrency(totals.tuitionAmount)}</strong> học phí tạm tính</span></p>
        </div>}
        <p className="attendance-report-note">Có mặt và đi muộn đều được tính là buổi đã học. Học phí tạm tính = buổi đã học × đơn giá.</p>
      </section>
      <div className="attendance-report-content" aria-busy={loading}>
        {loading ? <div className="attendance-report-feedback" role="status"><UiIcon name="calendar" size={28} /><p>Đang tải tổng hợp điểm danh…</p></div>
          : error ? <div className="attendance-report-feedback attendance-report-feedback--error" role="alert"><p>{error}</p><button type="button" className="secondary-button" onClick={() => setRetry((current) => current + 1)}>Thử lại</button></div>
            : classes.length === 0 ? <div className="attendance-report-feedback"><UiIcon name="classes" size={28} /><h3>Chưa có lớp học</h3><p>Tạo lớp học để bắt đầu theo dõi điểm danh.</p><button type="button" className="secondary-button" onClick={() => onNavigate("/classes/new")}>Tạo lớp mới</button></div>
              : visibleClasses.length === 0 ? <div className="attendance-report-feedback"><h3>Không tìm thấy học sinh phù hợp</h3><p>Thử tên khác hoặc xóa bộ lọc để xem toàn bộ lớp học.</p><button type="button" className="secondary-button" onClick={clearFilters}>Xóa bộ lọc</button></div>
                : <>
                  <div className="attendance-report-results"><p>{visibleClasses.length} lớp · {totals.studentCount} học sinh theo lớp</p><button type="button" className="attendance-text-button" onClick={toggleAll}>{allCollapsed ? "Mở rộng tất cả" : "Thu gọn tất cả"}</button></div>
                  {classes.every((classroom) => classroom.sessionCount === 0) && <p className="attendance-no-sessions">Tháng này chưa có buổi học theo lịch.</p>}
                  <div className="attendance-summary-list">{visibleClasses.map((classroom) => <AttendanceClassCard key={classroom.classId} classroom={classroom} collapsed={collapsedClasses.has(classroom.classId)} searched={Boolean(query.trim())} onToggle={() => toggleClass(classroom.classId)} />)}</div>
                </>}
      </div>
    </main>
  </div>;
}

function AttendanceClassCard({ classroom, collapsed, searched, onToggle }) {
  const total = getAttendanceTotals([classroom]);
  return <section className="attendance-class-card" aria-label={classroom.className}>
    <header className="attendance-class-heading">
      <div><h2>{classroom.className}</h2><p>{searched ? `${classroom.students.length}/${classroom.totalStudentCount}` : classroom.totalStudentCount} học sinh · {classroom.sessionCount} buổi theo lịch · {formatCurrency(classroom.feePerSession)}/buổi</p></div>
      <button type="button" className="attendance-collapse-button" onClick={onToggle} aria-expanded={!collapsed} aria-controls={`attendance-class-${classroom.classId}`} aria-label={`${collapsed ? "Mở rộng" : "Thu gọn"} lớp ${classroom.className}`}><span>{collapsed ? "Mở rộng" : "Thu gọn"}</span><span className={collapsed ? "" : "attendance-chevron-open"}><UiIcon name="chevron" size={16} /></span></button>
    </header>
    <div id={`attendance-class-${classroom.classId}`} hidden={collapsed}>
      {classroom.students.length ? <div className="attendance-report-table-wrap"><table className="attendance-report-table" aria-label={`Tổng hợp điểm danh lớp ${classroom.className}`}>
        <thead><tr><th scope="col">Học sinh</th><th scope="col">Buổi đã học</th><th scope="col">Học phí tạm tính</th></tr></thead>
        <tbody>{classroom.students.map((student) => <tr key={student.studentId}><th scope="row">{student.studentName}{student.leftClass && <span className="student-left-label">Đã rời lớp</span>}</th><td><span className="attendance-mobile-label" aria-hidden="true">Buổi đã học</span><span>{student.attendedDays} buổi</span></td><td><span className="attendance-mobile-label" aria-hidden="true">Học phí tạm tính</span><span>{formatCurrency(student.tuitionAmount)}</span></td></tr>)}</tbody>
        <tfoot><tr><th scope="row" colSpan={2}>{searched ? "Tổng kết quả tìm kiếm" : "Tổng lớp"}</th><td>{formatCurrency(total.tuitionAmount)}</td></tr></tfoot>
      </table></div> : <p className="attendance-class-empty">Lớp chưa có học sinh.</p>}
    </div>
    {collapsed && <p className="attendance-collapsed-total">{searched ? "Học phí kết quả tìm kiếm" : "Học phí tạm tính của lớp"}<strong>{formatCurrency(total.tuitionAmount)}</strong></p>}
  </section>;
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  return `Tháng ${Number(month)} năm ${year}`;
}
function formatCurrency(value) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value ?? 0); }

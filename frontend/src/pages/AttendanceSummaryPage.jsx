import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { CalendarFilter } from "../components/CalendarFilter";
import { UiIcon } from "../components/UiIcon";
import { filterAttendanceClasses, getAttendanceClassRows, getAttendanceStudentGroups, getAttendanceStudentRows, getAttendanceRatio, getScheduledAttendanceClasses, getAttendanceTotals, getReportMonth, shiftReportMonth } from "../components/attendanceReport";
import { getAttendanceSummary } from "../services/api";
import "./calendar.css";
import "./attendanceSummary.css";
import "../components/classSchedule.css";

export function AttendanceSummaryPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [month, setMonth] = useState(getReportMonth);
  const [report, setReport] = useState({ month: "", status: "loading", classes: [], error: "" });
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [classQuery, setClassQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortByTuition, setSortByTuition] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [retry, setRetry] = useState(0);
  const detailTrigger = useRef(null);
  const pageSize = useReportPageSize();

  useEffect(() => {
    let active = true;
    setReport((current) => ({ ...current, month, status: "loading", error: "" }));
    getAttendanceSummary(teacherId, month).then((result) => {
      if (!active) return;
      const classes = getScheduledAttendanceClasses(result);
      setReport({ month, status: "ready", classes, error: "" });
      setClassFilter((current) => current === "all" || classes.some((classroom) => classroom.classId === current) ? current : "all");
      setPage(1);
    }).catch((requestError) => {
      if (active) setReport((current) => ({ ...current, month, status: "error", error: requestError.message }));
    });
    return () => { active = false; };
  }, [teacherId, month, retry]);

  const loading = report.month !== month || report.status === "loading";
  const error = loading ? "" : report.error;
  const { classes } = report;
  const searchingStudents = Boolean(query.trim());
  const visibleClasses = useMemo(() => filterAttendanceClasses(classes, classFilter, query, classQuery), [classes, classFilter, query, classQuery]);
  const totals = useMemo(() => getAttendanceTotals(visibleClasses), [visibleClasses]);
  const classRows = useMemo(() => getAttendanceClassRows(visibleClasses, sortByTuition), [visibleClasses, sortByTuition]);
  const rows = useMemo(() => searchingStudents ? getAttendanceStudentGroups(visibleClasses, sortByTuition) : classRows, [visibleClasses, sortByTuition, searchingStudents, classRows]);
  const filtered = classFilter !== "all" || searchingStudents || Boolean(classQuery.trim());
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedClass = !loading && !error ? classRows.find((classroom) => classroom.classId === selectedClassId) : null;
  const classOptions = [{ value: "all", label: "Tất cả lớp học" }, ...classes.map((classroom) => ({ value: classroom.classId, label: classroom.className }))];
  const year = Number(month.slice(0, 4));
  const monthOptions = [];
  for (let optionYear = Math.max(1, year - 1); optionYear <= Math.min(9999, year + 1); optionYear++) {
    for (let number = 1; number <= 12; number++) monthOptions.push({ value: `${String(optionYear).padStart(4, "0")}-${String(number).padStart(2, "0")}`, label: `Tháng ${number}/${optionYear}` });
  }

  const closeDetails = useCallback(() => setSelectedClassId(null), []);
  function changeMonth(value) { closeDetails(); setPage(1); setMonth(value); }
  function changeFilter(value) { closeDetails(); setPage(1); setClassFilter(value); }
  function changeQuery(value) { closeDetails(); setPage(1); setQuery(value); }
  function changeClassQuery(value) { closeDetails(); setPage(1); setClassQuery(value); }
  function clearFilters() { closeDetails(); setClassFilter("all"); setQuery(""); setClassQuery(""); setPage(1); }

  return <div className="app-shell">
    <AppSidebar activeSection="attendance" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard attendance-summary-page">
      <AppPageHeader section="Điểm danh" title="Tổng hợp điểm danh" description="Xem lượt đi học và học phí tạm tính theo tháng." actions={<div className="attendance-month-navigation">
        <button type="button" aria-label="Tháng trước" disabled={month === "0001-01"} onClick={() => changeMonth(shiftReportMonth(month, -1))}><span className="attendance-previous"><UiIcon name="chevron" size={18} /></span></button>
        <CalendarFilter label="Tháng báo cáo" options={monthOptions} value={month} selectedLabel={`Tháng ${Number(month.slice(5))}/${month.slice(0, 4)}`} onChange={changeMonth} searchable emptyLabel="Không tìm thấy tháng." />
        <button type="button" aria-label="Tháng sau" disabled={month === "9999-12"} onClick={() => changeMonth(shiftReportMonth(month, 1))}><UiIcon name="chevron" size={18} /></button>
        <button type="button" className="attendance-current-month" onClick={() => changeMonth(getReportMonth())}>Tháng này</button>
      </div>} />
      <section className="attendance-metrics" aria-label={`Tổng hợp tháng ${Number(month.slice(5))}/${year}`} aria-busy={loading}>
        <ReportMetric label="Số lớp" value={visibleClasses.length} icon={<UiIcon name="classes" />} unavailable={loading || Boolean(error)} />
        <ReportMetric label="Lượt đi học" value={totals.attendedSessions} icon={<UiIcon name="check" />} unavailable={loading || Boolean(error)} />
        <ReportMetric label="Tổng học phí tạm tính" value={formatCurrency(totals.tuitionAmount)} unavailable={loading || Boolean(error)} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h18v14H3V5m0 4h3m12 6h3" /><circle cx="12" cy="12" r="3" /></svg>} />
      </section>
      <section className="attendance-report-filters" aria-label="Bộ lọc tổng hợp điểm danh">
        <CalendarFilter label="Lớp học" options={classOptions} value={classFilter} onChange={changeFilter} searchable={classes.length > 8} disabled={loading || Boolean(error)} />
        <label className="attendance-student-search">Tìm tên lớp<input type="search" maxLength={255} placeholder="Nhập tên lớp…" value={classQuery} onChange={(event) => changeClassQuery(event.target.value)} disabled={loading || Boolean(error)} /></label>
        <label className="attendance-student-search">Tìm học sinh<input type="search" maxLength={255} placeholder="Nhập tên học sinh…" value={query} onChange={(event) => changeQuery(event.target.value)} disabled={loading || Boolean(error)} /></label>
        {filtered && <button type="button" className="attendance-text-button" onClick={clearFilters}>Xóa bộ lọc</button>}
      </section>
      {filtered && !loading && !error && <p className="attendance-filter-caption" role="status">{searchingStudents ? "Mỗi học sinh hiển thị một lần. Các lớp và tổng học phí tính theo tháng và bộ lọc hiện tại." : "Số tổng và học phí từng lớp đang tính theo bộ lọc hiện tại."}</p>}
      <div className="attendance-report-content" aria-busy={loading}>
        {loading ? <ReportSkeleton pageSize={pageSize} />
          : error ? <div className="attendance-report-feedback attendance-report-feedback--error" role="alert"><h2>Không thể tải báo cáo tháng này</h2><p>{error}</p><button type="button" className="secondary-button" onClick={() => setRetry((current) => current + 1)}>Thử lại</button></div>
            : classes.length === 0 ? <div className="attendance-report-feedback"><h2>Chưa có lớp có lịch học trong tháng</h2><p>Chọn tháng khác hoặc mở lịch để kiểm tra các buổi học.</p><button type="button" className="secondary-button" onClick={() => onNavigate("/calendar")}>Xem lịch học</button></div>
              : visibleClasses.length === 0 ? <div className="attendance-report-feedback"><p>{searchingStudents ? "Không tìm thấy học sinh phù hợp. Thử tên khác hoặc xóa bộ lọc." : "Không tìm thấy lớp phù hợp. Thử tên lớp khác hoặc xóa bộ lọc."}</p><button type="button" className="attendance-text-button" onClick={clearFilters}>Xóa bộ lọc</button></div>
                : <section className="attendance-class-overview" aria-label={searchingStudents ? "Kết quả tìm học sinh" : "Học phí theo lớp"}>
                  <header className="attendance-table-heading"><div><h2>{searchingStudents ? "Kết quả tìm học sinh" : "Học phí theo lớp"}</h2><p>{searchingStudents ? `${rows.length} học sinh · ${visibleClasses.length} lớp` : `${visibleClasses.length} lớp · ${totals.studentCount} học sinh theo lớp`}</p></div><label className="attendance-sort-label">Sắp xếp<select aria-label="Sắp xếp kết quả" value={sortByTuition ? "tuition" : "name"} onChange={event => { setSortByTuition(event.target.value === "tuition"); setPage(1); }}><option value="tuition">Học phí cao nhất</option><option value="name">Tên A–Z</option></select></label></header>
                  {searchingStudents ? <table className="attendance-group-table" aria-label="Học sinh tìm thấy"><thead><tr><th scope="col">Họ tên / Lớp học</th><th scope="col">Lượt đi học</th><th scope="col">Giá buổi học</th><th scope="col">Học phí</th><th scope="col">Tổng</th></tr></thead>{pageRows.map(group => <tbody key={group.studentId} aria-label={group.studentName}>
                    <tr className="attendance-student-group-heading"><th scope="rowgroup" colSpan={4}><strong className="attendance-result-name">{group.studentName}</strong></th><td className="attendance-group-total"><span className="attendance-mobile-label" aria-hidden="true">Tổng học phí</span><strong>{formatCurrency(group.tuitionAmount)}</strong></td></tr>
                    {group.classes.map(student => <tr key={student.classId} className="attendance-student-class-row">
                      <th scope="row"><button className="attendance-group-class-link" aria-label={`Xem lớp ${student.className} của ${group.studentName}`} onClick={() => onNavigate(`/classes/${student.classId}?tab=students`)}>{student.className}<UiIcon name="chevron" size={16} /></button>{student.leftClass && <span className="attendance-student-left">Đã rời lớp</span>}</th>
                      <td><span className="attendance-mobile-label" aria-hidden="true">Lượt đi học</span><span aria-label={`${student.attendedDays} lượt đi học trên ${student.absentSessions == null ? "chưa có số" : Number(student.attendedDays) + Number(student.absentSessions)} lượt đã điểm danh`}>{getAttendanceRatio(student)}</span></td>
                      <td><span className="attendance-mobile-label" aria-hidden="true">Giá buổi học</span><span>{formatCurrency(student.feePerSession)}</span></td>
                      <td className="attendance-class-tuition"><span className="attendance-mobile-label" aria-hidden="true">Học phí</span><span>{formatCurrency(student.tuitionAmount)}</span></td><td className="attendance-group-spacer" aria-hidden="true" />
                    </tr>)}
                  </tbody>)}</table> : <table className="attendance-class-table" aria-label="Tổng hợp điểm danh theo lớp">
                    <thead><tr><th scope="col">Lớp học</th><th scope="col" className="attendance-number">Học sinh</th><th scope="col" className="attendance-number">Lượt đi học</th><th scope="col" className="attendance-number">Học phí tạm tính</th><th scope="col"><span className="attendance-sr-only">Chi tiết</span></th></tr></thead>
                    <tbody>{pageRows.map((classroom) => <tr key={classroom.classId}>
                      <th scope="row">{classroom.className}</th>
                      <td className="attendance-number attendance-class-size">{query.trim() ? `${classroom.students.length}/${classroom.totalStudentCount}` : classroom.students.length}</td>
                      <td className="attendance-number"><span className="attendance-mobile-label" aria-hidden="true">Lượt đi học</span><span>{classroom.totals.attendedSessions}</span></td>
                      <td className="attendance-number attendance-tuition"><span className="attendance-mobile-label" aria-hidden="true">Học phí tạm tính</span><strong>{formatCurrency(classroom.totals.tuitionAmount)}</strong></td>
                      <td><button type="button" className="attendance-row-action" aria-label={`Xem học sinh lớp ${classroom.className}`} aria-haspopup="dialog" onClick={(event) => { detailTrigger.current = event.currentTarget; setSelectedClassId(classroom.classId); }}>Xem học sinh<UiIcon name="chevron" size={16} /></button></td>
                    </tr>)}</tbody>
                  </table>}
                  <ReportPagination count={rows.length} page={currentPage} pageSize={pageSize} label={searchingStudents ? "học sinh" : "lớp"} onChange={setPage} />
                </section>}
      </div>
      <p className="attendance-report-note">Có mặt và đi muộn tính là đi học. Tỷ lệ = đi học / (đi học + vắng), không tính buổi chưa điểm danh. Học phí tạm tính = lượt đi học × đơn giá.</p>
    </main>
    {selectedClass && <AttendanceClassDetails key={selectedClass.classId} classroom={selectedClass} searched={searchingStudents} sortByTuition={sortByTuition} pageSize={pageSize} onClose={closeDetails} returnFocus={detailTrigger} />}
  </div>;
}

function useReportPageSize() {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 1000px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1000px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile ? 4 : 6;
}

function ReportMetric({ label, value, icon, unavailable }) {
  return <div className="attendance-metric"><span>{label}</span><strong>{unavailable ? <span className="attendance-skeleton attendance-skeleton--metric" aria-label="Chưa có số liệu" /> : value}</strong><span className="attendance-metric-icon">{icon}</span></div>;
}

function ReportSkeleton({ pageSize }) {
  return <section className="attendance-class-overview" aria-label="Đang tải tổng hợp điểm danh">
    <header className="attendance-table-heading"><h2>Học phí theo lớp</h2></header>
    <div className="attendance-skeleton-list" aria-hidden="true">{Array.from({ length: pageSize }, (_,index) => <div key={index}><span className="attendance-skeleton" /><span className="attendance-skeleton" /><span className="attendance-skeleton" /></div>)}</div>
    <p className="attendance-sr-only" role="status">Đang tải tổng hợp điểm danh…</p>
  </section>;
}

function ReportPagination({ count, page, pageSize, label, onChange }) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const compact = pageSize === 4;
  const numbers = pageCount <= (compact ? 4 : 7) ? Array.from({ length: pageCount }, (_,index) => index + 1) : [...new Set(compact ? [1, page, pageCount] : [1, page - 1, page, page + 1, pageCount])].filter((number) => number > 0 && number <= pageCount).sort((a,b) => a - b);
  return <div className="attendance-pagination"><p role="status">{count ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} / ${count}` : "0"} {label}</p><nav aria-label={`Phân trang ${label}`}>
    <button type="button" aria-label={`Trang ${label} trước`} disabled={page === 1} onClick={() => onChange(page - 1)}><span className="attendance-previous"><UiIcon name="chevron" size={16} /></span></button>
    {numbers.map((number,index) => <span key={number}>{index > 0 && number - numbers[index - 1] > 1 && <span className="attendance-pagination-gap" aria-hidden="true">…</span>}<button type="button" aria-label={`Trang ${label} ${number}`} aria-current={page === number ? "page" : undefined} onClick={() => onChange(number)}>{number}</button></span>)}
    <button type="button" aria-label={`Trang ${label} sau`} disabled={page === pageCount} onClick={() => onChange(page + 1)}><UiIcon name="chevron" size={16} /></button>
  </nav></div>;
}

function AttendanceClassDetails({ classroom, searched, sortByTuition, pageSize, onClose, returnFocus }) {
  const dialog = useRef(null);
  const [page, setPage] = useState(1);
  const [studentQuery, setStudentQuery] = useState("");
  const matchingStudents = useMemo(() => getAttendanceStudentRows(filterAttendanceClasses([classroom], "all", studentQuery), sortByTuition), [classroom, studentQuery, sortByTuition]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(matchingStudents.length / pageSize)));
  const students = matchingStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    const element = dialog.current;
    const trigger = returnFocus.current;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, [returnFocus]);

  return createPortal(<dialog ref={dialog} className="attendance-details" aria-labelledby="attendance-details-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <header className="attendance-details-heading"><div><h2 id="attendance-details-title">{classroom.className}</h2><p>{classroom.sessionCount} buổi theo lịch · {formatCurrency(classroom.feePerSession)}/buổi</p></div><button type="button" className="attendance-details-close" aria-label="Đóng chi tiết" onClick={onClose} autoFocus><UiIcon name="close" size={18} /></button></header>
    <div className="attendance-details-totals"><span>{searched ? "Học sinh tìm thấy" : "Học sinh"}<strong>{searched ? `${classroom.students.length}/${classroom.totalStudentCount}` : classroom.students.length}</strong></span><span>Lượt đi học<strong>{classroom.totals.attendedSessions}</strong></span><span>{searched ? "Học phí kết quả tìm kiếm" : "Học phí tạm tính"}<strong>{formatCurrency(classroom.totals.tuitionAmount)}</strong></span></div>
    <div className="attendance-details-search"><label className="attendance-student-search">Tìm học sinh trong lớp<input type="search" placeholder="Nhập tên học sinh…" value={studentQuery} onChange={(event) => { setStudentQuery(event.target.value); setPage(1); }} /></label>{studentQuery && <button type="button" className="attendance-text-button" onClick={() => { setStudentQuery(""); setPage(1); }}>Xóa tìm kiếm</button>}</div>
    <div className="attendance-details-body">
      {students.length ? <table className="attendance-student-table" aria-label={`Tổng hợp điểm danh lớp ${classroom.className}`}><thead><tr><th scope="col">Học sinh</th><th scope="col">Buổi đã học</th><th scope="col">Học phí tạm tính</th></tr></thead><tbody>{students.map((student) => <tr key={student.studentId}><th scope="row">{student.studentName}{student.leftClass && <span className="attendance-student-left">Đã rời lớp</span>}</th><td>{student.attendedDays} buổi</td><td>{formatCurrency(student.tuitionAmount)}</td></tr>)}</tbody></table> : <p className="attendance-class-empty">{classroom.students.length ? "Không tìm thấy học sinh phù hợp." : "Lớp chưa có học sinh."}</p>}
    </div>
    <ReportPagination count={matchingStudents.length} page={currentPage} pageSize={pageSize} label="học sinh" onChange={setPage} />
  </dialog>, document.body);
}

function formatCurrency(value) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value ?? 0); }

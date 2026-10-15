import { useEffect, useRef, useState } from "react";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { UiIcon } from "../components/UiIcon";
import { MaterialDialog } from "../components/materials/MaterialDialog";
import { StudentForm } from "../components/StudentForm";
import { getStudentDetail, getStudentOptions } from "../services/api";
import { studentReturnUrl } from "../services/studentNavigation";
import "./students.css";

const dateLabel = date => date ? new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa cập nhật";
const statuses = { PRESENT: "Có mặt", LATE: "Đi muộn", ABSENT: "Vắng" };

export function StudentDetailPage({ studentId, teacherId, teacherName, onLogout, onNavigate, locationSearch = "", registerNavigationGuard }) {
  const creating = studentId === "new";
  const returnUrl = studentReturnUrl(locationSearch);
  const requestedCenter = new URLSearchParams(locationSearch).get("centerId");
  const [detail, setDetail] = useState(null);
  const [options, setOptions] = useState({ centers: [], classes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(creating);
  const [historyPage, setHistoryPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);
  const draft = useRef({ dirty: false, busy: false });
  const heading = useRef(null);
  function requestAction(action) {
    if (draft.current.busy) return false;
    if (draft.current.dirty) { setPendingAction(() => action); return false; }
    return true;
  }
  useEffect(() => {
    registerNavigationGuard?.(requestAction);
    return () => registerNavigationGuard?.(null);
  }, [registerNavigationGuard]);
  useEffect(() => { window.scrollTo(0, 0); heading.current?.focus(); }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    Promise.all([creating ? Promise.resolve(null) : getStudentDetail(teacherId, studentId, historyPage), getStudentOptions(teacherId)])
      .then(([record, choices]) => { if (active) { setDetail(record); setOptions(choices); } })
      .catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, studentId, creating, historyPage, retry]);
  const student = detail?.student;
  function saved(record) {
    draft.current = { dirty: false, busy: false };
    window.dispatchEvent(new Event("students-updated"));
    if (creating) {
      onNavigate(`/students/${record.id}?${new URLSearchParams({ returnTo: returnUrl, ...(record.reused ? {} : { created: "1" }) })}`);
    } else {
      setDetail(current => ({ ...current, student: { ...current.student, ...record, classes: current.student.classes } }));
      setEditing(false); setNotice(`Đã cập nhật hồ sơ ${record.fullName}.`);
    }
  }
  function cancelEdit() {
    const action = () => { draft.current = { dirty: false, busy: false }; setEditing(false); };
    if (requestAction(action)) action();
  }
  return <div className="app-shell"><AppSidebar activeSection="students" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard students-page student-detail-page">
    <AppPageHeader icon={<UiIcon name="students" size={24} />} breadcrumbs={[{ label: "Học sinh", href: returnUrl }]} onNavigate={onNavigate} title={creating ? "Tạo hồ sơ học sinh" : student?.fullName || "Chi tiết học sinh"} description={creating ? "Lưu hồ sơ trước, sau đó thêm học sinh vào lớp." : student?.centerName || (student ? "Hồ sơ cá nhân" : "Thông tin hồ sơ và lịch sử học tập.")} actions={<><button className="secondary-button" onClick={() => onNavigate(returnUrl)}>Quay lại danh sách</button>{student?.canEdit && !editing && <button className="primary-button" onClick={() => { setNotice(""); setEditing(true); }}>Cập nhật</button>}</>} />
    <div ref={heading} tabIndex={-1} className="student-detail-content">
      {(notice || (!creating && new URLSearchParams(locationSearch).get("created") === "1")) && <p className="students-notice" role="status">{notice || `Đã tạo hồ sơ ${student?.fullName ?? "học sinh"}.`}</p>}
      {loading ? <p role="status">Đang tải hồ sơ…</p> : error ? <section className="students-directory students-empty" role="alert"><h2>Không thể tải hồ sơ</h2><p>{error}</p><button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></section> : <>
        <section className="student-detail-profile" aria-labelledby="student-profile-heading"><h2 id="student-profile-heading">Thông tin học sinh</h2>
          {editing ? <StudentForm key={student?.id ?? "new"} student={student} centerId={options.centers.some(c => c.id === requestedCenter) ? requestedCenter : null} teacherId={teacherId} options={options} onSaved={saved} onCancel={creating ? () => onNavigate(returnUrl) : cancelEdit} onDraftChange={value => { draft.current = value; }} /> : student && <><dl className="students-profile-fields student-detail-fields"><div><dt>Họ tên học sinh</dt><dd>{student.fullName}</dd></div><div><dt>Ngày sinh</dt><dd>{dateLabel(student.birthDate)}</dd></div><div><dt>Phụ huynh</dt><dd>{student.parentName || "Chưa cập nhật"}</dd></div><div><dt>Số điện thoại phụ huynh</dt><dd>{student.parentPhoneNumber ? <a href={`tel:${student.parentPhoneNumber}`}>{student.parentPhoneNumber}</a> : "Chưa cập nhật"}</dd></div><div><dt>Số điện thoại học sinh</dt><dd>{student.phoneNumber ? <a href={`tel:${student.phoneNumber}`}>{student.phoneNumber}</a> : "Chưa có"}</dd></div><div><dt>Phạm vi hồ sơ</dt><dd>{student.centerName || "Cá nhân"}</dd></div><div className="student-detail-notes"><dt>Ghi chú</dt><dd>{student.notes || "Chưa có ghi chú"}</dd></div></dl>{!student.canEdit && <p className="students-muted">{student.centerId ? "Chỉ chủ trung tâm được sửa thông tin chung." : "Hồ sơ cũ chỉ có quyền xem; cần xác định người sở hữu trước khi sửa."}</p>}</>}
        </section>
        {student && <div className="student-detail-learning"><section className="student-detail-classes" aria-labelledby="student-classes-heading"><h2 id="student-classes-heading">Lớp đang học với tôi</h2>{student.classes.length ? student.classes.map(c => <button key={c.id} className="students-class-link" onClick={() => onNavigate(`/classes/${c.id}?tab=students`)}><span>{c.name}</span><UiIcon name="chevron" size={18} /></button>) : <p className="students-muted">Chưa tham gia lớp nào của bạn.</p>}<p className="students-muted">Thêm hoặc gỡ học sinh tại màn lớp học.</p></section>
          <section className="student-detail-history" aria-labelledby="student-history-heading"><h2 id="student-history-heading">Lịch sử chuyên cần</h2><p className="students-muted">Các buổi thuộc lớp bạn quản lý, kể cả lớp học sinh đã rời.</p>{detail.history.length ? <><ul className="students-history">{detail.history.map(a => <li key={a.sessionId}><div><strong>{dateLabel(a.date)}</strong><span>{a.className}</span></div><span className={`students-attendance students-attendance--${a.status.toLowerCase()}`}>{statuses[a.status] ?? a.status}</span></li>)}</ul><div className="students-history-pages"><button className="secondary-button" disabled={editing || historyPage === 0} onClick={() => setHistoryPage(p => p - 1)}>Mới hơn</button><span>{historyPage * 20 + 1}–{Math.min((historyPage + 1) * 20, detail.historyTotal)} / {detail.historyTotal}</span><button className="secondary-button" disabled={editing || (historyPage + 1) * 20 >= detail.historyTotal} onClick={() => setHistoryPage(p => p + 1)}>Cũ hơn</button></div></> : <p className="students-muted">Chưa có dữ liệu điểm danh.</p>}</section></div>}
      </>}
    </div>
    {pendingAction && <MaterialDialog title="Hồ sơ chưa được lưu" onClose={() => setPendingAction(null)}><p>Bạn có thay đổi chưa lưu. Rời biểu mẫu sẽ bỏ các thay đổi này.</p><div className="students-form-actions"><button className="secondary-button" onClick={() => setPendingAction(null)}>Tiếp tục nhập</button><button className="primary-button" onClick={() => { const action = pendingAction; draft.current = { dirty: false, busy: false }; setPendingAction(null); action(); }}>Bỏ thay đổi</button></div></MaterialDialog>}
  </main></div>;
}

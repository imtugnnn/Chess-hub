import "./studentOptionalFields.css";

export function StudentOptionalFields({ values, onChange, readOnly = false }) {
  return <>
    <label><span>Số điện thoại học sinh <span className="student-optional-label">(không bắt buộc)</span></span><input aria-label="Số điện thoại học sinh" type="tel" maxLength={30} autoComplete="off" readOnly={readOnly} value={values.phoneNumber ?? ""} onChange={event => onChange("phoneNumber", event.target.value)} /></label>
    <label className="student-notes-field"><span>Ghi chú <span className="student-optional-label">(không bắt buộc)</span></span><textarea aria-label="Ghi chú" maxLength={4000} rows={3} readOnly={readOnly} value={values.notes ?? ""} onChange={event => onChange("notes", event.target.value)} /><small className="student-entry-help">Enter để tiếp tục; Shift+Enter để xuống dòng ghi chú.</small></label>
  </>;
}

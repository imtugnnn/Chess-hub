import "./studentOptionalFields.css";

export function StudentOptionalFields({ values, onChange }) {
  return <>
    <label><span>Số điện thoại học sinh <span className="student-optional-label">(không bắt buộc)</span></span><input aria-label="Số điện thoại học sinh" type="tel" maxLength={30} autoComplete="off" value={values.phoneNumber ?? ""} onChange={event => onChange("phoneNumber", event.target.value)} placeholder="Nhập số điện thoại nếu có" /></label>
    <label className="student-notes-field"><span>Ghi chú <span className="student-optional-label">(không bắt buộc)</span></span><textarea aria-label="Ghi chú" maxLength={4000} rows={3} value={values.notes ?? ""} onChange={event => onChange("notes", event.target.value)} placeholder="Thông tin cần lưu ý về học sinh…" /></label>
  </>;
}

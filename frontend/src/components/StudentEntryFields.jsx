import { useEffect, useId, useState } from 'react';
import { getStudents } from '../services/api';
import { StudentOptionalFields } from './StudentOptionalFields';
import { advanceStudentField } from './studentEntry';
import './studentEntry.css';

export function StudentEntryFields({ values, onChange, onSelect, teacherId, onComplete, required = true, suggestionsEnabled = true, scope = 'all', optionalFieldsVisible = true, nameField = null }) {
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const selected = Boolean(values.studentId);
  useEffect(() => {
    let live = true;
    setMatches([]); setActive(-1); setError(''); setSearching(false);
    if (!suggestionsEnabled || selected || values.fullName.trim().length < 2) return;
    setSearching(true);
    const timer = setTimeout(() => getStudents(teacherId, { query: values.fullName.trim(), scope, enrollment: 'all', page: 0, size: 25 })
      .then(result => { if (live) setMatches(result.items); })
      .catch(() => { if (live) setError('Không thể tải gợi ý. Bạn có thể thử nhập lại tên.'); })
      .finally(() => { if (live) setSearching(false); }), 220);
    return () => { live = false; clearTimeout(timer); };
  }, [values.fullName, selected, teacherId, suggestionsEnabled, scope]);
  function select(student) { onSelect(student); setOpen(false); setActive(-1); }
  return <div className="student-entry-fields" onKeyDown={event => advanceStudentField(event, onComplete)}>
    {nameField ?? <label className="student-entry-name">Họ và tên học sinh<span className="student-name-autocomplete">
      <input value={values.fullName} maxLength={255} required={required} pattern=".*\S.*" autoComplete="off"
        role={suggestionsEnabled ? 'combobox' : undefined} aria-autocomplete={suggestionsEnabled ? 'list' : undefined}
        aria-expanded={suggestionsEnabled ? open && matches.length > 0 : undefined} aria-controls={suggestionsEnabled ? `${id}-matches` : undefined}
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        onFocus={() => setOpen(true)} onBlur={event => { if (!event.currentTarget.parentElement.contains(event.relatedTarget)) setOpen(false); }}
        onChange={event => { onChange('fullName', event.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (open && matches.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setActive(current => event.key === 'ArrowDown' ? (current + 1) % matches.length : (current <= 0 ? matches.length - 1 : current - 1)); }
          if (event.key === 'Escape') { setOpen(false); event.stopPropagation(); }
          if (event.key === 'Enter') { if (open && active >= 0) { event.preventDefault(); event.stopPropagation(); select(matches[active]); } else setOpen(false); }
        }} />
      {suggestionsEnabled && <span id={`${id}-matches`} className="student-name-suggestions" role="listbox" aria-label="Gợi ý học sinh" hidden={!open || !matches.length}>{matches.map((student, index) => <button type="button" role="option" id={`${id}-${index}`} key={student.id} aria-selected={index === active} onMouseDown={event => event.preventDefault()} onClick={() => select(student)}><strong>{student.fullName}</strong><small>{student.birthDate ? new Date(`${student.birthDate}T12:00:00`).toLocaleDateString('vi-VN') : 'Chưa cập nhật ngày sinh'}{student.parentPhoneNumber ? ` · ${student.parentPhoneNumber}` : ''}</small></button>)}</span>}
      {open && searching && <span className="student-name-status" role="status">Đang tìm học sinh…</span>}
      {open && error && <span className="student-name-status" role="alert">{error}</span>}
    </span></label>}
    {selected && <p className="student-entry-help" role="status">Đã chọn hồ sơ có sẵn. Thông tin và lịch sử học sinh được giữ nguyên. Đổi tên để nhập học sinh mới.</p>}
    {optionalFieldsVisible && <><label>Ngày sinh (không bắt buộc)<input type="date" value={values.birthDate} onChange={event => onChange('birthDate', event.target.value)} readOnly={selected} max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })} /></label>
    <label>Họ và tên phụ huynh (không bắt buộc)<input maxLength={255} value={values.parentName} readOnly={selected} onChange={event => onChange('parentName', event.target.value)} /></label>
    <label>Số điện thoại phụ huynh (không bắt buộc)<input type="tel" maxLength={30} value={values.parentPhoneNumber} readOnly={selected} onChange={event => onChange('parentPhoneNumber', event.target.value)} /></label>
    <StudentOptionalFields values={values} onChange={onChange} readOnly={selected} /></>}
  </div>;
}

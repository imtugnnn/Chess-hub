import { useEffect, useId, useRef, useState } from 'react';
import { getStudents } from '../services/api';
import { StudentEntryFields } from './StudentEntryFields';
import { emptyStudentValues, studentSuggestionValues } from './studentEntry';
import { UiIcon } from './UiIcon';
import { ClassDraftStudentImport } from './ClassDraftStudentImport';

const newDraft = () => ({ ...emptyStudentValues(), draftId: crypto.randomUUID() });
const nameKey = name => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
function rosterConflict(students, candidate, exceptId) {
  return students.some(row => row.draftId !== exceptId && ((candidate.studentId && row.studentId === candidate.studentId) || nameKey(row.fullName) === nameKey(candidate.fullName)));
}

export function CreateClassRoster({ students, onChange, teacherId, scope, scopeLabel, disabled, onPendingChange }) {
  const [mode, setMode] = useState('entry');
  const [draft, setDraft] = useState(newDraft);
  const [editing, setEditing] = useState(null);
  const [optional, setOptional] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paste, setPaste] = useState('');
  const [excelPending, setExcelPending] = useState(false);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ key: '', state: 'idle', items: [], total: 0 });
  const [newStudent, setNewStudent] = useState(false);
  const [active, setActive] = useState(-1);
  const resultsId = useId();
  const query = draft.fullName.trim();
  const [retry, setRetry] = useState(0);
  const searchKey = JSON.stringify([teacherId, scope, query, page, retry]);
  const resolved = Boolean(draft.studentId || newStudent);
  const phase = query.length < 2 ? 'short' : result.key === searchKey ? result.state : 'loading';
  const candidates = phase === 'ready' ? result.items : [];
  const editorRef = useRef(null);
  const completeRef = useRef(null);
  const addRef = useRef(null);
  const importRef = useRef(null);
  const [menu, setMenu] = useState(false);
  const dirty = Boolean(excelPending || editing || Object.entries(draft).some(([key, value]) => !['draftId', 'studentId'].includes(key) && String(value ?? '').trim()) || paste.trim());
  useEffect(() => { onPendingChange(dirty); }, [dirty, onPendingChange]);
  useEffect(() => {
    function dismiss(event) {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'keydown' || !importRef.current?.contains(event.target)) setMenu(false);
    }
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', dismiss);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss); };
  }, []);
  useEffect(() => {
    if (mode !== 'entry' || resolved || query.length < 2) return;
    let live = true;
    setResult({ key: searchKey, state: 'loading', items: [], total: 0 });
    const timer = setTimeout(() => getStudents(teacherId, { query, scope, enrollment: 'all', page, size: 25 })
      .then(data => { if (live) setResult({ ...data, key: searchKey, state: 'ready' }); })
      .catch(() => { if (live) setResult({ key: searchKey, state: 'error', items: [], total: 0 }); }), 220);
    return () => { live = false; clearTimeout(timer); };
  }, [mode, resolved, teacherId, scope, query, page, retry, searchKey]);
  useEffect(() => { setPage(0); setActive(-1); }, [scope]);
  useEffect(() => {
    if (!resolved && active >= 0 && result.key === searchKey) document.getElementById(`${resultsId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, resolved, result.key, searchKey, resultsId]);
  function changeName(value) {
    setDraft(current => ({ ...(current.studentId ? { ...emptyStudentValues(), draftId: current.draftId } : current), fullName: value }));
    setNewStudent(false); setPage(0); setActive(-1); setError('');
  }
  function chooseProfile(student) {
    if (rosterConflict(students, { ...student, studentId: student.id }, editing)) return;
    setDraft(current => ({ ...current, ...studentSuggestionValues(student) }));
    setNewStudent(false); setActive(-1); setError('');
    requestAnimationFrame(() => completeRef.current?.focus());
  }
  function nameKeyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setActive(-1); return; }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && !resolved && candidates.length) {
      event.preventDefault(); event.stopPropagation();
      const eligible = candidates.map((student, index) => rosterConflict(students, { ...student, studentId: student.id }, editing) ? -1 : index).filter(index => index >= 0);
      if (!eligible.length) return;
      const at = eligible.indexOf(active);
      setActive(eligible[(at + (event.key === 'ArrowDown' ? 1 : at < 0 ? 0 : -1) + eligible.length) % eligible.length]);
      return;
    }
    if (event.key === 'Enter' && !resolved) {
      event.preventDefault(); event.stopPropagation();
      if (active >= 0 && candidates[active]) chooseProfile(candidates[active]);
    }
  }
  function focusEditor() { requestAnimationFrame(() => editorRef.current?.querySelector('input, textarea')?.focus()); }
  function show(next) {
    setMenu(false);
    if (dirty && next !== mode) { setError('Hãy thêm hoặc hủy nội dung đang nhập trước khi chuyển cách thêm.'); return; }
    setMode(next); setError(''); setMenu(false);
    if (next === 'entry') focusEditor();
  }
  function cancel() {
    setDraft(newDraft()); setEditing(null); setPaste(''); setNewStudent(false); setActive(-1); setOptional(false); setError(''); setMode(null);
    requestAnimationFrame(() => addRef.current?.focus());
  }
  function saveEntry() {
    if (!resolved) { setError('Hãy chọn hồ sơ có sẵn hoặc chọn thêm học sinh mới trước khi thêm vào danh sách.'); return; }
    const name = draft.fullName.trim();
    if (!name) { setError('Vui lòng nhập họ tên học sinh.'); focusEditor(); return; }
    if (draft.birthDate && draft.birthDate > new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })) { setOptional(true); setError('Ngày sinh không được ở tương lai.'); return; }
    const invalid = [...editorRef.current.querySelectorAll('input, textarea')].find(input => !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    if (rosterConflict(students, draft, editing)) { setError('Tên hoặc hồ sơ này đã có trong danh sách. Hãy kiểm tra lại trước khi thêm.'); return; }
    const next = { ...draft, fullName: name };
    onChange(editing ? students.map(row => row.draftId === editing ? next : row) : [...students, next]);
    setNotice(editing ? `Đã cập nhật ${name} trong danh sách chờ.` : `Đã thêm ${name} vào danh sách chờ.`);
    setDraft(newDraft()); setEditing(null); setNewStudent(false); setPage(0); setActive(-1); setOptional(false); setError(''); focusEditor();
  }
  function pasteRows() { return paste.split(/\r?\n/).map(line => line.trim()).filter(Boolean); }
  function savePaste() {
    const names = pasteRows();
    if (!names.length || names.length > 1000) { setError('Hãy nhập từ 1 đến 1.000 tên, mỗi tên một dòng.'); return; }
    if (names.some(name => name.includes('\t') || name.length > 255)) { setError('Chỉ dán một cột họ tên, tối đa 255 ký tự mỗi tên. Dùng nhập Excel nếu có nhiều cột.'); return; }
    const next = [...students];
    for (const name of names) {
      const row = { ...newDraft(), fullName: name };
      if (rosterConflict(next, row)) { setError(`Tên “${name}” bị lặp. Chỉnh lại danh sách trước khi thêm.`); return; }
      next.push(row);
    }
    onChange(next); setNotice(`Đã thêm ${names.length} học sinh vào danh sách chờ.`); setPaste(''); setMode(null);
    requestAnimationFrame(() => addRef.current?.focus());
  }
  return <section className="create-class-column create-roster" aria-labelledby="student-information-title">
    <div className="create-roster-heading"><h2 id="student-information-title">Danh sách học sinh</h2><span>{students.length} học sinh</span></div>
    <p className="create-roster-description">Không bắt buộc. Danh sách được lưu khi tạo lớp.</p>
    <fieldset disabled={disabled} className="create-roster-controls">
      <div className="create-roster-toolbar">
        <button ref={addRef} type="button" className={mode === 'entry' ? 'primary-button' : 'secondary-button'} aria-expanded={mode === 'entry'} onClick={() => show('entry')}><UiIcon name="plus" size={18} />Thêm học sinh</button>
        <div className="roster-import-menu" ref={importRef}><button type="button" className="secondary-button" aria-expanded={menu} aria-controls="roster-import-options" onClick={() => setMenu(value => !value)}>Nhập danh sách<UiIcon name="chevron" size={16} /></button>
          {menu && <div id="roster-import-options" className="roster-import-options"><button type="button" onClick={() => show('paste')}>Dán danh sách tên</button><button type="button" onClick={() => show('excel')}>Nhập từ Excel</button></div>}
        </div>
      </div>
      {mode === 'entry' && <div className="roster-editor" ref={editorRef}>
        <h3>{editing ? 'Sửa học sinh' : 'Thêm học sinh'}</h3>
        <p className="student-entry-help">Phạm vi tìm kiếm: <strong>{scopeLabel || (scope === 'personal' ? 'Cá nhân' : 'Trung tâm của lớp')}</strong></p>
        <StudentEntryFields values={draft} teacherId={teacherId} scope={scope} optionalFieldsVisible={optional} required={false} suggestionsEnabled={false}
          nameField={<label className="student-entry-name">Họ và tên học sinh<input maxLength={255} value={draft.fullName} autoComplete="off" role="combobox" aria-autocomplete="list" aria-controls={!resolved ? resultsId : undefined} aria-expanded={!resolved && candidates.length > 0} aria-activedescendant={!resolved && active >= 0 && candidates[active] ? `${resultsId}-${active}` : undefined} onChange={event => changeName(event.target.value)} onKeyDown={nameKeyDown} /></label>}
          onChange={(key, value) => { setDraft(current => ({ ...current, [key]: value })); setError(''); }}
          onComplete={() => completeRef.current?.focus()} />
        {!resolved && <div className="roster-identity-search" aria-busy={phase === 'loading'}>
          {phase === 'short' && <p className="student-entry-help">Nhập ít nhất 2 ký tự để tìm hồ sơ có sẵn trước khi thêm.</p>}
          {phase === 'loading' && <p className="student-entry-help" role="status">Đang tìm học sinh…</p>}
          {phase === 'error' && <div className="roster-search-error"><p role="alert">Chưa kiểm tra được hồ sơ trong phạm vi này. Nội dung đang nhập được giữ nguyên.</p><button type="button" className="secondary-button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>}
          <div id={resultsId} role="listbox" aria-label="Hồ sơ học sinh phù hợp" hidden={!candidates.length} className="roster-identity-results">{candidates.map((student, index) => {
            const used = rosterConflict(students, { ...student, studentId: student.id }, editing);
            const sameProfile = students.some(row => row.draftId !== editing && row.studentId === student.id);
            return <button key={student.id} type="button" role="option" id={`${resultsId}-${index}`} aria-selected={active === index} disabled={used} onClick={() => chooseProfile(student)}><span><strong>{student.fullName}</strong><small>{formatRosterBirth(student.birthDate)}{student.parentName ? ` · PH: ${student.parentName}` : ''}{student.parentPhoneNumber ? ` · ${student.parentPhoneNumber}` : ''}</small></span><span className="roster-profile-action">{used ? sameProfile ? 'Đã thêm' : 'Trùng tên trong danh sách' : 'Dùng hồ sơ này'}</span></button>;
          })}</div>
          {phase === 'ready' && <>
            <p className="student-entry-help" role="status">{result.total ? `Tìm thấy ${result.total} hồ sơ phù hợp. Chọn đúng học sinh để giữ thông tin và lịch sử.` : 'Chưa tìm thấy học sinh trong phạm vi này.'}</p>
            {result.total > 25 && <div className="roster-picker-pages"><button className="secondary-button" type="button" disabled={!page} onClick={() => { setPage(value => value - 1); setActive(-1); }}>Trước</button><span>Trang {page + 1} / {Math.ceil(result.total / 25)}</span><button className="secondary-button" type="button" disabled={(page + 1) * 25 >= result.total} onClick={() => { setPage(value => value + 1); setActive(-1); }}>Sau</button></div>}
            <button type="button" className="roster-new-student" onClick={() => { setNewStudent(true); setActive(-1); setError(''); requestAnimationFrame(() => completeRef.current?.focus()); }}><UiIcon name="plus" size={16} /><span>{result.total ? 'Không phải các học sinh này? ' : ''}Thêm học sinh mới: <strong>{query}</strong></span></button>
          </>}
        </div>}
        {resolved && <p className="roster-identity-selected" role="status">{draft.studentId ? 'Đang dùng hồ sơ có sẵn.' : 'Đang nhập học sinh mới.'} <button type="button" onClick={() => { setNewStudent(false); if (draft.studentId) setDraft(current => ({ ...emptyStudentValues(), draftId: current.draftId, fullName: current.fullName })); setPage(0); setActive(-1); }}>Tìm lại hồ sơ</button></p>}
        <button className="roster-details-toggle" type="button" aria-expanded={optional} onClick={() => setOptional(value => !value)}><UiIcon name={optional ? 'close' : 'plus'} size={16} />{optional ? 'Thu gọn thông tin' : 'Bổ sung thông tin'}</button>
        <p className="student-entry-help">Chọn hồ sơ cũ hoặc chủ động thêm mới. Danh sách chỉ được lưu khi tạo lớp.</p>
        <div className="roster-editor-actions"><button type="button" className="cancel-button" onClick={cancel}>Hủy</button><button type="button" ref={completeRef} className="primary-button" disabled={!resolved} onClick={saveEntry}>{editing ? 'Cập nhật danh sách' : 'Thêm vào danh sách'}</button></div>
      </div>}
      {mode === 'excel' && <ClassDraftStudentImport teacherId={teacherId} scope={scope} students={students} onPendingChange={setExcelPending} onClose={cancel} onApply={next => {
        onChange([...students, ...next]); setNotice(`Đã đưa ${next.length} học sinh từ Excel vào danh sách chờ.`); setMode(null); setExcelPending(false); setError(''); requestAnimationFrame(() => addRef.current?.focus());
      }} />}
      {mode === 'paste' && <div className="roster-editor" ref={editorRef}>
        <h3>Dán danh sách tên</h3><label>Họ tên học sinh, mỗi dòng một tên<textarea rows={5} value={paste} onChange={event => { setPaste(event.target.value); setError(''); }} /></label>
        <p className="student-entry-help">Dán một cột tên từ Excel hoặc nhập từng dòng. Có thể bổ sung thông tin sau.</p>
        <div className="roster-paste-preview"><strong>{pasteRows().length} tên</strong>{pasteRows().slice(0, 5).map((name, index) => <span key={index}>{index + 1}. {name}</span>)}{pasteRows().length > 5 && <small>Và {pasteRows().length - 5} tên khác</small>}</div>
        <div className="roster-editor-actions"><button type="button" className="cancel-button" onClick={cancel}>Hủy</button><button type="button" className="primary-button" disabled={!paste.trim()} onClick={savePaste}>Thêm vào danh sách</button></div>
      </div>}
      {error && <p role="alert" className="roster-error">{error}</p>}
      {notice && <p role="status" className="roster-notice">{notice}</p>}
      {students.length ? <div className="roster-table" role="table" aria-label="Danh sách học sinh chờ tạo lớp">
        <div className="roster-table-head" role="row"><span role="columnheader">Họ và tên</span><span role="columnheader">Ngày sinh</span><span role="columnheader">Thông tin</span><span role="columnheader" className="roster-action-heading">Thao tác</span></div>
        {students.map(student => <div className="roster-table-row" role="row" key={student.draftId}>
          <strong role="cell" className="roster-student-name">{student.fullName}</strong><span role="cell" className="roster-student-birth">{formatRosterBirth(student.birthDate)}</span><span role="cell"><span className={`roster-badge ${student.studentId ? 'roster-badge--existing' : ''}`}>{student.studentId ? 'Hồ sơ có sẵn' : 'Nhập mới'}</span></span>
          <span role="cell" className="roster-row-actions"><button type="button" className="roster-icon-button" aria-label={`Sửa ${student.fullName}`} onClick={() => { if (dirty) { setError('Hãy thêm hoặc hủy nội dung đang nhập trước khi sửa học sinh khác.'); return; } setDraft({ ...student }); setEditing(student.draftId); setNewStudent(!student.studentId); setPage(0); setActive(-1); setMode('entry'); setOptional(false); setError(''); focusEditor(); }}><UiIcon name="edit" size={17} /></button><button type="button" className="roster-icon-button roster-remove" disabled={editing === student.draftId} aria-label={`Bỏ ${student.fullName} khỏi danh sách`} onClick={() => { onChange(students.filter(row => row.draftId !== student.draftId)); setNotice(`Đã bỏ ${student.fullName} khỏi danh sách chờ.`); }}><UiIcon name="trash" size={17} /></button></span>
        </div>)}
      </div> : <div className="roster-empty"><UiIcon name="students" size={28} /><strong>Chưa có học sinh trong danh sách</strong><p>Thêm học sinh mới, chọn hồ sơ có sẵn hoặc bổ sung sau khi tạo lớp.</p></div>}
    </fieldset>
    <p className="create-roster-footnote">Có thể bổ sung thông tin học sinh sau.</p>
  </section>;
}
function formatRosterBirth(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN') : 'Chưa có'; }

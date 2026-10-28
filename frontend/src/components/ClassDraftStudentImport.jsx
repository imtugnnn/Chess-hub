import { useEffect, useRef, useState } from 'react';
import { downloadDraftStudentTemplate, previewDraftStudentImport, readDraftStudentWorkbook } from '../services/api';
import { mappedRows, suggestMapping } from './studentImport';
import { UiIcon } from './UiIcon';

const validActions = new Set(['CLASS_ONLY', 'CREATE_PROFILE', 'REUSE']);
const asRow = (student, index) => ({ rowNumber: index + 1, values: Object.fromEntries(['fullName', 'birthDate', 'parentName', 'parentPhoneNumber', 'phoneNumber', 'notes'].map(key => [key, student[key] ?? ''])), studentId: student.studentId || null, issues: {} });

export function ClassDraftStudentImport({ teacherId, scope, students, onApply, onClose, onPendingChange }) {
  const [file, setFile] = useState(null);
  const [book, setBook] = useState(null);
  const [header, setHeader] = useState(1);
  const [mapping, setMapping] = useState({});
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [snapshot, setSnapshot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const version = useRef(0);
  const centerId = scope === 'personal' ? null : scope;
  const fingerprint = JSON.stringify([scope, students, rows]);
  const checked = Boolean(snapshot) && snapshot === fingerprint;
  const ready = checked ? results.filter(result => validActions.has(result.action) && result.student) : [];
  const pending = busy || Boolean(file);
  useEffect(() => { onPendingChange(pending); }, [pending, onPendingChange]);
  useEffect(() => () => { version.current++; onPendingChange(false); }, [onPendingChange]);

  async function run(action) {
    const request = ++version.current;
    setBusy(true); setError('');
    try { await action(request); } catch (failure) { if (request === version.current) setError(failure.message); }
    finally { if (request === version.current) setBusy(false); }
  }
  async function inspect(next, request) {
    setSnapshot('');
    if (!next.length || next.length + students.length > 1000) throw new Error('Danh sách tổng cộng cần có từ 1 đến 1.000 học sinh.');
    const prefix = students.map(asRow);
    const response = await previewDraftStudentImport(teacherId, { centerId, rows: [...prefix, ...next.map(row => ({ ...row, rowNumber: students.length + row.rowNumber }))] });
    if (request !== version.current) return;
    setResults(next.map(row => {
      const result = response.find(item => item.rowNumber === students.length + row.rowNumber);
      return result ? { ...result, rowNumber: row.rowNumber } : { rowNumber: row.rowNumber, action: 'ERROR', message: 'Chưa nhận được kết quả kiểm tra dòng này.' };
    }));
    setSnapshot(JSON.stringify([scope, students, next]));
  }
  async function read(nextFile, sheet = 0) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.xlsx') || nextFile.size > 5 * 1024 * 1024) { setError('Chọn file .xlsx có dung lượng tối đa 5 MB.'); return; }
    await run(async request => {
      const data = await readDraftStudentWorkbook(teacherId, centerId, nextFile, sheet);
      if (request !== version.current) return;
      const first = data.rows[0]?.rowNumber ?? 1;
      const matched = suggestMapping(data.rows[0]?.cells ?? [], data.fields);
      const next = mappedRows(data.rows, first, matched, data.fields);
      setFile(nextFile); setBook(data); setHeader(first); setMapping(matched); setRows(next); setResults([]); setSnapshot(''); setPage(0);
      if (matched.fullName !== '' && matched.fullName != null) await inspect(next, request);
      else setError('Chưa nhận diện được cột họ tên. Hãy điều chỉnh ghép cột rồi kiểm tra.');
    });
  }
  function remap(nextHeader, nextMapping) {
    setHeader(nextHeader); setMapping(nextMapping); setRows(mappedRows(book.rows, nextHeader, nextMapping, book.fields));
    setSnapshot(''); setResults([]); setPage(0); setError('');
  }
  function update(number, patch) {
    setRows(current => current.map(row => row.rowNumber === number ? { ...row, ...patch } : row));
    setSnapshot(''); setError('');
  }
  function edit(row, key, value) {
    const issues = { ...row.issues }; delete issues[key];
    update(row.rowNumber, { values: { ...row.values, [key]: value }, issues, studentId: null });
    setResults(current => current.map(result => result.rowNumber === row.rowNumber ? { ...result, candidates: [] } : result));
  }
  function verify() {
    if (mapping.fullName === '' || mapping.fullName == null) { setError('Hãy ghép cột họ tên học sinh.'); return; }
    const columns = Object.values(mapping).filter(value => value !== '' && value != null);
    if (new Set(columns).size !== columns.length) { setError('Mỗi cột Excel chỉ được ghép với một trường.'); return; }
    run(request => inspect(rows, request));
  }
  function apply() {
    if (!checked || busy || !rows.length || ready.length !== rows.length) return;
    onApply(ready.map(result => {
      const values = result.student;
      return { draftId: crypto.randomUUID(), studentId: values.studentId || null, ...Object.fromEntries(['fullName', 'birthDate', 'parentName', 'parentPhoneNumber', 'phoneNumber', 'notes'].map(key => [key, values[key] ?? ''])) };
    }));
  }
  const visiblePage = Math.min(page, Math.max(0, Math.ceil(rows.length / 25) - 1));
  const visible = rows.slice(visiblePage * 25, (visiblePage + 1) * 25);
  const headerCells = book?.rows.find(row => row.rowNumber === header)?.cells ?? [];
  return <div className="roster-editor draft-student-import" aria-busy={busy} onKeyDown={event => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.target.matches('input:not([type="file"])')) event.preventDefault();
  }}>
    <div className="draft-import-heading"><h3>Nhập học sinh từ Excel</h3><button type="button" className="cancel-button" disabled={busy} onClick={onClose}>Hủy nhập</button></div>
    <p className="student-entry-help">Xem tên và sửa lỗi ngay tại đây. Dữ liệu chỉ được lưu khi tạo lớp.</p>
    <fieldset disabled={busy} className="draft-import-controls">
      <div className="draft-import-source"><label>File Excel (.xlsx, tối đa 5 MB)<input type="file" accept=".xlsx" onChange={event => read(event.target.files?.[0])} /></label><button type="button" className="secondary-button" onClick={() => run(async () => { await downloadDraftStudentTemplate(teacherId, centerId); })}>Tải file mẫu</button></div>
      {book && <>
        <div className="draft-import-source"><label>Sheet<select value={book.sheetIndex} onChange={event => read(file, Number(event.target.value))}>{book.sheets.map((sheet, index) => <option key={index} value={index}>{sheet}</option>)}</select></label><span className="student-entry-help">Đang đọc: {file.name}</span></div>
        <details className="draft-import-mapping"><summary>Điều chỉnh dòng tiêu đề và ghép cột</summary>
          <label>Dòng tiêu đề<select value={header} onChange={event => { const value = Number(event.target.value); remap(value, suggestMapping(book.rows.find(row => row.rowNumber === value)?.cells ?? [], book.fields)); }}>{book.rows.slice(0, 100).map(row => <option key={row.rowNumber} value={row.rowNumber}>Dòng {row.rowNumber}: {row.cells.slice(0, 2).join(' · ').slice(0, 80)}</option>)}</select></label>
          <div className="draft-import-field-grid">{book.fields.map(field => <label key={field.key}>{field.label}<select value={mapping[field.key] ?? ''} onChange={event => remap(header, { ...mapping, [field.key]: event.target.value })}><option value="">Bỏ qua cột</option>{headerCells.map((cell, index) => <option key={index} value={index}>Cột {index + 1}: {cell || '(không có tiêu đề)'}</option>)}</select></label>)}</div>
        </details>
        <div className="draft-import-summary" role="status"><strong>{rows.length} học sinh từ file</strong><span>{checked ? ready.length : '—'} hợp lệ</span><span>{checked ? rows.length - ready.length : '—'} cần xử lý</span><span>{students.length} đã có trong danh sách chờ</span></div>
        {!checked && rows.length > 0 && <p className="student-entry-help">Danh sách cần được kiểm tra lại trước khi đưa vào lớp.</p>}
        <div className="draft-import-rows">{visible.map(row => {
          const result = results.find(item => item.rowNumber === row.rowNumber);
          return <article className="draft-import-row" key={row.rowNumber}>
            <div className="draft-import-row-heading"><div><small>Dòng {row.rowNumber}</small><strong>{row.values.fullName?.trim() || 'Chưa có họ tên'}</strong></div><button type="button" className="roster-icon-button roster-remove" aria-label={`Bỏ dòng ${row.rowNumber}`} onClick={() => { setRows(current => current.filter(item => item.rowNumber !== row.rowNumber)); setSnapshot(''); }}><UiIcon name="trash" size={17} /></button></div>
            {result && <p className={checked && !validActions.has(result.action) ? 'roster-error' : 'student-entry-help'}>{checked ? result.message : 'Đã thay đổi dữ liệu. Cần kiểm tra lại.'}</p>}
            <details><summary>Sửa thông tin dòng {row.rowNumber}</summary><div className="draft-import-field-grid">{book.fields.map(field => <label key={field.key}>{field.label}<input aria-label={`${field.label}, dòng ${row.rowNumber}`} value={row.values[field.key] ?? ''} onChange={event => edit(row, field.key, event.target.value)} /></label>)}</div></details>
            {row.issues && Object.keys(row.issues).length > 0 && <div className="roster-search-error"><p>{Object.values(row.issues).join(' ')}</p><button type="button" className="secondary-button" onClick={() => update(row.rowNumber, { issues: {} })}>Xác nhận SĐT đang hiển thị</button></div>}
            {result?.candidates?.length > 0 && <label>Hồ sơ phù hợp<select aria-label={`Hồ sơ phù hợp, dòng ${row.rowNumber}`} value={row.studentId || ''} onChange={event => {
              const candidate = result.candidates.find(item => item.studentId === event.target.value);
              update(row.rowNumber, { studentId: candidate?.studentId || null, values: candidate ? { ...row.values, fullName: candidate.fullName, birthDate: candidate.birthDate || '', parentPhoneNumber: candidate.parentPhoneNumber || '' } : row.values });
            }}><option value="">Chọn hồ sơ có sẵn</option>{result.candidates.map(candidate => <option key={candidate.studentId} value={candidate.studentId}>{candidate.fullName} · {candidate.birthDate || 'chưa có ngày sinh'} · {candidate.parentPhoneNumber || 'chưa có SĐT'}</option>)}</select></label>}
          </article>;
        })}</div>
        {rows.length > 25 && <div className="roster-picker-pages"><button type="button" className="secondary-button" disabled={!visiblePage} onClick={() => setPage(visiblePage - 1)}>Trước</button><span>Trang {visiblePage + 1} / {Math.ceil(rows.length / 25)}</span><button type="button" className="secondary-button" disabled={(visiblePage + 1) * 25 >= rows.length} onClick={() => setPage(visiblePage + 1)}>Sau</button></div>}
        <div className="roster-editor-actions"><button type="button" className="secondary-button" onClick={verify}>Kiểm tra lại</button><button type="button" className="primary-button" disabled={!checked || !rows.length || ready.length !== rows.length} onClick={apply}>Đưa {rows.length} học sinh vào danh sách</button></div>
      </>}
    </fieldset>
    {busy && <p role="status" className="student-entry-help">Đang đọc và kiểm tra danh sách…</p>}
    {error && <p role="alert" className="roster-error">{error}</p>}
  </div>;
}

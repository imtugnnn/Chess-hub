import { useEffect, useRef, useState } from 'react';
import { readStudentWorkbook, previewStudentImport, commitStudentImport, downloadStudentTemplate, downloadStudentImportErrors } from '../services/api';
import { mappedRows, suggestMapping } from './studentImport';
import './studentImport.css';

const validActions = new Set(['CLASS_ONLY', 'CREATE_PROFILE', 'REUSE']);
export function StudentExcelImport({ teacherId, classId, onSaved, onClose, onDraftChange }) {
  const [file, setFile] = useState(null);
  const [book, setBook] = useState(null);
  const [header, setHeader] = useState(1);
  const [mapping, setMapping] = useState({});
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [checked, setChecked] = useState(false);
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const importId = useRef(crypto.randomUUID());
  const state = useRef(null);
  state.current = { dirty: Boolean(file) && results.filter(r => r.success).length < rows.length || Boolean(file) && !rows.length, busy, label: 'danh sách Excel', save: async () => false, discard: () => {} };
  useEffect(() => { onDraftChange?.(state.current); return () => onDraftChange?.(null); }, [file, rows, results, busy, onDraftChange]);
  async function run(action) { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function read(nextFile, sheet = 0) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.xlsx') || nextFile.size > 5 * 1024 * 1024) { setError('Chọn file .xlsx có dung lượng tối đa 5 MB.'); return; }
    await run(async () => {
      const next = await readStudentWorkbook(teacherId, classId, nextFile, sheet);
      const first = next.rows[0]?.rowNumber ?? 1;
      setFile(nextFile); setBook(next); setHeader(first); setMapping(suggestMapping(next.rows[0]?.cells ?? [], next.fields));
      setRows([]); setResults([]); setStep(1); setChecked(false); setPage(0); setNotice(''); importId.current = crypto.randomUUID();
    });
  }
  function chooseHeader(value) {
    setHeader(value); setMapping(suggestMapping(book.rows.find(r => r.rowNumber === value)?.cells ?? [], book.fields));
  }
  async function check(next = rows) {
    await run(async () => {
      const found = await previewStudentImport(teacherId, classId, { importId: importId.current, rows: next });
      setRows(next); setResults(found.map(r => results.find(old => old.rowNumber === r.rowNumber && old.success) ?? r)); setChecked(true); setStep(2); setNotice('');
    });
  }
  async function preview() {
    if (mapping.fullName === '' || mapping.fullName == null) { setError('Hãy ghép cột Họ tên học sinh.'); return; }
    const columns = Object.values(mapping).filter(v => v !== '');
    if (new Set(columns).size !== columns.length) { setError('Mỗi cột Excel chỉ được ghép với một trường.'); return; }
    const next = mappedRows(book.rows, header, mapping, book.fields);
    if (!next.length || next.length > 1000) { setError('Danh sách cần có 1–1.000 học sinh.'); return; }
    await check(next);
  }
  function update(number, patch) {
    setRows(current => current.map(row => row.rowNumber === number ? { ...row, ...patch } : row));
    setChecked(false); setNotice('');
  }
  function editValue(row, key, value) {
    const issues = { ...row.issues }; delete issues[key];
    update(row.rowNumber, { values: { ...row.values, [key]: value }, issues, studentId: null, membershipId: null, confirmNew: false, reuseRowNumber: null });
  }
  async function commit() {
    await run(async () => {
      const saved = await commitStudentImport(teacherId, classId, { importId: importId.current, rows });
      setResults(saved); setChecked(true); setNotice('Đã xử lý danh sách. Các dòng thành công được giữ nguyên khi thử lại.');
      window.dispatchEvent(new Event('classes-updated'));
      try { await onSaved(); } catch { setNotice('Đã nhập. Chưa tải lại được danh sách lớp; hãy tải lại trang để cập nhật.'); }
    });
  }
  const success = results.filter(r => r.success);
  const ready = results.filter(r => !r.success && validActions.has(r.action));
  const errors = results.filter(r => !r.success && !validActions.has(r.action));
  const visible = rows.slice(page * 25, (page + 1) * 25);
  const width = book ? Math.max(0, ...book.rows.map(r => r.cells.length)) : 0;
  const headerCells = Array.from({ length: width }, (_, i) => book?.rows.find(r => r.rowNumber === header)?.cells[i] ?? '');
  return <section className="management-card excel-import" aria-labelledby="excel-title" aria-busy={busy}>
    <div className="excel-import-heading"><div><h2 id="excel-title">Nhập học sinh từ Excel</h2><p>Chỉ có tên: thêm vào lớp. Có thêm thông tin: tạo hoặc dùng lại hồ sơ theo phạm vi của lớp.</p></div><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Đóng</button></div>
    <ol className="excel-steps" aria-label="Các bước nhập"><li aria-current={step === 0 ? 'step' : undefined}>Chọn file</li><li aria-current={step === 1 ? 'step' : undefined}>Ghép cột</li><li aria-current={step === 2 ? 'step' : undefined}>Xem trước và nhập</li></ol>
    <fieldset disabled={busy}>
      {step < 2 && <div className="excel-file"><label>File Excel (.xlsx, tối đa 5 MB)<input type="file" accept=".xlsx" onChange={e => read(e.target.files?.[0])} /></label><button type="button" className="secondary-button" onClick={() => run(() => downloadStudentTemplate(teacherId, classId))}>Tải file mẫu</button></div>}
      {book && step === 1 && <>
        <div className="excel-source"><label>Sheet<select value={book.sheetIndex} onChange={e => read(file, Number(e.target.value))}>{book.sheets.map((name, index) => <option key={index} value={index}>{name}</option>)}</select></label><label>Dòng tiêu đề<select value={header} onChange={e => chooseHeader(Number(e.target.value))}>{book.rows.slice(0, 100).map(row => <option key={row.rowNumber} value={row.rowNumber}>Dòng {row.rowNumber}: {row.cells.slice(0, 3).join(' · ').slice(0, 90)}</option>)}</select></label></div>
        <div className="excel-mapping">{book.fields.map(field => <label key={field.key}>{field.label}{field.key === 'fullName' ? ' (bắt buộc)' : ''}<select value={mapping[field.key] ?? ''} onChange={e => setMapping(current => ({ ...current, [field.key]: e.target.value }))}><option value="">Bỏ qua cột</option>{headerCells.map((cell, index) => <option key={index} value={index}>Cột {index + 1}: {cell || '(không có tiêu đề)'}</option>)}</select><small>{book.rows.find(r => r.rowNumber > header)?.cells[Number(mapping[field.key])] && mapping[field.key] !== '' ? `Ví dụ: ${book.rows.find(r => r.rowNumber > header).cells[Number(mapping[field.key])]}` : 'Không lấy dữ liệu'}</small></label>)}</div>
        <div className="management-actions"><button type="button" className="primary-button" onClick={preview}>Kiểm tra và xem trước</button></div>
      </>}
      {step === 2 && <>
        <div className="excel-summary" role="status"><strong>{rows.length} dòng</strong><span>{success.length} đã nhập</span><span>{checked ? ready.length : '—'} sẵn sàng</span><span>{checked ? errors.length : '—'} cần xử lý</span></div>
        {success.length > 0 && <p className="excel-help">{success.filter(r => r.profileCreated).length} hồ sơ mới · {success.filter(r => r.enrolled).length} lượt thêm vào lớp · {success.filter(r => !r.profileCreated && r.studentId).length} hồ sơ dùng lại · {success.filter(r => !r.profileCreated && !r.enrolled).length} dòng đã có trong lớp, bỏ qua.</p>}
        <p className="excel-help">Sửa trực tiếp trong bảng rồi bấm Kiểm tra lại. Dòng cần xử lý được bỏ qua khi nhập. Số dòng giữ theo file gốc.</p>
        <div className="excel-table-scroll"><table className="excel-table"><caption className="students-sr-only">Dữ liệu học sinh trước khi nhập</caption><thead><tr><th>Dòng</th>{book.fields.map(f => <th key={f.key}>{f.label}</th>)}<th>Kết quả / Hồ sơ có sẵn</th></tr></thead><tbody>{visible.map(row => {
          const result = results.find(r => r.rowNumber === row.rowNumber);
          const resolution = row.membershipId ? `member:${row.membershipId}` : row.studentId ? `profile:${row.studentId}` : '';
          return <tr key={row.rowNumber} data-state={result?.success ? 'success' : result?.action === 'ERROR' || result?.action === 'RESOLVE' ? 'error' : undefined}><th scope="row">{row.rowNumber}</th>{book.fields.map(field => <td key={field.key}><input aria-label={`${field.label}, dòng ${row.rowNumber}`} value={row.values[field.key]} disabled={result?.success} onChange={e => editValue(row, field.key, e.target.value)} /></td>)}<td><span className="excel-row-message">{result?.success ? 'Đã nhập. ' : ''}{result?.message}</span>{!result?.success && Object.keys(row.issues ?? {}).length > 0 && <button type="button" className="secondary-button" onClick={() => update(row.rowNumber, { issues: {} })}>Xác nhận SĐT đang hiển thị</button>}{!result?.success && result?.action !== 'ERROR' && (result?.action === 'RESOLVE' || row.membershipId || row.studentId) && <select aria-label={`Hồ sơ có sẵn, dòng ${row.rowNumber}`} value={resolution} onChange={e => {
            const [type, id] = e.target.value.split(':');
            update(row.rowNumber, { studentId: type === 'profile' ? id : null, membershipId: type === 'member' ? id : null, confirmNew: false, reuseRowNumber: null });
          }}><option value="">Tự kiểm tra</option>{row.membershipId && !(result?.candidates ?? []).some(c => c.membershipId === row.membershipId) && <option value={`member:${row.membershipId}`}>Dùng lại thành viên đã chọn</option>}{row.studentId && !(result?.candidates ?? []).some(c => !c.membershipId && c.studentId === row.studentId) && <option value={`profile:${row.studentId}`}>Dùng lại hồ sơ đã chọn</option>}{(result?.candidates ?? []).map((c, index) => <option key={index} value={c.membershipId ? `member:${c.membershipId}` : `profile:${c.studentId}`}>Dùng {c.membershipId ? 'thành viên lớp' : 'hồ sơ'}: {c.fullName} · {c.birthDate || 'chưa có ngày sinh'} · {c.parentPhoneNumber || 'chưa có SĐT'}{c.membershipId ? c.active ? ' · đang học' : ' · đã rời lớp' : ''}</option>)}</select>}</td></tr>;
        })}</tbody></table></div>
        <div className="excel-pagination"><span>{page * 25 + 1}–{Math.min((page + 1) * 25, rows.length)} / {rows.length}</span><button type="button" className="secondary-button" disabled={!page} onClick={() => setPage(p => p - 1)}>Trước</button><button type="button" className="secondary-button" disabled={(page + 1) * 25 >= rows.length} onClick={() => setPage(p => p + 1)}>Sau</button></div>
        <div className="management-actions">
          {!success.length && <button type="button" className="secondary-button" onClick={() => { setStep(1); setResults([]); }}>Sửa ghép cột</button>}
          {errors.length > 0 && <button type="button" className="secondary-button" onClick={() => run(() => downloadStudentImportErrors(teacherId, classId, { rows, results }))}>Tải các dòng cần sửa</button>}
          <button type="button" className="secondary-button" onClick={() => check()}>Kiểm tra lại</button>
          <button type="button" className="primary-button" disabled={!checked || !ready.length} onClick={commit}>Nhập {checked ? ready.length : ''} dòng hợp lệ</button>
        </div>
        {!checked && <p className="excel-help" role="status">Dữ liệu đã thay đổi. Hãy kiểm tra lại trước khi nhập.</p>}
      </>}
    </fieldset>
    {busy && <p role="status">Đang xử lý…</p>}
    {notice && <p role="status" className="excel-notice">{notice}</p>}
    {error && <p role="alert" className="management-message">{error}</p>}
  </section>;
}

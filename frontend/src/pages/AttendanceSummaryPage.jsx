import { useEffect, useMemo, useRef, useState } from 'react';
import { AppPageHeader } from '../components/layout/AppPageHeader';
import { AppChrome } from '../components/layout/AppChrome';
import { CalendarFilter } from '../components/CalendarFilter';
import { UiIcon } from '../components/UiIcon';
import { ActionFeedback } from '../components/ActionFeedback';
import { getReportMonth, shiftReportMonth, getScheduledAttendanceClasses, getAttendanceRatio } from '../components/attendanceReport';
import { PAYMENT_LABELS, foldName, paymentIdentity, paymentState, paymentTotals, paymentClasses, comparePaymentStudents } from '../components/attendancePayments';
import { getAttendanceSummary, saveTuitionPayment } from '../services/api';
import './calendar.css';
import './attendanceSummary.css';

const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value ?? 0);
const monthLabel = month => `Tháng ${Number(month.slice(5))}/${month.slice(0, 4)}`;
const CLASS_STATES = [['all', 'Tất cả tình trạng'], ['UNPAID', 'Có khoản chưa thu'], ['REVIEW', 'Cần đối soát'], ['PAID', 'Đã thu đủ'], ['NONE', 'Không phát sinh']];
const ROW_STATES = [['all', 'Tất cả trạng thái'], ...Object.entries(PAYMENT_LABELS)];
const sumStudents = classes => classes.flatMap(c => c.students);

export function AttendanceSummaryPage({ teacherId, teacherName, onLogout, onNavigate, locationSearch = window.location.search }) {
  const params = new URLSearchParams(locationSearch);
  const requestedMonth = params.get('month');
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth ?? '') && !requestedMonth.startsWith('0000') ? requestedMonth : getReportMonth();
  const selectedId = params.get('classId');
  const [report, setReport] = useState({ status: 'loading', classes: [], error: '' });
  const [classFilter, setClassFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [state, setState] = useState('all');
  const [sort, setSort] = useState('tuition:desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [retry, setRetry] = useState(0);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scroll = useRef(0);
  const scope = useRef('');
  const openedFromOverview = useRef(false);
  const previousSelection = useRef(selectedId);
  useEffect(() => {
    const returningFrom = previousSelection.current;
    if (returningFrom && !selectedId) requestAnimationFrame(() => {
      window.scrollTo({ top: scroll.current });
      const button = document.getElementById(`attendance-open-${returningFrom}`);
      (button ?? document.getElementById('attendance-overview-title'))?.focus({ preventScroll: true });
    });
    previousSelection.current = selectedId;
  }, [selectedId]);
  scope.current = `${teacherId}:${month}`;
  useEffect(() => {
    let active = true;
    setReport({ status: 'loading', classes: [], error: '' });
    getAttendanceSummary(teacherId, month).then(result => {
      if (!active) return;
      const classes = getScheduledAttendanceClasses(result);
      setReport({ status: 'ready', classes, error: '' });
      setClassFilter(id => id === 'all' || classes.some(c => c.classId === id) ? id : 'all');
    }).catch(error => { if (active) setReport({ status: 'error', classes: [], error: error.message }); });
    return () => { active = false; };
  }, [teacherId, month, retry]);

  const classes = useMemo(() => paymentClasses(report.classes, 'all', '', 'all', 'name'), [report.classes]);
  const visible = useMemo(() => paymentClasses(report.classes, classFilter, query, state, sort), [report.classes, classFilter, query, state, sort]);
  const totals = paymentTotals(sumStudents(visible));
  // Resolve from the full report: a successful save must not close a class that no longer matches the overview filter.
  const selected = classes.find(c => c.classId === selectedId);
  const filtered = classFilter !== 'all' || Boolean(query.trim()) || state !== 'all';
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visible.length / pageSize)));
  const loading = report.status === 'loading';
  const year = Number(month.slice(0, 4));
  const months = [];
  for (let y = Math.max(1, year - 1); y <= Math.min(9999, year + 1); y++) for (let m = 1; m <= 12; m++) months.push(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`);
  const overviewUrl = `/attendance-summary?month=${month}`;
  function close() {
    if (openedFromOverview.current) window.history.back();
    else onNavigate(overviewUrl);
  }
  function changeMonth(value) { onNavigate(`/attendance-summary?month=${value}`); setPage(1); }
  function filter(setter, value) { setter(value); setPage(1); }
  function clearFilters() { setClassFilter('all'); setQuery(''); setState('all'); setPage(1); }
  function open(c) { scroll.current = window.scrollY; openedFromOverview.current = true; onNavigate(`${overviewUrl}&classId=${encodeURIComponent(c.classId)}`); window.scrollTo({ top: 0 }); }
  function updatePayment(classId, identityId, responseMonth, payment) {
    if (scope.current !== `${teacherId}:${responseMonth}`) return;
    setReport(current => ({ ...current, classes: current.classes.map(c => c.classId === classId ? { ...c, students: c.students.map(s => paymentIdentity(s) === identityId ? { ...s, payment } : s) } : c) }));
  }
  async function refresh() {
    const requestScope = scope.current; setRefreshing(true);
    try {
      const result = await getAttendanceSummary(teacherId, month);
      if (scope.current === requestScope) setReport({ status: 'ready', classes: getScheduledAttendanceClasses(result), error: '' });
    } finally { if (scope.current === requestScope) setRefreshing(false); }
  }

  return <div className="app-shell">
    <AppChrome title="Tổng hợp điểm danh" activeSection="attendance" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard attendance-summary-page">
      {selectedId && !selected ? <><button type="button" className="attendance-back" onClick={close}>Quay lại tổng hợp</button>{loading ? <p role="status">Đang tải báo cáo lớp…</p> : <Feedback title={report.status === 'error' ? 'Không thể tải báo cáo' : 'Không tìm thấy lớp trong tháng này'} error={report.status === 'error'}>{report.status === 'error' && <button type="button" onClick={() => setRetry(retry + 1)}>Thử lại</button>}</Feedback>}</> : selected ? <ClassReport key={`${teacherId}:${month}:${selected.classId}`} classroom={selected} month={month} teacherId={teacherId} initialQuery={query} onClose={close} onSave={updatePayment} onRefresh={refresh} refreshing={refreshing} /> : <>
        <AppPageHeader section="Điểm danh" title="Tổng hợp điểm danh" description="Đối chiếu buổi học và theo dõi thu học phí theo từng lớp." actions={<div className="attendance-month-navigation">
          <button type="button" aria-label="Tháng trước" disabled={month === '0001-01'} onClick={() => changeMonth(shiftReportMonth(month, -1))}><span className="attendance-previous"><UiIcon name="chevron" size={18} /></span></button>
          <CalendarFilter label="Tháng báo cáo" options={months.map(value => ({ value, label: monthLabel(value) }))} value={month} selectedLabel={monthLabel(month)} searchable onChange={changeMonth} />
          <button type="button" aria-label="Tháng sau" disabled={month === '9999-12'} onClick={() => changeMonth(shiftReportMonth(month, 1))}><UiIcon name="chevron" size={18} /></button>
          <button type="button" onClick={() => changeMonth(getReportMonth())}>Tháng này</button>
        </div>} />
        <MoneySummary totals={totals} unavailable={loading || report.status === 'error'} />
        <section className="attendance-toolbar" aria-label="Bộ lọc tổng hợp điểm danh">
          <label className="attendance-search">Tìm học sinh<input type="search" maxLength={255} value={query} onChange={e => filter(setQuery, e.target.value)} disabled={loading} /></label>
          <button type="button" className="attendance-mobile-filter" aria-expanded={expandedFilters} aria-controls="attendance-extra-filters" onClick={() => setExpandedFilters(!expandedFilters)}>Bộ lọc{filtered ? ' •' : ''}<UiIcon name="chevron" size={16} /></button>
          <div id="attendance-extra-filters" className={`attendance-extra-filters ${expandedFilters ? 'is-expanded' : ''}`}>
            <CalendarFilter label="Lớp học" options={[{ value: 'all', label: 'Tất cả lớp học' }, ...classes.map(c => ({ value: c.classId, label: c.className }))]} value={classFilter} searchable normalizeSearch={foldName} onChange={value => filter(setClassFilter, value)} disabled={loading} />
            <Select label="Tình trạng lớp" value={state} onChange={value => filter(setState, value)} options={CLASS_STATES} />
          </div>
          {filtered && <button type="button" className="attendance-text-button" onClick={clearFilters}>Xóa bộ lọc</button>}
        </section>
        {loading ? <div className="attendance-loading" role="status"><span className="attendance-skeleton" /><span className="attendance-skeleton" /><span className="attendance-skeleton" /><span className="attendance-sr-only">Đang tải báo cáo…</span></div>
          : report.status === 'error' ? <Feedback title="Không thể tải báo cáo" error><p>{report.error}</p><button type="button" onClick={() => setRetry(retry + 1)}>Thử lại</button></Feedback>
          : !classes.length ? <Feedback title="Chưa có lớp có lịch học trong tháng"><p>Chọn tháng khác hoặc kiểm tra lịch học.</p><button type="button" onClick={() => onNavigate('/calendar')}>Xem lịch học</button></Feedback>
          : <section className="attendance-class-overview" aria-labelledby="attendance-overview-title">
            <header className="attendance-table-heading"><div><h2 id="attendance-overview-title" tabIndex={-1}>Học phí theo lớp</h2><p role="status">{filtered ? 'Trong bộ lọc' : 'Toàn tháng'} · {visible.length} lớp · {sumStudents(visible).length} lượt học sinh theo lớp</p></div><Select label="Sắp xếp lớp" value={sort} onChange={value => filter(setSort, value)} options={sortOptions('Tên lớp')} /></header>
            {query.trim() && <p className="attendance-context-note">Tìm các lớp có học sinh phù hợp. Số tiền và tiến độ vẫn tính toàn lớp.</p>}
            {!visible.length ? <Feedback title="Không có lớp phù hợp"><button type="button" onClick={clearFilters}>Xóa bộ lọc</button></Feedback> : <table className="attendance-class-table" aria-label="Tổng hợp theo lớp"><thead><tr>{[['name', 'Lớp học'], ['attended', 'Đi học'], ['tuition', 'Tạm tính'], ['collected', 'Đã ghi nhận'], ['remaining', 'Còn cần thu'], ['progress', 'Tiến độ thu']].map(([column, label]) => <SortHeading key={column} column={column} label={label} sort={sort} onChange={value => filter(setSort, value)} />)}<th scope="col"><span className="attendance-sr-only">Chi tiết lớp</span></th></tr></thead><tbody>
              {visible.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(c => <tr key={c.classId}>
                <th scope="row"><strong>{c.className}</strong><span className="attendance-meta">{c.students.length} học sinh · {c.sessionCount} buổi theo lịch{query.trim() ? ` · ${c.matchCount} khớp tên` : ''}</span></th>
                <td data-label="Lượt đi học"><span className="pastel-value" data-tone="purple">{c.totals.attended}</span></td><td data-label="Tạm tính"><span className="pastel-value" data-tone="blue">{money(c.totals.amount)}</span></td><td data-label="Đã ghi nhận"><span className="pastel-value" data-tone="mint">{money(c.totals.collected)}</span></td><td className="attendance-amount" data-label="Còn cần thu"><span className="pastel-value" data-tone="peach">{money(c.totals.remaining)}</span></td>
                <td data-label="Tiến độ thu"><Progress totals={c.totals} /></td><td><button type="button" className="attendance-open" id={`attendance-open-${c.classId}`} aria-label={`Mở báo cáo lớp ${c.className}`} onClick={e => open(c, e)}>Mở lớp<UiIcon name="chevron" size={16} /></button></td>
              </tr>)}
            </tbody></table>}
            <Pagination count={visible.length} page={currentPage} size={pageSize} label="lớp" onChange={setPage} onSize={size => { setPageSize(size); setPage(1); }} />
          </section>}
        <p className="attendance-report-note">Học phí tạm tính = lượt có mặt hoặc đi muộn × đơn giá hiện tại. Đã ghi nhận thu là xác nhận thủ công, có thể cần đối soát khi điểm danh hoặc đơn giá thay đổi.</p>
      </>}
    </main>
  </div>;
}

function sortOptions(name, detail = false) {
  const columns = detail ? [['name', name], ['attended', 'Đã điểm danh'], ['tuition', 'Tạm tính'], ['status', 'Trạng thái thu']] : [['name', name], ['attended', 'Đi học'], ['tuition', 'Tạm tính'], ['collected', 'Đã ghi nhận'], ['remaining', 'Còn cần thu'], ['progress', 'Tiến độ thu']];
  return columns.flatMap(([key, label]) => [[key + ':asc', label + ' · Tăng dần'], [key + ':desc', label + ' · Giảm dần']]);
}
function SortHeading({ column, label, sort, onChange }) {
  const [key, direction] = sort.split(':');
  const active = key === column;
  return <th scope="col" aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="attendance-sort" onClick={() => onChange(column + ':' + (active && direction === 'asc' ? 'desc' : 'asc'))}>{label}<svg width="12" height="16" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3 6 3-3 3 3" opacity={!active || direction === 'asc' ? 1 : .25} /><path d="m3 10 3 3 3-3" opacity={!active || direction === 'desc' ? 1 : .25} /></svg></button></th>;
}
function Select({ label, options, value, onChange }) { return <label className="attendance-select">{label}<select value={value} onChange={e => onChange(e.target.value)}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>; }
function MoneySummary({ totals, unavailable = false, caption }) {
  return <section className="attendance-metrics" aria-label={caption ?? 'Tổng học phí'} aria-busy={unavailable}>
    {[['Học phí tạm tính', totals.amount, 'blue'], ['Đã ghi nhận thu', totals.collected, 'mint'], ['Còn cần thu', totals.remaining, 'peach']].map(([label, value, tone]) => <div className="attendance-metric" data-tone={tone} key={label}><span>{label}</span><strong>{unavailable ? '—' : money(value)}</strong></div>)}
    {!unavailable && (totals.review > 0 || totals.overpaid > 0) && <p className="attendance-reconcile-note" role="status">{totals.review} khoản cần đối soát{totals.overpaid > 0 ? ` · Đã ghi nhận cao hơn phí: ${money(totals.overpaid)} (không bù trừ khoản khác)` : ''}</p>}
  </section>;
}
function Progress({ totals }) { return <span className="attendance-progress">{totals.dueCount ? <><strong>{totals.paidCount}/{totals.dueCount}</strong><span> khoản đã thu</span></> : 'Không phát sinh'}{totals.review > 0 && <span className="attendance-review-count">{totals.review} cần đối soát</span>}</span>; }
function Feedback({ title, error, children }) { return <div className="attendance-report-feedback" role={error ? 'alert' : undefined}><h2>{title}</h2>{children}</div>; }
function Pagination({ count, page, size, label, onChange, onSize }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return <footer className="attendance-pagination"><span role="status">{count ? `${(page - 1) * size + 1}–${Math.min(page * size, count)}` : '0'} / {count} {label}</span><div><label className="attendance-page-size">Mỗi trang<select aria-label={`Số ${label} mỗi trang`} value={size} onChange={e => onSize(Number(e.target.value))}>{[10, 25, 50].map(n => <option key={n}>{n}</option>)}</select></label><button type="button" aria-label={`Trang ${label} trước`} disabled={page <= 1} onClick={() => onChange(page - 1)}><span className="attendance-previous"><UiIcon name="chevron" size={16} /></span></button><span>{page}/{pages}</span><button type="button" aria-label={`Trang ${label} sau`} disabled={page >= pages} onClick={() => onChange(page + 1)}><UiIcon name="chevron" size={16} /></button></div></footer>;
}

function ClassReport({ classroom, month, teacherId, initialQuery, onClose, onSave, onRefresh, refreshing }) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState('all');
  const [sort, setSort] = useState('name:asc');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [rowStates, setRowStates] = useState({});
  const [notice, setNotice] = useState('');
  const heading = useRef(null);
  const inFlight = useRef(new Set());
  const retryCommands = useRef(new Map());
  const order = useRef({ key: '', ids: [] });
  const [highlight, setHighlight] = useState(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (!highlight) return; const timer = setTimeout(() => setHighlight(null), 1600); return () => clearTimeout(timer); }, [highlight]);
  const matching = classroom.students.filter(s => foldName(s.studentName).includes(foldName(query)) && (state === 'all' || paymentState(s) === state));
  const orderKey = `${query}:${state}:${sort}`;
  if (order.current.key !== orderKey) {
    order.current = { key: orderKey, ids: [...matching].sort((a, b) => comparePaymentStudents(a, b, sort)).map(paymentIdentity) };
  }
  const rows = [...matching].sort((a, b) => order.current.ids.indexOf(paymentIdentity(a)) - order.current.ids.indexOf(paymentIdentity(b)));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const filtered = Boolean(query.trim()) || state !== 'all';
  function change(setter, value) { setter(value); setPage(1); }
  async function reload() {
    try { await onRefresh(); setRowStates({}); retryCommands.current.clear(); setNotice('Đã tải dữ liệu mới. Kiểm tra khoản trước khi ghi nhận lại.'); }
    catch { setNotice('Chưa tải được dữ liệu mới. Vui lòng thử lại.'); }
  }
  async function save(student, collected, reuse = false) {
    const id = paymentIdentity(student);
    if (inFlight.current.has(id)) return;
    const command = reuse && retryCommands.current.has(id) ? retryCommands.current.get(id) : { collected, expectedRevision: student.payment?.revision ?? 0, expectedTuition: Number(student.tuitionAmount) };
    retryCommands.current.set(id, command); inFlight.current.add(id);
    setRowStates(old => ({ ...old, [id]: { busy: true } })); setNotice('');
    try {
      const payment = await saveTuitionPayment(teacherId, classroom.classId, id, month, command);
      onSave(classroom.classId, id, month, payment); retryCommands.current.delete(id);
      setRowStates(old => ({ ...old, [id]: { success: true } })); setHighlight(id);
      const message = `${student.studentName}: ${payment.collected ? 'đã ghi nhận thu' : 'đã bỏ đánh dấu'} ${monthLabel(month).toLocaleLowerCase('vi-VN')}.`;
      const remains = state === 'all' || paymentState({ ...student, payment }) === state;
      setNotice(message + (!remains ? ' Khoản không còn khớp bộ lọc hiện tại.' : ''));
      requestAnimationFrame(() => {
        if (!remains) heading.current?.focus();
        else document.getElementById(`attendance-payment-${id}`)?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
      });
    } catch (error) { setRowStates(old => ({ ...old, [id]: { error: error.message, conflict: error.status === 409 } })); }
    finally { inFlight.current.delete(id); }
  }
  const totals = classroom.totals;
  return <div className="attendance-class-detail">
    <button type="button" className="attendance-back" onClick={onClose}><span className="attendance-previous"><UiIcon name="chevron" size={18} /></span>Quay lại tổng hợp</button>
    <header className="attendance-detail-header"><div><h1 ref={heading} tabIndex={-1}>{classroom.className}</h1><p>{monthLabel(month)} · {money(classroom.feePerSession)}/buổi · {classroom.sessionCount} buổi theo lịch</p></div><Progress totals={totals} /></header>
    <span className="attendance-scope">Toàn lớp · {classroom.students.length} học sinh</span>
    <MoneySummary totals={totals} caption="Học phí toàn lớp" />
    <section className="attendance-student-workspace" aria-label="Đối chiếu và thu học phí">
      <header className="attendance-table-heading"><div><h2>Điểm danh & thu học phí</h2><p>Có mặt và đi muộn được tính học phí; buổi chưa điểm danh không tính.</p></div><button type="button" disabled={refreshing || inFlight.current.size > 0} onClick={reload}><ActionFeedback busy={refreshing} busyLabel="Đang tải…">Tải lại dữ liệu</ActionFeedback></button></header>
      <div className="attendance-detail-filters"><label className="attendance-search">Tìm học sinh trong lớp<input type="search" maxLength={255} value={query} onChange={e => change(setQuery, e.target.value)} /></label><Select label="Trạng thái khoản" options={ROW_STATES} value={state} onChange={value => change(setState, value)} /><Select label="Sắp xếp học sinh" options={sortOptions('Tên học sinh', true)} value={sort} onChange={value => change(setSort, value)} /></div>
      {filtered && <div className="attendance-filter-totals"><span>Kết quả lọc: {rows.length} học sinh · Tạm tính {money(paymentTotals(rows).amount)} · Còn cần thu {money(paymentTotals(rows).remaining)}</span><button type="button" onClick={() => { setQuery(''); setState('all'); setPage(1); }}>Xóa lọc học sinh</button></div>}
      <p className="attendance-save-notice" role="status" aria-atomic="true">{notice}</p>
      {!rows.length ? <Feedback title={classroom.students.length ? 'Không có học sinh phù hợp' : 'Lớp chưa có học sinh trong báo cáo tháng này'} /> : <table className="attendance-student-table" aria-label={`Thu học phí lớp ${classroom.className}`}><thead><tr>{[['name', 'Học sinh'], ['attended', 'Đã điểm danh / Số buổi học'], ['tuition', 'Tạm tính'], ['status', 'Trạng thái thu']].map(([column, label]) => <SortHeading key={column} column={column} label={label} sort={sort} onChange={value => change(setSort, value)} />)}<th scope="col">Thao tác</th></tr></thead><tbody>
        {rows.slice((currentPage - 1) * size, currentPage * size).map(student => {
          const id = paymentIdentity(student); const status = paymentState(student); const rowState = rowStates[id] ?? {};
          return <tr key={id} id={`attendance-payment-${id}`} className={highlight === id ? 'attendance-row-saved' : ''} aria-busy={rowState.busy || undefined}>
            <th scope="row"><strong>{student.studentName}</strong>{student.birthDate && <span className="attendance-meta">Sinh {student.birthDate.split('-').reverse().join('/')}</span>}{student.leftClass && <span className="attendance-meta">Đã rời lớp</span>}
            </th>
            <td data-label="Đã điểm danh / Số buổi học"><span aria-label={`${getAttendanceRatio(student, classroom.sessionCount)} buổi đã điểm danh trên số buổi học trong lớp tháng này`}>{getAttendanceRatio(student, classroom.sessionCount)}</span>{student.attendanceParts?.length > 1 && <details className="attendance-parts"><summary>Chi tiết lượt học</summary>{student.attendanceParts.map((part, i) => <p key={part.membershipId}>Mục {i + 1}: {part.attendedDays} đi học / {part.attendedDays + part.absentSessions} đã điểm danh{part.leftClass ? ' · Đã rời lớp' : ''}</p>)}</details>}</td>
            <td className="attendance-amount" data-label="Tạm tính">{money(student.tuitionAmount)}</td>
            <td data-label="Trạng thái thu"><div className={`attendance-payment-state attendance-payment-state--${status.toLowerCase()}`}>{status === 'PAID' && <UiIcon name="check" size={15} />}{PAYMENT_LABELS[status]}</div>
              {student.payment?.collected && <span className="attendance-meta">Đã ghi {money(student.payment.amount)}</span>}
              {status === 'REVIEW' && <span className="attendance-difference">Chênh lệch: {Number(student.tuitionAmount) - Number(student.payment.amount) > 0 ? '+' : ''}{money(Number(student.tuitionAmount) - Number(student.payment.amount))}</span>}
            </td>
            <td className="attendance-payment-actions">
              {rowState.error ? <div role="alert"><p>{rowState.error}</p><button type="button" disabled={refreshing} onClick={() => rowState.conflict ? reload() : save(student, retryCommands.current.get(id)?.collected ?? true, true)}>{rowState.conflict ? 'Tải lại khoản' : 'Thử lại'}</button></div> : <>
                {(status === 'UNPAID' || status === 'REVIEW' && Number(student.tuitionAmount) > 0) && <button type="button" className="attendance-collect" disabled={rowState.busy || refreshing} aria-label={`${status === 'REVIEW' ? 'Đối soát' : 'Đánh dấu đã thu'} ${student.studentName}`} onClick={() => save(student, true)}><ActionFeedback busy={rowState.busy}>{status === 'REVIEW' ? 'Đối soát' : 'Đánh dấu đã thu'}</ActionFeedback></button>}
                {student.payment?.collected && <button type="button" className="attendance-revoke" disabled={rowState.busy || refreshing} aria-label={`Bỏ đánh dấu đã thu ${student.studentName}`} onClick={() => save(student, false)}><ActionFeedback busy={rowState.busy}>Bỏ đánh dấu</ActionFeedback></button>}
              </>}
            </td>
          </tr>;
        })}
      </tbody></table>}
      <Pagination count={rows.length} page={currentPage} size={size} label="học sinh" onChange={setPage} onSize={value => { setSize(value); setPage(1); }} />
    </section>
  </div>;
}

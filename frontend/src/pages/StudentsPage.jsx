import { useEffect, useRef, useState } from "react";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { UiIcon } from "../components/UiIcon";
import { studentDetailUrl, studentCreateUrl } from "../services/studentNavigation";
import { getStudentOptions, getStudents } from "../services/api";
import "./students.css";

const defaults = { query: "", scope: "all", classId: "", enrollment: "all", page: 0, size: 25 };

const dateLabel = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa cập nhật";
function readFilters(search) {
  const p = new URLSearchParams(search);
  return { query: p.get("query") ?? "", scope: p.get("scope") ?? "all", classId: p.get("classId") ?? "", enrollment: ["enrolled", "unassigned"].includes(p.get("enrollment")) ? p.get("enrollment") : "all", page: Math.max(0, Number(p.get("page")) || 0), size: p.get("size") === "50" ? 50 : 25 };
}

export function StudentsPage({ teacherId, teacherName, onLogout, onNavigate, locationSearch = "", syncNavigationLocation }) {
  const [filters, setFilters] = useState(() => readFilters(locationSearch));
  const [options, setOptions] = useState({ centers: [], classes: [] });
  const [data, setData] = useState({ items: [], total: 0, page: 0, size: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [classSearch, setClassSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef(null);
  const initialSearch = useRef(locationSearch);
  useEffect(() => {
    if (locationSearch !== initialSearch.current) { initialSearch.current = locationSearch; setFilters(readFilters(locationSearch)); }
  }, [locationSearch]);
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== defaults[key]) params.set(key, value); });

    window.history.replaceState(window.history.state, "", `/students${params.size ? `?${params}` : ""}`);
    syncNavigationLocation?.();
  }, [filters, syncNavigationLocation]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const timer = setTimeout(() => Promise.all([getStudents(teacherId, filters), getStudentOptions(teacherId)])
      .then(([result, choices]) => {
        if (active) { setData(result); setOptions(choices); if (result.page !== filters.page) setFilters(current => ({ ...current, page: result.page })); }
      }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [teacherId, filters, retry]);
  function change(key, value) { setFilters(current => ({ ...current, [key]: value, page: 0 })); }
  function clear() { setFilters({ ...defaults, size: filters.size }); setClassSearch(""); searchRef.current?.focus(); }
  const filtered = filters.query || filters.scope !== "all" || filters.classId || filters.enrollment !== "all";
  const hasCenters = options.centers.length > 0;
  const pageCount = Math.max(1, Math.ceil(data.total / filters.size));
  const selectedClass = options.classes.find(c => c.id === filters.classId);
  const filterCount = Number(filters.scope !== "all") + Number(Boolean(filters.classId)) + Number(filters.enrollment !== "all");
  return <div className="app-shell"><AppSidebar activeSection="students" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard students-page">
    <AppPageHeader icon={<UiIcon name="students" size={24} />} title="Quản lý học sinh" description="Hồ sơ và thông tin liên hệ ở một nơi. Quản lý việc học tại từng lớp." actions={<button className="primary-button" disabled={loading || Boolean(error)} onClick={() => onNavigate(studentCreateUrl(filters.scope, window.location.search))}><UiIcon name="plus" size={18} />Tạo học sinh</button>} />
    <div className="students-layout">
      <section className="students-directory" aria-label="Danh sách học sinh">
        <div className="students-filters">
          <label className="students-search">Tìm học sinh<div><UiIcon name="search" size={18} /><input ref={searchRef} type="search" maxLength={255} value={filters.query} onChange={e => change("query", e.target.value)} placeholder="Tên học sinh, phụ huynh hoặc số điện thoại" /></div></label>
          <div className="students-mobile-filter-controls"><button className="secondary-button" aria-expanded={filtersOpen} aria-controls="students-secondary-filters" onClick={() => setFiltersOpen(open => !open)}>Bộ lọc{filterCount > 0 ? ` (${filterCount})` : ""}</button>{filtered && <button className="secondary-button" onClick={clear}>Xóa bộ lọc</button>}</div>
          {!filtersOpen && filterCount > 0 && <p className="students-mobile-filter-summary">{[filters.scope === "personal" ? "Cá nhân" : options.centers.find(c => c.id === filters.scope)?.name, selectedClass?.name, filters.enrollment === "enrolled" ? "Đang có lớp" : filters.enrollment === "unassigned" ? "Chưa có lớp" : null].filter(Boolean).join(" · ")}</p>}
          <div id="students-secondary-filters" className={`students-filter-row ${filtersOpen ? "students-filter-row--open" : ""}`}>
            <label>Trung tâm<select aria-label="Trung tâm" value={filters.scope} onChange={e => change("scope", e.target.value)}><option value="all">Tất cả</option><option value="personal">Cá nhân</option>{options.centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Lớp học<input type="search" list="student-class-options" value={classSearch || selectedClass?.name || ""} placeholder="Tìm và chọn lớp" onChange={e => {
              const value = e.target.value; setClassSearch(value);
              const found = options.classes.find(c => `${c.name} · ${c.id.slice(0, 6)}` === value);
              change("classId", found?.id ?? "");
            }} /><datalist id="student-class-options">{options.classes.map(c => <option key={c.id} value={`${c.name} · ${c.id.slice(0, 6)}`} />)}</datalist></label>
            <label>Tình trạng trong lớp của tôi<select value={filters.enrollment} onChange={e => change("enrollment", e.target.value)}><option value="all">Tất cả</option><option value="enrolled">Đang có lớp</option><option value="unassigned">Chưa có lớp</option></select></label>
            <button className="secondary-button students-clear" disabled={!filtered && !classSearch} onClick={clear}>Xóa bộ lọc</button>
          </div>
          <p className={`students-filter-help ${filtersOpen ? "students-filter-help--open" : ""}`}>Lớp và chuyên cần hiển thị theo các lớp bạn quản lý.{classSearch && !filters.classId && " Chọn một lớp trong gợi ý để áp dụng bộ lọc."}</p>
        </div>
        <div className="students-results"><span role="status">{loading ? "Đang tải học sinh…" : error ? "Chưa tải được danh sách" : `${data.total} học sinh${filtered ? " phù hợp" : ""}`}</span><label>Số dòng<select aria-label="Số dòng mỗi trang" value={filters.size} onChange={e => change("size", Number(e.target.value))}><option value={25}>25</option><option value={50}>50</option></select></label></div>
        {error ? <div className="students-empty" role="alert"><h2>Không thể tải học sinh</h2><p>{error}</p><button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : loading ? <div className="students-loading" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <div key={i}><span /><span /><span /></div>)}</div> : data.items.length ? <div className="students-table-scroll"><table className="students-table"><thead><tr><th scope="col">Học sinh</th><th scope="col">SĐT học sinh</th><th scope="col">Phụ huynh</th><th scope="col">Lớp của tôi</th>{hasCenters && <th scope="col">Trung tâm</th>}<th scope="col">Ghi chú</th><th scope="col"><span className="students-sr-only">Thao tác</span></th></tr></thead><tbody>{data.items.map(student => <tr key={student.id}>
          <td><button className="students-person" onClick={() => onNavigate(studentDetailUrl(student.id, window.location.search))}><span className="students-avatar" aria-hidden="true">{student.fullName.trim().split(/\s+/).slice(-2).map(word => word[0]).join("")}</span><span><strong>{student.fullName}</strong><small>{dateLabel(student.birthDate)}</small></span></button></td>
          <td><span className="students-cell-label">SĐT học sinh</span>{student.phoneNumber ? <a href={`tel:${student.phoneNumber}`}>{student.phoneNumber}</a> : <span className="students-muted">Chưa có</span>}</td><td><span className="students-cell-label">Phụ huynh</span><span className="students-parent">{student.parentName || "Chưa cập nhật"}</span>{student.parentPhoneNumber && <a href={`tel:${student.parentPhoneNumber}`}>{student.parentPhoneNumber}</a>}</td>
          <td><span className="students-cell-label">Lớp của tôi</span><div className="students-class-tags">{student.classes.length ? <>{student.classes.slice(0, 2).map(c => <span key={c.id}>{c.name}</span>)}{student.classes.length > 2 && <button aria-label={`Xem ${student.classes.length} lớp của ${student.fullName}`} onClick={() => onNavigate(studentDetailUrl(student.id, window.location.search))}>+{student.classes.length - 2}</button>}</> : <span className="students-muted">Chưa có lớp</span>}</div></td>
          {hasCenters && <td>{student.centerName && <><span className="students-cell-label">Trung tâm</span><span className="students-center-name">{student.centerName}</span></>}</td>}
          <td><span className="students-cell-label">Ghi chú</span><span className="students-note-preview" title={student.notes || undefined}>{student.notes || "—"}</span></td><td><button className="secondary-button students-view" onClick={() => onNavigate(studentDetailUrl(student.id, window.location.search))} aria-label={`Xem hồ sơ ${student.fullName}`}>Xem hồ sơ</button></td>
        </tr>)}</tbody></table></div> : <div className="students-empty"><UiIcon name="students" size={32} /><h2>{filtered ? "Không tìm thấy học sinh" : "Chưa có hồ sơ học sinh"}</h2><p>{filtered ? "Thử tên khác hoặc bỏ bớt bộ lọc để tìm học sinh." : "Tạo hồ sơ đầu tiên, sau đó thêm học sinh vào lớp tại màn lớp học."}</p><button className="secondary-button" onClick={filtered ? clear : () => onNavigate(studentCreateUrl("personal", window.location.search))}>{filtered ? "Xóa bộ lọc" : "Tạo học sinh"}</button></div>}
        {!error && !loading && data.total > 0 && <footer className="students-pagination"><span>{data.page * data.size + 1}–{Math.min((data.page + 1) * data.size, data.total)} / {data.total}</span><div><button className="secondary-button" aria-label="Trang trước" disabled={data.page === 0} onClick={() => setFilters(current => ({ ...current, page: data.page - 1 }))}>Trước</button><span>Trang {data.page + 1} / {pageCount}</span><button className="secondary-button" aria-label="Trang sau" disabled={data.page + 1 >= pageCount} onClick={() => setFilters(current => ({ ...current, page: data.page + 1 }))}>Sau</button></div></footer>}
      </section>
    </div>
  </main></div>;
}

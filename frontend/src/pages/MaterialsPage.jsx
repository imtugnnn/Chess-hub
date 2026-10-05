import { useEffect, useState } from "react";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppPageHeader } from "../components/layout/AppPageHeader";
import { UiIcon } from "../components/UiIcon";
import { MaterialDialog } from "../components/materials/MaterialDialog";
import { MaterialForm } from "../components/materials/MaterialForm";
import { MaterialList } from "../components/materials/MaterialList";
import { createMaterial, deleteMaterial, getCenterDashboard, searchMaterials, updateMaterial } from "../services/api";
import "../components/materials/materials.css";

export function MaterialsPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("mine");
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const timeout = setTimeout(() => Promise.all([searchMaterials(teacherId, query, tab), getCenterDashboard(teacherId)]).then(([result, dashboard]) => {
      if (active) { setItems(result); setCenter(dashboard.center); }
    }).catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); }), 250);
    return () => { active = false; clearTimeout(timeout); };
  }, [teacherId, query, tab, retry]);
  const visible = items.filter((item) => tab === "mine" ? !item.centerId : Boolean(item.centerId));
  const canCreate = tab === "mine" || center?.ownerUserId === teacherId;
  async function save(form) {
    setBusy(true);
    try {
      if (editor.material) await updateMaterial(teacherId, editor.material.id, form);
      else { if (editor.centerId) form.set("centerId", editor.centerId); await createMaterial(teacherId, form); }
      setEditor(null); setRetry((value) => value + 1);
    } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try { await deleteMaterial(teacherId, deleting.id); setDeleting(null); setRetry((value) => value + 1); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="app-shell"><AppSidebar activeSection="materials" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard materials-page">
    <AppPageHeader section="Giảng dạy" title="Quản lý bài giảng" description="Lưu tài liệu và dùng lại cho các tiết học của bạn." actions={canCreate && <button className="primary-button" type="button" disabled={loading || Boolean(error)} onClick={() => setEditor({ centerId: tab === "center" ? center.id : null })}><UiIcon name="plus" size={18} />{tab === "center" ? "Thêm bài mặc định" : "Thêm bài giảng"}</button>} />
    <section className="material-library" aria-label="Thư viện bài giảng">
      <div className="material-tabs" role="group" aria-label="Danh sách bài giảng"><button type="button" aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>Bài giảng của tôi</button><button type="button" aria-pressed={tab === "center"} onClick={() => setTab("center")}>Mặc định trung tâm</button></div>
      {tab === "center" && <p className="material-help">{center ? `${center.name} · Chỉ chủ trung tâm được thêm, sửa và xóa bài mặc định.` : "Bạn cần tham gia trung tâm để sử dụng bài giảng mặc định."}</p>}
      <label className="material-search">Tìm bài giảng<input type="search" maxLength={255} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc nội dung bài giảng…" /></label>
      {error && <div className="material-error" role="alert">{error} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      {loading ? <p className="material-empty" role="status">Đang tải bài giảng…</p> : !error && <><p className="material-help" role="status">{visible.length} bài giảng{items.length === 100 ? " · Nhập từ khóa cụ thể hơn để tìm thêm kết quả." : ""}</p>{visible.length ? <MaterialList teacherId={teacherId} items={visible} action={(item) => item.canEdit && <><button type="button" className="secondary-button" onClick={() => setEditor({ material: item })}>Sửa</button><button type="button" className="text-button material-danger" onClick={() => { setError(""); setDeleting(item); }}>Xóa</button></>} /> : <div className="material-empty"><UiIcon name="book" size={32} /><p>{query ? "Không tìm thấy bài giảng phù hợp." : tab === "mine" ? "Bạn chưa có bài giảng. Thêm liên kết hoặc tải tài liệu đầu tiên." : "Trung tâm chưa có bài giảng mặc định."}</p></div>}</>}
    </section>
    {editor && <MaterialDialog title={editor.material ? "Sửa bài giảng" : editor.centerId ? "Thêm bài mặc định của trung tâm" : "Thêm bài giảng"} onClose={() => setEditor(null)} busy={busy}><MaterialForm material={editor.material} note={editor.material ? "Thay đổi áp dụng cho các tiết đang sử dụng bài giảng này." : undefined} onSave={save} onCancel={() => setEditor(null)} /></MaterialDialog>}
    {deleting && <MaterialDialog title="Xóa bài giảng khỏi thư viện?" onClose={() => setDeleting(null)} busy={busy}><p className="material-help">“{deleting.title || deleting.fileName || "Bài giảng chưa đặt tên"}” sẽ không còn trong kết quả tìm kiếm. Những tiết đã gắn bài vẫn giữ tài liệu.</p>{error && <p className="material-error" role="alert">{error}</p>}<div className="material-actions"><button className="secondary-button" disabled={busy} onClick={() => setDeleting(null)}>Hủy</button><button className="primary-button" disabled={busy} onClick={remove}>{busy ? "Đang xóa…" : "Xóa khỏi thư viện"}</button></div></MaterialDialog>}
  </main></div>;
}

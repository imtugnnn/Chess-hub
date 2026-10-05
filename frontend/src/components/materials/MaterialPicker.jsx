import { useEffect, useState } from "react";
import { attachSessionMaterial, createSessionMaterial, searchMaterials } from "../../services/api";
import { MaterialDialog } from "./MaterialDialog";
import { MaterialForm } from "./MaterialForm";
import { MaterialList } from "./MaterialList";

export function MaterialPicker({ teacherId, classId, sessionId, attachedIds, onAdded, onClose }) {
  const [tab, setTab] = useState("existing");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const timeout = setTimeout(() => searchMaterials(teacherId, query).then((result) => { if (active) setItems(result); })
      .catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); }), 250);
    return () => { active = false; clearTimeout(timeout); };
  }, [teacherId, query, retry]);
  async function attach(item) {
    setBusy(true); setError("");
    try { onAdded(await attachSessionMaterial(teacherId, classId, sessionId, item.id)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <MaterialDialog title="Thêm bài giảng vào tiết học" onClose={onClose} busy={busy}>
    <div className="material-tabs" role="group" aria-label="Cách thêm bài giảng"><button type="button" disabled={busy} aria-pressed={tab === "existing"} onClick={() => setTab("existing")}>Chọn bài có sẵn</button><button type="button" disabled={busy} aria-pressed={tab === "new"} onClick={() => setTab("new")}>Thêm bài mới</button></div>
    {tab === "new" ? <MaterialForm note="Bài mới được lưu vào bài giảng của bạn và gắn vào tiết học này." onCancel={onClose} onSave={async (form) => {
      setBusy(true);
      try { onAdded(await createSessionMaterial(teacherId, classId, sessionId, form)); }
      finally { setBusy(false); }
    }} /> : <>
      <label className="material-search">Tìm bài giảng<input autoFocus type="search" maxLength={255} value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc nội dung bài giảng…" /></label>
      <p className="material-help">Bài giảng của bạn và bài mặc định của trung tâm · Tối đa 100 kết quả, nhập từ khóa để thu hẹp.</p>
      {error && <div className="material-error" role="alert">{error} <button type="button" className="text-button" disabled={busy} onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
      {loading ? <p className="material-empty" role="status">Đang tìm bài giảng…</p> : !error && (items.length ? <MaterialList items={items} teacherId={teacherId} action={(item) => <button type="button" className="primary-button" disabled={busy || attachedIds.includes(item.id)} onClick={() => attach(item)}>{attachedIds.includes(item.id) ? "Đã thêm" : busy ? "Đang thêm…" : "Chọn bài"}</button>} /> : <p className="material-empty">Không tìm thấy bài giảng. Bạn có thể thêm bài mới.</p>)}
    </>}
  </MaterialDialog>;
}

import { useEffect, useId, useState } from "react";
import { detachSessionMaterial, getSessionMaterials } from "../../services/api";
import { UiIcon } from "../UiIcon";
import { MaterialList } from "./MaterialList";
import { MaterialPicker } from "./MaterialPicker";
import "./materials.css";

export function SessionMaterials({ teacherId, classId, sessionId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    getSessionMaterials(teacherId, classId, sessionId).then((result) => { if (active) setItems(result); })
      .catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId, classId, sessionId, retry]);
  async function remove(item) {
    setBusy(true); setError("");
    try { await detachSessionMaterial(teacherId, classId, sessionId, item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="session-materials" aria-label="Bài giảng của tiết học">
    <h3 className="session-materials__title"><button type="button" className="session-materials__toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)}><span><UiIcon name="book" size={18} />Bài giảng <small>· {loading ? "Đang tải…" : error ? "Không thể tải" : `${items.length} tài liệu`}</small></span><UiIcon name="chevron" size={16} /></button></h3>
    <div id={panelId} className={`session-materials__panel ${expanded ? "session-materials__panel--open" : ""}`} inert={!expanded}><div className="session-materials__clip"><div className="session-materials__content">
    <div className="material-section-heading"><div><h3>Bài giảng của tiết học</h3><p>Chọn bài có sẵn hoặc thêm tài liệu mới.</p></div><button type="button" className="secondary-button" disabled={loading || busy} onClick={() => setPicker(true)}><UiIcon name="plus" size={18} />Gắn bài giảng</button></div>
    {error && <div className="material-error" role="alert">{error} <button type="button" className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>}
    {loading ? <p role="status" className="material-empty">Đang tải bài giảng…</p> : items.length ? <MaterialList items={items} teacherId={teacherId} action={(item) => <button className="secondary-button" type="button" disabled={busy} onClick={() => remove(item)}>Gỡ khỏi tiết</button>} /> : !error && <p className="material-empty">Tiết học này chưa có bài giảng.</p>}
    </div></div></div>
    {picker && <MaterialPicker teacherId={teacherId} classId={classId} sessionId={sessionId} attachedIds={items.map((item) => item.id)} onClose={() => setPicker(false)} onAdded={(result) => { setItems(result); setPicker(false); }} />}
  </section>;
}

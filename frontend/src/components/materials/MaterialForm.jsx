import { useState } from "react";

export function MaterialForm({ material, onSave, onCancel, note }) {
  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [kind, setKind] = useState(material?.fileName ? "file" : "link");
  const [url, setUrl] = useState(material?.sourceUrl ?? "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setError("");
    if (kind === "file" && !file && !material?.fileName) { setError("Hãy chọn tệp bài giảng."); return; }
    if (file && file.size > 20 * 1024 * 1024) { setError("Tệp tối đa 20 MB."); return; }
    const form = new FormData();
    form.set("title", title.trim()); form.set("description", description.trim());
    if (kind === "link") form.set("url", url.trim());
    else if (file) form.set("file", file);
    setBusy(true);
    try { await onSave(form); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form className="material-form" onSubmit={submit}>
    {note && <p className="material-help">{note}</p>}
    <fieldset disabled={busy}>
      <label>Tên bài giảng (không bắt buộc)<input autoFocus maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Mô tả (không bắt buộc)<textarea rows={3} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <div className="material-tabs" role="group" aria-label="Nguồn bài giảng"><button type="button" aria-pressed={kind === "link"} onClick={() => setKind("link")}>Liên kết</button><button type="button" aria-pressed={kind === "file"} onClick={() => setKind("file")}>Tải tệp lên</button></div>
      {kind === "link" ? <label>Liên kết bài giảng<input type="url" required pattern="https://.*" maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} /><small>Canva, Google Slides hoặc liên kết HTTPS khác. Đảm bảo người dùng có quyền mở tại nguồn.</small></label>
        : <label>Tệp PDF hoặc PowerPoint<input type="file" accept=".pdf,.ppt,.pptx" onChange={(event) => setFile(event.target.files[0] ?? null)} /><small>{material?.fileName ? `Tệp hiện tại: ${material.fileName}. Chọn tệp mới để thay thế.` : "Hỗ trợ PDF, PPT, PPTX · Tối đa 20 MB."}</small></label>}
    </fieldset>
    {error && <p className="material-error" role="alert">{error}</p>}
    <div className="material-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Hủy</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Đang lưu…" : material ? "Lưu thay đổi" : "Thêm bài giảng"}</button></div>
  </form>;
}

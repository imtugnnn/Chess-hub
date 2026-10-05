import { materialFileUrl } from "../../services/api";
import { UiIcon } from "../UiIcon";

export function MaterialList({ items, teacherId, action }) {
  return <div className="material-list">{items.map((item) => {
    const isPdf = item.contentType === "application/pdf";
    const opensInTab = Boolean(item.sourceUrl) || isPdf;
    return <article className="material-row" key={item.id}>
    <span className="material-source-icon"><UiIcon name="book" size={22} /></span>
    <div className="material-row__content"><strong>{item.title || item.fileName || "Bài giảng chưa đặt tên"}</strong><span className="material-meta">{item.centerId ? "Mặc định trung tâm" : "Bài giảng của tôi"} · {item.fileName ? `${item.fileName}${item.fileSize ? ` · ${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}` : "Liên kết"}{item.deleted ? " · Đã xóa khỏi thư viện" : ""}</span>{item.description && <p>{item.description}</p>}</div>
    <div className="material-row__actions"><a className="secondary-button" href={item.sourceUrl ?? materialFileUrl(teacherId, item.id)} target={opensInTab ? "_blank" : undefined} rel={opensInTab ? "noopener noreferrer" : undefined} download={opensInTab ? undefined : item.fileName}>{item.sourceUrl ? "Mở bài" : isPdf ? "Xem PDF" : "Tải tệp"}</a>{action?.(item)}</div>
  </article>; })}</div>;
}

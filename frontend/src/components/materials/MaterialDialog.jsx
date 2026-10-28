import { useEffect, useRef } from "react";
import { UiIcon } from "../UiIcon";
import "./materials.css";

export function MaterialDialog({ title, children, onClose, busy = false, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    dialog.querySelector("[data-dialog-autofocus]")?.focus();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog className={`material-dialog ${className}`} ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="material-dialog__heading"><h2>{title}</h2><button type="button" className="material-icon-button" aria-label="Đóng" disabled={busy} onClick={onClose}><UiIcon name="close" /></button></div>
    {children}
  </dialog>;
}

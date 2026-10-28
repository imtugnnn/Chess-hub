import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UiIcon } from "./UiIcon";

const OPTIONS = [
  { key: "arrows", label: "Mũi tên gợi ý", note: "Đánh dấu nước đi tốt nhất trên bàn cờ." },
  { key: "evaluation", label: "Đánh giá thế cờ", note: "Hiện lợi thế Trắng/Đen bằng thanh điểm cạnh bàn." },
  { key: "variations", label: "3 phương án", note: "So sánh ba nước ưu tiên và chuỗi nước tiếp theo." },
];

export function AnalysisSettings({ tools, onToggle }) {
  const id = useId();
  const trigger = useRef(null), panel = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const bounds = trigger.current.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 32);
      const height = panel.current?.getBoundingClientRect().height || 340;
      const below = bounds.bottom + 8;
      setPosition({ width, left: Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16)), top: below + height <= window.innerHeight - 16 ? below : Math.max(16, bounds.top - height - 8), maxHeight: window.innerHeight - 32 });
    }
    function dismiss(event) {
      if (event.type === "keydown") {
        if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      } else if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false);
    }
    place();
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", dismiss); document.addEventListener("focusin", dismiss); document.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", dismiss); document.removeEventListener("keydown", dismiss);
    };
  }, [open]);
  const positioned = position !== null;
  useLayoutEffect(() => {
    if (open && positioned) panel.current?.querySelector('[role="switch"]')?.focus({ preventScroll: true });
  }, [open, positioned]);
  return <>
    <button ref={trigger} type="button" className="be-icon-button be-settings-trigger" aria-label="Cài đặt phân tích" title="Cài đặt phân tích" aria-expanded={open} aria-controls={`${id}-panel`} data-enabled={Object.values(tools).some(Boolean)} onClick={() => setOpen((value) => !value)}><UiIcon name="settings" size={20} /></button>
    {open && createPortal(<section ref={panel} id={`${id}-panel`} className="be-settings-popover" role="dialog" aria-labelledby={`${id}-title`} style={{ ...position, visibility: position ? "visible" : "hidden" }}>
      <header><h2 id={`${id}-title`}>Cài đặt phân tích</h2><button type="button" className="be-icon-button" aria-label="Đóng cài đặt" onClick={() => { setOpen(false); trigger.current?.focus(); }}><UiIcon name="close" size={18} /></button></header>
      {OPTIONS.map(({ key, label, note }) => <label className="be-setting-row" key={key} htmlFor={`${id}-${key}`}><span><strong>{label}</strong><small id={`${id}-${key}-note`}>{note}</small></span><input id={`${id}-${key}`} type="checkbox" role="switch" aria-label={label} aria-describedby={`${id}-${key}-note`} checked={tools[key]} onChange={() => onToggle(key)} /></label>)}
    </section>, document.body)}
  </>;
}

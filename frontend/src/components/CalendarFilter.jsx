import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UiIcon } from "./UiIcon";

export function CalendarFilter({ label, options, value, onChange, searchable = false, disabled = false, emptyLabel = "Không tìm thấy lớp học.", selectedLabel }) {
  const id = useId();
  const trigger = useRef(null);
  const popup = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);
  const visibleOptions = options.filter((option) => option.label.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN")));
  const selected = options.find((option) => option.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const bounds = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - bounds.bottom - 16;
      const above = bounds.top - 16;
      const flipped = below < 160 && above > below;
      const width = Math.min(Math.max(bounds.width, 240), window.innerWidth - 32);
      setPosition({ width, left: Math.min(bounds.left, window.innerWidth - width - 16), maxHeight: Math.min(304, flipped ? above : below), ...(flipped ? { bottom: window.innerHeight - bounds.top + 8 } : { top: bounds.bottom + 8 }) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  useEffect(() => {
    if (!open || !position) return;
    const target = popup.current?.querySelector("input") ?? popup.current?.querySelector('[aria-selected="true"]') ?? popup.current?.querySelector('[role="option"]');
    target?.focus();
    target?.scrollIntoView({ block: "nearest" });
  }, [open, Boolean(position)]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", dismiss); };
  }, [open]);

  function close() { setOpen(false); trigger.current?.focus(); }
  function moveFocus(event) {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "Tab") { setOpen(false); trigger.current?.focus(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (event.target.tagName === "INPUT" && ["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [...popup.current.querySelectorAll('[role="option"]')];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : current === -1 ? (event.key === "ArrowDown" ? 0 : items.length - 1) : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }

  return <div className="schedule-filter">
    <span id={`${id}-label`} className="schedule-filter__label">{label}</span>
    <button ref={trigger} type="button" role="combobox" title={`${label}: ${selected?.label}`} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} disabled={disabled}
      onClick={() => { setQuery(""); setOpen((current) => !current); }} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setQuery(""); setOpen(true); } else if (event.key === "Escape") close(); }}>
      <span id={`${id}-value`}>{selectedLabel ?? selected?.label}</span><span className="schedule-filter__chevron"><UiIcon name="chevron" size={16} /></span>
    </button>
    {open && position && createPortal(<div ref={popup} className="schedule-filter-popup" style={position} onKeyDown={moveFocus}>
      {searchable && <div className="schedule-filter-popup__search"><input aria-label={`Tìm ${label.toLocaleLowerCase("vi-VN")}`} placeholder={`Tìm ${label.toLocaleLowerCase("vi-VN")}…`} value={query} onChange={(event) => setQuery(event.target.value)} /></div>}
      <div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}>
        {visibleOptions.map((option) => <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => { onChange(option.value); close(); }}>
          <span>{option.label}</span>{value === option.value && <UiIcon name="check" size={16} />}
        </button>)}
        {!visibleOptions.length && <p>{emptyLabel}</p>}
      </div>
    </div>, document.body)}
  </div>;
}

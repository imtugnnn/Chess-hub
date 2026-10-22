import { useEffect, useRef, useState } from "react";
import { UiIcon } from "../UiIcon";

export function AppHeadbar({ title, teacherName = "", onNavigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const account = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    function dismiss(event) {
      if (event.type === "keydown") {
        if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); }
      } else if (!account.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [open]);
  return <header className="app-headbar">
    <h1>{title}</h1>
    <div className="home-account" ref={account}>
      <button className="home-account-trigger" ref={trigger} type="button" aria-label={`Tài khoản ${teacherName}`} aria-expanded={open} aria-controls="home-account-actions" onClick={() => setOpen(!open)}>
        <span className="home-avatar">{teacherName.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase()}</span>
        <span className="home-account-name"><strong>{teacherName}</strong><small>Tài khoản của bạn</small></span>
        <UiIcon name="chevron" size={16} />
      </button>
      {open && <div className="home-account-actions" id="home-account-actions">
        <button type="button" onClick={() => { setOpen(false); onNavigate("/settings"); }}><UiIcon name="settings" size={18} />Cài đặt tài khoản</button>
        <button type="button" onClick={() => { setOpen(false); onLogout(); }}><UiIcon name="logout" size={18} />Đăng xuất</button>
      </div>}
    </div>
  </header>;
}

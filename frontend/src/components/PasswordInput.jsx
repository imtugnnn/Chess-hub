import { useState } from "react";
import "./password-input.css";

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return <span className="input-wrap password-input">
    <span aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg></span>
    <input {...props} type={visible ? "text" : "password"} />
    <button type="button" className="password-input__toggle" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible((value) => !value)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
        {visible && <path d="m3 3 18 18" />}
      </svg>
    </button>
  </span>;
}

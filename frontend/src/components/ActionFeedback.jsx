import { UiIcon } from './UiIcon';

// The caller owns request state; success is only shown after a successful response.
export function ActionFeedback({ busy, success, children, busyLabel = 'Đang lưu…', successLabel = 'Đã lưu' }) {
  return <span className="action-feedback">
    {busy ? <span className="action-feedback__spinner" aria-hidden="true" /> : success ? <UiIcon name="check" size={17} /> : null}
    <span>{busy ? busyLabel : success ? successLabel : children}</span>
  </span>;
}

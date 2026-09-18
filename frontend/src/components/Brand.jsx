export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">♞</span>
      <span>Chess<span>Hub</span></span>
    </div>
  );
}

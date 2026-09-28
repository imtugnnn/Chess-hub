export function AppPageHeader({ breadcrumb, title, description, actions, icon, className = "" }) {
  const defaultIcon = getBreadcrumbIcon(breadcrumb);
  const displayIcon = icon ?? defaultIcon;

  return (
    <header className={`dashboard-header ${className}`}>
      <div className="dashboard-header__main">
        {displayIcon && <div className="dashboard-header__icon" aria-hidden="true">{displayIcon}</div>}
        <div className="dashboard-header__content">
          {breadcrumb && <div className="dashboard-header__breadcrumb"><span>{breadcrumb}</span></div>}
          <h1 className="dashboard-header__title">{title}</h1>
          {description && <p className="dashboard-header__description">{description}</p>}
        </div>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}

function getBreadcrumbIcon(breadcrumb = "") {
  const text = String(breadcrumb).toLowerCase();
  if (text.includes("tổng quan")) return "♟";
  if (text.includes("lịch")) return "📅";
  if (text.includes("điểm danh")) return "📋";
  if (text.includes("giải đấu") || text.includes("swiss")) return "🏆";
  if (text.includes("lớp")) return "🏫";
  return "♟";
}


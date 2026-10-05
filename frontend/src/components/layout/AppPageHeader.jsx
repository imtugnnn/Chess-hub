import { UiIcon } from "../UiIcon";

export function AppPageHeader({ section, breadcrumbs = [], onNavigate, title, description, actions, icon, className = "" }) {
  const defaultIcon = getBreadcrumbIcon(section);
  const displayIcon = icon ?? defaultIcon;

  return (
    <header className={`dashboard-header ${className}`}>
      <div className="dashboard-header__main">
        {displayIcon && <div className="dashboard-header__icon" aria-hidden="true">{displayIcon}</div>}
        <div className="dashboard-header__content">
          {breadcrumbs.length > 0 && <nav className="dashboard-header__breadcrumb" aria-label="Đường dẫn">
            <ol>{breadcrumbs.map((item) => <li key={item.href}>
              <a href={item.href} title={item.label} onClick={(event) => {
                if (onNavigate && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                  event.preventDefault();
                  onNavigate(item.href);
                }
              }}><span>{item.label}</span></a>
            </li>)}</ol>
          </nav>}
          <h1 className="dashboard-header__title">{typeof title === "string" ? title.replace(/\s+([·,:;!?])/g, "\u00a0$1") : title}</h1>
          {description && <p className="dashboard-header__description">{description}</p>}
        </div>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}

function getBreadcrumbIcon(breadcrumb = "") {
  const text = String(breadcrumb).toLowerCase();
  if (text.includes("tổng quan")) return <UiIcon name="home" size={24} />;
  if (text.includes("lịch")) return <UiIcon name="calendar" size={24} />;
  if (text.includes("điểm danh")) return <UiIcon name="check" size={24} />;
  if (text.includes("giải đấu") || text.includes("swiss")) return <UiIcon name="trophy" size={24} />;
  if (text.includes("lớp")) return <UiIcon name="classes" size={24} />;
  if (text.includes("trung tâm")) return <UiIcon name="center" size={24} />;
  if (text.includes("cài đặt")) return <UiIcon name="settings" size={24} />;
  return <UiIcon name="home" size={24} />;
}


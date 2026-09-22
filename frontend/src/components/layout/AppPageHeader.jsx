export function AppPageHeader({ breadcrumb, title, description, actions, className = "" }) {
  return <header className={`dashboard-header ${className}`}><div><p className="breadcrumb">{breadcrumb}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</header>;
}

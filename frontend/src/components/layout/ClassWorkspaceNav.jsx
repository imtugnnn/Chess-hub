import { UiIcon } from "../UiIcon";

const sections = [
  { key: "sessions", label: "Buổi học", icon: "calendar" },
  { key: "students", label: "Học sinh", icon: "classes" },
  { key: "general", label: "Thông tin lớp", icon: "settings" },
  { key: "tournaments", label: "Giải đấu", icon: "trophy" },
];

export function ClassWorkspaceNav({ classId, active, studentCount, onNavigate, onSelect }) {
  return <nav className="class-workspace-nav" aria-label="Nội dung lớp học">
    {sections.map(({ key, label, icon }) => {
      const href = key === "general" ? `/classes/${classId}/manage?section=general` : `/classes/${classId}?tab=${key}`;
      return <a key={key} href={href} aria-current={active === key ? "page" : undefined} onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (onSelect && key !== "general") onSelect(key); else onNavigate(href);
      }}><UiIcon name={icon} size={18} /><span>{label}</span>{key === "students" && <small>{studentCount}</small>}</a>;
    })}
  </nav>;
}

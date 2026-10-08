export function attendanceChanged(current, saved) {
  const keys = Object.keys(current);
  return keys.length !== Object.keys(saved).length || keys.some((key) => current[key] !== saved[key]);
}

export function canonicalClassUrl(to, origin) {
  const url = new URL(to, origin);
  const match = url.pathname.match(/^\/classes\/([0-9a-f-]{36})\/manage$/i);
  if (match) {
    const section = url.searchParams.get("section");
    url.pathname = `/classes/${match[1]}`;
    url.searchParams.delete("section");
    url.searchParams.set("tab", section === "schedule" ? "sessions" : section === "students" ? "students" : "general");
    if (section === "schedule") url.searchParams.set("edit", "schedule");
    if (section === "students") url.searchParams.set("add", "student");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

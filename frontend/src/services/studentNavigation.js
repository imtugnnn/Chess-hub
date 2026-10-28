const idPattern = /^[0-9a-f-]{36}$/i;
export function studentReturnUrl(search = "") {
  const value = new URLSearchParams(search).get("returnTo");
  if (!value || !value.startsWith("/students") || value.startsWith("//")) return "/students";
  try {
    const url = new URL(value, "https://chesshub.local");
    return url.origin === "https://chesshub.local" && url.pathname === "/students" ? `${url.pathname}${url.search}` : "/students";
  } catch { return "/students"; }
}
export function studentDetailUrl(id, listSearch = "") {
  const filters = new URLSearchParams(listSearch);
  filters.delete("studentId");
  return `/students/${id}?${new URLSearchParams({ returnTo: `/students${filters.size ? `?${filters}` : ""}` })}`;
}
export function studentCreateUrl(scope = "personal", listSearch = "") {
  const params = new URLSearchParams({ returnTo: `/students${listSearch}` });
  if (idPattern.test(scope)) params.set("centerId", scope);
  return `/students/new?${params}`;
}
export function legacyStudentDetailUrl(search) {
  const params = new URLSearchParams(search), id = params.get("studentId");
  return id && idPattern.test(id) ? studentDetailUrl(id, search) : null;
}

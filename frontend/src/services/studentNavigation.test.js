import test from "node:test";
import assert from "node:assert/strict";
import { studentReturnUrl, studentDetailUrl, studentCreateUrl, legacyStudentDetailUrl } from "./studentNavigation.js";
const id = "11111111-1111-1111-1111-111111111111";
test("student detail and create pages preserve directory filters and pagination", () => {
  const search = "?query=An&scope=personal&page=2&size=50";
  const detail = new URL(studentDetailUrl(id, search), "https://chesshub.local");
  assert.equal(detail.pathname, `/students/${id}`);
  assert.equal(studentReturnUrl(detail.search), `/students${search}`);
  const create = new URL(studentCreateUrl(id, search), "https://chesshub.local");
  assert.equal(create.pathname, "/students/new"); assert.equal(create.searchParams.get("centerId"), id);
  assert.equal(studentReturnUrl(create.search), `/students${search}`);
});
test("student return navigation is restricted to the internal directory", () => {
  for (const value of ["https://other.test", "//other.test/students", "/students/" + id, "/students/../settings", "/students\\other", "/settings"])
    assert.equal(studentReturnUrl(`?${new URLSearchParams({ returnTo: value })}`), "/students");
});
test("old student query links resolve to detail pages without losing filters", () => {
  const url = new URL(legacyStudentDetailUrl(`?studentId=${id}&scope=personal`), "https://chesshub.local");
  assert.equal(url.pathname, `/students/${id}`); assert.equal(studentReturnUrl(url.search), "/students?scope=personal");
  assert.equal(legacyStudentDetailUrl("?studentId=invalid"), null);
});

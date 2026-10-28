// Restore a rejected Back/Forward move to its original history entry. Replaying
// an approved move keeps the history stack intact rather than adding a new page.
export function createNavigation(browser, onChange) {
  const key = "chesshubPosition";
  let position = browser.history.state?.[key] ?? 0;
  let current = relativeUrl();
  let guard = null;
  let restoring = false;
  let replaying = false;
  let afterRestore = null;
  browser.history.replaceState({ ...browser.history.state, [key]: position }, "", current);

  function relativeUrl() { return `${browser.location.pathname}${browser.location.search ?? ""}${browser.location.hash ?? ""}`; }
  function publish() { onChange(); current = relativeUrl(); }
  function request(action) { if (!guard || guard(action) !== false) action(); }
  function navigate(to, force = false) {
    const action = () => {
      position += 1;
      browser.history.pushState({ [key]: position }, "", to);
      publish();
    };
    if (force) action(); else request(action);
  }
  function popstate() {
    if (restoring) {
      restoring = false;
      const action = afterRestore; afterRestore = null; action?.();
      return;
    }
    const target = relativeUrl();
    const targetPosition = browser.history.state?.[key];
    if (replaying) { replaying = false; position = targetPosition ?? position; publish(); return; }
    const delta = targetPosition === undefined ? 0 : targetPosition - position;
    const proceed = () => {
      const action = () => {
        if (delta) { replaying = true; browser.history.go(delta); }
        else navigate(target, true);
      };
      if (restoring) afterRestore = action; else action();
    };
    if (guard && guard(proceed) === false) {
      if (delta) { restoring = true; browser.history.go(-delta); }
      else browser.history.replaceState({ ...browser.history.state, [key]: position }, "", current);
      return;
    }
    position = targetPosition ?? position;
    publish();
  }
  return { navigate, request, popstate, setGuard(next) { guard = next; }, sync() {
    current = relativeUrl(); browser.history.replaceState({ ...browser.history.state, [key]: position }, "", current);
  } };
}

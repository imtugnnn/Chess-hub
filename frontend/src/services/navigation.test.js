import test from "node:test";
import assert from "node:assert/strict";
import { createNavigation } from "./navigation.js";

function harness(deferred = false) {
  let index = 0;
  const entries = [{ url: "/calendar", state: null }];
  const browser = { location: {} };
  const events = [];
  let navigation;
  function sync() { const url = new URL(entries[index].url, "https://chesshub.test"); browser.location = { pathname: url.pathname, search: url.search, hash: url.hash }; }
  browser.history = {
    get state() { return entries[index].state; },
    replaceState(state, _, url) { entries[index] = { url, state }; sync(); },
    pushState(state, _, url) { entries.splice(index + 1); entries.push({ url, state }); index += 1; sync(); },
    go(delta) { const next = index + delta; if (next < 0 || next >= entries.length) return; index = next; sync(); if (deferred) events.push(() => navigation.popstate()); else navigation.popstate(); },
  };
  sync();
  const published = [];
  navigation = createNavigation(browser, () => published.push(`${browser.location.pathname}${browser.location.search}`));
  return { browser, navigation, entries, published, flush() { while (events.length) events.shift()(); }, flushOne() { events.shift()?.(); } };
}

test("approval arriving before the restoration event waits and replays only once", () => {
  const { browser, navigation, entries, published, flush, flushOne } = harness(true);
  navigation.navigate("/classes/class?sessionId=one");
  navigation.navigate("/classes/class?sessionId=two");
  let pending;
  navigation.setGuard((action) => { pending = action; return false; });
  browser.history.go(-1); flushOne(); pending(); flush();
  assert.equal(browser.location.search, "?sessionId=one");
  assert.equal(entries.length, 3);
  assert.equal(published.length, 3);
});

test("query-only transitions publish a new route and preserve selected lesson", () => {
  const { navigation, published } = harness();
  navigation.navigate("/classes/class?sessionId=one");
  navigation.navigate("/classes/class?sessionId=two");
  assert.deepEqual(published, ["/classes/class?sessionId=one", "/classes/class?sessionId=two"]);
});

test("rejected Back keeps the draft page, approval replays Back without duplicating history", () => {
  const { browser, navigation, entries, published } = harness();
  navigation.navigate("/classes/class?sessionId=one");
  navigation.navigate("/classes/class?sessionId=two");
  let pending;
  navigation.setGuard((action) => { pending = action; return false; });
  browser.history.go(-1);
  assert.equal(browser.location.search, "?sessionId=two");
  assert.equal(published.length, 2);
  pending();
  assert.equal(browser.location.search, "?sessionId=one");
  assert.equal(entries.length, 3);
  navigation.setGuard(null);
  browser.history.go(1);
  assert.equal(browser.location.search, "?sessionId=two");
});

test("staying and then requesting another destination keeps only the current intent", () => {
  const { navigation, browser, entries } = harness();
  navigation.navigate("/classes/class?sessionId=one");
  let pending;
  navigation.setGuard((action) => { pending = action; return false; });
  navigation.navigate("/calendar"); // user stays
  navigation.navigate("/classes/class?tab=students");
  assert.equal(browser.location.search, "?sessionId=one");
  pending();
  assert.equal(browser.location.search, "?tab=students");
  assert.equal(entries.length, 3);
});

test("logout callbacks wait for approval; forced session-expiry navigation proceeds", () => {
  const { navigation, browser } = harness();
  let loggedOut = false;
  let pending;
  navigation.setGuard((action) => { pending = action; return false; });
  navigation.request(() => { loggedOut = true; });
  assert.equal(loggedOut, false);
  pending();
  assert.equal(loggedOut, true);
  navigation.navigate("/login", true);
  assert.equal(browser.location.pathname, "/login");
});

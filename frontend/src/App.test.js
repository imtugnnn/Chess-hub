import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({
  entryPoints: [new URL("./App.jsx", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")],
  bundle: true, write: false, platform: "node", format: "cjs", external: ["react"],
  plugins: [{ name: "mock-pages-and-api", setup(builder) {
    builder.onResolve({ filter: /^\.\/pages\// }, ({ path }) => ({ path, namespace: "page" }));
    builder.onLoad({ filter: /.*/, namespace: "page" }, ({ path }) => {
      const name = path.split("/").at(-1);
      // HomePage exports Homepage; the others match their filenames.
      return { contents: `export function ${name === "HomePage" ? "Homepage" : name}() { return "${name}"; }` };
    });
    builder.onResolve({ filter: /^\.\/services\/api$/ }, ({ path }) => ({ path, namespace: "api" }));
    builder.onLoad({ filter: /.*/, namespace: "api" }, () => ({ contents:
      "export const getSessionUser = () => new Promise(() => {}); export const logoutSession = async () => {};" }));
  } }],
});

function initialRender(pathname) {
  const module = { exports: {} };
  const location = new URL(pathname, "https://chesshub.test");
  const browser = { location: { pathname: location.pathname, search: location.search, hash: location.hash, origin: location.origin }, history: { state: {}, replaceState(state, _, to) { this.state = state; const next = new URL(to, location.origin); Object.assign(browser.location, { pathname: next.pathname, search: next.search, hash: next.hash }); } } };
  vm.runInNewContext(compiled.outputFiles[0].text, {
    module, exports: module.exports, require: createRequire(import.meta.url), React, URL, URLSearchParams,
    window: browser,
  });
  return renderToStaticMarkup(React.createElement(module.exports.default));
}

test("public routes render while session verification is pending", () => {
  for (const [path, page] of [["/", "LandingPage"], ["/login", "LoginPage"], ["/register", "RegisterPage"], ["/forgot-password", "ForgotPasswordPage"], ["/reset-password", "ResetPasswordPage"]]) {
    assert.equal(initialRender(path), page);
  }
});

test("protected routes still wait for session verification", () => {
  for (const path of ["/homepage", "/center", "/materials", "/students", "/students/new", "/students/11111111-1111-1111-1111-111111111111", "/students?studentId=11111111-1111-1111-1111-111111111111", "/classes/new", "/tournaments/new", "/classes/11111111-1111-1111-1111-111111111111/manage?section=students"]) {
    assert.match(initialRender(path), /Đang kiểm tra phiên đăng nhập/);
  }
});

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
  vm.runInNewContext(compiled.outputFiles[0].text, {
    module, exports: module.exports, require: createRequire(import.meta.url), React,
    window: { location: { pathname }, history: { replaceState() {} } },
  });
  return renderToStaticMarkup(React.createElement(module.exports.default));
}

test("public routes render while session verification is pending", () => {
  for (const [path, page] of [["/", "LandingPage"], ["/login", "LoginPage"], ["/register", "RegisterPage"]]) {
    assert.equal(initialRender(path), page);
  }
});

test("protected routes still wait for session verification", () => {
  for (const path of ["/homepage", "/center", "/materials", "/classes/new", "/tournaments/new"]) {
    assert.match(initialRender(path), /Đang kiểm tra phiên đăng nhập/);
  }
});

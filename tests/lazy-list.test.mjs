// A long session list opens short and shows the rest while scrolling: the choice of hidden blocks (rows.js lazyHidden) and
// the rule that hides them (clean.css). No browser.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { lazyHidden } from "../rows.js";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");
const main = fs.readFileSync(path.join(import.meta.dirname, "..", "main.js"), "utf8");
const count = (a) => a.filter(Boolean).length;

test("the first ten blocks stay, the rest are hidden", () => {
  const h = lazyHidden(40);
  assert.equal(count(h), 30);
  assert.ok(h.slice(0, 10).every((x) => !x) && h.slice(10).every(Boolean));
});

test("a list barely longer than the step is not cut", () => {
  assert.equal(count(lazyHidden(13)), 0);
  assert.equal(count(lazyHidden(14)), 4);
});

test("the open chat stays wherever it is; the search shows all", () => {
  const h = lazyHidden(40, { cur: 25 });
  assert.equal(h[25], false);
  assert.equal(count(h), 29);
  assert.equal(count(lazyHidden(40, { searching: true })), 0);
});

test("the budget grows by portions and the whole list opens at the end", () => {
  assert.equal(count(lazyHidden(40, { budget: 20 })), 20);
  assert.equal(count(lazyHidden(40, { budget: 40 })), 0);
});

test("the mark hides rows in the list and the pass is repeated when the core erases it", () => {
  assert.match(css, /html\.th-clean #list \[data-clean-lazy\]\s*\{\s*display:\s*none/);
  assert.match(main, /attributeFilter:\s*\[[^\]]*"data-clean-lazy"/);
});

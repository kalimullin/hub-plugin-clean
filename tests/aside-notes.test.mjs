// Side column notes: no decorative counters in the filter tabs and group headers (a number only for what is unread), no scroll
// bar on the list on a phone, and the ☰ menu opened with a mouse or a tap shows no focus ring on "Settings" (the keyboard keeps it).
// Browserless: clean.css is read as text, main.js loads on stub nodes and gets the document's pointer and key events.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const MAIN = pathToFileURL(path.join(root, "main.js")).href;
const rule = (sel, from = css) => {
  const out = [];
  for (let i = from.indexOf(sel + " {"); i >= 0; i = from.indexOf(sel + " {", i + 1)) {
    if (i === 0 || "\n ".includes(from[i - 1])) out.push(from.slice(i, from.indexOf("}", i)));
  }
  assert.ok(out.length, sel);
  return out.join("\n");
};
// the body of every @media (max-width: 760px) block
const phone = () => {
  const out = [];
  for (let i = css.indexOf("@media (max-width: 760px) {"); i >= 0; i = css.indexOf("@media (max-width: 760px) {", i + 1)) {
    let depth = 0, j = css.indexOf("{", i);
    for (; j < css.length; j++) { if (css[j] === "{") depth++; else if (css[j] === "}" && !--depth) break; }
    out.push(css.slice(css.indexOf("{", i) + 1, j));
  }
  return out.join("\n");
};

test("group headers carry no count: the core's .gcount is not drawn", () => {
  assert.match(rule("html.th-clean .gcount"), /display: none/);
});

test("the All | Now tabs carry no count: the number split out by the theme is not drawn", () => {
  assert.match(rule("html.th-clean .active-bar .c-n"), /display: none/);
  assert.doesNotMatch(css, /html\.th-clean \.c-n \{/, "no styling of the number as a badge any more");
});

test("unread and waiting marks stay: the waiting count and the To-do tile count are not hidden", () => {
  assert.match(rule("html.th-clean .srow .tag:not(.soft)[data-n]::after"), /content: attr\(data-n\)/);
  assert.doesNotMatch(css, /\.wt-tile-count[^{]*\{[^}]*display: none/);
});

test("the executors badge on a row carries no count, and its room in the row shrinks to the badge without a digit", () => {
  assert.match(rule("html.th-clean .fork-toggle .n"), /display: none/);
  const twin = rule("html.th-clean li.has-forks > .srow::after");
  assert.match(twin, /content: ""/, "the invisible twin holds no digits");
  assert.match(twin, /padding: 0 12px 0 4px/, "4 + 12 = the badge's padding plus its 10 px chevron");
  assert.match(rule("html.th-clean .fork-toggle"), /padding: 0 2px 0 4px/);
  assert.match(rule("html.th-clean .fork-toggle .chev"), /width: 10px/);
  assert.doesNotMatch(css, /attr\(data-clean-fw\)/);
});

test("on a phone the list has no scroll bar, it still scrolls", () => {
  const p = phone();
  assert.match(rule("html.th-clean .app > aside #list", p), /scrollbar-width: none/);
  assert.match(rule("html.th-clean .app > aside #list::-webkit-scrollbar", p), /display: none/);
  assert.doesNotMatch(rule("html.th-clean .app > aside #list", p), /overflow/, "scrolling itself is untouched");
});

test("the ring is dropped only in a menu opened with a pointer", () => {
  assert.match(rule("html.th-clean #nav-extra[data-clean-ptr] :focus-visible"), /outline: 0/);
});

async function scene() {
  const ls = {};
  const node = (o = {}) => ({ dataset: {}, style: {}, classList: { contains: () => false, toggle() {}, add() {}, remove() {} },
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, matches: () => false,
    setAttribute() {}, removeAttribute() {}, append() {}, remove() {}, addEventListener() {}, ...o });
  const box = node(), menuBtn = node(), row = node();
  menuBtn.closest = (q) => (q.includes("#navmenu") ? menuBtn : null);
  const item = node(); item.closest = (q) => (q.includes("#nav-extra") ? box : null);
  const html = node({ classList: { contains: (c) => c === "th-clean", toggle() {}, add() {}, remove() {} } });
  const doc = { documentElement: html, body: node(), head: node(), activeElement: null, readyState: "complete",
    querySelector: () => null, querySelectorAll: () => [], createElement: () => node(),
    getElementById: (id) => (id === "nav-extra" ? box : null),
    addEventListener: (type, fn) => { (ls[type] ||= []).push(fn); } };
  Object.assign(globalThis, {
    document: doc, localStorage: { getItem: () => null, setItem() {} }, addEventListener() {}, removeEventListener() {},
    requestAnimationFrame: (f) => f(), innerWidth: 1440, innerHeight: 900,
    MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "" }), matchMedia: () => ({ matches: false, addEventListener() {} }),
    setInterval: () => 0, CSS: { escape: (x) => x },
  });
  const mod = await import(MAIN + "?s=" + Math.random());
  await mod.default({ addStyle() {}, addSlot() {}, addOptions() {}, addOrder() {}, option: () => false, el: () => node(), t: (k, d) => d ?? k,
    snapshot: () => ({}), redraw() {}, lang: "en", locale: "en" });
  const fire = (type, target) => { for (const fn of ls[type] || []) fn({ type, target, key: "ArrowDown" }); };
  return { box, menuBtn, item, row, fire };
}

test("a press on ☰ marks the menu, the first key clears the mark", async () => {
  const s = await scene();
  s.fire("pointerdown", s.menuBtn);
  assert.ok("cleanPtr" in s.box.dataset, "opened with a pointer");
  s.fire("keydown", s.item);
  assert.ok(!("cleanPtr" in s.box.dataset), "a key brings the keyboard ring back");
});

test("a press inside the menu keeps the mark, a press elsewhere clears it; the keyboard alone never marks", async () => {
  const s = await scene();
  s.fire("pointerdown", s.menuBtn);
  s.fire("pointerdown", s.item);
  assert.ok("cleanPtr" in s.box.dataset);
  s.fire("pointerdown", s.row);
  assert.ok(!("cleanPtr" in s.box.dataset));
  s.fire("keydown", s.menuBtn);
  assert.ok(!("cleanPtr" in s.box.dataset));
});

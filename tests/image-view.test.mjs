// Image viewer tweaks: tall shots are marked on the core's lightbox, and the CSS for tall shots and the file pill.
// Run: node --test tests/*.test.mjs. No core or browser: main.js loads on document stubs and the capture-phase
// `load` listener on document (a load event never reaches window listeners) is driven by hand.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const MAIN = pathToFileURL(path.join(ROOT, "main.js")).href;
const CSS = readFileSync(path.join(ROOT, "clean.css"), "utf8");

const node = (tag = "div", o = {}) => ({
  tag, dataset: {}, style: {}, children: [], attrs: {},
  classList: { contains: () => false, toggle() {}, add() {}, remove() {} },
  querySelector: () => null, querySelectorAll: () => [], closest: () => null, matches: () => false,
  setAttribute() {}, removeAttribute() {}, append() {}, remove() {}, addEventListener() {},
  ...o,
});

// Scene: a lightbox with an image; `fire` dispatches load/error to the document listeners.
async function scene({ theme = true } = {}) {
  const s = { theme, docListeners: [], marked: new Set() };
  const box = node("div", {
    scrollTop: 77, focused: 0, focus() { this.focused++; },
    classList: {
      contains: (c) => s.marked.has(c), add: (c) => s.marked.add(c), remove: (c) => s.marked.delete(c),
      toggle: (c, on) => { if (on) s.marked.add(c); else s.marked.delete(c); },
    },
  });
  s.box = box;
  s.img = (w, h) => node("img", {
    naturalWidth: w, naturalHeight: h,
    matches: (q) => q === ".lb-img", closest: (q) => (q === ".lightbox" ? box : null),
  });
  const root = node("html", { classList: { contains: (c) => c === "th-clean" && s.theme, toggle() {}, add() {}, remove() {} } });
  const doc = {
    documentElement: root, body: node("body"), activeElement: null, readyState: "complete",
    querySelector: () => null, querySelectorAll: (q) => (q === ".lightbox.clean-tall" && s.marked.has("clean-tall") ? [box] : []),
    getElementById: () => null, createElement: (t) => node(t), head: node("head"),
    addEventListener: (type, fn, opt) => { s.docListeners.push({ type, fn, opt }); },
  };
  Object.assign(globalThis, {
    document: doc, localStorage: { getItem: () => null, setItem() {} },
    addEventListener() {}, removeEventListener() {}, requestAnimationFrame: (f) => f(), innerWidth: 1440, innerHeight: 900,
    MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "" }), matchMedia: () => ({ matches: false, addEventListener() {} }),
    setInterval: () => 0, CSS: { escape: (x) => x },
  });
  const mod = await import(MAIN + "?s=" + Math.random());
  await mod.default({ addStyle() {}, addSlot() {}, addOptions() {}, addOrder() {}, option: () => false, el: (t) => node(t), t: (k) => k, snapshot: () => ({}), redraw() {}, locale: "ru" });
  s.fire = (type, img) => { for (const l of s.docListeners.filter((x) => x.type === type)) l.fn({ type, target: img }); };
  return s;
}

test("load/error listeners sit on document in the capture phase", async () => {
  const s = await scene();
  for (const t of ["load", "error"]) {
    const l = s.docListeners.filter((x) => x.type === t);
    assert.equal(l.length, 1, t);
    assert.equal(l[0].opt, true, t);
  }
});

test("a tall shot (height > 2x width) marks the lightbox and resets its scroll", async () => {
  const s = await scene();
  s.fire("load", s.img(390, 2400));
  assert.ok(s.marked.has("clean-tall"));
  assert.equal(s.box.scrollTop, 0);
});

test("a tall shot moves the focus to the lightbox (keys scroll it), a wide one leaves the focus alone", async () => {
  const s = await scene();
  s.fire("load", s.img(390, 2400));
  assert.equal(s.box.focused, 1);
  assert.equal(s.box.tabIndex, -1);
  s.box.focused = 0;
  s.fire("load", s.img(1200, 800));
  assert.equal(s.box.focused, 0);
});

test("a wide, square or 2:1 image does not mark; paging to one unmarks", async () => {
  const s = await scene();
  for (const [w, h] of [[1200, 800], [300, 300], [400, 800]]) {
    s.fire("load", s.img(390, 2400));
    s.fire("load", s.img(w, h));
    assert.ok(!s.marked.has("clean-tall"), `${w}x${h}`);
  }
});

test("a broken image unmarks", async () => {
  const s = await scene();
  s.fire("load", s.img(390, 2400));
  s.fire("error", s.img(0, 0));
  assert.ok(!s.marked.has("clean-tall"));
});

test("other images and a theme that is off are left alone", async () => {
  const s = await scene();
  const other = s.img(390, 2400); other.matches = () => false;
  s.fire("load", other);
  assert.ok(!s.marked.has("clean-tall"));
  const off = await scene({ theme: false });
  off.fire("load", off.img(390, 2400));
  assert.ok(!off.marked.has("clean-tall"));
});

test("CSS: the feed caption is left alone; tall shots keep their natural size, the file pill stays on one line", () => {
  // the core's own left-aligned caption and the preview position are not overridden
  assert.doesNotMatch(CSS, /\.sent-file \.(md|attach-list)/);
  assert.doesNotMatch(CSS, /\.lb-name\) \{ font-weight/);
  assert.match(CSS, /\.lightbox\.clean-tall \{ overflow: auto; place-items: start center;/);
  // no stretching: the image is never given a width of its own (a 100x300 stays 100x300, centred by auto margins)
  assert.match(CSS, /\.lightbox\.clean-tall \.lb-img \{ max-height: none; margin: auto; \}/);
  assert.doesNotMatch(CSS, /\.clean-tall \.lb-img \{[^}]*(?<![-\w])width: 100vw/);
  // phone: edge to edge, but only as far as the natural width
  assert.match(CSS, /@media \(max-width: 760px\) \{\s*html\.th-clean \.lightbox\.clean-tall \{ padding: 56px 0 72px; \}\s*html\.th-clean \.lightbox\.clean-tall \.lb-img \{ max-width: 100vw;/);
  // the pill: one line, shrink-wrapped, at the core's own spot
  assert.match(CSS, /\.lightbox:is\(\.clean-tall, \.zoom\) \.lb-bar \{[^}]*bottom: 12px;[^}]*white-space: nowrap;/);
  assert.match(CSS, /\.lightbox\.clean-tall\.zoom \.lb-img \{ width: auto; max-width: none;/);
});

// Code blocks (main.js copyWords + clean.css): the core's icon-only copy button gets a visible word for its state —
// «Copy» → «Copied» / «Failed» — in ru, en, es; other hub languages take the core's strings. The words live in data
// attributes because the core rebuilds the button's children on every state change; CSS draws them with ::after over the
// longest word kept invisible in ::before, so the button keeps its width. The state is the core's data-state where the
// core has it (no observer then), otherwise data-clean-state kept from aria-label. Inline code to copy (.code-box.code-inline,
// a 20px button in the line) is the core's alone. Browserless: main.js loads on stub nodes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const MAIN = pathToFileURL(path.join(ROOT, "main.js")).href;
const CSS = readFileSync(path.join(ROOT, "clean.css"), "utf8");

// The core's strings (i18n/<lang>.json); es has none of its own, so the core falls back to English.
const EN = { "web.markdown.copy_code": "Copy code", "web.markdown.copied": "Copied", "web.markdown.copy_failed": "Could not copy" };
const CORE = {
  en: EN,
  ru: { "web.markdown.copy_code": "Скопировать код", "web.markdown.copied": "Скопировано", "web.markdown.copy_failed": "Не скопировалось" },
  es: EN,
  de: { "web.markdown.copy_code": "Code kopieren", "web.markdown.copied": "Kopiert", "web.markdown.copy_failed": "Kopieren fehlgeschlagen" },
};

const node = (tag = "div", o = {}) => ({
  tag, dataset: {}, style: {}, children: [], attrs: {}, textContent: "",
  classList: { contains: () => false, toggle() {}, add() {}, remove() {} },
  querySelector: () => null, querySelectorAll: () => [], closest: () => null, matches: () => false,
  setAttribute() {}, removeAttribute() {}, getAttribute: () => null, append() {}, remove() {}, addEventListener() {},
  ...o,
});

const SEL = ".md .code-box:not(.code-inline) > .code-copy:not([data-clean-copy])";

// core: "old" — state only in aria-label (agents-hub main before data-state); "new" — show() also sets data-state.
// inline: buttons of inline code (.code-box.code-inline) that the selector above must skip.
async function scene({ lang, count = 2, core = "old", inline = 1 }) {
  const S = CORE[lang];
  const t = (k) => S[k] ?? EN[k] ?? k;
  const observers = [];
  // The core's button (markdown.js copyButtons): show() sets title and aria-label for each state.
  const STATE = { "web.markdown.copy_code": "copy", "web.markdown.copied": "copied", "web.markdown.copy_failed": "failed" };
  const button = (isInline) => {
    const b = node("button", { attrs: {}, inline: isInline });
    b.getAttribute = (k) => b.attrs[k] ?? null;
    b.show = (key) => {
      if (core === "new") b.dataset.state = STATE[key];
      b.attrs["aria-label"] = t(key);
      for (const o of observers) if (o.target === b) o.fn([]);
    };
    b.show("web.markdown.copy_code");
    return b;
  };
  const buttons = Array.from({ length: count }, () => button(false));
  const inlines = Array.from({ length: inline }, () => button(true));
  const root = node("html", { classList: { contains: (c) => c === "th-clean", toggle() {}, add() {}, remove() {} } });
  const doc = {
    documentElement: root, body: node("body"), activeElement: null, readyState: "complete", head: node("head"),
    querySelector: () => null, createElement: (x) => node(x), addEventListener() {}, getElementById: () => null,
    querySelectorAll: (q) => (q === SEL ? [...buttons, ...inlines].filter((b) => !b.inline && !("cleanCopy" in b.dataset)) : []),
  };
  const redraws = [];
  Object.assign(globalThis, {
    document: doc, localStorage: { getItem: () => null, setItem() {} },
    addEventListener: (type, fn) => { if (type === "hub-redraw") redraws.push(fn); }, removeEventListener() {},
    requestAnimationFrame: (f) => f(), innerWidth: 1440, innerHeight: 900,
    MutationObserver: class { constructor(fn) { this.fn = fn; } observe(target) { this.target = target; observers.push(this); } disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "" }), matchMedia: () => ({ matches: false, addEventListener() {} }),
    setInterval: () => 0, CSS: { escape: (x) => x },
  });
  const mod = await import(MAIN + "?s=" + Math.random());
  await mod.default({ addStyle() {}, addSlot() {}, addOptions() {}, addOrder() {}, option: () => false, el: (x) => node(x), t, snapshot: () => ({}), redraw() {}, lang });
  const sweep = () => redraws.forEach((f) => f());
  sweep();
  return { buttons, inlines, observers, sweep };
}

const WANT = {
  ru: { copy: "Копировать", copied: "Скопировано", failed: "Не вышло" },
  en: { copy: "Copy", copied: "Copied", failed: "Failed" },
  es: { copy: "Copiar", copied: "Copiado", failed: "Falló" },
};

for (const [lang, w] of Object.entries(WANT)) {
  test(`${lang}: the button's words follow the core's state — ${w.copy} → ${w.copied} / ${w.failed} → ${w.copy}`, async () => {
    const { buttons: [b] } = await scene({ lang });
    assert.deepEqual([b.dataset.cleanCopy, b.dataset.cleanCopied, b.dataset.cleanFailed], [w.copy, w.copied, w.failed]);
    assert.equal(b.dataset.cleanState, "copy");
    b.show("web.markdown.copied");
    assert.equal(b.dataset.cleanState, "copied");
    b.show("web.markdown.copy_code");
    assert.equal(b.dataset.cleanState, "copy");
    b.show("web.markdown.copy_failed");
    assert.equal(b.dataset.cleanState, "failed");
  });

  test(`${lang}: the invisible width keeper holds the longest of the three words`, async () => {
    const { buttons: [b] } = await scene({ lang });
    const longest = Math.max(...Object.values(w).map((x) => x.length));
    assert.equal(b.dataset.cleanWide.length, longest);
  });
}

test("hub language de: the core's own strings are the words", async () => {
  const { buttons: [b] } = await scene({ lang: "de" });
  assert.deepEqual([b.dataset.cleanCopy, b.dataset.cleanCopied, b.dataset.cleanFailed], ["Code kopieren", "Kopiert", "Kopieren fehlgeschlagen"]);
  b.show("web.markdown.copied");
  assert.equal(b.dataset.cleanState, "copied");
});

test("repeated sweeps keep one observer per button", async () => {
  const s = await scene({ lang: "en" });
  s.sweep(); s.sweep();
  assert.equal(s.observers.filter((o) => s.buttons.includes(o.target)).length, s.buttons.length);
});

test("a core with data-state: words only, the state is the core's own, no observer", async () => {
  const s = await scene({ lang: "ru", core: "new" });
  const [b] = s.buttons;
  assert.deepEqual([b.dataset.cleanCopy, b.dataset.cleanCopied, b.dataset.cleanFailed], ["Копировать", "Скопировано", "Не вышло"]);
  assert.equal(b.dataset.cleanWide, "Скопировано");
  assert.ok(!("cleanState" in b.dataset));
  s.sweep(); s.sweep();
  assert.equal(s.observers.filter((o) => s.buttons.includes(o.target)).length, 0);
  b.show("web.markdown.copied");
  assert.equal(b.dataset.state, "copied");
});

for (const core of ["old", "new"]) {
  test(`${core} core: the inline code's button is left as the core draws it`, async () => {
    const s = await scene({ lang: "ru", core, inline: 2 });
    s.sweep();
    for (const b of s.inlines) {
      assert.ok(!Object.keys(b.dataset).some((k) => k.startsWith("clean")), "inline button got clean attributes");
      assert.ok(!s.observers.some((o) => o.target === b), "inline button got an observer");
    }
  });
}

// CSS: the rules that make the box, the scroll and the steady width.
const BTN = "html.th-clean .md .code-box:not(.code-inline) > .code-copy[data-clean-copy]";
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rule = (sel) => {
  const i = CSS.indexOf(sel + " {");
  assert.ok(i >= 0, `no rule for ${sel}`);
  return CSS.slice(i, CSS.indexOf("}", i));
};

test("code scrolls sideways instead of wrapping", () => {
  const r = rule("html.th-clean .md .code-box:not(.code-inline) > pre");
  assert.match(r, /white-space: pre;/);
  assert.match(r, /overflow-x: auto/);
});

test("the button is always visible and sits in its own row above the code", () => {
  const r = rule(`${BTN}`);
  assert.match(r, /opacity: 1/);
  assert.match(r, /position: static/);
  assert.match(r, /grid-row: 1/);
});

test("the shown word and the width keeper share one grid cell; the keeper is invisible", () => {
  assert.match(rule(`${BTN}::before, ${BTN}::after`), /grid-area: 1 \/ 2; position: static; inset: auto/);
  assert.match(rule(`${BTN}::before`), /content: attr\(data-clean-wide\); visibility: hidden/);
  assert.match(CSS, new RegExp(`(^|\\n)${esc(BTN)}::after \\{ content: attr\\(data-clean-copy\\); \\}`));
});

test("the word follows the core's data-state, and data-clean-state as the fallback", () => {
  for (const s of ["copied", "failed"]) {
    assert.match(rule(`${BTN}:is([data-state="${s}"], [data-clean-state="${s}"])::after`), new RegExp(`content: attr\\(data-clean-${s}\\)`));
    assert.match(CSS, new RegExp(esc(`${BTN}:is([data-state="${s}"], [data-clean-state="${s}"]) > .icon {`)));
  }
});

test("no rule touches the inline code's box or button", () => {
  const sels = [...CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(","));
  const touching = sels.filter((x) => /\.code-(copy|box)/.test(x));
  assert.ok(touching.length >= 10);
  for (const x of touching) assert.match(x, /\.code-box:not\(\.code-inline\)/, `not scoped: ${x.trim()}`);
});

test("on touch the button is 44 tall", () => {
  const m = CSS.match(new RegExp(`@media \\(hover: none\\), \\(max-width: 760px\\) \\{\\s*${esc(BTN)} \\{([^}]*)\\}`));
  assert.ok(m, "no touch rule");
  assert.match(m[1], /height: 44px/);
});

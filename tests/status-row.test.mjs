// The bottom row of the composer card: nothing overlaps at any width and with any number of plugin buttons.
// Run: node --test tests/. No browser: the order of steps is the pure function pickStep, the row measuring is fit.js on stub
// nodes whose widths depend on the classes on .dock-inner (as in clean.css), and the rules of clean.css are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pickStep, STEPS, GAP, MIN, mountFit } from "../fit.js";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");

// widths of the status buttons: executors, model, effort — with full and with short labels
const W = { long: { par: 150, mod: 90, eff: 70 }, short: { par: 110, mod: 70, eff: 70 } };
const total = (w, names) => names.reduce((a, k) => a + w[k], 0) + GAP * (names.length - 1);

test("the order of steps: labels, ellipsis, effort, model, executors — each next one only when the previous does not fit", () => {
  assert.equal(pickStep(W, total(W.long, ["par", "mod", "eff"])), 0);
  assert.equal(pickStep(W, total(W.long, ["par", "mod", "eff"]) - 1), 1);
  assert.equal(pickStep(W, total(W.short, ["par", "mod", "eff"]) - 1), 2);
  const floor = (names) => names.reduce((a, k) => a + Math.min(W.short[k], MIN[k]), 0) + GAP * (names.length - 1);
  assert.equal(pickStep(W, floor(["par", "mod", "eff"]) - 1), 3);
  assert.equal(pickStep(W, floor(["par", "mod"]) - 1), 4);
  assert.equal(pickStep(W, floor(["par"]) - 1), 5);
  assert.equal(pickStep(W, 0), 5);
  const rooms = [];
  for (let r = 400; r >= 0; r--) rooms.push(pickStep(W, r));
  assert.deepEqual(rooms, [...rooms].sort((a, b) => a - b), "the less room, the more steps — they never go back");
});

test("a session without effort takes the same steps without its width", () => {
  const w = { long: { par: 150, mod: 90 }, short: { par: 110, mod: 70 } };
  assert.equal(pickStep(w, 150 + GAP + 90), 0);
  assert.equal(pickStep(w, 0), 5);
  assert.equal(pickStep({ long: {}, short: {} }, 0), 0, "no status buttons — nothing to give way");
});

test("steps are cumulative class lists named in clean.css", () => {
  for (let i = 1; i < STEPS.length; i++) assert.deepEqual(STEPS[i].slice(0, STEPS[i - 1].length), STEPS[i - 1]);
  for (const n of ["short", "shrink", "noeff", "nomod", "nopar"]) assert.match(css, new RegExp(`\\.dock-inner\\.clean-fit-${n}\\b`), `clean.css has no rule for clean-fit-${n}`);
  assert.match(css, /\.dock-inner\.clean-up\b/);
});

test("clean.css: 8 between neighbours, the status room comes from the measure, the camera is 8 from the mic", () => {
  assert.match(css, /padding: 0 var\(--fit-r, [^)]*\) [^;]*var\(--fit-l, 52px\);\s*justify-content: flex-end; align-items: center; gap: 8px;/);
  assert.match(css, /right: calc\(12px \+ 2 \* var\(--row, 32px\) \+ 16px\)/, "camera: send 12 + button + 8 + mic + 8");
  assert.match(css, /\.bar:not\(\.reply-bar\) \{ flex-wrap: nowrap; gap: 8px; \}/);
  assert.match(css, /\.bar \{ padding-left: calc\(var\(--row, 32px\) \+ 8px\); \}/, "8 from «+» to the first button of the row");
  // container steps do not decide for the room: short labels and hiding come from fit.js only
  assert.doesNotMatch(css, /@container status \([^)]*\)\s*\{[^}]*(par-long|\.stat-eff|\.stat-mod)/);
});

// A page stub: a tree of nodes with rectangles. The width of the status line and the place of the buttons on the right follow
// the classes on .dock-inner the way clean.css does; the plugin buttons wrap (clean-up) when they do not fit.
function page({ cardW = 366, tools = 0, vf = true, mic = true }) {
  const d = { cls: new Set(), style: {}, dataset: {} };
  d.classList = { add: (c) => d.cls.add(c), remove: (c) => d.cls.delete(c), toggle: (c, on) => (on ? d.cls.add(c) : d.cls.delete(c)), contains: (c) => d.cls.has(c) };
  d.style = { props: {}, setProperty(k, v) { this.props[k] = v; }, removeProperty(k) { delete this.props[k]; } };
  const up = () => d.cls.has("clean-up");
  const BTN = 32, G = 8, PAD = 12;
  const rect = (left, w, top = 100, h = BTN) => ({ left, right: left + w, top, bottom: top + h, width: w, height: h });
  const rowTop = 100, upTop = 60;
  const el = (r, shown = true) => ({ getBoundingClientRect: () => r(), getClientRects: () => (shown ? [1] : []), classList: { contains: () => false }, style: {} });
  const toolsW = () => (tools ? tools * BTN + (tools - 1) * G : 0);
  const right0 = () => cardW - PAD;                                   // the right edge of the content
  const send = () => rect(right0() - BTN, BTN, rowTop);
  const micR = () => rect(send().left - G - BTN, BTN, rowTop);
  const camL = () => (vf ? (mic ? micR().left : send().left) - G - BTN : null);
  const toolsR = () => {
    const last = (vf ? camL() : mic ? micR().left : send().left) - G;
    return up() ? rect(right0() - toolsW(), toolsW(), upTop) : rect(last - toolsW(), toolsW(), rowTop);
  };
  const need = BTN + G + toolsW() + G + (vf ? BTN + G : 0) + (mic ? BTN + G : 0) + BTN;   // «+», buttons, camera, mic, send
  const natural = (long, short) => () => rect(0, d.cls.has("clean-fit-short") ? short : long, rowTop, 28);
  const chips = { par: natural(150, 110), mod: natural(90, 70), eff: natural(70, 70) };
  const status = { getBoundingClientRect: () => rect(0, cardW, rowTop), classList: { contains: () => false }, style: {},
    querySelector: (q) => { const k = /stat-(\w+)/.exec(q)?.[1]; return k ? el(chips[k]) : null; } };
  const plus = el(() => rect(PAD, BTN, rowTop));
  const bar = { scrollWidth: 0, clientWidth: 0, classList: { contains: () => false },
    querySelectorAll: () => [
      mic && el(micR), el(send), ...(tools ? [el(toolsR)] : []),
    ].filter(Boolean) };
  Object.defineProperty(bar, "scrollWidth", { get: () => (need > cardW - 2 * PAD - 0 ? need : 0) });
  Object.defineProperty(bar, "clientWidth", { get: () => cardW - 2 * PAD });
  const card = { classList: { contains: () => false }, getBoundingClientRect: () => rect(0, cardW, 90, 80),
    querySelector: (q) => (q.includes(".bar") ? bar : q.includes(".attach") ? plus : null) };
  d.querySelector = (q) => (q.includes("form.composer") ? card : q.includes(".status") ? status : null);
  d.querySelectorAll = (q) => (vf && q.includes(".vf-slot") ? [el(() => rect(camL(), BTN, rowTop))] : []);
  const doc = { querySelector: (q) => (q === ".dock-inner" ? d : null), fonts: null };
  return { d, doc, up, toolsR, camL };
}

async function fitted(opts) {
  const p = page(opts);
  let frame = null;
  Object.assign(globalThis, {
    document: p.doc, requestAnimationFrame: (f) => { frame = f; },
    ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} disconnect() {} },
    CSS: { supports: () => true },
  });
  const fit = mountFit(() => true);
  fit.hook();
  frame?.();
  return p;
}

test("fit.js: a wide window — everything in place, no wrap", async () => {
  const p = await fitted({ cardW: 1100, tools: 3 });
  assert.equal(p.d.dataset.fit, "0");
  assert.equal(p.up(), false);
});

test("fit.js: the status gives way by the real width, not by a button count", async () => {
  for (const tools of [0, 1, 3, 5]) {
    const row = { single: [], up: [] };
    for (let w = 1100; w >= 340; w -= 10) { const p = await fitted({ cardW: w, tools }); row[p.up() ? "up" : "single"].push(+p.d.dataset.fit); }
    for (const [mode, steps] of Object.entries(row)) assert.deepEqual(steps, [...steps].sort((x, y) => x - y), `${tools} buttons, ${mode}: the narrower the window, the more steps`);
    assert.equal(row.single[0], 0, `${tools} buttons: at 1100 everything is in place`);
  }
  // at the same width more plugin buttons mean no fewer steps
  for (const w of [700, 560, 480]) {
    const a = await fitted({ cardW: w, tools: 1 }), b = await fitted({ cardW: w, tools: 5 });
    assert.ok(+b.d.dataset.fit >= +a.d.dataset.fit || b.up(), `${w}: five buttons give way no less than one, or go above`);
  }
});

test("fit.js: plugin buttons with no room in one row go above, and the status stays", async () => {
  const p = await fitted({ cardW: 366, tools: 5 });
  assert.equal(p.up(), true, "five buttons at 366 px — a row above");
  assert.ok(+p.d.dataset.fit < 5, "the status is visible in the bottom row");
  assert.match(p.d.style.props["--fit-l"], /^\d+px$/);
  assert.match(p.d.style.props["--fit-r"], /^\d+px$/);
});

test("fit.js: the status room is between «+» and the nearest button on the right, 8 off each", async () => {
  const p = await fitted({ cardW: 900, tools: 3 });
  const L = parseFloat(p.d.style.props["--fit-l"]), R = parseFloat(p.d.style.props["--fit-r"]);
  assert.equal(L, 12 + 32 + GAP, "left — «+» and the gap");
  assert.equal(900 - R, p.toolsR().left - GAP, "right — the plugin buttons and the gap");
});

test("fit.js: at the narrowest widths the row holds — the status goes away entirely only when there is no room at all", async () => {
  for (const tools of [0, 1, 3, 5, 9]) for (const w of [320, 360, 390, 480]) {
    const p = await fitted({ cardW: w, tools });
    assert.ok(["0", "1", "2", "3", "4", "5"].includes(p.d.dataset.fit), `${w}/${tools}`);
    const L = parseFloat(p.d.style.props["--fit-l"]), R = parseFloat(p.d.style.props["--fit-r"]);
    assert.ok(L + R <= w, `${w}/${tools}: the status paddings are within the card width`);
  }
});

test("fit.js: the theme is switched off — classes and paddings are removed", async () => {
  const p = await fitted({ cardW: 390, tools: 5 });
  assert.ok(p.d.cls.size > 0);
  let on = false;
  Object.assign(globalThis, { document: p.doc });
  const fit = mountFit(() => on);
  fit.reset();
  assert.equal(p.d.cls.size, 0);
  assert.equal(p.d.dataset.fit, undefined);
  assert.deepEqual(p.d.style.props, {});
});

test("clean.css: the reply plate is the whole width of the field, the quote is one line with an ellipsis, «Cancel» sits inside on the right", () => {
  const rule = (sel) => css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"))?.[1] ?? "";
  const bar = rule("html.th-clean :is(.composer, .dock-inner:has(.vf-slot) form.composer) > .bar.reply-bar");
  assert.match(bar, /width: 100%/);
  assert.match(bar, /background: var\(--c-fill\)/);
  assert.match(bar, /padding: 0 0 0 8px/, "the core's 36px on the right would push «Cancel» off the edge of the plate");
  const chip = rule("html.th-clean .composer .reply-chip");
  assert.match(chip, /flex: 1 1 0/);
  assert.match(chip, /text-overflow: ellipsis/);
  assert.match(chip, /background: none/, "the plate is the bar, not the chip");
  assert.match(rule("html.th-clean .composer .reply-bar > .btn"), /flex: none/, "«Cancel» does not shrink under a long quote");
});

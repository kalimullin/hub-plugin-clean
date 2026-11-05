// The model mark on a thread row, as the native client: colour by the lab (Claude, Codex, GLM), number of dots by the
// model class, twinkling while working, dimmed while asleep, the core's unread dot in the same colour.
// Run: node --test tests/*.test.mjs. No browser: marks.js on stub nodes, the rules of clean.css read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { family, harnessOf, tierOf, dotCount, modelLabel, kindOf, markLabel, renderMark } from "../marks.js";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");

// a minimal element: what renderMark touches
function node(tag, cls = "") {
  const attrs = {};
  const n = {
    tag, dataset: {}, title: "", hidden: false, childNodes: [],
    classList: { contains: (c) => cls.split(" ").includes(c) },
    get firstChild() { return n.childNodes[0] || null; },
    replaceChildren: (...kids) => { n.childNodes = kids; },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: (k) => { delete attrs[k]; },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
  };
  return n;
}
const hub = (lang = "ru") => ({ lang, el: (tag, cls) => node(tag, cls) });

const MODELS = [
  { id: "haiku-4-5", tier: 2 }, { id: "sonnet-5-5", tier: 4 }, { id: "opus-5-5", tier: 6 }, { id: "opus", tier: 6 },
  { id: "gpt-6.1-sol", tier: 6 }, { id: "glm-5.3", tier: 6 }, { id: "glm-5.3-flash", tier: 2 }, { id: "top", tier: 8 },
];
const snap = (sessions = [], extra = {}) => ({ models: MODELS, model_names: { "opus-5-5": "Opus 5.5" }, sessions, ...extra });

test("the lab by a model or launcher name; bare Claude aliases are Claude's", () => {
  assert.equal(family("claude-opus-5-5"), "claude");
  assert.equal(family("opus"), "claude");
  assert.equal(family("gpt-6.1-sol"), "codex");
  assert.equal(family("codex"), "codex");
  assert.equal(family("glm-5.3-flash"), "glm");
  assert.equal(family("luna"), "");
  assert.equal(family(undefined), "");
});

test("the harness: explicit, then the launcher, then the model", () => {
  assert.equal(harnessOf({ harness: "glm", model: "opus" }), "glm");
  assert.equal(harnessOf({ doing: { harness: "codex" }, info: { harness: "claude" } }), "codex");
  assert.equal(harnessOf({ info: { launcher: "glm-flash", model: "opus" } }), "glm");
  assert.equal(harnessOf({ info: { model: "claude-sonnet-5-5" } }), "claude");
  assert.equal(harnessOf({ doing: { model: "gpt-6.1-sol" }, model: "opus" }), "codex");
  assert.equal(harnessOf({}), "");
});

test("dots by class: Haiku 2, Sonnet 4, Opus 6, the top class 8, unknown 6", () => {
  const n = (s) => dotCount(tierOf(snap(), s));
  assert.equal(n({ info: { model: "claude-haiku-4-5" } }), 2);
  assert.equal(n({ info: { model: "claude-sonnet-5-5" } }), 4);
  assert.equal(n({ info: { model: "claude-opus-5-5" } }), 6);
  assert.equal(n({ model: "top" }), 8);
  assert.equal(n({ model: "something-new" }), 6);
  assert.equal(n({}), 6);
  assert.equal(n({ model_effective: "glm-5.3-flash", model: "opus" }), 2, "the effective model wins");
  assert.equal(dotCount(7), 6, "always in pairs");
  assert.equal(dotCount(1), 2);
  assert.equal(dotCount(9), 8);
});

test("the model name from the hub's catalogue, effort capitalised", () => {
  assert.equal(modelLabel(snap(), { info: { model: "claude-opus-5-5" }, effort: "high" }), "Opus 5.5 High");
  assert.equal(modelLabel(snap(), { model: "gpt-6.1-sol" }), "gpt-6.1-sol");
  assert.equal(modelLabel(snap(), { model: "default" }), "");
  assert.equal(modelLabel(snap(), { info: { model: "claude-haiku-4-5" } }), "Haiku 4.5");
});

test("the state: working (or its executors work), asleep; paused, held, manual — the core's own mark", () => {
  assert.equal(kindOf(snap(), { status: "working" }), "work");
  assert.equal(kindOf(snap(), { status: "asleep" }), "asleep");
  assert.equal(kindOf(snap(), { status: "idle", state: "idle" }), "");
  assert.equal(kindOf(snap(), { status: "working", state: "held" }), "");
  assert.equal(kindOf(snap(), { status: "working", quota_hold: true }), "");
  const boss = { name: "boss", status: "idle", state: "idle" };
  const exec = { name: "x", role: "executor", raised_by: "boss", status: "working" };
  assert.equal(kindOf(snap([boss, exec]), boss), "work", "a free session with a working executor works");
  const paused = { name: "p", status: "working" };
  const s = snap([paused], { features: ["session.quota_hold"], sessions_extra: { p: { quota_hold: true } } });
  assert.equal(kindOf(s, paused), "");
});

test("the label in words and the model: colour is never the only signal", () => {
  assert.equal(markLabel("ru", "work", "Opus 5.5 High"), "Работает: Opus 5.5 High");
  assert.equal(markLabel("en", "asleep", ""), "Asleep");
  assert.equal(markLabel("es-AR", "work", "GLM"), "Trabajando: GLM");
  assert.equal(markLabel("de", "asleep", "X"), "Asleep: X");
});

test("renderMark: one node per root, kept across snapshots; the root carries the state for the stylesheet", () => {
  const r = node("span", "slot"), h = hub("ru");
  const s = { name: "a", status: "working", info: { model: "claude-sonnet-5-5" }, effort: "high" };
  const m = renderMark(h, r, snap([s]), s);
  assert.equal(m.dataset.harness, "claude");
  assert.equal(m.dataset.kind, "work");
  assert.equal(m.hidden, false);
  assert.equal(m.childNodes.length, 4);
  assert.equal(r.dataset.cleanMark, "work");
  assert.equal(m.getAttribute("role"), "img");
  assert.equal(m.getAttribute("aria-label"), "Работает: Sonnet 5.5 High");
  const first = m.childNodes[0];
  const again = renderMark(h, r, snap([{ ...s, status: "asleep" }]), { ...s, status: "asleep" });
  assert.equal(again, m, "the same node");
  assert.equal(again.childNodes[0], first, "dots not rebuilt while their number stays");
  assert.equal(r.dataset.cleanMark, "asleep");
  const idle = { ...s, status: "idle", state: "idle" };
  renderMark(h, r, snap([idle]), idle);
  assert.equal(m.hidden, true);
  assert.equal(m.dataset.harness, "claude", "hidden, but the lab stays for the unread dot");
  assert.equal(r.dataset.cleanMark, undefined);
  assert.equal(m.getAttribute("role"), null);
  const none = { name: "n", status: "working" };
  renderMark(h, r, snap([none]), none);
  assert.equal(m.dataset.harness, undefined, "no harness — the theme's own status mark");
  assert.equal(r.dataset.cleanMark, undefined);
});

test("the slot is registered in main.js and clears itself off the theme", () => {
  assert.match(main, /import \{ renderMark \} from "\.\/marks\.js"/);
  assert.match(main, /hub\.addSlot\("sidebar\.session", \{\s*id: "clean-mark"/);
  assert.match(main, /root\.replaceChildren\(\); delete root\.dataset\.cleanMark; return;/);
});

test("lab colours: native in the dark, deepened to 3:1 on the light rows; GLM lighter in the dark", () => {
  assert.match(css, /--c-claude: light-dark\(#B35C00, #FF9F0A\);/);
  assert.match(css, /--c-codex: light-dark\(#248A3D, #30D158\);/);
  assert.match(css, /--c-glm: light-dark\(#5856D6, #7D7AFF\);/);
  for (const h of ["claude", "codex", "glm"]) {
    assert.match(css, new RegExp(`\\.clean-mark\\[data-harness="?${h}"?\\][^{]*\\{[^}]*color: var\\(--c-${h}\\)`), `dot colour for ${h}`);
    assert.match(css, new RegExp(`\\.clean-mark\\[data-harness="?${h}"?\\]\\)[^{]*> \\.dot::before \\{[^}]*background: var\\(--c-${h}\\)`), `unread colour for ${h}`);
  }
});

test("asleep dimmed to .28, working twinkles, reduced motion holds still", () => {
  assert.match(css, /\[data-kind="?asleep"?\] > i \{[^}]*opacity: \.28/);
  assert.match(css, /\[data-kind="?work"?\] > i \{[^}]*animation: clean-mark-twinkle/);
  assert.match(css, /@keyframes clean-mark-twinkle/);
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*?\.clean-mark[^{]*\{[^}]*animation: none; opacity: 1;/, "still dots keep full contrast");
});

test("the mark replaces the core's glyph only while shown, and no :has() is nested (a nested one voids the rule)", () => {
  assert.match(css, /\.srow:has\(> \.slot-sidebar-session\[data-clean-mark\]\) > :is\(\.glyph, \.dot\) \{[^}]*display: none/);
  for (const m of css.matchAll(/:has\(/g)) {
    let depth = 1, i = m.index + 5;
    for (; i < css.length && depth; i++) {
      if (css[i] === "(") depth++;
      else if (css[i] === ")") depth--;
      if (depth && css.startsWith(":has(", i)) assert.fail(`nested :has() at ${css.slice(m.index, m.index + 80)}`);
    }
  }
});

// Red of Clean: white text on a red fill (the "waiting for you" count, the header pill) and red text without a fill
// (usage 95%, voice recording, the core's "account stopped") keep ≥4.5:1 in both themes. Values are read from clean.css and
// clean.json / clean-dark.json, not copied here.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const theme = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")).colors;
const light = theme("clean.json"), dark = theme("clean-dark.json");

const rgb = (h) => { const m = /^#([0-9a-f]{6})$/i.exec(h.trim()); assert.ok(m, "hex color: " + h); return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); };
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
// a token of the theme's root block: one value, or light-dark(light, dark)
const token = (name) => {
  const v = new RegExp(`\\n\\s*${name}: ([^;]+);`).exec(css)?.[1];
  assert.ok(v, "token " + name);
  const ld = /^light-dark\((.+), (.+)\)$/.exec(v);
  return ld ? [ld[1], ld[2]] : [v, v];
};
const resolve = (v, colors) => (v === "var(--destructive)" ? colors.destructive : v);
const [shellL, shellD] = token("--c-shell").map(rgb);
const WHITE = [255, 255, 255];
const bgs = { light: [rgb(light.background), shellL], dark: [rgb(dark.background), shellD] };

test("white text on the red fill: ≥4.5:1, one fill in both themes, and the fill stands out from the page (≥3:1)", () => {
  const [l, d] = token("--c-alert");
  assert.equal(l, d, "one red fill under white text in both themes");
  const fill = rgb(l);
  assert.ok(ratio(WHITE, fill) >= 4.5, `white on ${l}: ${ratio(WHITE, fill).toFixed(2)}`);
  for (const bg of [...bgs.light, ...bgs.dark]) assert.ok(ratio(fill, bg) >= 3, `${l} on ${bg}: ${ratio(fill, bg).toFixed(2)}`);
  // where the fill sits under white text
  assert.match(css, /\.srow \.tag:not\(\.soft\) \{ background: var\(--c-alert\); \}/);
  assert.match(css, /\.head \.pill:is\(\[data-s="dialog"\], \[data-s="failed"\]\) \{ color: #fff; background: var\(--c-alert\); \}/);
});

test("red text without a fill (--destructive): ≥4.5:1 on the window and on the list in both themes", () => {
  for (const [name, colors, list] of [["light", light, bgs.light], ["dark", dark, bgs.dark]]) {
    const red = rgb(colors.destructive);
    for (const bg of list) assert.ok(ratio(red, bg) >= 4.5, `${name} ${colors.destructive} on ${bg}: ${ratio(red, bg).toFixed(2)}`);
  }
  for (const sel of [".clean-lim .limseg[data-tone=\"high\"] .limpct", ".btn.round.dictate.err:not(.stop, :disabled)", ".vf-slot > .btn.round.vf-rec"])
    assert.ok(css.includes(sel), sel);
});

test("red text on a red tint (the core's .ac-stop 12%, diff 13%) and on hover (--c-fill, --accent): ≥4.5:1 in both themes", () => {
  const [il, id] = token("--c-alert-ink");
  const [fl, fd] = token("--c-fill");
  const alpha = (v) => +/\/ ([\d.]+)\)/.exec(v)[1];
  for (const [name, colors, ink, fill, base] of [["light", light, il, fl, [0, 0, 0]], ["dark", dark, id, fd, WHITE]]) {
    const text = rgb(resolve(ink, colors)), page = rgb(colors.background);
    const tint = over(rgb(colors.destructive), 0.12, page), hover = over(base, alpha(fill), page);
    assert.ok(ratio(text, tint) >= 4.5, `${name} on the tint: ${ratio(text, tint).toFixed(2)}`);
    assert.ok(ratio(text, hover) >= 4.5, `${name} on hover: ${ratio(text, hover).toFixed(2)}`);
    for (const a of [0.12, 0.13]) { const t = over(rgb(colors.destructive), a, page); assert.ok(ratio(text, t) >= 4.5, `${name} on a ${a} tint: ${ratio(text, t).toFixed(2)}`); }
    assert.ok(ratio(text, rgb(colors.accent)) >= 4.5, `${name} on --accent (hover of .btn): ${ratio(text, rgb(colors.accent)).toFixed(2)}`);
  }
  assert.ok(css.includes("html.th-clean :is(.ac-stop, pre.diff .del .mk, .btn.danger:hover, .job .btn.remove:is(:hover, :focus-visible)) { color: var(--c-alert-ink); }"));
  assert.match(css, /\.vf-slot > \.btn\.round\.vf-rec:hover \{ color: var\(--c-alert-ink\); \}/);
});

test("the jump-to-new count: dark text on the light blue of the dark theme (white there is 2.8:1)", () => {
  assert.match(css, /main > \.btn\.jumpnew \.n \{ color: light-dark\(#fff, var\(--primary-foreground\)\); \}/);
  assert.ok(ratio(rgb(dark["primary-foreground"]), rgb(dark.primary)) >= 4.5);
});

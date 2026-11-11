// Small read text — feed times and captions (.row .meta), the folder in the status line, the queue strip labels — is text:
// >= 4.5:1 to what lies under it in Clean and Clean Dark, and never louder than the message text (--c-t1).
// Reads the real clean.css and the theme palettes. Run: node --test tests/.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const palette = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")).colors;
const SCHEMES = [["light", 0, palette("clean.json")], ["dark", 1, palette("clean-dark.json")]];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// --c-x: light-dark(rgb(r g b / a), rgb(r g b / a)) -> [[r, g, b, a], [r, g, b, a]]
function token(name) {
  const m = css.match(new RegExp(`${name}:\\s*light-dark\\(([^;]+)\\);`));
  assert.ok(m, `${name} is defined`);
  const parts = [...m[1].matchAll(/rgb\(([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)/g)].map((x) => x.slice(1).map(Number));
  assert.equal(parts.length, 2, `${name}: a light and a dark value`);
  return parts;
}
const on = ([r, g, b, a], back) => [r, g, b].map((c, i) => c * a + back[i] * (1 - a));

// The colour token of the rule whose selector is exactly `sel`.
function colorOf(sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`^${esc} \\{[^}]*?[;\\s]color: var\\((--[\\w-]+)\\)`, "m"));
  assert.ok(m, `rule ${sel} sets a color`);
  return m[1];
}

// [selector whose rule sets the colour, the element it is measured for, palette colour under it, token laid over that]
const CASES = [
  ["html.th-clean .row .meta", "feed time", "background"],
  ["html.th-clean .row .meta", "time in your bubble (.row.mine > .b > .meta)", "muted"],
  ["html.th-clean :is(.row.from > .b, .reply-box) > .meta", "reply meta line", "background"],
  ["html.th-clean .status > .stat-left > .stat-dir", "folder in the status line", "background"],
  ["html.th-clean .clean-queue .strip-row > .k", "queue label", "background", "--c-fill"],
  ["html.th-clean .clean-queue .strip-row > .strip-urg", "queue urgency", "background", "--c-fill"],
];

test("your bubble's time takes its colour from .row .meta and its backdrop is --muted", () => {
  assert.match(css, /^html\.th-clean \.row\.mine > \.b > \.meta \{(?![^}]*color)[^}]*\}/m);
  assert.match(css, /^html\.th-clean \.row\.mine > \.b \{[^}]*background: var\(--muted\)/m);
});

for (const [sel, what, under, layer] of CASES) for (const [name, i, pal] of SCHEMES) {
  test(`${what}: >= 4.5:1 in ${name} and not louder than the message text`, () => {
    const ink = token(colorOf(sel))[i];
    let b = hex(pal[under]);
    if (layer) b = on(token(layer)[i], b);
    const r = ratio(on(ink, b), b);
    assert.ok(r >= 4.5, `${name}: ${r.toFixed(2)}:1`);
    const t1 = token("--c-t1")[i];
    assert.ok(r < ratio(on(t1, b), b), `${name}: quieter than --c-t1`);
  });
}

// The queue strip's urgency ("срочность NN%", .strip-urg): the core marks it data-level="mid" (yellow) or "high" (red)
// and colours them apart; Clean's base rule (--c-t2) outranks the core's, so Clean must colour the levels itself.
// Each level is text: >= 4.5:1 on the queue plate (--c-fill over the background) in Clean and Clean Dark, the two levels
// differ in hue from each other and from the plain urgency. Reads the real clean.css and palettes. Run: node --test tests/.
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
const on = ([r, g, b, a], back) => [r, g, b].map((c, i) => c * a + back[i] * (1 - a));
const hue = ([r, g, b]) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return null;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

// light-dark(...) of a theme token, each side as [r, g, b, a]
function token(name) {
  const m = css.match(new RegExp(`${name}:\\s*light-dark\\(([^;]+)\\);`));
  assert.ok(m, `${name} is defined`);
  const parts = [...m[1].matchAll(/rgb\(([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)|#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map((x) => {
    if (x[1]) return x.slice(1, 5).map(Number);
    const h = x[5].length === 3 ? x[5].replace(/./g, "$&$&") : x[5];
    return [...hex("#" + h), 1];
  });
  assert.equal(parts.length, 2, `${name}: a light and a dark value`);
  return parts;
}

// The value of `color` in the rule whose selector is exactly `sel`, resolved for scheme i over backdrop `back`.
function inkOf(sel, i, pal, back) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`^${esc} \\{[^}]*?[;\\s]color: ([^;}]+);`, "m"));
  assert.ok(m, `rule ${sel} sets a color`);
  const v = m[1].trim();
  const val = (x) => {
    x = x.trim();
    const t = x.match(/^var\((--[\w-]+)\)$/);
    if (!t) throw new Error(`unsupported colour ${x}`);
    if (t[1].startsWith("--c-")) return on(token(t[1])[i], back);
    assert.ok(pal[t[1].slice(2)], `palette has ${t[1]}`);
    return hex(pal[t[1].slice(2)]);
  };
  const mix = v.match(/^color-mix\(in srgb, (var\([\w-]+\)) (\d+)%, (var\([\w-]+\))\)$/);
  if (mix) {
    const p = Number(mix[2]) / 100, a = val(mix[1]), b = val(mix[3]);
    return a.map((c, k) => c * p + b[k] * (1 - p));
  }
  return val(v);
}

const BASE = "html.th-clean .clean-queue .strip-row > .strip-urg";
const LEVELS = [["mid", `${BASE}[data-level="mid"]`], ["high", `${BASE}[data-level="high"]`]];

for (const [name, i, pal] of SCHEMES) {
  const plate = on(token("--c-fill")[i], hex(pal.background));
  const t1 = ratio(on(token("--c-t1")[i], plate), plate);
  const base = inkOf(BASE, i, pal, plate);
  const inks = {};
  for (const [lvl, sel] of LEVELS) {
    test(`urgency ${lvl}: its own colour, >= 4.5:1 on the queue plate in ${name}, not louder than the message text`, () => {
      const ink = inks[lvl] = inkOf(sel, i, pal, plate);
      const r = ratio(ink, plate);
      assert.ok(r >= 4.5, `${name} ${lvl}: ${r.toFixed(2)}:1`);
      assert.ok(r < t1, `${name} ${lvl}: quieter than --c-t1`);
      assert.notEqual(hue(ink), null, `${name} ${lvl}: a colour, not a grey`);
      assert.notDeepEqual(ink.map(Math.round), base.map(Math.round), `${name} ${lvl}: differs from plain urgency`);
    });
  }
  test(`urgency mid and high are told apart in ${name}: orange vs red, >= 15 degrees of hue`, () => {
    const [m, h] = [inks.mid ?? inkOf(LEVELS[0][1], i, pal, plate), inks.high ?? inkOf(LEVELS[1][1], i, pal, plate)];
    const d = Math.abs(hue(m) - hue(h));
    assert.ok(Math.min(d, 360 - d) >= 15, `${name}: hue ${hue(m).toFixed(0)} vs ${hue(h).toFixed(0)}`);
  });
}

test("high urgency is bold, as in the core", () => {
  assert.match(css, /^html\.th-clean \.clean-queue \.strip-row > \.strip-urg\[data-level="high"\] \{[^}]*font-weight: 600/m);
});

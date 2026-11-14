// Blue text in the light Clean reads at ≥4.5:1: links and text buttons of the core and of the modules paint their text with
// --primary (#4f6cf6 — 4.4:1 on white, 3.9:1 on the gray shell). Clean routes only their TEXT through one variable, --c-link
// (#2e69c1 in light, the old --primary in dark); --primary itself, fills, tints and icons stay.
// Run: node --test tests/*.test.mjs. No browser: the rules of clean.css and the colors of clean.json / clean-dark.json are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(dir, "clean.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const light = JSON.parse(fs.readFileSync(path.join(dir, "clean.json"), "utf8")).colors;
const dark = JSON.parse(fs.readFileSync(path.join(dir, "clean-dark.json"), "utf8")).colors;

const hex = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + 0.05) / (x + 0.05); };
const mix = (a, b, p) => a.map((v, i) => v * p + b[i] * (1 - p));
const token = (name) => (css.match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1]?.trim();
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().replace(/\s+/g, " "), body: m[2] }));
const LINK = token("--c-link"), TINT = token("--c-link-tint");

test("--c-link: #2e69c1 in light, the old --primary in dark; the theme's --primary is not touched", () => {
  assert.equal(LINK, "light-dark(#2e69c1, var(--primary))");
  assert.equal(light.primary, "#4f6cf6");
  assert.equal(dark.primary, "#7d93ff");
});

test("the light text color is ≥4.5:1 on every light surface it sits on", () => {
  const text = hex(LINK.match(/#[0-9a-f]{6}/i)[0]);
  const shell = token("--c-shell").match(/#[0-9a-f]{6}/i)[0];
  for (const [name, bg] of [["background", light.background], ["card", light.card], ["muted", light.muted], ["shell", shell]]) {
    assert.ok(ratio(text, hex(bg)) >= 4.5, `${name} ${bg}: ${ratio(text, hex(bg)).toFixed(2)}`);
  }
  // badges and chips: their own tone on a 14–20% --primary tint over the card (the bus chip is 16%)
  assert.equal(TINT, "light-dark(#2559a8, var(--primary))");
  const deep = hex(TINT.match(/#[0-9a-f]{6}/i)[0]);
  for (const p of [0.14, 0.16, 0.2]) {
    const tint = mix(hex(light.primary), hex(light.card), p);
    assert.ok(ratio(deep, tint) >= 4.5, `${p * 100}% tint: ${ratio(deep, tint).toFixed(2)}`);
  }
  assert.ok(ratio(hex(light.primary), hex(light.background)) < 4.5, "the old text color was below 4.5:1 — the reason for the variable");
});

test("Clean sets --primary only on the text it routes (zero weight), the badges get only their own text tone", () => {
  const sets = rules.filter((r) => /(^|;|\s)--primary\s*:/.test(r.body));
  assert.equal(sets.length, 1, sets.map((r) => r.sel).join(" | "));
  assert.match(sets[0].body, /--primary:\s*var\(--c-link\)/);
  assert.match(sets[0].sel, /^html\.th-clean :where\(/);
  for (const sel of [".todos .t-now", ".hljs-title", ".wl-md-load", ".wl-bell-expand", ".wl-bell-reset", ".wl-session-link", ".wl-file-open",
    ".wv-task-source", ".wv-undo-back", ".vf-link", ".vf-row"]) assert.ok(sets[0].sel.includes(sel), sel);
  for (const icon of [".navmenu", ".btn.round.mic", ".st[", ".bus-step", ".g[", ".wl-list-checked"]) assert.ok(!sets[0].sel.includes(icon), icon);
  const badge = rules.find((r) => /(?<![-\w])color:\s*var\(--c-link-tint\)/.test(r.body));
  assert.match(badge?.sel || "", /^html\.th-clean :where\(/, "zero weight: .ac-badge.busy, .bus-chip.ok/.warn/.bad keep their own colors");
  for (const sel of [".ac-badge", ".voice-model-role", ".bus-chip"]) assert.ok(badge?.sel.includes(sel), sel);
  assert.doesNotMatch(badge.body, /background/, "the badge tint stays");
});

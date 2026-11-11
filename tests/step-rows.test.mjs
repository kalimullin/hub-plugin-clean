// Step rows of the feed («Read · …», «Bash · …»): the tool name is in the text font, only the path or command is monospaced,
// and the secondary step text keeps at least 4.5:1 on the feed background and on the file chip in both schemes.
// Run: node --test tests/. No browser: the rules of clean.css and the colors of clean.json / clean-dark.json are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(dir, "clean.css"), "utf8");
const bg = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).colors.background;

const rule = (sel) => {
  const at = css.indexOf(`${sel} {`);
  assert.notEqual(at, -1, `clean.css has no rule ${sel}`);
  return css.slice(at, css.indexOf("}", at));
};
// light-dark(rgb(r g b / a), rgb(r g b / a)) of a token → [light, dark] as {r,g,b,a}
const token = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*light-dark\\(rgb\\(([^)]*)\\),\\s*rgb\\(([^)]*)\\)\\)`));
  assert.ok(m, `no light-dark value for ${name}`);
  return [m[1], m[2]].map((s) => { const [r, g, b, , a] = s.split(/\s+/).map(Number); return { r, g, b, a: a ?? 1 }; });
};
const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16), a: 1 });
const over = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
const ratio = (fg, back) => { const [a, b] = [lum(over(fg, back)), lum(back)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };

test("the tool name is in the text font; the path or command stays monospaced", () => {
  assert.match(rule("html.th-clean .tool .call b"), /font-family:\s*var\(--font\)/);
  assert.match(rule("html.th-clean .tool .call, html.th-clean .tool .res, html.th-clean .tool pre"), /var\(--font-code, var\(--font-mono\)\)/);
  assert.match(rule("html.th-clean .tool .call .arg"), /color:\s*inherit/);
});

test("secondary step text is at least 4.5:1 on the feed and on the file chip, light and dark", () => {
  assert.match(rule("html.th-clean .tool .call"), /color:\s*var\(--c-t2\)/);
  assert.match(rule("html.th-clean .tool .res"), /color:\s*var\(--c-t2\)/);
  const t2 = token("--c-t2"), fill = token("--c-fill");
  [bg("clean.json"), bg("clean-dark.json")].forEach((b, i) => {
    const feed = hex(b), chip = over(fill[i], feed);
    for (const [where, back] of [["feed", feed], ["chip", chip]]) {
      const r = ratio(t2[i], back);
      assert.ok(r >= 4.5, `${i ? "dark" : "light"} ${where}: ${r.toFixed(2)}:1`);
    }
  });
});

test("step text is not smaller than the other secondary text of the feed", () => {
  const px = (s) => Number(s.match(/font:\s*\d+\s+(\d+)px/)[1]);
  const meta = px(rule("html.th-clean .row .meta"));
  assert.ok(px(rule("html.th-clean .tool .call, html.th-clean .tool .res, html.th-clean .tool pre")) >= meta);
  assert.ok(px(rule("html.th-clean .row:is(.tool, .sys)")) >= meta);
});

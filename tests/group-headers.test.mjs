// Sidebar group headers («Agents», «Directions», «Executors») are read, so they use the secondary text color --c-t2
// (4.6:1 on the light sidebar, 7.2:1 on the dark one); --c-t3 (2.0:1 / 2.7:1) stays for non-essential marks.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");
const rule = (sel) => {
  const i = css.indexOf(sel + " {");
  assert.ok(i >= 0, sel);
  return css.slice(i, css.indexOf("}", i));
};

test("group headers are secondary text, not the faint --c-t3", () => {
  const h = rule("html.th-clean .sgroup-h");
  assert.match(h, /color: var\(--c-t2\)/);
  assert.doesNotMatch(h, /--c-t3/);
});

test("hover makes the header darker than at rest", () => {
  assert.match(rule("html.th-clean .sgroup-h:hover"), /color: var\(--c-t1\)/);
});

// A reaction badge in Clean, as the native ReactionChip: opaque (page background, never see-through over a bubble) and,
// on an own message, hanging on the bubble's bottom-right corner 6px out. With the picker open the row stays under the text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
// all declarations of the exact selector, joined
const rule = (sel) => {
  const out = [];
  for (let i = css.indexOf(sel + " {"); i >= 0; i = css.indexOf(sel + " {", i + 1)) {
    if (i === 0 || "\n ".includes(css[i - 1])) out.push(css.slice(i, css.indexOf("}", i)));
  }
  assert.ok(out.length, sel);
  return out.join("\n");
};

test("the badge is opaque: the page background, also under hover", () => {
  const chip = rule("html.th-clean .react-chip");
  assert.match(chip, /background: var\(--background\)/);
  assert.doesNotMatch(chip, /background: none/);
  assert.match(rule("html.th-clean .react-chip:hover"), /var\(--background\)/);
});

test("on an own message the badge hangs on the bubble's bottom-right corner, 6px out", () => {
  const box = rule("html.th-clean .row.mine > .b > .reactions:has(> .react-chip:only-child)");
  assert.match(box, /position: absolute/);
  assert.match(box, /right: -6px/);
  assert.match(box, /bottom: -6px/);
  const bubble = rule("html.th-clean .row.mine > .b:has(> .reactions > .react-chip:only-child)");
  assert.match(bubble, /position: relative/);
  assert.match(bubble, /padding-bottom: 24px/);   // the badge never covers the last line
});

test("the open picker is not pinned to the corner", () => {
  assert.doesNotMatch(css, /\.reactions:has\(> \.react-pick\)[^{]*\{[^}]*position: absolute/);
});

// A reaction badge in Clean, as the native ReactionChip: opaque (page background, never see-through over a bubble) and,
// on an own message, hanging on the bubble's bottom-right corner (4px out on the right, 6px down). With the picker open the row stays under the text.
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

test("on an own message the badge hangs on the bubble's bottom-right corner, 4px out on the right, 6px down", () => {
  const box = rule("html.th-clean .row.mine > .b > .reactions:has(> .react-chip:only-child)");
  assert.match(box, /position: absolute/);
  assert.match(box, /right: -4px/);
  assert.match(box, /bottom: -6px/);
  const bubble = rule("html.th-clean .row.mine > .b:has(> .reactions > .react-chip:only-child)");
  assert.match(bubble, /position: relative/);
  assert.match(bubble, /padding-bottom: 24px/);   // the badge never covers the last line
});

test("the open picker is not pinned to the corner", () => {
  assert.doesNotMatch(css, /\.reactions:has\(> \.react-pick\)[^{]*\{[^}]*position: absolute/);
});

// «Reaction» under a session's reply: the core writes it as a word in the name row, the theme keeps «Reply» as an icon in the
// corner — the word ran into that icon on a phone. Here it is the same quiet 24 button with a 16 icon, left of «Reply»
test("«Reaction» under a session's reply is an icon button left of «Reply», visible when «Reply» is", () => {
  const sel = "html.th-clean .row > .b > .reply-btn ~ .react-add";
  const btn = rule(sel);
  assert.match(btn, /position: absolute/);
  assert.match(btn, /top: -2px; right: 28px; width: 24px; height: 24px/);   // «Reply»: right 0, 24 wide, 4 apart
  assert.match(btn, /font-size: 0/);
  assert.match(btn, /opacity: 0/);
  assert.match(rule(sel + "::before"), /mask: url\("react\.svg"\) center \/ 16px no-repeat/);
  assert.match(css, /\.react-add\[aria-expanded="true"\] \{ opacity: 1; \}/);
  assert.match(css, /@media \(hover: none\) \{\n  html\.th-clean \.row > \.b > \.reply-btn ~ \.react-add \{ opacity: 1;/);
  const icons = JSON.parse(fs.readFileSync(path.join(root, "icons8.json"), "utf8"));
  assert.equal(icons.icons.items.react.commonName, "happy");
  assert.ok(fs.readFileSync(path.join(root, "react.svg"), "utf8").startsWith("<svg"));
  assert.match(fs.readFileSync(path.join(root, "main.js"), "utf8"), /\.reply-btn ~ \.react-add:not\(\[title\]\)/);   // the word goes to the tooltip
});

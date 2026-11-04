// Icons in list rows sit on the center of the FIRST line of the record, not on the center of a multi-line record.
// Run: node --test tests/*.test.mjs. No browser: the rules of clean.css are read as text. The pixel check (center of the icon
// against the center of the first line, tolerance 1px, 390 and 1440, Clean and Clean Dark) is done on a stand, see the PR.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");
const D = "html.th-clean.th-clean-detail #list";

// the declarations of the rule whose selector contains `sel` (first match)
const decl = (sel) => {
  const i = css.indexOf(sel);
  assert.ok(i >= 0, `no rule: ${sel}`);
  const open = css.indexOf("{", i);
  return css.slice(open + 1, css.indexOf("}", open));
};

test("two-line rows: status icon, unread dot and badge start at the top, not at the bottom or the middle", () => {
  const d = decl(`${D} .srow[data-clean-d][data-clean-two] > :is(.glyph, .dot, .tag:not(.soft))`);
  assert.match(d, /align-self:\s*start/);
  assert.doesNotMatch(d, /align-self:\s*(end|center)/);
  assert.match(d, /margin-top:\s*calc\(2px \+ var\(--clean-first-dy\)\)/);
});

test("two-line rows: busy dots and the dismiss cross are offset by the size of their own box", () => {
  assert.match(decl(`> .glyph:is([data-s="busy"], [data-s="starting"]) { margin-top`), /margin-top:\s*calc\(9px \+ var\(--clean-first-dy\)\)/);
  assert.match(decl(`> .tag.soft { align-self: start`), /margin-top:\s*calc\(-2px \+ var\(--clean-first-dy\)\)/);
});

test("the picture left of the name raises the first line by 2px", () => {
  assert.match(css, /\.sgroup\.bare \.srow\[data-clean-d\]\[data-clean-two\]:has\(\.nm > \.avatar\) \{ --clean-first-dy: 2px; \}/);
  assert.match(css, /\[data-clean-two\] \{ --clean-first-dy: 0px; \}/);
});

test("executors toggle: pinned to the first line of a two-line row; 22px from the top on the 44px phone row", () => {
  assert.match(decl(`${D} li.has-forks > .srow[data-clean-d][data-clean-two] ~ .fork-toggle`), /top:\s*10px[^}]*bottom:\s*auto[^}]*transform:\s*none/);
  assert.match(decl(`:has(.nm > .avatar) ~ .fork-toggle`), /top:\s*12px/);
  const mobile = css.slice(css.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /html\.th-clean li\.has-forks > \.fork-toggle \{ top: 22px; \}/);
});

test("the time moves left of the icon in every detailed row that has an icon on the first line", () => {
  assert.match(css, /\.srow\[data-clean-d\]:has\(> :is\(\.dot, \.tag:not\(\.soft\), \.glyph:not\(\[data-s="idle"\], \[data-s="dialog"\]\)\)\)::before \{ right: 36px; \}/);
  assert.doesNotMatch(css, /\[data-clean-d\]:not\(\[data-clean-two\]\):has\(> :is\(\.dot[^{]*::before \{ right: 36px/);
});

// No overlap of boxes in the first line (checked on the stand by comparing getBoundingClientRect of the time, the executors
// toggle and the tags: 24 overlaps before, 0 after, 390 and 1440, Clean and Clean Dark). Here: the rules that keep them apart.
test("time and executors toggle do not overlap: the toggle sits left of the time, the invisible twin reserves the room", () => {
  assert.match(decl(`${D} li.has-forks > .srow[data-clean-d] ~ .fork-toggle`), /right:\s*calc\(8px \+ var\(--clean-ago-w, 0px\)\)/);
  assert.match(decl(`${D} li.has-forks > .srow.fw-dot[data-clean-d]::after`), /padding-right:\s*calc\(12px \+ 6px \+ var\(--clean-ago-w, 0px\)\)/);
  assert.match(decl(`${D} li.has-forks > .srow[data-clean-d]::after`), /padding-right:\s*calc\(12px \+ var\(--clean-ago-w, 0px\)\)/);
});

test("time and executors toggle do not overlap: with an icon at the right edge the toggle moves left by the icon too", () => {
  assert.match(css, /\) > \.srow\[data-clean-d\] ~ \.fork-toggle \{ right: calc\(36px \+ var\(--clean-ago-w, 0px\)\); \}/);
});

test("the answer tag does not overlap the time: a spacer as wide as the time stands between them", () => {
  const d = decl(`${D} li:not(.has-forks) > .srow[data-clean-d]:has(> .tag.soft)::after`);
  assert.match(d, /width:\s*calc\(var\(--clean-ago-w, 0px\) - 8px\)/);
  assert.match(d, /order:\s*6/);
});

test("the time width reaches the <li>, because the toggle is a sibling of the row and cannot read the row's variables", () => {
  const js = fs.readFileSync(path.join(import.meta.dirname, "..", "main.js"), "utf8");
  assert.match(js, /parentElement\?\.classList\.contains\("has-forks"\)\) r\.parentElement\.style\.setProperty\("--clean-ago-w"/);
  assert.match(js, /r\.parentElement\?\.style\.removeProperty\("--clean-ago-w"\)/);
});

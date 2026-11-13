// The "working" row at the bottom of the feed: the size of the feed's own text (14/20, as the base web gives .working
// --text-sm at the feed's line height and the native app its status line), never smaller than 12; the three dots stay in the
// middle of the line. Run: node --test tests/*.test.mjs. The rules of clean.css are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(DIR, "clean.css"), "utf8");
const rule = (sel) => {
  const i = css.indexOf(`${sel} {`);
  assert.ok(i >= 0, `${sel} is in clean.css`);
  return css.slice(i, css.indexOf("}", i));
};

test("working row: 14/20 like the feed text, the line as tall as its text", () => {
  const r = rule("html.th-clean .row.working");
  assert.match(r, /font: 400 14px\/20px var\(--font\)/);
  assert.match(r, /min-height: 20px/);
  assert.match(r, /letter-spacing: -0\.1px/, "as the feed text");
  assert.match(rule("html.th-clean .feed-inner"), /font: 400 14px\/20px/, "the feed's line height, which the base web's .working inherits");
});

test("working row: the dots sit in the middle of the line, 16 + 12 before the words", () => {
  const r = rule("html.th-clean .row.working");
  assert.match(r, /grid-template-columns: 16px minmax\(0, 1fr\); column-gap: 12px; align-items: center/);
  assert.match(css, /\.row\.working > \.g\.spin\) \{\s*display: block; position: relative; align-self: center;/);
});

test("the line stays one line: the words give way with an ellipsis, the time and the Esc hint stay whole", () => {
  const b = rule("html.th-clean .row.working:not(.crew) > .b");
  assert.match(b, /display: flex/);
  assert.match(b, /white-space: pre/);
  assert.match(b, /overflow: hidden/);
  assert.match(rule("html.th-clean .row.working:not(.crew) > .b > *"), /flex: none/);
  const what = rule("html.th-clean .row.working:not(.crew) > .b > .clean-what");
  assert.match(what, /flex: 0 1 auto/);
  assert.match(what, /min-width: 0/);
  assert.match(what, /text-overflow: ellipsis/);
  const js = fs.readFileSync(path.join(DIR, "main.js"), "utf8");
  assert.match(js, /\.row\.working:not\(\.crew\) > \.b/);
  assert.match(js, /"clean-what"/);
});

test("a touch screen hides the Esc hint and its separator (there is no Esc key), so the words keep the room", () => {
  const m = css.match(/@media \(pointer: coarse\) \{\s*html\.th-clean \.row\.working:not\(\.crew, \.bg\) > \.b > :is\(span\.muted:last-child, \.clean-sep:nth-last-child\(2\)\) \{ display: none; \}/);
  assert.ok(m, "the coarse-pointer rule hides the last muted part and the separator before it");
});

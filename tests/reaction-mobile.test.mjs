// «Реакция» and «Ответить» on a phone. A reply without the name line (the second one in a row) has no room on the right
// there (padding 0), so both buttons sit in its time line under the text, not on the text's first line; above the reactions
// row when it is there. On a touch screen the icons are always visible and drawn in --c-t2 (3:1 and more), like on a computer.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");

// top-level @media blocks: [{ query, body }]
const blocks = (() => {
  const out = [];
  for (let i = css.indexOf("@media "); i >= 0; i = css.indexOf("@media ", i + 1)) {
    if (i > 0 && css[i - 1] !== "\n") continue;
    const open = css.indexOf("{", i);
    let depth = 0, j = open;
    for (; j < css.length; j++) { if (css[j] === "{") depth++; else if (css[j] === "}" && --depth === 0) break; }
    out.push({ query: css.slice(i + 7, open).trim(), body: css.slice(open + 1, j) });
  }
  return out;
})();
const declsIn = (query, sel) => blocks.filter((b) => b.query === query).flatMap((b) => {
  const r = [];
  for (let i = b.body.indexOf(sel + " {"); i >= 0; i = b.body.indexOf(sel + " {", i + 1)) r.push(b.body.slice(i, b.body.indexOf("}", i)));
  return r;
}).join("\n");

const BOTH = ":is(.reply-btn, .reply-btn ~ .react-add)";
const NO_NAME = "html.th-clean .row.out > .b:not(:has(> .byline))";

test("on a phone a reply without the name line has both buttons in its time line, not on the text", () => {
  const d = declsIn("(max-width: 760px)", `${NO_NAME} > ${BOTH}`);
  assert.match(d, /top: auto/);
  assert.match(d, /bottom: -4px/);   // 24 px button centred on the 16 px time line
});

test("with the reactions row under the time the buttons stay in the time line: the open picker row 18 + 6, a badge 28 + 6", () => {
  assert.match(declsIn("(max-width: 760px)", `${NO_NAME}:has(> .reactions) > ${BOTH}`), /bottom: 20px/);
  assert.match(declsIn("(max-width: 760px)", `${NO_NAME}:has(> .reactions > .react-chip) > ${BOTH}`), /bottom: 30px/);
});

test("the computer layout is untouched: buttons on the name line, top right", () => {
  const base = css.slice(css.indexOf("html.th-clean .row > .b > .reply-btn ~ .react-add {"));
  assert.match(base.slice(0, base.indexOf("}")), /top: -2px; right: 28px/);
  for (const b of blocks.filter((x) => !x.query.includes("max-width"))) assert.doesNotMatch(b.body, /:not\(:has\(> \.byline\)\)/);
});

test("on a touch screen both icons are --c-t2, not the faint --c-t3", () => {
  const react = declsIn("(hover: none)", "html.th-clean .row > .b > .reply-btn ~ .react-add");
  const reply = declsIn("(hover: none)", "html.th-clean .row > .b > .reply-btn, html.th-clean .row > .b > .reply-box > .meta > .reply-btn");
  for (const d of [react, reply]) {
    assert.match(d, /opacity: 1/);
    assert.match(d, /color: var\(--c-t2\)/);
    assert.doesNotMatch(d, /--c-t3/);
  }
});

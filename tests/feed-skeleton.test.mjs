// Feed loading skeleton: the core draws “Loading the feed…” as a plain p.hint, Clean marks it and paints grey bubbles in CSS.
// Browserless: checks the text of clean.css and main.js.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(dir, "clean.css"), "utf8"), js = fs.readFileSync(path.join(dir, "main.js"), "utf8");
const start = css.indexOf("feed loading skeleton");
const block = css.slice(start, css.indexOf("html.th-clean .feed { padding: 24px; }", start));

test("the skeleton block exists and every selector is behind the theme class", () => {
  assert.ok(start > 0 && block.length > 200);
  for (const l of block.split("\n").filter((l) => /^(html|\.|@)/.test(l)))
    assert.match(l, /^(html\.th-clean|@container)/, "a rule outside the theme class: " + l);
});

test("main.js marks only the loading hint, never the failed or the empty one", () => {
  assert.match(js, /const feedSkeleton = \(\) =>/);
  assert.match(js, /fade\(\); feedSkeleton\(\); feedEnd\(\);/);
  assert.match(js, /!p\.classList\.contains\("feed-failed"\)/);
  assert.match(js, /T\("web\.main\.feed_loading"/);
  assert.match(js, /classList\.toggle\("clean-skel", v\)/);
});

test("two layouts by the column width: narrow 2 bubbles (40 and 22 lines), wide 3 (1, 12, 14)", () => {
  assert.match(block, /@container \(min-width: 600px\)/);
  assert.match(block, /--sk-l:\s*22px;\s*--sk-n:\s*40;\s*--sk-last:\s*60%/);
  assert.match(block, /--sk-n:\s*22;\s*--sk-last:\s*40%/);
  const wide = block.slice(block.indexOf("@container"));
  assert.match(wide, /--sk-l:\s*20px;\s*--sk-n:\s*1;[^}]*width:\s*85%/);
  assert.match(wide, /--sk-n:\s*12;\s*--sk-last:\s*46%/);
  assert.match(wide, /--sk-n:\s*14;\s*--sk-last:\s*50%/);
});

test("static: no animation, no transition", () => {
  assert.ok(!/animation|transition/.test(block));
});

test("the bottom sticks to the input, the top is cut by the edge", () => {
  assert.match(block, /justify-content:\s*flex-end/);
  assert.match(block, /overflow:\s*hidden/);
});

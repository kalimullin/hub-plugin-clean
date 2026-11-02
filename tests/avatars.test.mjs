// «Chat avatars» of the session list (Settings → Appearance): on by default, two sizes by level (not by type), directions are the same size as specialists.
// Browserless: checks the text of clean.css and main.js.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(dir, "clean.css"), "utf8"), js = fs.readFileSync(path.join(dir, "main.js"), "utf8");
const block = css.slice(css.indexOf("«Аватарки у чатов»"));
const rules = block.split("\n").filter((l) => /^html\./.test(l));

test("the setting is on by default and behind the theme class", () => {
  assert.match(js, /key: "avatars", on: true/);
  for (const l of rules) assert.match(l, /^html\.th-clean\./, "a rule outside the theme class: " + l);
});

test("avatar sizes: two per level — 16/12 in the compact list, 32/24 in the detailed one", () => {
  const sizes = (re) => rules.filter((l) => re.test(l)).map((l) => /--av:\s*(\d+)px/.exec(l)?.[1]).filter(Boolean);
  assert.deepEqual(sizes(/^html\.th-clean\.th-clean-av #list (\.forks )?\.srow\[data-clean-k\] \{/), ["16", "12"]);
  assert.deepEqual(sizes(/th-clean-detail\.th-clean-av #list (\.forks )?\.srow\[data-clean-k\] \{/), ["32", "24"]);
});

test("a direction takes the size of the level, not a size of its own", () => {
  assert.ok(!rules.some((l) => /data-clean-k="dir"\][^{]*\{[^}]*--av:/.test(l)));
});

test("the core's avatar node stays as the click area for the icon picker (not for directions)", () => {
  assert.ok(rules.some((l) => /\.nm > \.avatar \{ display: block;/.test(l)));
  assert.ok(rules.some((l) => /data-clean-k="dir"\] \.nm > \.avatar \{ display: none/.test(l)));
});

test("the Hub is a first-level row: the size of a specialist, the same ring, no size of its own", () => {
  assert.ok(!rules.some((l) => /data-clean-k="hub"\][^{]*\{[^}]*--av:/.test(l)));
  assert.match(js, /hubRow \? "hub"/);
  // the ring is drawn by the picture rule that every typed row shares (.txt::before)
  assert.match(block, /\.srow\[data-clean-k\] > \.txt::before \{[^}]*box-shadow: inset 0 0 0 1px/);
  // without a picture of its own the Hub shows the theme's picture, not an empty tile
  assert.ok(rules.some((l) => /data-clean-k="hub"\] > \.txt::before \{ background-image: var\(--clean-face, url\("avatar-hub\.png"\)\)/.test(l)));
});

test("the old 24px hub picture is only for the setting that is off; the row height does not hang on our attributes", () => {
  const old = css.split("\n").filter((l) => /sgroup\.bare/.test(l) && /\.avatar|data-clean-d\]:has\(\.nm > \.avatar\)/.test(l));
  assert.ok(old.length >= 3);
  for (const l of old) assert.match(l, /:not\(\.th-clean-av\)/, l);
  // the core erases our attributes on every snapshot: the Hub row must keep its 44 without data-clean-k, or the scroll is cut (keepList)
  assert.ok(rules.some((l) => /\.sgroup\.bare \.srow:not\(\[data-clean-d\], \.forks \.srow\) \{ min-height: 44px/.test(l)));
});

test("a tile (direction, the Hub without a picture) takes its glyph from --clean-ic and falls back to the compass", () => {
  assert.match(block, /\.srow\[data-clean-tile\] \.nm::before \{[^}]*mask: var\(--clean-ic, url\("compass\.svg"\)\)/);
  assert.match(js, /put\(r, "cleanTile"/);
  assert.match(js, /attributeFilter: \[[^\]]*"data-clean-tile"/);
});

test("the icon map is local: the folder is ignored by git, a missing map or a name outside it gives the compass", () => {
  assert.match(fs.readFileSync(path.join(dir, ".gitignore"), "utf8"), /^chat-icons\/$/m);
  assert.match(js, /fetch\(iconBase \+ "map\.json"\)[^\n]*catch\(\(\) => \(\{\}\)\)/);
  assert.match(js, /if \(!chatIcons\) return ""/);
  assert.match(js, /\^\[\\w-\]\+\\\.svg\$/, "only a plain file name from the map goes into url()");
});

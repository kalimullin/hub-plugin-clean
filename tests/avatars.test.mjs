// «Chat avatars» of the session list (Settings → Appearance): on by default, two sizes by level (not by type), directions are the same size as specialists.
// Browserless: checks the text of clean.css and main.js.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(dir, "clean.css"), "utf8"), js = fs.readFileSync(path.join(dir, "main.js"), "utf8");
const rules = css.slice(css.indexOf("«Аватарки у чатов»")).split("\n").filter((l) => /^html\./.test(l));

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

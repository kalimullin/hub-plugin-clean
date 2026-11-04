// Small polish of the Clean theme: red count badges (text and shape), the caption under a picture, the send arrow.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { badgeText } from "../rows.js";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const icons = JSON.parse(fs.readFileSync(path.join(root, "icons8.json"), "utf8"));

test("badge text: one sign is a circle, two and more a capsule, 100 and more is 99+", () => {
  assert.deepEqual(badgeText(1), { text: "1", w: "1" });
  assert.deepEqual(badgeText(8), { text: "8", w: "1" });
  assert.deepEqual(badgeText(14), { text: "14", w: "2" });
  assert.deepEqual(badgeText(99), { text: "99", w: "2" });
  assert.deepEqual(badgeText(100), { text: "99+", w: "2" });
  assert.deepEqual(badgeText(120), { text: "99+", w: "2" });
  assert.deepEqual(badgeText(0), { text: "1", w: "1" });
});

test("the red badge is 18 px high, 12 px semibold, tabular digits, white on the alert fill", () => {
  const rule = css.match(/\.srow \.tag:not\(\.soft\)\s*\{[^}]*\}/)?.[0] || "";
  assert.match(rule, /height:\s*18px/);
  assert.match(rule, /min-width:\s*18px/);
  assert.match(rule, /background:\s*var\(--c-alert-fill\)/);
  assert.match(rule, /color:\s*#fff/);
  assert.match(css, /\[data-n\]::after\s*\{[^}]*font:\s*600 12px\/18px[^}]*tabular-nums/);
});

test("a caption under a picture shrinks to the picture, outside any hover media query", () => {
  const at = css.indexOf(".row.sent-file > .b:has(> .attach-list img)");
  assert.ok(at > 0, "rule exists");
  const before = css.slice(0, at);
  const open = (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length;
  assert.equal(open, 0, "the rule is on the top level, not inside @media");
  assert.match(css, /\.row\.sent-file > \.b:has\(> \.attach-list img\) > :is\(\.meta, \.md\)\s*\{[^}]*width:\s*0;[^}]*min-width:\s*100%/);
});

test("the send arrow is the heavy Icons8 sf-black up, 20 px in a 36 px button", () => {
  assert.equal(icons.icons.items.send.id, "Mq3eLYjKvHcI");
  assert.equal(icons.icons.items.send.pack, "sf-black");
  assert.match(css, /\.btn\.round\.send\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/);
  assert.match(css, /\.btn\.round\.send \.icon\s*\{[^}]*width:\s*20px[^}]*height:\s*20px/);
  assert.match(css, /\.clean-send::before\s*\{[^}]*width:\s*20px[^}]*height:\s*20px/);
});

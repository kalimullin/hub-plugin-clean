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

test("a caption under a picture is not shrunk to the picture: the bubble keeps the width the core gives it", () => {
  assert.doesNotMatch(css, /\.row\.sent-file > \.b:has\(> \.attach-list img\)/);
  assert.doesNotMatch(css, /\.sent-file[^{]*\{[^}]*width:\s*(fit-content|0)\b/);
});

test("the send arrow is the heavy Icons8 sf-black up, 20 px in a 36 px button", () => {
  assert.equal(icons.icons.items.send.id, "Mq3eLYjKvHcI");
  assert.equal(icons.icons.items.send.pack, "sf-black");
  assert.match(css, /\.btn\.round\.send\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/);
  assert.match(css, /\.btn\.round\.send \.icon\s*\{[^}]*width:\s*20px[^}]*height:\s*20px/);
});

test("a dimmed row keeps the full red badge: the fade mask has a second layer that spares the right column", () => {
  const rule = css.match(/\.list\[data-clean-fade\]\s*\{[^}]*\}/)?.[0] || "";
  assert.match(rule, /--fade-keep:\s*56px/);
  assert.match(rule, /mask-composite:\s*add/);
  assert.match(rule, /linear-gradient\(to right, transparent calc\(100% - var\(--fade-keep\)\), #000 calc\(100% - var\(--fade-keep\)\)\)/);
});

test("the caption under a picture is 14/20 and dark, not the faint meta colour", () => {
  const rule = css.match(/\.row\.sent-file > \.b > \.meta\s*\{[^}]*\}/)?.[0] || "";
  assert.match(rule, /font:\s*400 14px\/20px/);
  assert.match(rule, /color:\s*var\(--c-t1\)/);
});

test("filters and group headers show no totals: .gcount and .c-n are hidden by the theme", () => {
  assert.match(css, /html\.th-clean \.gcount\s*\{\s*display:\s*none;?\s*\}/);
  assert.match(css, /html\.th-clean \.c-n\s*\{\s*display:\s*none;?\s*\}/);
});

test("feed times and captions use --c-meta (>= 4.5:1), not the ~2:1 --c-t3; the picture caption keeps --c-t1", () => {
  assert.match(css, /--c-meta:\s*light-dark\(rgb\(0 0 0 \/ 0\.62\), rgb\(255 255 255 \/ 0\.60\)\)/);
  assert.match(css, /html\.th-clean \.row \.meta\s*\{[^}]*color:\s*var\(--c-meta\)/);
  assert.match(css, /\(\.row\.from > \.b, \.reply-box\) > \.meta\s*\{[^}]*color:\s*var\(--c-meta\)/);
  assert.doesNotMatch(css, /html\.th-clean \.row \.meta\s*\{[^}]*--c-t3/);
  assert.match(css, /\.row\.sent-file > \.b > \.meta\s*\{[^}]*color:\s*var\(--c-t1\)/);
});

test("the executor toggle shows only the chevron: the count is hidden and takes no reserved width", () => {
  assert.match(css, /html\.th-clean \.fork-toggle \.n\s*\{\s*display:\s*none;?\s*\}/);
  assert.match(css, /li\.has-forks > \.srow::after\s*\{[^}]*content:\s*""/);
  const rule = css.match(/html\.th-clean \.fork-toggle\s*\{[^}]*\}/)?.[0] || "";
  assert.match(rule, /opacity:\s*\.7/);
  assert.match(rule, /color:\s*var\(--c-t1\)/);
});

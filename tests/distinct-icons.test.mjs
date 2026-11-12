// Three places used to share a drawing with a neighbour or had a hand-drawn icon:
// hide/show the list, auto-sort of groups (was the queue's lines), reset of groups (was the reply's arrow).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const css = read("clean.css");
const items = JSON.parse(read("icons8.json")).icons.items;
const d = (f) => read(f).match(/ d="([^"]+)"/)[1];

test("hide and show the list: Icons8 side-panel icons, one for each direction, no hand-drawn file", () => {
  assert.ok(!fs.existsSync(path.join(root, "sidebar.svg")));
  assert.match(css, /\.clean-fold \{ --fold-ic: url\("sidebar-hide\.svg"\); \}/);
  assert.match(css, /\.clean-fold-show \{ --fold-ic: url\("sidebar-show\.svg"\); \}/);
  assert.equal(items["sidebar-hide"].commonName, "hide-sidepanel");
  assert.equal(items["sidebar-show"].commonName, "show-sidepanel");
  assert.notEqual(d("sidebar-hide.svg"), d("sidebar-show.svg"));
});

test("auto-sort of groups is not the queue icon, reset of groups is not the reply arrow", () => {
  assert.match(css, /\.g-tools \.auto \{ --g-ic: url\("sort\.svg"\); \}/);
  assert.match(css, /\.g-tools \.btn:not\(\.add-group, \.auto\) \{ --g-ic: url\("reset\.svg"\); \}/);
  assert.notEqual(d("sort.svg"), d("queue.svg"));
  assert.notEqual(d("reset.svg"), d("reply.svg"));
  assert.notEqual(items.sort.id, items.queue.id);
  assert.notEqual(items.reset.id, items.reply.id);
  for (const k of ["sort", "reset", "auto-sort", "reset-groups"]) assert.equal(items[k].platform, undefined);   // Forma Regular, the set's pack
});

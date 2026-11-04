// The send button of Clean: a 36 px circle with the Icons8 «up» arrow (Mq3eLYjKvHcI) in both schemes, a 44 px tap target.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const pathOf = (svg) => svg.match(/ d="([^"]+)"/)[1];
// all declarations of the exact selector, joined
const rule = (sel) => {
  const out = [];
  for (let i = css.indexOf(sel + " {"); i >= 0; i = css.indexOf(sel + " {", i + 1)) {
    if (i === 0 || "\n ".includes(css[i - 1])) out.push(css.slice(i, css.indexOf("}", i)));
  }
  assert.ok(out.length, sel);
  return out.join("\n");
};

test("the light and the dark theme icon and the plugin's own arrow are the same Icons8 «up»", () => {
  const icons = JSON.parse(read("icons8.json"));
  const send = icons.icons.items.send;
  assert.equal(send.id, "Mq3eLYjKvHcI");
  const own = pathOf(read("send.svg"));
  assert.equal(pathOf(read("i/send.svg")), own);
  assert.equal(pathOf(read("id/send.svg")), own);
});

test("the send button is a circle with a ring that brings the tap target to 44 px", () => {
  const b = rule("html.th-clean .btn.round.send");
  assert.match(b, /width: 36px; height: 36px; border-radius: 50%/);
  assert.match(b, /position: relative/);
  assert.match(rule("html.th-clean .btn.round.send::after"), /inset: -4px/);
  assert.doesNotMatch(css, /\.btn\.round\.send \{[^}]*border-radius: 8px/);
});

test("the core icon is masked by the plugin's own arrow, not only by the theme file that loads later", () => {
  const r = rule("html.th-clean .btn.round.send .icon.kit-img");
  assert.match(r, /-webkit-mask-image: url\("send\.svg"\) !important/);
  assert.match(r, /mask-image: url\("send\.svg"\) !important/);
});

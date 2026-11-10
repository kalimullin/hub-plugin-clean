// The send button of Clean, as in Telegram: an empty field shows only the mic, text or a file turns the one button at the
// right end into a black circle with the thin Forma Regular «up» arrow, with the mic before it (voice goes with the typed words).
// The core draws its one button (mic or send); with a draft the mic before send is the theme's own (voicetext.js, hub.dictate);
// the theme adds no send of its own.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
// all declarations of the exact selector, joined
const rule = (sel) => {
  const out = [];
  for (let i = css.indexOf(sel + " {"); i >= 0; i = css.indexOf(sel + " {", i + 1)) {
    if (i === 0 || "\n ".includes(css[i - 1])) out.push(css.slice(i, css.indexOf("}", i)));
  }
  assert.ok(out.length, sel);
  return out.join("\n");
};

test("an empty field shows no send: the theme adds no send button of its own", () => {
  const main = read("main.js");
  assert.doesNotMatch(main, /clean-send/);
  assert.doesNotMatch(main, /"btn round send/);
  assert.doesNotMatch(css, /clean-send/);
  assert.doesNotMatch(read("fit.js"), /clean-send/);
});

test("with text the core's send is a circle: 32 on a desktop, 36 on a phone, a 44 px tap target", () => {
  const b = rule("html.th-clean .btn.round.send");
  assert.match(b, /width: 32px; height: 32px/);
  assert.match(b, /border-radius: 9999px/);
  assert.match(b, /position: relative/);
  assert.doesNotMatch(css, /\.btn\.round\.send \{[^}]*border-radius: 8px/);
  assert.match(css, /\.btn\.round\.send, html\.th-clean \.btn\.round\.quiet:is\(\.attach, \.mic\)[^{]*\{ width: 36px; height: 36px; \}/);
  assert.match(css, /\.btn\.round\.send::after \{ content: ""; position: absolute; inset: -4px; border-radius: 9999px; \}/);
});

test("the arrow is the thin Forma Regular «up» (the same drawing in the light, dark and own file), not a heavy glyph", () => {
  const icons = JSON.parse(read("icons8.json"));
  assert.equal(icons.icons.pack, "forma-regular");
  assert.equal(icons.icons.items.send.commonName, "up");
  assert.equal(icons.icons.items.send.platform, undefined);
  const d = (f) => read(f).match(/ d="([^"]+)"/)[1];
  assert.equal(d("i/send.svg"), d("send.svg"));
  assert.equal(d("id/send.svg"), d("send.svg"));
  assert.match(rule("html.th-clean .btn.round.send .icon"), /width: 16px; height: 16px/);
});

test("the core icon is masked by the plugin's own arrow, not only by the theme file that loads later", () => {
  const r = rule("html.th-clean .btn.round.send .icon.kit-img");
  assert.match(r, /-webkit-mask-image: url\("send\.svg"\) !important/);
  assert.match(r, /mask-image: url\("send\.svg"\) !important/);
});

test("hover of the send button only where there is a hover", () => {
  const i = css.indexOf(".btn.round.send:hover");
  assert.ok(i > 0);
  assert.match(css.slice(css.lastIndexOf("\n", i - 1) - 60, i), /@media \(hover: hover\) and \(pointer: fine\)/);
});

test("the record pill grows leftwards from the mic at the right end of the row", () => {
  assert.match(css, /@keyframes clean-pill \{ from \{ clip-path: inset\(0 0 0 40px round 8px\)/);
  assert.match(css, /@keyframes clean-pill-phone \{ from \{ clip-path: inset\(0 0 0 44px round 8px\)/);
  assert.match(rule("html.th-clean .composer:is(.rec, .clean-vt-rec) .btn.round.stop::before"), /right: 8px/);
  assert.doesNotMatch(css, /:has\(form\.composer \.bar > \.btn\.round\.mic\)\) \{ --tail/);
});

test("with a draft and voice on the theme's mic stands before send: the camera moves one button left, the two stay side by side", () => {
  const vt = String.raw`\.bar:has\(> \.btn\.round\.send\) > \.spacer > \.btn\.dictate:not\(\[hidden\]\)`;
  // two :has side by side: a :has inside :has is invalid CSS and drops the whole rule
  assert.doesNotMatch(css, /:has\([^(){}]*:has\(/);
  assert.match(css, new RegExp(String.raw`\.dock-inner:has\(form\.composer:not\(\.rec, \.clean-vt-rec\) \.bar > \.btn\.round\.send\):has\(form\.composer \.bar > \.spacer > \.btn\.dictate:not\(\[hidden\]\)\) \.slot-host\.composer:has\(> \.vf-slot\)[^{]*\{ right: calc\(12px \+ 2 \* var\(--row, 32px\) \+ 16px\); \}`));
  assert.match(css, /\.bar:not\(\.reply-bar\):has\(> \.spacer > \.btn\.dictate:not\(\[hidden\]\)\) > \.send \{ margin-left: 0; \}/);
  // shown only while send is: an empty field keeps the core's own mic alone
  assert.match(css, /\.composer \.bar > \.spacer > \.btn\.dictate \{ display: none; \}/);
  assert.match(css, new RegExp(String.raw`\.composer:not\(\.rec, \.clean-vt-rec\) ` + vt + String.raw` \{ display: grid;`));
});

test("a recording over a draft takes the record look of the core's voice message: the strip in the spacer, the pill in place of send", () => {
  assert.match(css, /\.composer\.clean-vt-rec \.bar > \.spacer \{ display: contents; \}/);
  assert.match(css, /\.composer\.clean-vt-rec \.bar > :is\(\.send, \.hint\) \{ display: none; \}/);
  assert.match(rule("html.th-clean .composer:is(.rec, .clean-vt-rec) .bar > .btn.round.stop, html.th-clean .composer.clean-vt-rec .bar > .spacer > .btn.round.stop"), /width: 72px/);
  assert.match(rule("html.th-clean .composer:is(.rec, .clean-vt-rec) .recstrip"), /display: contents/);
  // the rules for the idle row stay off while either recording runs
  assert.doesNotMatch(css, /:not\(\.rec\)/);
});

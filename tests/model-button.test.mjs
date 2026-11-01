// Model and effort buttons of the core dock under the Clean theme: the model label («Opus 5.5») is not shortened earlier than
// the core does it, and the buttons are neither hidden nor zeroed. Browserless: checks the text of clean.css.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");

// @container status (max-width: N) rules: [{ max, body }]
const containers = [...css.matchAll(/@container status \(max-width:\s*(\d+)px\)\s*\{([^\n]*)\}/g)].map((m) => ({ max: +m[1], body: m[2] }));
// The core shortens the labels itself at this container width (modules/web/static/css/dock.css).
const CORE = 520;

test("the theme does not hide the full model label before the core does", () => {
  const hides = containers.filter((c) => /\.mod-long\s*\{\s*display:\s*none/.test(c.body));
  for (const c of hides) {
    assert.ok(c.max <= CORE, `mod-long is hidden at ${c.max} px: between ${CORE} px and that the core still shows «Opus 5.5»`);
  }
});

test("a short model label is shown together with hiding the full one", () => {
  for (const c of containers.filter((x) => /\.mod-long\s*\{\s*display:\s*none/.test(x.body))) {
    assert.match(c.body, /\.mod-short\s*\{\s*display:\s*inline/);
  }
});

test("the model control stays openable: .stat-mod is never display:none outside voice recording", () => {
  // The model leaves the composer row (it is the «Модель: …» item of the thread's ⋯ menu), but that item clicks the core's button,
  // so the control and its menu must stay in the layout (zero size), not be removed.
  const rules = css.split("\n").filter((l) => /\.stat-mod\b/.test(l) && !/^\s*\/[*]/.test(l));
  for (const l of rules) {
    if (/display:\s*none|visibility:\s*hidden/.test(l)) assert.match(l, /form\.composer\.rec|vf-/, `.stat-mod is hidden outside voice recording: ${l.trim().slice(0, 120)}`);
  }
  assert.match(css, /\.status > \.stat-eff \{ display: none; \}/, "the effort button leaves the composer row");
  assert.match(css, /\.stat-mod \.mod-eff \{ display: block; \}/, "the effort section of the model menu is shown at any width");
  assert.match(css, /\.status > \.stat-mod > \.menu-btn \{[^}]*pointer-events: none/, "the model button in the row takes no pointer input");
});

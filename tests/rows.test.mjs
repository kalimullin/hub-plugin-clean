// The detailed session list: what a row shows comes from the snapshot only (out_head, since, state, cwd).
// Run: node --test tests/. No browser: the pure parts are rows.js, the rules of clean.css are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AGO, agoText, flat, sessionFor, detailOf } from "../rows.js";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");
const NOW = 1_800_000_000;

test("the preview is flat text: markup, images, list marks and line breaks are gone, one line, no trailing ellipsis", () => {
  assert.equal(flat("Done. **Board 81:35** is `outdated` — see [the doc](file:///a/b.md)."), "Done. Board 81:35 is outdated — see the doc.");
  assert.equal(flat("Ready. ![Overview](file:///a/b.png) Next: - first - second"), "Ready. Next: first second");
  assert.equal(flat("## Title\n\n> quote\n```js\nlet a = 1;\n```\ntail"), "Title quote js let a = 1; tail");
  assert.equal(flat("Не хватило места, чтобы дочитать до конца этой мысли и ещё…"), "Не хватило места, чтобы дочитать до конца этой мысли и ещё");
  assert.equal(flat("HANDOFF-DONE Сделано: отчёт готов"), "Сделано: отчёт готов", "the hand-off marker between sessions is not list text");
  assert.equal(flat("x".repeat(500)).length, 120);
  assert.equal(flat("   \n  "), "");
  assert.equal(flat(null), "");
  assert.equal(flat(undefined), "");
  assert.equal(flat("snake_case_name stays and a + b too"), "snake_case_name stays and a + b too");
});

test("time: a working session is “now”, otherwise minutes, hours, days since the last change", () => {
  const at = (sec, state = "idle") => agoText({ state, since: NOW - sec }, NOW, AGO.en);
  assert.equal(at(5), "now");
  assert.equal(at(59), "now");
  assert.equal(at(60), "1m");
  assert.equal(at(14 * 60 + 20), "14m");
  assert.equal(at(3599), "59m");
  assert.equal(at(3600), "1h");
  assert.equal(at(86399), "23h");
  assert.equal(at(86400 * 5 + 99), "5d");
  assert.equal(at(7200, "busy"), "now", "since of a running turn is its start, not the last activity");
  assert.equal(at(-30), "now", "a clock a little ahead of the core never gives a negative time");
  assert.equal(agoText({ state: "idle" }, NOW, AGO.en), "now", "no since — nothing to count");
  assert.equal(agoText({ state: "idle", since: NOW - 180 }, NOW, AGO.ru), "3м");
  assert.equal(agoText({ state: "idle", since: NOW - 10 }, NOW, AGO.ru), "сейчас");
});

test("the row finds its session by the shown name, a child under its parent too — but never by a guess", () => {
  const list = [{ name: "maps-dev" }, { name: "maps-dev-api" }, { name: "x-api" }, { name: "docs-api" }];
  assert.equal(sessionFor("maps-dev", list).name, "maps-dev");
  assert.equal(sessionFor("maps-dev-api", list).name, "maps-dev-api");
  assert.equal(sessionFor("api", list), null, "two sessions end with -api: no guess");
  assert.equal(sessionFor("dev", list).name, "maps-dev");
  assert.equal(sessionFor("", list), null);
  assert.equal(sessionFor("nope", list), null);
});

test("what a row shows: the hub stays compact, an empty chat has no second line, the full path goes to the tooltip", () => {
  const s = { name: "flash", kind: "work", state: "idle", since: NOW - 120, cwd: "/u/dev/p/.claude/worktrees/flash-fix", out_head: "Fixed **the flash** on reload…" };
  assert.deepEqual(detailOf(s, NOW, AGO.en), { prev: "Fixed the flash on reload", ago: "2m", cwd: s.cwd });
  assert.equal(detailOf({ ...s, out_head: null, gist: { text: "The gist of the turn" } }, NOW, AGO.en).prev, "The gist of the turn", "an executor that never wrote to the owner: the gist of its turn");
  assert.deepEqual(detailOf({ ...s, out_head: null }, NOW, AGO.en), { prev: "", ago: "2m", cwd: s.cwd });
  assert.deepEqual(detailOf({ ...s, cwd: "", out_head: undefined }, NOW, AGO.en), { prev: "", ago: "2m", cwd: "" });
  assert.equal(detailOf({ ...s, kind: "hub" }, NOW, AGO.en), null);
  assert.equal(detailOf(null, NOW, AGO.en), null);
});

test("the preview is regular sans in the preview token, one line with an ellipsis; the token keeps ≥4.5:1", () => {
  const rule = /\[data-clean-prev\]::after \{ content: attr\(data-clean-prev\)[^}]*\}/.exec(css)?.[0] || "";
  assert.ok(rule, "the preview rule exists");
  assert.match(rule, /font: 400 12px\/16px var\(--font\)/);
  assert.match(rule, /color: var\(--c-preview\)/);
  assert.match(rule, /white-space: nowrap/);
  assert.match(rule, /text-overflow: ellipsis/);
  assert.doesNotMatch(rule, /mono|font-code/);
  // token: light 55%, dark 50% — contrast against the card (#fff / #1c1c1f) and the list (#f1f1f3 / #121214)
  const m = /--c-preview: light-dark\(rgb\(0 0 0 \/ ([\d.]+)\), rgb\(255 255 255 \/ ([\d.]+)\)\)/.exec(css);
  assert.ok(m, "token --c-preview exists");
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const on = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
  for (const bg of [[255, 255, 255], [241, 241, 243]]) assert.ok(ratio(lum(...on([0, 0, 0], +m[1], bg)), lum(...bg)) >= 4.5, "light " + bg);
  for (const bg of [[28, 28, 31], [18, 18, 20]]) assert.ok(ratio(lum(...on([255, 255, 255], +m[2], bg)), lum(...bg)) >= 4.5, "dark " + bg);
});

test("the detailed rules live behind the setting class and use no bare :hover", () => {
  const rules = css.split("\n").filter((l) => l.includes("th-clean-detail"));
  assert.ok(rules.length > 5);
  for (const l of rules) {
    assert.match(l, /html\.th-clean\.th-clean-detail/, "every rule needs both classes: the theme and the setting");
    assert.doesNotMatch(l, /:hover/, "hover of a row stays the compact one, inside its media query");
  }
});

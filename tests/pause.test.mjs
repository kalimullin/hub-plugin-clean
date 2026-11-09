// Pause by limit: a session hit its provider's limit window and waits for the reset; the core resumes it by itself.
// Run: node --test tests/. No browser: the pure parts are pause.js, the rules of clean.css and main.js are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { holdOf, modelLabel, pauseText, pauseTip, wordsFor } from "../pause.js";

const dir = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(dir, "clean.css"), "utf8");
const js = fs.readFileSync(path.join(dir, "main.js"), "utf8");
const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi).getTime() / 1000;
const NOW = at(2026, 11, 9, 22, 10);   // Monday
const snap = (extra, features = ["session.quota_hold"]) => ({ features, sessions_extra: extra });
const s = { name: "codex-ops", model: "opus", info: { model: "claude-opus-5-5", effort: "high" } };

test("a pause comes from the quota-hold record of the session, only when the core announces the feature", () => {
  const rec = { quota_hold: true, hold_mark: { text: "limit", since: NOW - 60 }, until: NOW + 3000 };
  assert.deepEqual(holdOf(snap({ "codex-ops": rec }), s, NOW), { until: NOW + 3000 });
  assert.equal(holdOf(snap({ "codex-ops": rec }, []), s, NOW), null, "no feature: the record is not trusted");
  assert.equal(holdOf(snap({ other: rec }), s, NOW), null, "another session's record");
  assert.equal(holdOf(snap({ "codex-ops": { ...rec, quota_hold: false } }), s, NOW), null);
  assert.deepEqual(holdOf(snap({ "codex-ops": { hold_mark: { text: "x" } } }), s, NOW), { until: null }, "a hold mark alone is a pause");
  assert.deepEqual(holdOf(snap({ "codex-ops": { ...rec, until: NOW - 5 } }), s, NOW), { until: null }, "a passed reset: paused, time unknown");
  assert.deepEqual(holdOf(snap({}), { ...s, quota_hold: true, until: NOW + 60 }, NOW), { until: NOW + 60 }, "the flag on the session itself");
  assert.equal(holdOf({}, s, NOW), null);
  assert.equal(holdOf(snap({ "": rec }), {}, NOW), null);
  assert.equal(holdOf(null, null, NOW), null);
});

test("the resume time reads like the native app: 24 h, today / tomorrow / weekday / date; unknown — just paused", () => {
  assert.equal(pauseText("ru", at(2026, 11, 9, 23, 5), NOW), "Продолжит в 23:05");
  assert.equal(pauseText("ru", at(2026, 11, 10, 3, 0), NOW), "Продолжит завтра 03:00");
  assert.match(pauseText("ru", at(2026, 11, 12, 9, 5), NOW), /^Продолжит четверг 09:05$/);
  assert.match(pauseText("ru", at(2026, 11, 20, 17, 3), NOW), /^Продолжит 20 нояб\.? 17:03$/);
  assert.match(pauseText("ru", at(2027, 1, 20, 17, 3), NOW), /2027/);
  assert.equal(pauseText("ru", null, NOW), "На паузе");
  assert.equal(pauseText("en", at(2026, 11, 9, 23, 5), NOW), "Resumes at 23:05");
  assert.equal(pauseText("en-US", at(2026, 11, 10, 3, 0), NOW), "Resumes tomorrow 03:00");
  assert.equal(pauseText("es", at(2026, 11, 9, 23, 5), NOW), "Continúa a las 23:05");
  assert.equal(pauseText("es", at(2026, 11, 10, 3, 0), NOW), "Continúa mañana 03:00");
  assert.equal(pauseText("es", NOW - 1, NOW), "En pausa");
  assert.equal(wordsFor("de"), wordsFor("en"), "other languages — English");
});

test("the tooltip names the model and why it waits, like the native help text", () => {
  const names = { model_names: { "claude-opus-5-5": "Opus 5.5" } };
  assert.equal(modelLabel(names, s), "Opus 5.5 High");
  assert.equal(modelLabel({ model_names: { "opus-5-5": "Opus 5.5" } }, { info: { model: "claude-opus-5-5" } }), "Opus 5.5");
  assert.equal(modelLabel({}, { model: "gpt-6.1-sol" }), "gpt-6.1-sol");
  assert.equal(modelLabel({}, { model: "default" }), "");
  assert.equal(modelLabel(names, { ...s, effort: "medium", doing: { effort: "low" } }), "Opus 5.5 Low", "the running turn first, then the session's own choice");
  assert.equal(modelLabel(names, { ...s, effort: "medium" }), "Opus 5.5 Medium");
  assert.equal(pauseTip("ru", "Opus 5.5 High", at(2026, 11, 10, 3, 0), NOW), "Opus 5.5 High · пауза: окно лимита кончилось, Продолжит завтра 03:00");
  assert.equal(pauseTip("en", "", null, NOW), "paused: limit window is out");
});

test("the row shows two bars instead of any core status; the header pill shows the time; nothing else is drawn", () => {
  assert.match(css, /html\.th-clean #list \.srow\[data-clean-pause\] > \.glyph \{[^}]*display: flex;[^}]*animation: none;[^}]*color: var\(--c-t1\);/);
  assert.match(css, /\.srow\[data-clean-pause\] > \.glyph::after \{[^}]*width: 3px; height: 10px;[^}]*background: currentColor;/);
  assert.match(css, /\.srow\[data-clean-pause\] > \.dot \{ display: none; \}/);
  assert.match(css, /\.pill\[data-clean-pause\]::after \{ content: attr\(data-clean-pause\); font: 500 12px\/16px/);
  // no "Resume" item: the core has no endpoint that resumes the cut turn (reload only restarts the process)
  assert.doesNotMatch(js, /session\/reload/);
  const fn = js.slice(js.indexOf("const pauseMarks"), js.indexOf("const unPausePill"));
  assert.ok(fn.length > 100);
  assert.doesNotMatch(fn, /createElement|hub\.el\(|append\(|after\(/, "rows get no new nodes: the core rebuilds them");
});

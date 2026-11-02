// The detailed session list: what a row shows comes from the snapshot only (cwd, since, state).
// Run: node --test tests/. No browser: the pure parts are rows.js, the rules of clean.css are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AGO, agoText, whereOf, sessionFor, detailOf } from "../rows.js";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");
const NOW = 1_800_000_000;

test("project and folder come from the working copy path; no worktree — the last folder only", () => {
  assert.deepEqual(whereOf("/Users/a/dev/app/.claude/worktrees/dark-mode"), ["app", "dark-mode"]);
  assert.deepEqual(whereOf("/Users/a/dev/shop/.claude/worktrees/fix-cart"), ["shop", "fix-cart"]);
  assert.deepEqual(whereOf("/Users/a/dev/notes"), ["notes", ""]);
  assert.deepEqual(whereOf("/Users/a/dev/agents-hub-core/"), ["agents-hub-core", ""]);
  assert.deepEqual(whereOf("/Users/a/dev/.claude/worktrees/"), ["worktrees", ""], "no name after worktrees — an ordinary path");
  assert.deepEqual(whereOf(""), ["", ""]);
  assert.deepEqual(whereOf(undefined), ["", ""]);
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

test("what a row shows: the hub stays compact, a folder named like the session is not repeated, no cwd — time only", () => {
  const s = { name: "flash", kind: "work", state: "idle", since: NOW - 120, cwd: "/u/dev/p/.claude/worktrees/flash-fix" };
  assert.deepEqual(detailOf(s, NOW, AGO.en), { proj: "p", sub: "flash-fix", ago: "2m", cwd: s.cwd });
  assert.deepEqual(detailOf({ ...s, name: "flash-fix" }, NOW, AGO.en), { proj: "p", sub: "", ago: "2m", cwd: s.cwd });
  assert.deepEqual(detailOf({ ...s, cwd: "" }, NOW, AGO.en), { proj: "", sub: "", ago: "2m", cwd: "" });
  assert.equal(detailOf({ ...s, kind: "hub" }, NOW, AGO.en), null);
  assert.equal(detailOf(null, NOW, AGO.en), null);
});

test("the detailed rules live behind the setting class and use no bare :hover", () => {
  const rules = css.split("\n").filter((l) => l.includes("th-clean-detail"));
  assert.ok(rules.length > 5);
  for (const l of rules) {
    assert.match(l, /html\.th-clean\.th-clean-detail/, "every rule needs both classes: the theme and the setting");
    assert.doesNotMatch(l, /:hover/, "hover of a row stays the compact one, inside its media query");
  }
});

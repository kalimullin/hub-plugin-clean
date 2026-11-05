// The usage block at the bottom of the sidebar: colours, old readings and the account line, as in the native app (LimitsBlock).
// Run: node --test tests/*.test.mjs. No browser: usage.js is pure, the snapshots below have the shape the core sends
// (limits, account, accounts, accounts_live, economy), and the rules of clean.css are read as text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { usageModel, emailSteps, left, accountTitle, langOf, WORDS } from "../usage.js";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");
const main = fs.readFileSync(path.join(import.meta.dirname, "..", "main.js"), "utf8");

const NOW = 2_000_000_000;
// a snapshot as the core sends it: limits for the current account, accounts_live per account
const snap = ({ five = 0.4, week = 0.5, status = "allowed", eco = false, ts = NOW - 60, live, pool, active = "work" } = {}) => ({
  limits: {
    status, account: active, ts,
    windows: { five_hour: { used: five, resets: NOW + 2 * 3600 }, seven_day: { used: week, resets: NOW + 3 * 86400 } },
  },
  account: { active },
  accounts: pool ? { on: true, pool } : { on: false, pool: [] },
  accounts_live: live || {},
  economy: { on: eco },
});
const tones = (m) => m.windows.map((w) => w.tone);

test("colour: grey below 80%, orange 80–95%, red from 95%, yellow in economy, red when not working — even in economy", () => {
  assert.deepEqual(tones(usageModel(snap({ five: 0.4, week: 0.79 }), { now: NOW })), ["ok", "ok"]);
  assert.deepEqual(tones(usageModel(snap({ five: 0.8, week: 0.944 }), { now: NOW })), ["warn", "warn"]);
  assert.deepEqual(tones(usageModel(snap({ five: 0.95, week: 1 }), { now: NOW })), ["high", "high"]);
  assert.deepEqual(tones(usageModel(snap({ five: 0.97, week: 0.2, eco: true }), { now: NOW })), ["eco", "eco"]);
  const broken = usageModel(snap({ five: 0.1, week: 0.2, status: "rejected", eco: true }), { now: NOW });
  assert.equal(broken.broken, true);
  assert.deepEqual(tones(broken), ["high", "high"]);
});

test("percent and even-pace mark: the mark is how much of the window has passed", () => {
  const m = usageModel(snap({ five: 0.834 }), { now: NOW });
  const five = m.windows.find((w) => w.id === "five_hour"), week = m.windows.find((w) => w.id === "seven_day");
  assert.equal(five.pct, 83);
  assert.ok(Math.abs(five.even - 3 / 5) < 1e-9, "2 hours left of 5 — the mark at 60%");
  assert.ok(Math.abs(week.even - 4 / 7) < 1e-9, "3 days left of 7 — the mark at 4/7");
  assert.match(five.spoken, /^5 часов 83%, сброс /);
});

test("a window whose reset has passed: no fill colour, no mark, its own words", () => {
  const s = snap({ five: 0.99 });
  s.limits.windows.five_hour.resets = NOW - 10;
  const w = usageModel(s, { now: NOW }).windows[0];
  assert.equal(w.lapsed, true);
  assert.equal(w.tone, "ok");
  assert.equal(w.even, null);
  assert.match(w.spoken, /лимит сброшен/);
});

test("a fresher accounts_live reading wins over limits", () => {
  const live = { work: { five_hour: { used: 0.9, reset: NOW + 3600 }, seven_day: { used: 0.1, reset: NOW + 86400 }, measured_at: NOW - 5, stale: false } };
  const m = usageModel(snap({ five: 0.2, ts: NOW - 100, live }), { now: NOW });
  assert.equal(m.windows[0].pct, 90);
  assert.equal(m.stale, null);
});

test("old reading: a clock hint with the time and the reason; the link to the hub goes first", () => {
  assert.equal(usageModel(snap(), { now: NOW }).stale, null, "fresh — no clock");
  const hourOld = usageModel(snap({ ts: NOW - 2 * 3600 }), { now: NOW });
  assert.equal(hourOld.stale.why, "rest");
  assert.match(hourOld.stale.text, /^Замер от /);
  assert.equal(usageModel(snap(), { now: NOW, linkDown: true }).stale.why, "link");
  assert.equal(usageModel(snap(), { now: NOW, sinceSnap: null }).stale.why, "cache");
  const auth = { work: { five_hour: { used: 0.3, reset: NOW + 3600 }, seven_day: null, measured_at: NOW - 30, stale: true, error: "auth" } };
  assert.equal(usageModel(snap({ live: auth }), { now: NOW }).stale.why, "auth");
  const net = { work: { five_hour: { used: 0.3, reset: NOW + 3600 }, seven_day: null, measured_at: NOW - 30, stale: true, error: "timeout" } };
  assert.equal(usageModel(snap({ live: net }), { now: NOW }).stale.why, "net");
});

test("the account line: the e-mail only with a pool of 2+ accounts, ✓ when it is the active one", () => {
  const pool = [{ name: "work", email: "someone@example.com" }, { name: "spare", email: "other@example.com" }];
  const m = usageModel(snap({ pool }), { now: NOW });
  assert.equal(m.email, "someone@example.com");
  assert.equal(m.active, true);
  assert.equal(usageModel(snap({ pool: [pool[0]] }), { now: NOW }).email, "", "one account — nothing to tell apart");
  const other = snap({ pool });
  other.limits.account = "spare";
  assert.equal(usageModel(other, { now: NOW }).active, false);
  assert.equal(accountTitle("icons8-claude", "ru"), "icons8");
  assert.equal(accountTitle("token-vph", "ru"), "VPH");
  assert.equal(accountTitle("", "en"), WORDS.en.machine);
});

test("e-mail steps: whole, then without the top-level zone; the middle is never cut", () => {
  assert.deepEqual(emailSteps("name@company.example.com"), ["name@company.example.com", "name@company.example"]);
  assert.deepEqual(emailSteps("name@localhost"), ["name@localhost"]);
  for (const s of emailSteps("a.very.long.name@sub.example.org")) assert.ok(!s.includes("…"));
  assert.match(css, /\.cu-mail \{[^}]*text-overflow: ellipsis/, "the end is cut by CSS");
});

test("time to reset, in three languages", () => {
  assert.equal(left(NOW + 30, NOW, "ru"), WORDS.ru.soon);
  assert.match(left(NOW + 4 * 3600, NOW, "en"), /4 hours/);
  assert.match(left(NOW + 23 * 3600 + 40 * 60, NOW, "en"), /1 day/);
  assert.match(left(NOW + 90 * 60, NOW, "es"), /2 horas/);
  assert.equal(langOf("es-AR"), "es");
  assert.equal(langOf("de"), "en");
});

test("nothing to show without windows", () => {
  assert.equal(usageModel({ limits: {} }, { now: NOW }), null);
  assert.equal(usageModel(null, { now: NOW }), null);
});

test("CSS: colours from the theme tokens, old reading paler, the mark and the hint", () => {
  assert.match(css, /\[data-tone="warn"\] \.cu-fill \{ background: var\(--warning\)/);
  assert.match(css, /\[data-tone="high"\] \.cu-fill \{ background: var\(--destructive\)/);
  assert.match(css, /\[data-tone="eco"\] \.cu-fill \{ background: var\(--c-eco\)/);
  assert.match(css, /\.cu-fill\.old \{ opacity: 0\.4/);
  assert.match(css, /\.cu-mark \{[^}]*width: 1\.5px/);
  assert.match(css, /\.cu-hint\[hidden\] \{ display: none/);
  assert.match(css, /\.cu-seg\[aria-pressed="true"\]/);
  // hover only where there is a mouse
  const hovers = css.match(/\.cu-[a-z-]+[^{,]*:hover/g) || [];
  assert.ok(hovers.length > 0);
  const media = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine) {\n  html.th-clean button.cu-acc:hover"));
  for (const h of hovers) assert.ok(media.includes(h), `${h} sits inside the hover media query`);
});

test("CSS: the bottom line sits level with ☰ (36 px, 40 on a phone); the old line is gone", () => {
  assert.match(css, /\.clean-usage \{ --cu-row: 36px; --cu-pull: -48px;/);
  assert.match(css, /\.clean-usage \{ --cu-row: 40px; --cu-pull: -52px; \}/);
  assert.doesNotMatch(css, /\.clean-lim\b|\.limlink|\.limseg/);
  assert.doesNotMatch(main, /clean-lim\b|limseg|limlink/);
  assert.match(main, /localStorage\.getItem\(USAGE_KEY\)/, "the compact / expanded choice is kept");
});

test("old reading: each row has its own clock and only the pressed one opens its hint", () => {
  assert.match(main, /usageClock\(m\.stale, w\.id\)/, "the clock knows its window");
  assert.match(main, /const shown = usage\.tip === id;/);
  assert.match(main, /tip\.hidden = !shown;/);
  assert.doesNotMatch(main, /usage\.tip = (true|false)/, "no shared on/off flag for all clocks");
});

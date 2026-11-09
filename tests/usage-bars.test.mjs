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

test("colour: grey below 80%, orange 80–95%, red from 95% and when not working", () => {
  assert.deepEqual(tones(usageModel(snap({ five: 0.4, week: 0.79 }), { now: NOW })), ["ok", "ok"]);
  assert.deepEqual(tones(usageModel(snap({ five: 0.8, week: 0.944 }), { now: NOW })), ["warn", "warn"]);
  assert.deepEqual(tones(usageModel(snap({ five: 0.95, week: 1 }), { now: NOW })), ["high", "high"]);
  assert.deepEqual(tones(usageModel(snap({ five: 0.1, status: "rejected" }), { now: NOW })), ["high", "high"]);
});

test("colour in economy: red and orange stay, yellow only instead of grey", () => {
  assert.deepEqual(tones(usageModel(snap({ five: 0.97, week: 0.99, eco: true }), { now: NOW })), ["high", "high"], "97–99% in economy — red");
  assert.deepEqual(tones(usageModel(snap({ five: 0.95, week: 0.98, eco: true }), { now: NOW })), ["high", "high"], "95% in economy — red");
  assert.deepEqual(tones(usageModel(snap({ five: 0.85, week: 0.8, eco: true }), { now: NOW })), ["warn", "warn"], "80–95% in economy — orange");
  assert.deepEqual(tones(usageModel(snap({ five: 0.4, week: 0.79, eco: true }), { now: NOW })), ["eco", "eco"], "below 80% in economy — yellow");
  assert.deepEqual(tones(usageModel(snap({ five: 0.4, week: 0.2 }), { now: NOW })), ["ok", "ok"], "below 80% without economy — grey");
  const broken = usageModel(snap({ five: 0.1, week: 0.2, status: "rejected", eco: true }), { now: NOW });
  assert.equal(broken.broken, true);
  assert.deepEqual(tones(broken), ["high", "high"], "not working in economy — red");
  const s = snap({ five: 0.99, eco: true });
  s.limits.windows.five_hour.resets = NOW - 10;
  assert.equal(usageModel(s, { now: NOW }).windows[0].tone, "ok", "a window whose reset has passed — no colour, even in economy");
});

test("colour: a not-working account keeps a full-strength red bar even when the reading is old, as in the native app", () => {
  const calls = main.match(/usageBar\(w, [^)]*\)\)/g) || [];
  assert.equal(calls.length, 2);
  for (const c of calls) assert.match(c, /&& !m\.broken/);
  const m = usageModel(snap({ five: 0.6, status: "rejected", ts: NOW - 3 * 3600 }), { now: NOW });
  assert.ok(m.stale && m.broken);
});

test("not working, as UsageState.of in the native app: an old reading whose last probe failed on auth or a missing token", () => {
  const probe = (error, extra = {}) => ({ work: { five_hour: { used: 0.3, reset: NOW + 3600 }, seven_day: { used: 0.4, reset: NOW + 86400 }, measured_at: NOW - 2 * 3600, stale: true, error, ...extra } });
  for (const error of ["auth", "no_token"]) {
    const old = usageModel(snap({ five: 0.2, week: 0.3, ts: NOW - 2 * 3600, live: probe(error) }), { now: NOW });
    assert.ok(old.stale, `${error}: the reading is old`);
    assert.equal(old.broken, true, `${error}: old reading with a failed probe — not working`);
    assert.deepEqual(tones(old), ["high", "high"], `${error}: red`);
    // the error is read even when limits are fresher than the probe and win (miss in PublicFeed+Accounts)
    const won = usageModel(snap({ five: 0.2, ts: NOW - 90 * 60, live: probe(error, { measured_at: NOW - 3 * 3600 }) }), { now: NOW });
    assert.equal(won.broken, true, `${error}: limits win, still not working`);
  }
  const fresh = usageModel(snap({ five: 0.2, live: probe("auth", { measured_at: NOW - 30, stale: false }) }), { now: NOW });
  assert.equal(fresh.broken, false, "a fresh reading is never broken by the probe error");
  const net = usageModel(snap({ five: 0.2, ts: NOW - 2 * 3600, live: probe("net") }), { now: NOW });
  assert.equal(net.broken, false, "a network error is only a reason in the hint, not «not working»");
  assert.deepEqual(tones(net), ["ok", "ok"]);
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

test("a fresh reading stays fresh when the link drops or the hub is quiet, as in the native app", () => {
  // the stream sends a snapshot only on a hub event: 15 quiet minutes or a reconnect blip are not an old reading
  assert.equal(usageModel(snap(), { now: NOW, linkDown: true }).stale, null, "link down, reading 1 min old — no clock");
  assert.equal(usageModel(snap(), { now: NOW, sinceSnap: 20 * 60 }).stale, null, "no hub event for 20 min — no clock");
  assert.equal(usageModel(snap({ ts: NOW - 50 * 60 }), { now: NOW, sinceSnap: 20 * 60 }).stale, null, "50 min old reading — still fresh");
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
  const stale = snap({ ts: NOW - 2 * 3600 });
  assert.equal(usageModel(stale, { now: NOW, linkDown: true }).stale.why, "link");
  assert.equal(usageModel(stale, { now: NOW, sinceSnap: 16 * 60 }).stale.why, "link");
  assert.equal(usageModel(stale, { now: NOW, sinceSnap: null }).stale.why, "cache");
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

test("the account line without an e-mail: the account name, the same link to the accounts settings", () => {
  const pool = [{ name: "icons8-claude" }, { name: "token-vph" }];
  const m = usageModel(snap({ pool, active: "icons8-claude" }), { now: NOW });
  assert.equal(m.email, "");
  assert.equal(m.line, "icons8", "no e-mail in the pool — the name, as the title");
  assert.equal(m.pool, true, "accounts on — the line is the link");
  const bad = usageModel(snap({ pool: [{ name: "work", email: "not a mail" }, { name: "spare" }] }), { now: NOW });
  assert.equal(bad.line, accountTitle("work", "ru"), "a broken e-mail counts as none");
  const mail = usageModel(snap({ pool: [{ name: "work", email: "someone@example.com" }, { name: "spare" }] }), { now: NOW });
  assert.equal(mail.line, "someone@example.com", "the e-mail when there is one");
  assert.equal(usageModel(snap({ pool: [pool[0]], active: "icons8-claude" }), { now: NOW }).line, "", "one account — no line, as before");
  assert.equal(usageModel(snap(), { now: NOW }).line, "", "accounts off — no line, as before");
  const acc = main.slice(main.indexOf("const usageAcc = "), main.indexOf("const usageFoot = "));
  assert.match(acc, /hub\.el\("span", "cu-mail", m\.line\)/);
  assert.match(acc, /fitMail\(shown, m\.email \? emailSteps\(m\.email\) : \[m\.line\]\)/, "a name is not cut at its dot");
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
  assert.match(css, /\[data-tone="warn"\] \.cu-fill \{ background: var\(--c-warn-bar\)/);
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

test("expanded view: the account e-mail is its own line as wide as the windows; the bottom line keeps only the switch", () => {
  assert.match(main, /if \(open && m\.line\) box\.append\(usageAcc\(m\)\);/);
  const foot = main.slice(main.indexOf("const usageFoot = "), main.indexOf("return foot;"));
  assert.doesNotMatch(foot, /cu-acc|cu-mail/, "the e-mail is not squeezed next to ☰ and the switch");
  assert.match(css, /\.cu-acc \{[^}]*margin: -4px 0 -4px var\(--cu-pull\)/, "the line starts under the windows, at their left edge");
  assert.match(css, /\.cu-foot\.open \{ justify-content: flex-end; \}/);
});

test("expanded view: the name stays on the left and the reset on the right; the percent joins the name", () => {
  const rows = main.slice(main.indexOf("const usageRows = "), main.indexOf("function usageDraw("));
  assert.match(rows, /hub\.el\("span", "cu-peek", ` · \$\{captionText\(m, w\)\}`\)/);
  assert.match(rows, /else if \(w\.reset\) line\.append\(hub\.el\("span", "cu-val", w\.reset\)\);/);
  assert.doesNotMatch(rows, /cu-tip/, "no number over the bar in the expanded view");
  assert.doesNotMatch(css, /\.cu-line\.peek > :not\(\.cu-tip\) \{ visibility: hidden/);
});

test("keyboard: a redraw's own focus and blur do not redraw again, and the hide waits until the focus has moved", () => {
  // checked in Chromium: Tab onto a bar used to redraw until "Maximum call stack size exceeded", and the next Tab dropped the
  // focus to the page instead of the second bar
  const peek = main.slice(main.indexOf("const wirePeek = "), main.indexOf("const usageClock = "));
  assert.match(peek, /addEventListener\("focus", \(\) => \{ if \(!usage\.drawing && peekable && usage\.peek !== w\.id/);
  assert.match(peek, /addEventListener\("blur", \(\) => \{ if \(!usage\.drawing\) setTimeout\(\(\) => peekHide\(w\.id\)\); \}\)/);
  const clock = main.slice(main.indexOf("const usageClock = "), main.indexOf("const usageSwitch = "));
  assert.match(clock, /addEventListener\("blur", \(\) => \{ if \(!usage\.drawing\) setTimeout\(\(\) => set\(false\)\); \}\)/);
  const draw = main.slice(main.indexOf("function usageDraw("), main.indexOf("hub.addSlot(\"sidebar.footer\""));
  assert.match(draw, /usage\.drawing = true;\s*try \{\s*root\.replaceChildren\(box\);[\s\S]*?\} finally \{ usage\.drawing = false; \}/);
});

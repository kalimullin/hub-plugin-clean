// Client of the hubbahub-feed-kinds module (kinds.js): what a module answer does to the state, how requests are cut,
// how failures surface. Run: node --test tests/. No browser or core: pure functions and a fake fetch.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { KIND_IDS, KIND_BATCH, newState, takeKinds, plan, askQuery, afterQuery, retryWait, fetchKinds } from "../kinds.js";

const read = (f) => fs.readFileSync(path.join(import.meta.dirname, "..", f), "utf8");

test("kinds in the answer land in the map, a known type clears pending", () => {
  const st = newState(); st.pending.add(12);
  takeKinds(st, { v: 1, rev: 7, kinds: { 12: "R", 15: "Q" }, pending: [] }, [12, 15]);
  assert.equal(st.map.get(12), "R");
  assert.equal(st.map.get(15), "Q");
  assert.equal(st.pending.has(12), false);
  assert.equal(st.rev, 7);
});

test("asked seq absent from kinds and pending get no type (null)", () => {
  const st = newState();
  takeKinds(st, { v: 1, rev: 1, kinds: { 12: "P" }, pending: [] }, [12, 13]);
  assert.equal(st.map.has(13), true);
  assert.equal(st.map.get(13), null);
});

test("pending seq are not typed and are remembered for a later ask", () => {
  const st = newState();
  takeKinds(st, { v: 1, rev: 1, kinds: {}, pending: [20, 21] }, [20, 21, 22]);
  assert.deepEqual([...st.pending].sort(), [20, 21]);
  assert.equal(st.map.has(20), false);
  assert.equal(st.map.get(22), null);
});

test("an unknown type letter is no type, rev never goes back", () => {
  const st = newState(); st.rev = 9;
  takeKinds(st, { v: 1, rev: 3, kinds: { 5: "Z" }, pending: [] }, [5]);
  assert.equal(st.map.get(5), null);
  assert.equal(st.rev, 9);
});

test("an after= answer changes only the rows it names, and re-types a changed one", () => {
  const st = newState();
  takeKinds(st, { v: 1, rev: 4, kinds: { 1: "P", 2: "R" }, pending: [] }, [1, 2]);
  takeKinds(st, { v: 1, rev: 6, kinds: { 2: "Q" }, pending: [] });
  assert.equal(st.map.get(1), "P");
  assert.equal(st.map.get(2), "Q");
  assert.equal(st.rev, 6);
});

test("a fallback C re-read later arrives through after=<rev>, and a row with no type can get one", () => {
  const st = newState();
  // classifier off: most rows have no type (in neither kinds nor pending), one got the fallback C
  takeKinds(st, { v: 1, rev: 2, kinds: { 3: "C" }, by: { 3: "fallback" }, pending: [] }, [1, 2, 3, 4, 5]);
  assert.deepEqual([...st.map].filter(([, k]) => k === null).map(([n]) => n), [1, 2, 4, 5]);
  assert.equal(st.pending.size, 0);
  // the module re-reads the fallback row quietly (never in pending) and a rule types another one
  takeKinds(st, { v: 1, rev: 5, kinds: { 3: "R", 4: "F" }, pending: [] });
  assert.equal(st.map.get(3), "R");
  assert.equal(st.map.get(4), "F");
  assert.equal(st.map.get(1), null);
  assert.equal(st.rev, 5);
});

test("a malformed answer throws and leaves the state alone", () => {
  for (const bad of [null, {}, { v: 2, kinds: {} }, { v: 1 }, { v: 1, kinds: null }]) {
    const st = newState();
    assert.throws(() => takeKinds(st, bad, [1]));
    assert.equal(st.map.size, 0);
  }
});

test("plan asks only unknown seq, ascending, in batches of 500", () => {
  const st = newState();
  st.map.set(2, "P"); st.pending.add(3); st.busy.add(4);
  const wanted = new Set([1, 2, 3, 4, 5]);
  assert.deepEqual(plan(st, wanted), [[1, 5]]);
  const many = new Set(Array.from({ length: 1201 }, (_, i) => 1000 - i + 1500));
  const parts = plan(newState(), many);
  assert.deepEqual(parts.map((p) => p.length), [KIND_BATCH, KIND_BATCH, 201]);
  assert.ok(parts.flat().every((n, i, a) => !i || a[i - 1] < n));
});

test("queries: the session name is escaped, seq are comma-joined, after carries the rev", () => {
  assert.equal(askQuery("a b/c", [12, 15, 18]), "session=a%20b%2Fc&seq=12,15,18");
  assert.equal(afterQuery("demo", 42), "session=demo&after=42");
});

test("retry pause grows 3, 6, 12, 24 s and stops at 30 s", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map(retryWait), [3000, 6000, 12000, 24000, 30000, 30000, 30000]);
});

test("fetchKinds sends the hub header and rejects on 400, 403 and network errors", async () => {
  const seen = [];
  const ok = async (url, o) => { seen.push([url, o.headers["X-Hub"]]); return { ok: true, json: async () => ({ v: 1, kinds: {} }) }; };
  assert.deepEqual(await fetchKinds(ok, "session=s&seq=1"), { v: 1, kinds: {} });
  assert.deepEqual(seen, [["/api/feed-kinds?session=s&seq=1", "1"]]);
  for (const status of [400, 403, 500]) await assert.rejects(fetchKinds(async () => ({ ok: false, status }), "x"), new RegExp(String(status)));
  await assert.rejects(fetchKinds(async () => { throw new TypeError("network"); }, "x"));
});

test("the six type letters are the module's", () => assert.deepEqual(KIND_IDS, ["P", "R", "I", "Q", "F", "C"]));

test("main.js reads types from the module only: no msg_kind, the feature flag gates the filter", () => {
  const src = read("main.js");
  assert.equal(/msg_kind/.test(src), false);
  assert.match(src, /includes\("feed\.kinds"\)/);
  assert.match(src, /from "\.\/kinds\.js"/);
});

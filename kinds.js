// Message types of a session feed (Ход работы / Отчёт / К сведению / Вопрос / Сбой / Разговор) come from the hubbahub-feed-kinds
// module: GET /api/feed-kinds?session=<name>&seq=12,15,18 → {v:1, rev, kinds:{seq:"P|R|I|Q|F|C"}, pending:[seq]}, and for later
// changes ?session=<name>&after=<rev>. This file is the client's pure part (no DOM, no hub), main.js wires it to the feed.

export const KIND_IDS = ["P", "R", "I", "Q", "F", "C"];
export const KIND_BATCH = 500;   // the module takes up to 500 seq per request

// Per-session state: map is seq → type or null (null: the module has no type for the row, it shows only under "All");
// pending is seq the module will type later, busy is seq with a request in flight.
export const newState = () => ({ map: new Map(), pending: new Set(), busy: new Set(), rev: 0, failedAt: 0, tries: 0, timer: 0, poll: 0 });

// One answer of the module: kinds → type, pending → ask again later, asked but absent from both → no type (null).
// A malformed answer throws: the caller treats it like a failed request.
export function takeKinds(st, j, asked) {
  if (!j || j.v !== 1 || typeof j.kinds !== "object" || !j.kinds) throw new Error("feed-kinds: bad answer");
  if (Number.isFinite(j.rev)) st.rev = Math.max(st.rev, j.rev);
  const wait = new Set(Array.isArray(j.pending) ? j.pending.map(Number) : []);
  for (const [k, v] of Object.entries(j.kinds)) {
    const n = Number(k);
    if (n > 0) { st.map.set(n, KIND_IDS.includes(v) ? v : null); st.pending.delete(n); }
  }
  for (const n of asked || []) {
    if (j.kinds[n] != null) continue;
    if (wait.has(n)) st.pending.add(n);
    else { st.map.set(n, null); st.pending.delete(n); }
  }
}

// The rows still to ask about (ascending), cut into requests of at most KIND_BATCH.
export function plan(st, wanted) {
  const need = [...wanted].filter((n) => !st.map.has(n) && !st.pending.has(n) && !st.busy.has(n)).sort((x, y) => x - y);
  const parts = [];
  for (let i = 0; i < need.length; i += KIND_BATCH) parts.push(need.slice(i, i + KIND_BATCH));
  return parts;
}

export const askQuery = (name, part) => `session=${encodeURIComponent(name)}&seq=${part.join(",")}`;
export const afterQuery = (name, rev) => `session=${encodeURIComponent(name)}&after=${rev}`;

// Pause before asking about pending rows again: 3, 6, 12, 24, 30, 30 … s
export const retryWait = (tries) => Math.min(30000, 3000 * 2 ** Math.min(tries, 4));

// GET with the hub header; any non-2xx (400/403/…) or network error rejects.
export async function fetchKinds(fetchFn, query) {
  const r = await fetchFn(`/api/feed-kinds?${query}`, { headers: { "X-Hub": "1" } });
  if (!r.ok) throw new Error(`feed-kinds: ${r.status}`);
  return r.json();
}

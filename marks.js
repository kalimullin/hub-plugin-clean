// Model mark on a thread row of the left panel, as the native client (hub-ios PublicFeed+Harness, WorkDots, StatusMark):
// the colour says the lab that runs the thread (Claude, Codex, GLM), the number of dots says the model class
// (Haiku 2, Sonnet 4, Opus 6, the top class 8, unknown 6). A working thread shows the dots twinkling, a sleeping one
// the same dots dimmed; the core's unread dot takes the same colour. No harness known — the theme's own status mark stays.
// Pure functions: the snapshot in, words and numbers out (tests/thread-dots.test.mjs); the slot in main.js draws them.

const text = (v) => (typeof v === "string" ? v.trim() : "");
const first = (...values) => values.map(text).find(Boolean) || "";
const object = (v) => (v && typeof v === "object" ? v : {});

// a model or launcher name → lab; the bare aliases are Claude's (the native harnessFamily)
const CLAUDE = new Set(["claude", "default", "opus", "sonnet", "fable", "haiku"]);
export function family(value) {
  const v = text(value).toLowerCase();
  if (v === "glm" || v.startsWith("glm-")) return "glm";
  if (v === "codex" || v.startsWith("codex-") || v.startsWith("gpt-")) return "codex";
  if (CLAUDE.has(v) || v.startsWith("claude-")) return "claude";
  return "";
}

// The lab: named explicitly (doing → info → session), else by the launcher, else by the model actually named
// (doing → info.model → the chosen one). Empty — no data.
export function harnessOf(session) {
  const s = object(session), info = object(s.info), doing = object(s.doing);
  const explicit = first(doing.harness, info.harness, s.harness);
  if (explicit) return family(explicit);
  return family(first(info.launcher, s.launcher)) || family(first(doing.model, info.model, s.model));
}

// The class from the hub's model catalogue (models[].tier, 2…8): model_effective → info.model (claude-opus-5-5 is
// looked up as opus-5-5, opus-5, opus) → the chosen model; the first named one wins. Not in the catalogue — 6.
export function tierOf(snap, session) {
  const s = object(session), id = first(s.model_effective, object(s.info).model, s.model), keys = [id];
  if (id.startsWith("claude-")) { const parts = id.slice(7).split("-"); while (parts.length) { keys.push(parts.join("-")); parts.pop(); } }
  const catalog = Array.isArray(object(snap).models) ? snap.models : [];
  const entry = keys.map((k) => catalog.find((x) => x?.id === k)).find(Boolean);
  return Number.isInteger(entry?.tier) && entry.tier >= 2 && entry.tier <= 8 ? entry.tier : 6;
}

// Dots always come in pairs (two columns, up to four rows)
export const dotCount = (tier) => Math.max(2, Math.min(8, tier - (tier % 2)));

// «Opus 5.5 High», «GPT 6.1 Sol High»: the name from the hub's catalogue, else the id; effort capitalised
export function modelLabel(snap, session) {
  const s = object(session), info = object(s.info), doing = object(s.doing), names = object(object(snap).model_names);
  const model = first(doing.model, info.model, s.model), short = model.startsWith("claude-") ? model.slice(7) : model;
  // not in the catalogue: a Claude id reads as «Sonnet 5.5», others as they are
  const plain = model.startsWith("claude-") ? short.replace(/^([a-z]+)-(.*)$/, (_, n, v) => n.charAt(0).toUpperCase() + n.slice(1) + " " + v.replace(/-/g, ".")) : model;
  const title = model && model !== "default" ? first(names[model], names[short]) || plain : "";
  const effort = first(doing.effort, s.effort, info.effort);
  return [title, effort ? effort.charAt(0).toUpperCase() + effort.slice(1) : ""].filter(Boolean).join(" ");
}

// A free session whose executors work counts as working — as the core's crewOf (state.js): a working executor without
// a backlog counts for the one who raised it and up the chain of executors (the hub itself not)
const runner = (s) => s?.role === "executor" && !s.backlog;
const crews = new WeakMap();
function crewAtWork(sessions) {
  if (crews.has(sessions)) return crews.get(sessions);
  const by = new Map(sessions.map((x) => [x?.name, x])), out = new Set();
  for (const x of sessions) {
    if (!runner(x) || x.status !== "working") continue;
    let up = x.raised_by;
    for (let i = 0; up && i < 5; i++) {
      const p = by.get(up); if (!p || p.kind === "hub") break;
      out.add(up); if (!runner(p)) break; up = p.raised_by;
    }
  }
  crews.set(sessions, out);
  return out;
}

const featureOn = (snap, name) => { const f = object(snap).features; return Array.isArray(f) ? f.includes(name) : object(f)[name] === true; };
// paused on a usage limit (module hubbahub-quota-hold, or the session's own flag on an older core)
function paused(snap, s) {
  const extra = featureOn(snap, "session.quota_hold") && s.name ? object(object(object(snap).sessions_extra)[s.name]) : {};
  return extra.quota_hold === true || (extra.quota_hold === undefined && !!extra.hold_mark && typeof extra.hold_mark === "object") || s.quota_hold === true;
}

// What the dots show, by the same rule as the core's status glyph (sidebar.js look): «work» — status working or its
// executors work; «asleep» — status asleep. Anything else — empty, and the core's own mark stays: the unread dot
// (coloured by the stylesheet), the paused, failed and manual marks, the spinner of an unknown harness.
export function kindOf(snap, session) {
  const s = object(session);
  if (paused(snap, s) || ["held", "absent"].includes(s.state)) return "";
  const sessions = Array.isArray(object(snap).sessions) ? snap.sessions : [];
  if (s.status === "working" || (s.status === "idle" && s.state === "idle" && crewAtWork(sessions).has(s.name))) return "work";
  if (s.status === "asleep") return "asleep";
  return "";
}

const WORDS = {
  ru: { work: "Работает", asleep: "Уснула" },
  en: { work: "Working", asleep: "Asleep" },
  es: { work: "Trabajando", asleep: "Dormida" },
};
// The tooltip and the name read by a screen reader: the state in words and the model — «Работает: Opus 5.5 High».
// The colour is never the only signal.
export function markLabel(lang, kind, model) {
  const w = WORDS[String(lang || "").toLowerCase().split(/[-_]/)[0]] || WORDS.en, word = w[kind] || "";
  return word && model ? `${word}: ${model}` : word || model;
}

// One mark per slot root, kept across snapshots; rebuilt only when the number of dots changes. Without a state the
// mark stays hidden but keeps the lab: the stylesheet colours the core's unread dot by it.
export function renderMark(hub, root, snap, session) {
  const harness = harnessOf(session), kind = harness ? kindOf(snap, session) : "";
  const n = kind ? dotCount(tierOf(snap, session)) : 0;
  let mark = root.firstChild;
  if (!mark?.classList?.contains("clean-mark")) { mark = hub.el("span", "clean-mark"); root.replaceChildren(mark); }
  if (harness) mark.dataset.harness = harness; else delete mark.dataset.harness;
  mark.dataset.kind = kind || "none";
  mark.hidden = !kind;
  // the slot root carries the state too: the stylesheet reaches it from the row without a nested :has()
  if (kind) root.dataset.cleanMark = kind; else delete root.dataset.cleanMark;
  if (mark.childNodes.length !== n) mark.replaceChildren(...Array.from({ length: n }, () => hub.el("i")));
  const label = kind ? markLabel(hub.lang, kind, modelLabel(snap, session)) : "";
  mark.title = label;
  if (label) { mark.setAttribute("role", "img"); mark.setAttribute("aria-label", label); }
  else { mark.removeAttribute("role"); mark.removeAttribute("aria-label"); }
  return mark;
}

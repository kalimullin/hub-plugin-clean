// A recording over a draft belongs to its chat, not to the form node (voicetext.js): the core rebuilds the chat's form when
// the owner opens another chat and comes back. Run: node --test tests/. No core and no browser: a few stand-in nodes, the
// core's dictate button is a stub whose mode is set by the test (rec, busy, idle).
import test from "node:test";
import assert from "node:assert/strict";
import { mountVoiceText, chatOf, REC } from "../voicetext.js";

const classes = (...init) => {
  const s = new Set(init);
  return { contains: (c) => s.has(c), add: (c) => s.add(c), remove: (c) => s.delete(c), toggle: (c, on) => (on ? s.add(c) : s.delete(c)) };
};
// a node that keeps its children and knows its parent: enough for append/before/remove of the button and the strip
function node(tag = "div", cls = "") {
  const n = { tag, classList: classes(...cls.split(" ").filter(Boolean)), children: [], parentNode: null, dataset: {}, attrs: {},
    hidden: false, disabled: false, listeners: {},
    append(...kids) { for (const k of kids) { if (typeof k !== "object") continue; k.parentNode?.children.splice(k.parentNode.children.indexOf(k), 1); k.parentNode = n; n.children.push(k); } },
    before(k) { const p = n.parentNode; k.parentNode?.children.splice(k.parentNode.children.indexOf(k), 1); k.parentNode = p; p.children.splice(p.children.indexOf(n), 0, k); },
    remove() { if (n.parentNode) { n.parentNode.children.splice(n.parentNode.children.indexOf(n), 1); n.parentNode = null; } },
    replaceChildren(...kids) { n.children = []; n.append(...kids); },
    setAttribute(k, v) { n.attrs[k] = v; }, getAttribute: (k) => n.attrs[k] ?? null,
    addEventListener(type, fn) { (n.listeners[type] ||= []).push(fn); },
    querySelector: () => null,
  };
  return n;
}
// a session form as the core builds it: the bottom row's spacer, the field (#msg — the open chat's) and the form's submit
function sessionForm(scene, draft) {
  const form = node("form", "composer");
  const spacer = node("span", "spacer"), ta = node("textarea");
  ta.value = draft;
  ta.dispatchEvent = () => true;
  ta.closest = (q) => (q === "form.composer" ? form : null);
  form.ta = ta;
  form.sent = [];   // what the core's submit would send from this form
  form.isConnected = true;
  form.querySelector = (q) => (q === ":scope > .bar:not(.reply-bar) > .spacer" ? spacer : /textarea/.test(q) ? ta : null);
  form.requestSubmit = () => { if (!form.isConnected) return; const e = event("submit", form); scene.fire(e); if (!e.defaultPrevented) form.sent.push(ta.value); };
  form.dispatchEvent = (e) => { if (e.type === "submit") form.sent.push(ta.value); return true; };
  return form;
}
const event = (type, target, o = {}) => ({ type, target, defaultPrevented: false, stopped: false, ...o,
  preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; } });

function setup() {
  const scene = { forms: [], buttons: [], capture: [], hash: "#/s/a", active: null };
  scene.fire = (e) => { for (const fn of scene.capture) fn(e); };
  globalThis.location = { get hash() { return scene.hash; } };
  globalThis.MutationObserver = class { observe() {} };
  globalThis.KeyboardEvent = class { constructor(type, o) { Object.assign(this, { type }, o); } };
  globalThis.Event = class { constructor(type, o) { Object.assign(this, { type }, o); } };
  globalThis.document = {
    createElement: (t) => node(t),
    querySelectorAll: (q) => (q === "form.composer" ? scene.forms.filter((f) => f.isConnected) : []),
    addEventListener: (type, fn, capture) => { if (type === "submit" && capture) scene.capture.push(fn); },
    get activeElement() { return scene.active; },
  };
  const hub = {
    capabilities: { dictate: 1 },
    t: (k) => k,
    el: (tag, cls = "", text) => { const n = node(tag, cls); if (text) n.text = text; return n; },
    banner: (text) => { scene.banner = text; },
    dictate: (proxy, opts) => {
      const b = node("button", "btn round dictate mic");
      b.opts = opts;
      b.clicks = 0;
      b.click = () => { b.clicks++; };
      b.querySelector = (q) => (q === ".spin-dot" && b.busy ? {} : null);
      b.mode = (m) => {   // as the core repaints its button: rec — stop, busy — spinner and disabled, idle — mic
        b.classList.toggle("stop", m === "rec");
        b.busy = m === "busy";
        b.disabled = m === "busy";
      };
      scene.buttons.push(b);
      return b;
    },
  };
  scene.vt = mountVoiceText(hub, () => true);
  return scene;
}
// the owner opens another chat: the core drops the old form and builds the new chat's one
function open(scene, hash, draft = "") {
  for (const f of scene.forms) f.isConnected = false;
  scene.hash = hash;
  const f = sessionForm(scene, draft);
  scene.forms.push(f);
  scene.vt.sweep();
  return f;
}

test("the chat of a form: the session field is the open chat's, other fields have none", () => {
  const scene = setup();
  const f = sessionForm(scene, "");
  assert.equal(chatOf(f, "#/s/a"), "chat:#/s/a");
  const other = sessionForm(scene, "");
  other.querySelector = () => null;
  assert.equal(chatOf(other, "#/s/a"), null);
});

test("away and back mid-recording: the chat's new form takes over the button, the strip and the record look", () => {
  const scene = setup();
  const a = open(scene, "#/s/a", "[Image #1]");
  const b = scene.buttons[0];
  b.mode("rec");
  scene.vt.sweep();
  a.classList.add(REC);   // what paint does on the class change
  open(scene, "#/s/b");
  const a2 = open(scene, "#/s/a", "[Image #1]");
  assert.equal(b.parentNode, a2.querySelector(":scope > .bar:not(.reply-bar) > .spacer"), "the running button moved to the new form");
  assert.ok(a2.classList.contains(REC), "the new form looks recording");
  assert.ok(!a.classList.contains(REC), "the old form does not");
  // Enter in the new field while recording: stop (the words come back and go with the draft), the core's field does not get it
  scene.active = a2.ta;
  const e = event("keydown", a2.ta, { key: "Enter" });
  assert.equal(scene.vt.enter(e), true);
  assert.ok(e.defaultPrevented && e.stopped);
  assert.equal(b.clicks, 1);
  b.mode("idle");
  b.opts.onText("hello");
  assert.deepEqual(a2.sent, ["[Image #1]\n\n🎤 voice: hello"], "one message: the draft and the words");
  assert.deepEqual(a.sent, []);
});

test("the words come back while the owner is in another chat: they go to the recording's chat with its draft, not the open one", () => {
  const scene = setup();
  open(scene, "#/s/a", "[Image #1]");
  const b = scene.buttons[0];
  b.mode("busy");
  scene.vt.sweep();
  const a = scene.forms[0];
  const other = open(scene, "#/s/b", "someone else's draft");
  b.mode("idle");
  b.opts.onText("hello");
  assert.deepEqual(a.sent, ["[Image #1]\n\n🎤 voice: hello"]);
  assert.deepEqual(other.sent, []);
  assert.equal(other.ta.value, "someone else's draft");
  assert.equal(scene.banner, undefined);
});

test("sending the draft while its recording runs or is recognised stops it instead (one message later)", () => {
  const scene = setup();
  const a = open(scene, "#/s/a", "draft");
  const b = scene.buttons[0];
  b.mode("rec");
  // the form's own submit (the send button)
  a.requestSubmit();
  assert.deepEqual(a.sent, [], "the draft did not go alone");
  assert.equal(b.clicks, 1, "the recording was stopped");
  // ⌘Enter, and a held Enter's repeats: taken, no second stop
  scene.active = a.ta;
  assert.equal(scene.vt.enter(event("keydown", a.ta, { key: "Enter", metaKey: true })), true);
  assert.equal(scene.vt.enter(event("keydown", a.ta, { key: "Enter", repeat: true })), true);
  assert.equal(b.clicks, 2);
  // recognising: Enter waits for the words
  b.mode("busy");
  assert.equal(scene.vt.enter(event("keydown", a.ta, { key: "Enter" })), true);
  assert.equal(b.clicks, 2);
  // Shift+Enter is a new line; no recording — Enter is the core's
  assert.equal(scene.vt.enter(event("keydown", a.ta, { key: "Enter", shiftKey: true })), false);
  b.mode("idle");
  assert.equal(scene.vt.enter(event("keydown", a.ta, { key: "Enter" })), false);
  a.requestSubmit();
  assert.deepEqual(a.sent, ["draft"]);
});

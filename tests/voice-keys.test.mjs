// Клавиши записи голоса в main.js: Enter — остановить и отправить, двойной Esc — отмена, одиночный Esc — запись не трогает.
// Запуск: node --test tests/. Ядра и браузера нет: main.js грузится на заглушках документа, а нажатия идут в
// единственный keydown-слушатель на window (фаза перехвата) — так, как их увидело бы ядро после плагина.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const MAIN = pathToFileURL(path.join(import.meta.dirname, "..", "main.js")).href;

// Узел с теми методами, что нужны main.js на загрузке и слушателю клавиш.
const node = (tag = "div", o = {}) => ({
  tag, dataset: {}, style: {}, children: [], attrs: {},
  classList: { contains: () => false, toggle() {}, add() {}, remove() {} },
  querySelector: () => null, querySelectorAll: () => [], closest: () => null, matches: () => false,
  setAttribute() {}, removeAttribute() {}, append() {}, remove() {}, addEventListener() {},
  ...o,
});

// The core's record strip as voice.js recStrip() builds it (core 1.7.0): the same children and classes, no button text.
// recording: dot, clock [data-rec-clock], spacer, round cancel ×; hold: plus a hint before ×; opening the mic: spinner,
// label, spacer, ×; recognising (busy): spinner and label only.
const el = (tag, cls = "", attrs = {}) => ({ tag, cls: cls.split(" ").filter(Boolean), attrs });
const STRIPS = {
  recording: () => [el("span", "rec-dot"), el("span", "t", { "data-rec-clock": "1" }), el("span", "spacer"), el("button", "btn round quiet rec-cancel")],
  hold: () => [el("span", "rec-dot"), el("span", "t", { "data-rec-clock": "1" }), el("span", "spacer"), el("span", "hint"), el("button", "btn round quiet rec-cancel")],
  opening: () => [el("span", "spin-dot"), el("span", "t"), el("span", "spacer"), el("button", "btn round quiet rec-cancel")],
  busy: () => [el("span", "spin-dot"), el("span", "t")],
};
// A compound selector (tag, .class, [attr], [attr="v"]) and comma lists — enough for queries inside the strip.
const matches = (n, sel) => sel.split(",").some((one) => {
  const parts = one.trim().match(/^[a-z]+|\.[\w-]+|\[[^\]]+\]/g) || [];
  if (parts.join("") !== one.trim()) throw new Error("unsupported selector in strip: " + one);
  return parts.every((p) => {
    if (p[0] === ".") return n.cls.includes(p.slice(1));
    if (p[0] === "[") { const [k, v] = p.slice(1, -1).split("="); return k in n.attrs && (v === undefined || n.attrs[k] === v.replace(/"/g, "")); }
    return n.tag === p;
  });
});

// The core's strip and stop, or the theme's own over a draft (voicetext.js): one query each
const STRIP_Q = "form.composer.rec .recstrip, form.composer.clean-vt-rec .recstrip";
const STOP_Q = "form.composer.rec .bar > .btn.round.stop, form.composer.clean-vt-rec .bar > .spacer > .btn.round.stop";

// Сцена: идёт ли запись, какое поле в фокусе, сколько раз нажали стоп.
async function scene({ theme = true, rec = "recording", focus = null, stopButton = true } = {}) {
  const s = { stops: 0, listeners: [], theme };
  const kids = rec ? STRIPS[rec]() : [];
  const strip = node("div", { querySelector: (q) => kids.find((k) => matches(k, q)) || null });
  const stop = node("button", { click: () => { s.stops++; } });
  const body = node("body");
  const root = node("html", { classList: { contains: (c) => c === "th-clean" && s.theme, toggle() {}, add() {}, remove() {} } });
  s.setFocus = (f) => { doc.activeElement = f; };
  const doc = {
    documentElement: root, body, activeElement: focus || body, readyState: "complete",
    querySelector: (q) => (q === STRIP_Q ? (rec ? strip : null) : q === STOP_Q ? (stopButton && rec && rec !== "busy" ? stop : null) : null),
    querySelectorAll: () => [], getElementById: () => null, createElement: (t) => node(t), addEventListener() {},
    head: node("head"),
  };
  Object.assign(globalThis, {
    document: doc, localStorage: { getItem: () => null, setItem() {} },
    addEventListener: (type, fn, opt) => { s.listeners.push({ type, fn, opt }); },
    removeEventListener() {}, requestAnimationFrame: (f) => f(), innerWidth: 1440, innerHeight: 900,
    MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "" }), matchMedia: () => ({ matches: false, addEventListener() {} }),
    setInterval: () => 0, CSS: { escape: (x) => x },
  });
  const mod = await import(MAIN + "?s=" + Math.random());
  await mod.default({ addStyle() {}, addSlot() {}, addOptions() {}, addOrder() {}, option: () => false, el: (t) => node(t), t: (k) => k, snapshot: () => ({}), redraw() {}, locale: "ru",
    capabilities: { dictate: 1 }, dictate: () => node("button"), banner() {}, icon: () => node("svg") });
  const keys = s.listeners.filter((l) => l.type === "keydown");
  s.keys = keys;
  // нажатие: возвращает, что с ним сделал плагин
  let t = 1000;
  s.press = (key, o = {}) => {
    t += o.after ?? 1000;
    const e = { key, timeStamp: t, repeat: false, isComposing: false, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...o,
      defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
    for (const l of keys) l.fn(e);
    return e;
  };
  return s;
}

test("один постоянный слушатель клавиш, в фазе перехвата", async () => {
  const s = await scene();
  assert.equal(s.keys.length, 1);
  assert.equal(s.keys[0].opt, true);
});

test("Enter во время записи нажимает стоп один раз и гасит клавишу", async () => {
  const s = await scene();
  const e = s.press("Enter");
  assert.equal(s.stops, 1);
  assert.ok(e.defaultPrevented && e.stopped);
  const again = s.press("Enter", { after: 100 });   // дубль, пока полоска не сменилась
  assert.equal(s.stops, 1);
  assert.ok(!again.defaultPrevented);
});

test("Enter вне записи, без темы, при открытии микрофона и распознавании ничего не делает", async () => {
  for (const o of [{ rec: null }, { theme: false }, { rec: "opening" }, { rec: "busy" }]) {
    const s = await scene(o);
    const e = s.press("Enter");
    assert.equal(s.stops, 0, JSON.stringify(o));
    assert.ok(!e.defaultPrevented && !e.stopped, JSON.stringify(o));
  }
});

test("Enter с модификатором, повтором и в постороннем поле не трогаем", async () => {
  const s = await scene();
  for (const o of [{ shiftKey: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { repeat: true }, { isComposing: true }]) {
    const e = s.press("Enter", o);
    assert.ok(!e.defaultPrevented, JSON.stringify(o));
  }
  const other = node("input", { matches: (q) => q.includes("input") });
  s.setFocus(other);
  assert.ok(!s.press("Enter").defaultPrevented);
  const dlg = node("button", { matches: () => true, closest: (q) => (q.includes("dialog") ? {} : null) });
  s.setFocus(dlg);
  assert.ok(!s.press("Enter").defaultPrevented);
  assert.equal(s.stops, 0);
});

test("Enter в поле ввода «Разговора» и на стоп-кнопке работает", async () => {
  for (const tag of ["textarea", "button"]) {
    const s = await scene();
    s.setFocus(node(tag, { matches: () => true }));   // подходит и под «поле/кнопка», и под «свои» — композер и стоп записи
    assert.ok(s.press("Enter").defaultPrevented, tag);
    assert.equal(s.stops, 1, tag);
  }
});

test("одиночный Esc не доходит до ядра, пауза между Esc сбрасывает пару", async () => {
  const s = await scene();
  const a = s.press("Escape");
  assert.ok(a.stopped && !a.defaultPrevented);   // глотается без preventDefault
  const b = s.press("Escape", { after: 1000 });
  assert.ok(b.stopped, "через секунду — снова одиночный");
  const c = s.press("Escape", { after: 600 });
  assert.ok(c.stopped, "через 0,6 с — не пара");
});

test("двойной Esc быстрее 0,4 с пропускает второй Esc ядру; третий Esc сразу — глотается", async () => {
  const s = await scene();
  assert.ok(s.press("Escape").stopped);
  const second = s.press("Escape", { after: 300 });
  assert.ok(!second.stopped && !second.defaultPrevented, "ядро получает второй Esc и отменяет");
  const third = s.press("Escape", { after: 100 });
  assert.ok(third.stopped, "отмена уже ушла, полоска ещё не сменилась");
  const later = s.press("Escape", { after: 1500 });   // новая запись
  assert.ok(later.stopped);
  assert.ok(!s.press("Escape", { after: 200 }).stopped, "после паузы пара снова работает");
});

test("удержание Esc — не второе нажатие", async () => {
  const s = await scene();
  s.press("Escape");
  const held = s.press("Escape", { after: 100, repeat: true });
  assert.ok(held.stopped);
});

test("Esc вне записи, без темы и при распознавании идёт ядру и страницам как раньше", async () => {
  for (const o of [{ rec: null }, { theme: false }, { rec: "busy" }]) {
    const s = await scene(o);
    const e = s.press("Escape");
    assert.ok(!e.stopped && !e.defaultPrevented, JSON.stringify(o));
    const e2 = s.press("Escape", { after: 100 });
    assert.ok(!e2.stopped, JSON.stringify(o));
  }
});

test("одиночный Esc глотается и при открытии микрофона, и при удержании кнопки", async () => {
  for (const rec of ["opening", "hold"]) {
    const s = await scene({ rec });
    assert.ok(s.press("Escape").stopped, rec);
    assert.ok(!s.press("Escape", { after: 200 }).stopped, rec + ": второй Esc — ядру");
  }
});

test("Enter при удержании кнопки записи останавливает и отправляет", async () => {
  const s = await scene({ rec: "hold" });
  assert.ok(s.press("Enter").defaultPrevented);
  assert.equal(s.stops, 1);
});

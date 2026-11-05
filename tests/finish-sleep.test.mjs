// The thread's ⋯ menu (main.js finishItem): the core's sleep item and its confirm dialog read «Finish and sleep» in ru, en, es;
// any other hub language keeps the core's words. Browserless: main.js loads on stub nodes, the sweep renames the rendered
// item, and a click runs the core's handler first (it fills #confirm-dlg, as dialogs.js confirmDlg does), then the plugin's.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const MAIN = pathToFileURL(path.join(import.meta.dirname, "..", "main.js")).href;

// The core's strings (i18n/<lang>.json), the ones the sleep item and dialog use.
const CORE = {
  en: { "web.main.sleep": "Put to sleep", "web.dialogs.sleep_title": "Put {name} to sleep?", "web.dialogs.sleep_ok": "Put to sleep", "web.main.stop": "Stop" },
  ru: { "web.main.sleep": "Усыпить", "web.dialogs.sleep_title": "Усыпить {name}?", "web.dialogs.sleep_ok": "Усыпить", "web.main.stop": "Остановить" },
  es: { "web.main.sleep": "Poner a dormir", "web.dialogs.sleep_title": "¿Poner a dormir a {name}?", "web.dialogs.sleep_ok": "Poner a dormir", "web.main.stop": "Detener" },
  de: { "web.main.sleep": "Schlafen legen", "web.dialogs.sleep_title": "{name} schlafen legen?", "web.dialogs.sleep_ok": "Schlafen legen", "web.main.stop": "Stoppen" },
  fr: { "web.main.sleep": "Mettre en veille", "web.dialogs.sleep_title": "Mettre {name} en veille ?", "web.dialogs.sleep_ok": "Mettre en veille", "web.main.stop": "Arrêter" },
};
const fill = (s, p = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m));

const node = (tag = "div", o = {}) => ({
  tag, dataset: {}, style: {}, children: [], attrs: {}, textContent: "",
  classList: { contains: () => false, toggle() {}, add() {}, remove() {} },
  querySelector: () => null, querySelectorAll: () => [], closest: () => null, matches: () => false,
  setAttribute() {}, removeAttribute() {}, append() {}, remove() {}, addEventListener() {},
  ...o,
});

// A rendered thread menu: the core builds each item with its own click listener (menu.js: close the menu, run onClick),
// so the core's listener always runs before any listener the plugin adds later.
async function scene({ lang, locale = lang, name = "codex-ops" }) {
  const S = CORE[lang];
  const t = (k, p) => (k in S ? fill(S[k], p) : k);
  const dialog = { open: false, title: node("h3"), text: node("p"), ok: node("button") };
  const confirmDlg = (title, text, ok) => { dialog.title.textContent = title; dialog.text.textContent = text; dialog.ok.textContent = ok; dialog.open = true; };
  const item = (label, onClick) => {
    const ls = [];
    const b = node("button", { textContent: label, addEventListener: (type, fn) => { if (type === "click") ls.push(fn); } });
    b.addEventListener("click", () => onClick());
    b.click = () => { for (const fn of [...ls]) fn({}); };
    b.listeners = ls;
    return b;
  };
  const items = [
    item(t("web.main.stop"), () => confirmDlg(`${t("web.main.stop")} ${name}?`, "", t("web.main.stop"))),
    item(t("web.main.sleep"), () => confirmDlg(t("web.dialogs.sleep_title", { name }), "", t("web.dialogs.sleep_ok"))),
  ];
  const menu = node("div", { querySelectorAll: (q) => (q === ":scope > .menu-item" ? items : []) });
  const root = node("html", { classList: { contains: (c) => c === "th-clean", toggle() {}, add() {}, remove() {} } });
  const doc = {
    documentElement: root, body: node("body"), activeElement: null, readyState: "complete", head: node("head"),
    querySelector: (q) => (q === "main > .head .menu-wrap > .menu" ? menu : null),
    querySelectorAll: () => [], createElement: (x) => node(x), addEventListener() {},
    getElementById: (id) => ({ "confirm-title": dialog.title, "confirm-text": dialog.text, "confirm-ok": dialog.ok })[id] || null,
  };
  const redraws = [];
  Object.assign(globalThis, {
    document: doc, localStorage: { getItem: () => null, setItem() {} },
    addEventListener: (type, fn) => { if (type === "hub-redraw") redraws.push(fn); }, removeEventListener() {},
    requestAnimationFrame: (f) => f(), innerWidth: 1440, innerHeight: 900,
    MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "" }), matchMedia: () => ({ matches: false, addEventListener() {} }),
    setInterval: () => 0, CSS: { escape: (x) => x },
  });
  const mod = await import(MAIN + "?s=" + Math.random());
  await mod.default({ addStyle() {}, addSlot() {}, addOptions() {}, addOrder() {}, option: () => false, el: (x) => node(x), t, snapshot: () => ({}), redraw() {}, lang, locale });
  return { items, dialog, sweep: () => redraws.forEach((f) => f()) };
}

const WANT = {
  ru: { item: "Закончить и усыпить", title: "Закончить и усыпить codex-ops?", ok: "Закончить" },
  en: { item: "Finish and sleep", title: "Finish and sleep codex-ops?", ok: "Finish" },
  es: { item: "Terminar y dormir", title: "¿Terminar y dormir a codex-ops?", ok: "Terminar" },
};

for (const [lang, w] of Object.entries(WANT)) {
  test(`${lang}: the rendered item and its confirm dialog say «${w.item}»`, async () => {
    const s = await scene({ lang });
    const sleep = s.items[1];
    assert.equal(sleep.textContent, w.item);
    sleep.click();
    assert.ok(s.dialog.open, "the core's action still opens its dialog");
    assert.equal(s.dialog.title.textContent, w.title);
    assert.equal(s.dialog.ok.textContent, w.ok);
  });
}

test("en is in sentence case: only the first word is capitalised", async () => {
  const s = await scene({ lang: "en" });
  s.items[1].click();
  for (const text of [s.items[1].textContent, s.dialog.ok.textContent, s.dialog.title.textContent.replace(" codex-ops?", "")]) {
    assert.equal(text, text[0] + text.slice(1).toLowerCase(), text);
  }
});

for (const [lang, locale] of [["de", "de-DE"], ["fr", "fr-FR"], ["de", "ru-RU"]]) {
  test(`hub language ${lang} (locale ${locale}): the core's item and dialog stay as they are`, async () => {
    const s = await scene({ lang, locale });
    const S = CORE[lang];
    assert.equal(s.items[1].textContent, S["web.main.sleep"]);
    s.items[1].click();
    assert.equal(s.dialog.title.textContent, fill(S["web.dialogs.sleep_title"], { name: "codex-ops" }));
    assert.equal(s.dialog.ok.textContent, S["web.dialogs.sleep_ok"]);
  });
}

test("one item, the same action: nothing added, other items and other questions in the shared dialog untouched", async () => {
  const s = await scene({ lang: "en" });
  assert.equal(s.items.length, 2);
  assert.equal(s.items[0].textContent, "Stop");
  s.items[0].click();
  assert.equal(s.dialog.title.textContent, "Stop codex-ops?");
  assert.equal(s.dialog.ok.textContent, "Stop");
});

test("repeated sweeps keep one plugin listener on the item", async () => {
  const s = await scene({ lang: "ru" });
  s.sweep(); s.sweep();
  assert.equal(s.items[1].textContent, "Закончить и усыпить");
  assert.equal(s.items[1].listeners.length, 2, "the core's listener and one of the plugin's");
});

test("a session name that looks like part of the question is kept whole", async () => {
  const s = await scene({ lang: "en", name: "Put to sleep?" });
  s.items[1].click();
  assert.equal(s.dialog.title.textContent, "Finish and sleep Put to sleep??");
});

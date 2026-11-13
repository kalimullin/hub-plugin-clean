// «Ответить» у своего сообщения и у ответа на карточку (ядро рисует ту же кнопку): у своего пузыря она вне его, слева у
// верхнего угла — не на времени и не на тексте; у ответа на карточку — сразу после строки.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "clean.css"), "utf8");
const rule = (sel) => {
  const out = [];
  for (let i = css.indexOf(sel + " {"); i >= 0; i = css.indexOf(sel + " {", i + 1)) {
    if (i === 0 || "\n ".includes(css[i - 1])) out.push(css.slice(i, css.indexOf("}", i)));
  }
  assert.ok(out.length, sel);
  return out.join("\n");
};

test("у своего пузыря кнопка вне его, слева у верхнего угла", () => {
  assert.match(rule("html.th-clean .row.mine > .b > .reply-btn"), /right: calc\(100% \+ 4px\)/);
  assert.match(css, /html\.th-clean \.row\.mine > \.b \{ position: relative;/);
});

test("у ответа на карточку кнопка сразу после строки", () => {
  const b = rule("html.th-clean .row.answer > .b");
  assert.match(b, /position: relative/);
  assert.match(b, /justify-self: start/);
});

test("the quote mark in a sent bubble is the speech cloud in both sets; the Reply action is the arrow", () => {
  const d = (f) => fs.readFileSync(path.join(root, f), "utf8").match(/ d="([^"]+)"/)[1];
  assert.equal(d("i/quote.svg"), d("id/quote.svg"));
  assert.equal(d("i/reply.svg"), d("id/reply.svg"));
  assert.equal(d("i/reply.svg"), d("reply.svg"));
  assert.notEqual(d("i/quote.svg"), d("i/reply.svg"));
  const icons = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")).icons;
  assert.equal(icons("clean.json").quote, "i/quote.svg");
  assert.equal(icons("clean-dark.json").quote, "id/quote.svg");
  const items = icons("icons8.json").items;
  assert.equal(items.quote.commonName, "response");
  assert.equal(items.reply.commonName, "undo");
});

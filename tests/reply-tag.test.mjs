// Мягкий тег наблюдателя «ответ?» в подробном списке: он встаёт на место статуса (нижняя строка), а не на место времени,
// поэтому не закрывает время справа сверху; имя не теряет места. Та же правка, что во встроенной Clean ядра.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");
const detail = css.split("\n").filter((l) => l.startsWith("html.th-clean.th-clean-detail #list .srow[data-clean-d]"));

test("every status rule of the detailed list counts the soft tag too", () => {
  const status = detail.filter((l) => /\.dot, \.tag|\.glyph, \.dot, \.tag/.test(l));
  assert.ok(status.length >= 3, "the rules that move the time and the name for a status");
  for (const l of status) assert.doesNotMatch(l, /\.tag:not\(\.soft\)/, "a status rule skips the soft tag: " + l);
});

test("on two lines the tag goes to the bottom line and the name loses no room to the time", () => {
  assert.ok(detail.some((l) => /\[data-clean-two\] > :is\(\.glyph, \.dot, \.tag\) \{[^}]*align-self: end/.test(l)));
  assert.ok(detail.some((l) => /\[data-clean-two\]:has\(> \.tag\.soft\) \.nm \{ margin-right: 0; \}/.test(l)));
});

test("on one line the time gives way to the tag instead of lying under it", () => {
  assert.ok(detail.some((l) => /:not\(\[data-clean-two\]\):has\(> \.tag\.soft\)::before \{ content: none; \}/.test(l)));
});

// The thread's ⋯ menu (main.js moreItems): «Model: …», «Detail: …» and «Finish and Sleep». Browserless: checks the text of main.js.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const js = fs.readFileSync(path.join(import.meta.dirname, "..", "main.js"), "utf8");

test("the menu items come in ru, en and es", () => {
  const more = js.match(/const MORE = \{([\s\S]*?)\};/)[1];
  for (const lang of ["ru", "en", "es"]) assert.match(more, new RegExp(`${lang}: \\{ model: "[^"]+", detail: "[^"]+", finish: "[^"]+" \\}`));
  assert.match(more, /finish: "Finish and Sleep"/);
  assert.match(more, /finish: "Закончить и усыпить"/);
  assert.match(more, /detail: "Detail"/);
});

test("the core's «Put to sleep» item is renamed, not duplicated: one item, the same action", () => {
  assert.match(js, /T\("web\.main\.sleep", ""\)/);
  assert.match(js, /b\.textContent = w\.finish/);
  assert.doesNotMatch(js, /api\/session\/close/, "the plugin does not call the close endpoint itself");
});

test("the items are inserted idempotently into the menu and run from the sweep", () => {
  assert.match(js, /if \(menu\.querySelector\("\.clean-more-i"\)\) return;/);
  assert.match(js, /queuePlate\(\); headFold\(\); moreItems\(\);/);
});

test("«Brief | Detailed» is one «Detail» item, headFold keeps only «Feed | Board»", () => {
  assert.match(js, /for \(const cls of \["clean-board"\]\)/);
  assert.match(js, /\$\{w\.detail\}: /);
});

test("the model item clicks the core's model button, re-queried at click time", () => {
  assert.match(js, /\.dock \.stat-mod > \.menu-btn/);
  assert.match(js, /\(\) => modelBtn\(\)\?\.click\(\)/);
});

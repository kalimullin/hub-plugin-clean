// tools/chat-icons.py: the local map «chat → Forma icon». Browserless: runs the script in a temporary folder.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tool = path.join(import.meta.dirname, "..", "tools", "chat-icons.py");
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M 2 2 L 22 22 z"/></svg>';
const run = (dir, args, input) => spawnSync("python3", ["-I", tool, "--dir", dir, ...args], { input, encoding: "utf8" });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "chat-icons-"));

test("add puts the SVG and the name into the map; word does the same for a word", () => {
  const d = tmp();
  assert.equal(run(d, ["add", "my-direction", "-", "--as", "Test Tube"], SVG).status, 0);
  assert.equal(run(d, ["word", "Design", path.join(d, "test-tube.svg"), "--as", "palette"]).status, 0);
  const m = JSON.parse(fs.readFileSync(path.join(d, "map.json"), "utf8"));
  assert.deepEqual(m.names, { "my-direction": "test-tube.svg" });
  assert.deepEqual(m.words, { design: "palette.svg" });
  assert.equal(fs.readFileSync(path.join(d, "test-tube.svg"), "utf8").trim(), SVG);
});

test("the MCP answer {\"svg\": ...} is taken as is; an empty one (a wrong id) is refused", () => {
  const d = tmp();
  assert.equal(run(d, ["add", "a", "-"], JSON.stringify({ svg: SVG })).status, 0);
  const bad = run(d, ["add", "b", "-"], JSON.stringify({ svg: "" }));
  assert.notEqual(bad.status, 0);
  assert.ok(!fs.existsSync(path.join(d, "b.svg")));
});

test("SVGs with scripts, handlers, images or links are refused (the file is served from the page's origin)", () => {
  const d = tmp();
  for (const evil of ['<svg onload="x()"></svg>', "<svg><script>1</script></svg>", '<svg><image href="http://x/y.png"/></svg>', '<svg><a href="javascript:1"/></svg>'])
    assert.notEqual(run(d, ["add", "e", "-"], evil).status, 0, evil);
  assert.ok(!fs.existsSync(path.join(d, "map.json")));
});

test("remove takes the rule out; an unknown one is an error", () => {
  const d = tmp();
  run(d, ["add", "x", "-"], SVG);
  assert.equal(run(d, ["remove", "x"]).status, 0);
  assert.deepEqual(JSON.parse(run(d, ["list"]).stdout).names, {});
  assert.notEqual(run(d, ["remove", "x"]).status, 0);
});

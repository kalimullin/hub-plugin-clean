// One left edge for the side column: search, session rows, ☰, the limits row and module tiles all start --aside-field (16, as on
// iPhone) from the column's edge, on the desktop and on the phone. Run: node --test tests/. No browser: clean.css is read as text and
// split into rules; a literal horizontal offset on any of these rows (or a phone rule that moves them) breaks the single line.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "clean.css"), "utf8");

// rules as { sel, media, decl: Map } — one level of @media is enough for clean.css
function rules(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  const walk = (s, media) => {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf("{", i);
      if (open < 0) break;
      const head = s.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < s.length && depth) { if (s[j] === "{") depth++; else if (s[j] === "}") depth--; j++; }
      const body = s.slice(open + 1, j - 1);
      if (head.startsWith("@media")) walk(body, head);
      else if (!head.startsWith("@")) {
        const decl = new Map();
        for (const d of body.split(";")) {
          const k = d.indexOf(":");
          if (k > 0) decl.set(d.slice(0, k).trim(), d.slice(k + 1).replace(/!important/, "").trim());
        }
        for (const sel of head.split(/,(?![^(]*\))/)) out.push({ sel: sel.trim().replace(/\s+/g, " "), media, decl });
      }
      i = j;
    }
  };
  walk(src, null);
  return out;
}
const all = rules(css);
const ANY = Symbol("any media");
const find = (sel, media = null) => all.filter((r) => r.sel === sel && (media === ANY || r.media === media));
const phone = (r) => r.media && /max-width:\s*760px/.test(r.media);

// horizontal values of the shorthand: [left, right]
function sides(v) {
  const p = [""];
  let depth = 0;
  for (const ch of v.trim()) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && !depth) { if (p.at(-1)) p.push(""); } else p[p.length - 1] += ch;
  }
  const right = p.length === 1 ? p[0] : p[1];
  const left = p.length === 4 ? p[3] : right;
  return [left, right];
}

test("the column has no padding of its own: the field is one variable, 16", () => {
  const [aside] = find("html.th-clean aside");
  assert.ok(aside, "clean.css styles the column");
  assert.equal(aside.decl.get("--aside-field"), "16px");
  assert.deepEqual(sides(aside.decl.get("padding")), ["0", "0"], "the column keeps no inline padding — rows take the field");
  for (const r of all.filter((r) => r.sel === "html.th-clean aside" && phone(r)))
    for (const k of ["padding", "padding-left", "padding-right", "padding-inline"])
      assert.ok(!r.decl.has(k), `the phone rule must not move the column's edge (${k}: ${r.decl.get(k)})`);
});

test("search, tabs and the list start at --aside-field on both sides", () => {
  for (const [sel, prop] of [["html.th-clean .search-row", "padding"], ["html.th-clean .list", "padding"], ["html.th-clean .active-bar", "margin"]]) {
    const [r] = find(sel);
    assert.ok(r, `${sel} is styled`);
    assert.deepEqual(sides(r.decl.get(prop)), ["var(--aside-field)", "var(--aside-field)"], `${sel} ${prop}`);
  }
});

test("☰ and its menu sit on the same line on the desktop and the phone", () => {
  const [menu] = find("html.th-clean .navmenu");
  assert.equal(menu.decl.get("left"), "var(--aside-field)");
  const [pop] = find("html.th-clean .nav-pop");
  assert.equal(pop.decl.get("left"), "var(--aside-field)");
  assert.equal(pop.decl.get("right"), "var(--aside-field)");
  for (const sel of ["html.th-clean .navmenu", "html.th-clean .nav-pop"])
    for (const r of find(sel, ANY).filter(phone))
      assert.ok(!r.decl.has("left") && !r.decl.has("right"), `${sel}: the phone keeps the column's edge`);
});

test("the limits row: right edge at the field, left edge after ☰ of its real width", () => {
  const [foot] = find("html.th-clean .aside-foot");
  const [left, right] = sides(foot.decl.get("padding"));
  assert.equal(right, "var(--aside-field)");
  assert.match(left, /^calc\(var\(--aside-field\) \+ var\(--menu-w\) \+ \d+px\)$/);
  assert.equal(foot.decl.get("--menu-w"), find("html.th-clean .navmenu")[0].decl.get("width"), "the desktop ☰ width");
  const phoneFoot = find("html.th-clean .aside-foot", ANY).filter(phone);
  const phoneMenu = find("html.th-clean .navmenu", ANY).filter(phone);
  assert.equal(phoneFoot.at(-1).decl.get("--menu-w"), phoneMenu.at(-1).decl.get("width"), "the phone ☰ width");
  for (const r of phoneFoot) assert.ok(!r.decl.has("padding-left") && !r.decl.has("padding"), "no literal left on the phone");
});

test("no row of the column carries a literal left offset anywhere", () => {
  const rows = [".search-row", ".list", ".active-bar", ".navmenu", ".nav-pop", ".aside-foot"].map((s) => `html.th-clean ${s}`);
  for (const r of all.filter((r) => rows.includes(r.sel)))
    for (const k of ["left", "padding-left", "margin-left", "padding-inline", "margin-inline", "padding-inline-start", "margin-inline-start"])
      if (r.decl.has(k)) assert.match(r.decl.get(k), /var\(--aside-field\)/, `${r.sel} ${k} in ${r.media || "base"}`);
});

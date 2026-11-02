// «Подробный» список сессий (main.js rowDetail): чистые части — что и откуда берётся из снимка, чтобы проверять без браузера.
// Данные — только те, что ядро уже отдаёт: cwd, since, state. Ветки в снимке нет, «папка» — рабочая копия .claude/worktrees/<имя>.

// подпись времени: работает — «сейчас» (since у такой сессии — начало хода, а не последняя активность); иначе — сколько прошло
export const AGO = { ru: { now: "сейчас", m: "м", h: "ч", d: "д" }, en: { now: "now", m: "m", h: "h", d: "d" } };
export function agoText(s, now, words = AGO.en) {
  if (s.state === "busy" || s.state === "starting") return words.now;
  const sec = Math.max(0, now - (s.since || now));
  if (sec < 60) return words.now;
  return sec < 3600 ? Math.floor(sec / 60) + words.m : sec < 86400 ? Math.floor(sec / 3600) + words.h : Math.floor(sec / 86400) + words.d;
}

// …/<проект>/.claude/worktrees/<папка> → [проект, папка]; иначе [последняя папка пути, ""]
export function whereOf(cwd) {
  const segs = String(cwd || "").split("/").filter(Boolean), i = segs.lastIndexOf("worktrees");
  if (i >= 2 && segs[i - 1] === ".claude" && segs[i + 1]) return [segs[i - 2], segs[i + 1]];
  return [segs[segs.length - 1] || "", ""];
}

// сессия строки по имени в ней: имя исполнителя под родителем ядро показывает без префикса (maps-dev-api → api)
export function sessionFor(name, list) {
  if (!name) return null;
  const exact = list.find((s) => s.name === name);
  if (exact) return exact;
  const tails = list.filter((s) => s.name.endsWith("-" + name));
  return tails.length === 1 ? tails[0] : null;
}

// что рисовать в строке: проект, папка (нет, если названа как сессия — повтор), время, полный путь для подсказки; null — строка остаётся компактной
export function detailOf(s, now, words) {
  if (!s || s.kind === "hub") return null;
  const [proj, folder] = whereOf(s.cwd);
  return { proj, sub: folder === s.name ? "" : folder, ago: agoText(s, now, words), cwd: s.cwd || "" };
}

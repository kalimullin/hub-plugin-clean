// «Подробный» список сессий (main.js rowDetail): чистые части — что и откуда берётся из снимка, чтобы проверять без браузера.
// Данные — только те, что ядро уже отдаёт в снимке сессий: out_head (начало последнего ответа; нет — gist.text), since, state, cwd (для подсказки).

// подпись времени: работает — «сейчас» (since у такой сессии — начало хода, а не последняя активность); иначе — сколько прошло
export const AGO = { ru: { now: "сейчас", m: "м", h: "ч", d: "д" }, en: { now: "now", m: "m", h: "h", d: "d" } };
export function agoText(s, now, words = AGO.en) {
  if (s.state === "busy" || s.state === "starting") return words.now;
  const sec = Math.max(0, now - (s.since || now));
  if (sec < 60) return words.now;
  return sec < 3600 ? Math.floor(sec / 60) + words.m : sec < 86400 ? Math.floor(sec / 3600) + words.h : Math.floor(sec / 86400) + words.d;
}

// превью последнего сообщения: ядро отдаёт начало ответа сессии в `out_head` (≈160 знаков, переводы строк уже пробелами; у исполнителей,
// не писавших в чат, его нет — тогда `gist.text`, суть хода) —
// разметку убираем, получается плоский текст для одной строки; пусто — второй строки нет
export function flat(text, max = 120) {
  const t = String(text || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")          // картинка
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")          // ссылка → её текст
    .replace(/^\s{0,3}(#{1,6}|>)\s*/gm, "")             // заголовок, цитата
    .replace(/```|\*\*|__|~~|`/g, "")                  // код и выделение
    .replace(/(^|\s)[-*•]\s+/g, "$1")                   // маркер списка, склеенный переводом строки в пробел
    .replace(/\s+/g, " ").trim().replace(/^HANDOFF-[A-Z]+:?\s*/, "")   // служебная метка сдачи задачи между сессиями — не текст для списка
    .replace(/[…\s]+$/, "");
  return t.length > max ? t.slice(0, max) : t;
}

// сессия строки по имени в ней: имя исполнителя под родителем ядро показывает без префикса (maps-dev-api → api)
export function sessionFor(name, list) {
  if (!name) return null;
  const exact = list.find((s) => s.name === name);
  if (exact) return exact;
  const tails = list.filter((s) => s.name.endsWith("-" + name));
  return tails.length === 1 ? tails[0] : null;
}

// что рисовать в строке: превью, время, полный путь для подсказки; null — строка остаётся компактной
export function detailOf(s, now, words) {
  if (!s) return null;
  if (s.kind === "hub") return { prev: flat(s.out_head || s.gist?.text), ago: "", cwd: "" };   // «Хаб»: превью как у всех; он всегда на связи — времени нет, подсказка — своя
  return { prev: flat(s.out_head || s.gist?.text), ago: agoText(s, now, words), cwd: s.cwd || "" };
}

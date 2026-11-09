// Пауза по лимиту: сессия упёрлась в окно лимита своего провайдера и ждёт сброса; ядро продолжит ход само.
// Признак session.quota_hold в снимке и запись модуля quota-hold в sessions_extra по имени сессии
// ({quota_hold, hold_mark: {text, since}, until}) — как натив (StatusMark PauseMark, WorkActivity) и web-look.
// Чистые функции без DOM: их проверяет tests/pause.test.mjs.

const obj = (x) => (x && typeof x === "object" ? x : {});
const featureOn = (snap, name) => {
  const f = obj(snap).features;
  return Array.isArray(f) ? f.includes(name) : obj(f)[name] === true;
};

// пауза сессии или null; until — когда продолжит (null — срок неизвестен или уже прошёл, тогда «На паузе»)
export function holdOf(snap, session, now = Date.now() / 1000) {
  const s = obj(session);
  if (!s.name) return null;
  const e = featureOn(snap, "session.quota_hold") ? obj(obj(obj(snap).sessions_extra)[s.name]) : {};
  const held = e.quota_hold === true || (e.quota_hold === undefined && typeof e.hold_mark === "object" && !!e.hold_mark);
  const rec = held ? e : s.quota_hold === true ? s : null;
  if (!rec) return null;
  return { until: Number.isFinite(rec.until) && rec.until > now ? rec.until : null };
}

// слова натива (L10n status.paused*, session.paused, tomorrow)
const WORDS = {
  ru: { why: "пауза: окно лимита кончилось", at: "Продолжит в {0}", on: "Продолжит {0}", paused: "На паузе", tomorrow: "завтра", loc: "ru-RU" },
  en: { why: "paused: limit window is out", at: "Resumes at {0}", on: "Resumes {0}", paused: "Paused", tomorrow: "tomorrow", loc: "en-GB" },
  es: { why: "en pausa: se acabó la ventana del límite", at: "Continúa a las {0}", on: "Continúa {0}", paused: "En pausa", tomorrow: "mañana", loc: "es-ES" },
};
export const wordsFor = (lang) => WORDS[String(lang || "").toLowerCase().split(/[-_]/)[0]] || WORDS.en;

// срок — как натив When.exact, 24 часа: сегодня «03:00», завтра «завтра 03:00», в пределах недели «четверг 09:05», дальше «12 нояб. 17:03»
export function pauseText(lang, until, now = Date.now() / 1000) {
  const w = wordsFor(lang);
  if (!(Number.isFinite(until) && until > now)) return w.paused;
  const d = new Date(until * 1000), n = new Date(now * 1000);
  const time = d.toLocaleTimeString(w.loc, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(d) - day(n)) / 86400000);
  if (days === 0) return w.at.replace("{0}", time);
  const when = days === 1 ? `${w.tomorrow} ${time}`
    : days < 7 ? `${d.toLocaleDateString(w.loc, { weekday: "long" })} ${time}`
    : `${d.toLocaleDateString(w.loc, { day: "numeric", month: "short", ...(d.getFullYear() === n.getFullYear() ? {} : { year: "numeric" }) })} ${time}`;
  return w.on.replace("{0}", when);
}

// «Opus 5.5 High»: что идёт сейчас (doing), иначе выбранное у сессии; имя из каталога хаба (model_names), иначе как есть; усилие — с заглавной
export function modelLabel(snap, session) {
  const s = obj(session), info = obj(s.info), doing = obj(s.doing), names = obj(obj(snap).model_names);
  const model = String(doing.model || info.model || s.model || "");
  const title = model && model !== "default" ? names[model] || names[model.replace(/^claude-/, "")] || model : "";
  const effort = String(doing.effort || s.effort || info.effort || "");
  return [title, effort ? effort[0].toUpperCase() + effort.slice(1) : ""].filter(Boolean).join(" ");
}

// подсказка и имя знака для диктора — как натив: «Opus 5.5 High · пауза: окно лимита кончилось, Продолжит в 03:00»
export function pauseTip(lang, model, until, now = Date.now() / 1000) {
  const w = wordsFor(lang);
  const why = Number.isFinite(until) && until > now ? `${w.why}, ${pauseText(lang, until, now)}` : w.why;
  return [model, why].filter(Boolean).join(" · ");
}

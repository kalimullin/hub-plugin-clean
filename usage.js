// Usage block at the bottom of the sidebar (place sidebar.footer), as in the native app (hub-ios LimitsBlock):
// bars of the "5 hours" and "week" windows with an even-pace mark, the percent on hover or tap, a compact / expanded switch,
// the account e-mail with a check when it is the active one, and a clock with a hint when the reading is old.
// Bar colour: not working or 95%+ — red, 80–95% — orange, below 80% — grey, or yellow in economy (economy never covers red or orange).
// Everything comes from the core snapshot: limits, account, accounts, accounts_live, economy. This file holds the pure part
// (data and words) — main.js draws it; tests/usage-bars.test.mjs runs it without a browser.

export const SPAN = { five_hour: 5 * 3600, seven_day: 7 * 86400 };
export const ORDER = ["five_hour", "seven_day"];
const HOUR = 3600, LINK = 15 * 60;

export const WORDS = {
  ru: {
    five_hour: "5 часов", seven_day: "Неделя", mark: "ровный темп", lapsed: "лимит сброшен, свежего замера нет",
    compact: "Компактно", expanded: "Расширенно", machine: "Логин Mac", active: "активен", soon: "скоро", resets: "сброс",
    pace: "Ровный темп: где был бы расход, если тратить поровну до сброса. Полоска за меткой — ты тратишь быстрее.",
    at: "Замер от %@", broken: "не работает",
    link: "Связи с хабом нет с %@ — показан последний полученный замер. Обновится само, когда связь вернётся.",
    cache: "Это сохранённая копия — хаб с запуска ещё не ответил. Обновится само, когда связь вернётся.",
    auth: "Хаб не может замерить аккаунт: токен не принят. Выдай новый токен на Mac — командой в Терминале.",
    token: "У аккаунта нет токена — хаб его не мерит. Выдай токен на Mac — командой в Терминале.",
    net: "Последний замер не дошёл до Anthropic. Хаб повторит сам через 10 минут.",
    idle: "Аккаунт не активен, а хаб мерит только активный. Обновится, когда хаб на него переключится.",
    rest: "Сессии на этом аккаунте больше часа не работали. Расход обновится со следующим ответом сессии.",
    quiet: "Замеры молчат больше часа — хаб перезапускает их сам.",
  },
  en: {
    five_hour: "5 hours", seven_day: "Week", mark: "even pace", lapsed: "limit reset, no fresh reading",
    compact: "Compact", expanded: "Expanded", machine: "Mac login", active: "active", soon: "soon", resets: "resets",
    pace: "Even pace: where usage would be if spent evenly until the reset. Bar past the mark — you are ahead of it.",
    at: "Measured at %@", broken: "not working",
    link: "No connection to the hub since %@ — showing the last measurement received. It updates by itself once the connection is back.",
    cache: "This is a saved copy — the hub has not answered since launch. It updates by itself once the connection is back.",
    auth: "The hub cannot measure this account: its token is not accepted. Issue a new token on the Mac with a Terminal command.",
    token: "The account has no token, so the hub does not measure it. Issue one on the Mac with a Terminal command.",
    net: "The last measurement did not reach Anthropic. The hub retries by itself in 10 minutes.",
    idle: "The account is not active, and the hub measures only the active one. It updates once the hub switches to it.",
    rest: "No session has run on this account for over an hour. Usage updates with the next session reply.",
    quiet: "Measurements have been silent for over an hour — the hub restarts them by itself.",
  },
  es: {
    five_hour: "5 horas", seven_day: "Semana", mark: "ritmo parejo", lapsed: "límite reiniciado, sin medición reciente",
    compact: "Compacto", expanded: "Ampliado", machine: "Sesión del Mac", active: "activa", soon: "pronto", resets: "se reinicia",
    pace: "Ritmo parejo: dónde estaría el uso si se gastara por igual hasta el reinicio. Barra más allá de la marca: vas por delante.",
    at: "Medición de las %@", broken: "no funciona",
    link: "Sin conexión con el hub desde las %@: se muestra la última medición recibida. Se actualizará sola cuando vuelva la conexión.",
    cache: "Es una copia guardada: el hub aún no respondió desde el inicio. Se actualizará sola cuando vuelva la conexión.",
    auth: "El hub no puede medir la cuenta: el token no es aceptado. Emite un token nuevo en la Mac con un comando de Terminal.",
    token: "La cuenta no tiene token y el hub no la mide. Emítelo en la Mac con un comando de Terminal.",
    net: "La última medición no llegó a Anthropic. El hub reintentará solo en 10 minutos.",
    idle: "La cuenta no está activa y el hub mide solo la activa. Se actualizará cuando el hub cambie a ella.",
    rest: "Ninguna sesión trabajó en esta cuenta por más de una hora. El uso se actualizará con la próxima respuesta.",
    quiet: "Las mediciones llevan más de una hora en silencio: el hub las reinicia solo.",
  },
};

export const langOf = (code) => { const l = String(code || "ru").slice(0, 2).toLowerCase(); return l in WORDS ? l : "en"; };

const clamp = (x) => Math.min(1, Math.max(0, x));

// "resets in 4 hours": days → hours → minutes, rounded to the nearest whole unit; a rounding that reaches the next unit
// moves to it (23 h 40 min → 1 day). Less than a minute — "soon". As When.left in the native app.
export function left(at, now, lang) {
  const s = at - now, w = WORDS[lang];
  if (!(s >= 60)) return w.soon;
  let n, unit;
  if (s >= 86400) { n = Math.round(s / 86400); unit = "day"; }
  else if (s >= HOUR) { n = Math.round(s / HOUR); unit = "hour"; if (n >= 24) { n = 1; unit = "day"; } }
  else { n = Math.round(s / 60); unit = "minute"; if (n >= 60) { n = 1; unit = "hour"; } }
  try { return new Intl.RelativeTimeFormat(lang, { numeric: "always" }).format(n, unit); } catch { return `${n} ${unit}`; }
}

// Account name without an e-mail: "icons8-claude" → "icons8", "token-vph" → "VPH"; empty — the Mac login
export function accountTitle(name, lang) {
  const s = String(name || "").replace(/-claude$/i, "").replace(/^token-/i, "").trim();
  if (!s) return WORDS[lang].machine;
  return s.length <= 3 ? s.toUpperCase() : s;
}

// E-mail labels from the longest to the shortest: the whole address, then without the top-level zone
// ("name@company.example.com" → "name@company.example"); if that does not fit either, CSS cuts the end with "…".
export function emailSteps(email) {
  const at = email.lastIndexOf("@"), dot = email.lastIndexOf(".");
  return dot > at + 1 ? [email, email.slice(0, dot)] : [email];
}

const goodMail = (s) => typeof s === "string" && /^\S{1,100}@\S{1,100}$/.test(s);

// Why the reading is old — as PublicFeed+UsageAge in the native app. The link to the hub goes first.
function ageWhy(live, active, linkDown, sinceSnap) {
  if (sinceSnap == null) return "cache";
  if (linkDown || sinceSnap > LINK) return "link";
  const e = live?.error;
  if (e === "auth") return "auth";
  if (e === "no_token") return "token";
  if (e == null || e === "") return live && !live.stale ? "quiet" : active ? "rest" : "idle";
  return "net";
}

// The block's data from a snapshot, or null when there is nothing to show (no windows at all).
// now and sinceSnap are seconds; sinceSnap — how long ago the last snapshot came (null — none since launch).
export function usageModel(snap, { now, lang = "ru", linkDown = false, sinceSnap = 0 } = {}) {
  const limits = snap?.limits || {}, acc = snap?.account || {}, accounts = snap?.accounts || {};
  const current = limits.account || acc.active || "";
  const live = current ? snap?.accounts_live?.[current] : null;
  const fresh = live && typeof live.measured_at === "number" && live.measured_at >= (limits.ts || 0);
  const src = {};
  for (const id of ORDER) {
    const w = fresh ? live[id] : limits.windows?.[id];
    if (w && typeof w.used === "number") src[id] = { used: w.used, resets: w.resets ?? w.reset ?? null };
  }
  const ids = ORDER.filter((id) => src[id]);
  if (!ids.length) return null;
  const words = WORDS[lang];
  const eco = !!snap?.economy?.on;
  const measured = fresh ? live.measured_at : limits.ts || null;
  // old = the reading itself is old (marked stale, or over an hour) — as PublicFeed.UsageAge.note in the native app; no link
  // or no snapshot for a while only explains why (ageWhy), it does not make a fresh reading old: the stream sends a
  // snapshot only on a hub event, so a quiet hub or a reconnect blip must not pale the bars and claim the link is down
  const old = !!(fresh && live.stale) || (measured != null && now - measured > HOUR);
  // not working: the hub refused the account (limits.status), or — as UsageState.of in the native app — the reading is old
  // and the account's last probe failed on auth or a missing token (the error is read whichever reading is shown)
  const miss = live?.error === "auth" || live?.error === "no_token";
  const broken = limits.status === "rejected" || (old && miss);
  const active = !acc.active || current === acc.active;
  const windows = ids.map((id) => {
    const { used, resets } = src[id];
    const lapsed = typeof resets === "number" && resets <= now;
    const pct = Math.round(clamp(used) * 100);
    const even = typeof resets === "number" && !lapsed ? clamp(1 - (resets - now) / SPAN[id]) : null;
    // colour, red first: not working or 95%+ — red, 80–95% — orange, the rest — grey; economy turns only that grey yellow
    // and never covers red or orange. A window whose reset has passed has no colour.
    const tone = lapsed ? "ok" : broken || pct >= 95 ? "high" : pct >= 80 ? "warn" : eco ? "eco" : "ok";
    const reset = lapsed ? "" : typeof resets === "number" ? `${words.resets} ${left(resets, now, lang)}` : "";
    const spoken = lapsed ? `${words[id]}, ${words.lapsed}` : `${words[id]} ${pct}%${reset ? `, ${reset}` : ""}`;
    return { id, name: words[id], pct, used: clamp(used), even, lapsed, tone, reset, spoken };
  });
  const pool = Array.isArray(accounts.pool) ? accounts.pool : [];
  const mail = pool.find((p) => p?.name === current)?.email;
  const email = accounts.on && pool.length > 1 && goodMail(mail) ? mail : "";
  let stale = null;
  if (old) {
    const why = ageWhy(fresh ? live : null, active, linkDown, sinceSnap);
    const time = measured ? new Date(measured * 1000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) : "";
    const lastSnap = sinceSnap != null ? new Date((now - sinceSnap) * 1000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) : "";
    const lines = [];
    if (time && why !== "cache") lines.push(words.at.replace("%@", time));
    lines.push(words[why].replace("%@", lastSnap || time));
    stale = { why, text: lines.join("\n") };
  }
  return {
    account: current, title: email || accountTitle(current, lang), email, active: !!acc.active && current === acc.active,
    broken, eco, windows, stale, words, pool: !!accounts.on,
  };
}

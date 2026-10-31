// Тема Clean: цвета, шрифт Geist, значки и аватарки — в clean.json и clean-dark.json; раскладка — в clean.css, только
// пока выбрана одна из этих тем (класс th-clean на <html>). Плагин из маркетплейса зовётся с автором («автор:clean»),
// поэтому id темы сверяется по хвосту.
//
// Чего тема не может словами JSON, делается здесь — и только пока она выбрана:
// - аватарки у «Хаб» и «Ядро» в ленте: у них нет эмодзи, к которому тема привязывает картинку (avatars), — подпись
//   помечается классом, картинку ставит clean.css;
// - счётчики вкладок «Все · 38» — отдельной плашкой;
// - лимиты — внизу боковой панели (место sidebar.footer), из снимка ядра;
// - подпись строки сессии, которую тема прячет, — в подсказке строки;
// - «ждёт вас» — числом вопросов (красный счётчик), шевроны ▸ ▾ — значком Forma с поворотом;
// - значки темы — маской цвета текста (белые на красном и на тёмной кнопке);
// - поиск как в Slack: крестик «очистить», пустой результат — что искали и кнопка «Очистить поиск»;
// - аватарки у всех авторов ленты: картинка темы по значку сессии, иначе — из набора темы по имени; в «ответила на ваше
//   сообщение» — аватарка ответившей вместо ●;
// - кнопка «Скрыть список» рядом с поиском и «Показать список» в углу у скрытого списка — нажимают родную полосу ядра;
// - «Новая группа», «Разложить по группам» и «Вернуть стандартные группы» — каждая строкой на всю ширину сразу под группами; край списка при прокрутке — плавно;
// - по макету на DS: подсказки «Найти…» и «Задача или вопрос хабу…», «·» в строках «работает» и под полем — отдельным
//   серым знаком, «Esc для остановки», число на бейдже исполнителей, «Отправить» видна и в пустом поле с голосом;
// - число открытых задач — бейджем на вкладке «Доска» (строка-сводка ядра прячется из шапки CSS); значок часов в бейдже
//   расписания — маской цвета текста; у сессии со значком вместо персонажа в ленте — серая плашка с маленьким значком;
// - «Ответить» значком на плавающей панели (как в Slack): подсказка — слова кнопки, « · » перед ней — отдельным знаком,
//   который тема прячет; раскрытая переписка сессий сворачивается шевроном — у него подпись «Свернуть»; у контекстных
//   меню списка без заголовка — имя меню для чтения с экрана;
// - запись голоса с клавиатуры: Enter останавливает и отправляет, двойной Esc отменяет, одиночный Esc запись не трогает.
const MINE = /(^|:)clean:clean(-dark)?\.json$/;
const OWNER = new Set(["владелец", "owner"]);   // как называет владельца ядро в событиях (core/reducer.py)
const on = () => document.documentElement.classList.contains("th-clean");

export default function register(hub) {
  hub.addStyle("clean.css");
  const T = (k, fb) => { try { const v = hub.t?.(k); return v && v !== k ? v : fb; } catch { return fb; } };
  const names = () => ({ hub: T("web.who.hub", "Хаб"), core: T("web.who.core", "ядро") });

  // подписи авторов в ленте: «Хаб» и «Ядро» — своими аватарками
  const tagBylines = (root) => {
    if (!on()) return;
    const n = names();
    for (const b of root.querySelectorAll?.(".byline:not([data-clean])") || []) {
      const who = b.querySelector(":scope > b")?.textContent?.trim().toLowerCase();
      b.dataset.clean = who === n.hub.toLowerCase() ? "hub" : who === n.core.toLowerCase() ? "core" : "";
      if (OWNER.has(who)) b.dataset.cleanOwner = "";   // «владелец» приходит от ядра с маленькой буквы — как «Хаб» и «Расписание», с большой
    }
  };
  // «Все · 38» → «Все» и плашка «38»
  const splitTabs = () => {
    const bar = document.getElementById("active-bar");
    if (!bar || !on()) return;
    for (const b of bar.children) {
      const m = /^(.*?)\s*·\s*(\d+)$/.exec(b.textContent || "");
      if (!m || b.querySelector(".c-n")) continue;
      const n = document.createElement("span");
      n.className = "c-n";
      n.textContent = m[2];
      b.replaceChildren(document.createTextNode(m[1]), n);
    }
  };
  // подпись строки сессии (что делает, чего ждёт) тема прячет, как в макете, — она остаётся в подсказке строки
  const rowTitles = () => {
    if (!on()) return;
    for (const r of document.querySelectorAll("#list .srow")) {
      const nm = r.querySelector(".nm"), lb = r.querySelector(".lb")?.textContent?.trim();
      const t = [nm?.title || nm?.textContent?.trim(), lb].filter(Boolean).join("\n");
      if (t && r.title !== t) r.title = t;
    }
  };
  // «ждёт вас» — красным счётчиком, как в макете: сколько вопросов ждут ответа (вопросы карточек и запросы разрешения)
  const asks = (s) => (s.pending || []).reduce((n, r, i) => n + (r.tool === "AskUserQuestion" ? r.input?.questions?.length || 1 : i === 0 ? 1 : 0), 0)
    + (s.shown || []).reduce((n, q) => n + (q.input?.questions?.length || 1), 0);
  const waitCounts = () => {
    const tags = document.querySelectorAll("#list .srow .tag:not(.soft)");
    if (!tags.length) return;
    const by = new Map((hub.snapshot?.()?.sessions || []).map((s) => [s.name, s]));
    for (const tag of tags) {
      const nm = tag.closest(".srow")?.querySelector(".nm");
      const s = by.get((nm?.title || nm?.textContent || "").split(" — ")[0].trim());
      const n = String((s && asks(s)) || 1);
      if (tag.dataset.n !== n) tag.dataset.n = n;
    }
  };
  // шевроны ядра — символы ▸ ▾: тема рисует один значок Forma и поворачивает раскрытый
  const chevrons = () => {
    for (const c of document.querySelectorAll(".chev, .chat-chev")) {
      const d = c.textContent.includes("▾") ? "1" : "";
      if ((c.dataset.down || "") !== d) c.dataset.down = d;
    }
  };
  // значки темы — картинки с цветом внутри: в маску, чтобы цвет шёл от текста (белый крестик на красной шапке)
  const maskIcons = () => {
    for (const k of document.querySelectorAll(":is(.icon, .chip-glyph).kit-img:not([data-clean-mask])")) {
      const url = k.style.backgroundImage;
      if (!url || url === "none") continue;
      k.dataset.cleanMask = "";
      k.style.webkitMaskImage = k.style.maskImage = url;
      k.style.backgroundImage = "none";
    }
  };
  const unmaskIcons = () => {
    for (const k of document.querySelectorAll(":is(.icon, .chip-glyph).kit-img[data-clean-mask]")) {
      k.style.backgroundImage = k.style.maskImage;
      k.style.webkitMaskImage = k.style.maskImage = "";
      delete k.dataset.cleanMask;
    }
  };
  // поиск как в Slack: крестик «очистить» в поле; ничего не нашлось — что искали, где ищем, кнопка «Очистить поиск»
  const RU = !/^en/.test(hub.locale || document.documentElement.lang || "ru");
  const W = RU ? { clear: "Очистить поиск", none: (q) => `Нет сессий с «${q}» в имени`, where: "Проверьте, нет ли опечатки." }
    : { clear: "Clear search", none: (q) => `No sessions with “${q}” in the name`, where: "Check the spelling." };
  const clearSearch = () => {
    const i = document.getElementById("filter");
    if (!i) return;
    i.value = "";
    i.dispatchEvent(new Event("input", { bubbles: true }));
    i.focus();
  };
  const searchBox = () => {
    const box = document.querySelector(".search-row label.search");
    if (!box || box.querySelector(".clean-x")) return;
    const x = hub.el("button", "clean-x");
    x.type = "button";
    x.title = W.clear;
    x.setAttribute("aria-label", W.clear);
    x.addEventListener("click", (e) => { e.preventDefault(); clearSearch(); });
    box.append(x);
  };
  // скрыть/раскрыть список — кнопкой со значком (как в ChatGPT и Claude): рядом с поиском, а у скрытого списка — в углу
  // страницы. Само скрытие — родное: ядро прячет список полосой-разделителем .grip.left (клик или Enter), помнит выбор
  // в localStorage hub.leftFolded и держит у скрытого списка полосу «›»; кнопка нажимает эту полосу
  const FOLD = RU ? { hide: "Скрыть список сессий", show: "Показать список сессий" } : { hide: "Hide the session list", show: "Show the session list" };
  const toggleList = (e) => {
    const g = document.querySelector(".grip.left");
    if (!g) return;
    g.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    // с клавиатуры фокус переходит на кнопку, которая теперь на виду: её можно нажать снова
    const folded = document.getElementById("app")?.classList.contains("left-folded");
    if (e?.detail === 0) document.querySelector(folded ? ".clean-fold-show" : ".search-row .clean-fold")?.focus({ preventScroll: true });
  };
  const foldButton = (cls, label) => {
    const b = hub.el("button", cls);
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.addEventListener("click", toggleList);
    return b;
  };
  const foldButtons = () => {
    const row = document.querySelector(".search-row"), app = document.getElementById("app");
    if (row && !row.querySelector(".clean-fold")) row.append(foldButton("clean-fold", FOLD.hide));
    if (app && !app.querySelector(":scope > .clean-fold-show")) app.append(foldButton("clean-fold-show", FOLD.show));
  };
  const emptySearch = () => {
    const p = document.querySelector("#list > p.hint:not([data-clean])");
    const q = document.getElementById("filter")?.value.trim();
    if (!p || !q || p.textContent.trim() !== T("web.sidebar.nothing_found", "Ничего не нашлось.")) return;
    p.dataset.clean = "empty";
    const b = hub.el("button", "btn ce-clear", W.clear);
    b.type = "button";
    b.addEventListener("click", clearSearch);
    const icon = hub.el("span", "ce-icon");
    icon.setAttribute("aria-hidden", "true");
    p.replaceChildren(icon, hub.el("b", "ce-title", W.none(q)), hub.el("span", "ce-hint", W.where), b);
  };
  // аватарки: у кого нет картинки (буква, эмодзи без картинки темы) — картинка из набора темы, по имени всегда одна и та же.
  // Адреса — из выбранной темы (avatars_url: страница отдаёт их сама; .jpg из папки плагина она не отдаёт)
  const kitAvatars = () => { try { return JSON.parse(localStorage.getItem("hub.theme") || "null")?.theme?.avatars_url || {}; } catch { return {}; } };
  const hash = (t) => { let h = 5381; for (const ch of t) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0; return h; };
  const pictureFor = (name) => {
    const kit = kitAvatars(), pool = Object.values(kit).filter((u) => /\.jpe?g\b/.test(u));
    const s = (hub.snapshot?.()?.sessions || []).find((x) => x.name === name);
    const url = (s?.icon && kit[s.icon]) || pool[hash(name) % pool.length];
    return url ? `url("${url}")` : "";
  };
  const avatars = () => {
    for (const av of document.querySelectorAll(".byline .av:not(.kit-img):not([data-clean-av])")) {
      const b = av.closest(".byline");
      if (["hub", "core"].includes(b.dataset.clean)) continue;
      const who = b.querySelector(":scope > b")?.textContent?.trim();
      const pic = who && pictureFor(who);
      if (!pic) continue;
      av.dataset.cleanAv = "";
      av.style.setProperty("--clean-av", pic);
    }
    // «hub-dev ответила на ваше сообщение»: имя — жирным, аватарка ответившей — в колонке слева вместо ●
    for (const box of document.querySelectorAll(".row > .b > .reply-box:not([data-clean])")) {
      const meta = box.querySelector(":scope > .meta"), first = meta?.firstChild;
      const m = first?.nodeType === 3 && /^(\S+)(\s[\s\S]*)$/.exec(first.nodeValue);
      if (!m) continue;
      box.dataset.clean = m[1];
      first.replaceWith(hub.el("b", "clean-who", m[1]), document.createTextNode(m[2]));
      const g = box.closest(".row").querySelector(":scope > .g");
      if (!g) continue;
      const a = hub.el("span", "clean-av"), pic = pictureFor(m[1]);
      a.style.setProperty("--clean-av", pic);
      if (/\.svg\b/.test(pic)) a.dataset.tile = "";   // значок вместо персонажа — серая плашка, как в ленте
      g.replaceChildren(a);
    }
  };
  // «Доска · 3»: число открытых задач на вкладке — строка-сводка ядра больше не лежит под шапкой
  const boardCount = () => {
    const head = document.querySelector("main > .head"), name = head?.querySelector("h2")?.title;
    const snap = hub.snapshot?.(), tab = head?.querySelector(".seg")?.lastElementChild;
    if (!name || !tab || !(snap?.directions || []).includes(name)) return;
    const n = (snap.direction_tasks || {})[name]?.open || 0, now = tab.querySelector(".ce-n");
    if (!n) { now?.remove(); return; }
    if (!now) tab.append(hub.el("span", "ce-n", String(n)));
    else if (now.textContent !== String(n)) now.textContent = String(n);
  };
  // «В фоне · 19 мин»: строки под шапкой, которые ядро кладёт в .head-meta (фоновая работа, заметки мини-хаба), CSS прячет —
  // шапка в одну строку; то же — чипом рядом со статусом, полный текст в подсказке (data-tip: с клавиатуры тоже).
  // Сводка направления (.dir-recap) в чип не идёт — она на «Доске»
  const BG = RU ? { one: "В фоне", min: "мин", h: "ч" } : { one: "In background", min: "min", h: "h" };
  const bgLabel = (bgs) => {
    if (bgs.length > 1) return `${BG.one} · ${bgs.length}`;
    const m = Math.floor((Date.now() / 1000 - bgs[0].since) / 60);
    return m < 1 ? BG.one : `${BG.one} · ${m < 60 ? `${m} ${BG.min}` : `${Math.floor(m / 60)} ${BG.h}`}`;
  };
  const headNote = () => {
    const head = document.querySelector("main > .head"), now = head?.querySelector(":scope > .clean-bg");
    const extra = [...(head?.querySelectorAll(":scope > .head-meta > :not(.dir-recap, .sep)") || [])];
    if (!head || !extra.length) { now?.remove(); return; }
    const name = head.querySelector("h2")?.title;
    const bgs = (hub.snapshot?.()?.sessions || []).find((x) => x.name === name)?.background || [];
    const live = [...bgs].sort((a, b) => a.since - b.since);
    const label = live.length && extra[0].classList.contains("bg-line") ? bgLabel(live) : extra[0].textContent.trim();
    const tip = extra.map((x) => x.textContent.trim()).join("\n");
    let chip = now;
    if (!chip) {
      chip = hub.el("span", "chip clean-bg");
      chip.tabIndex = 0;
      chip.setAttribute("role", "note");
      chip.append(hub.el("span", "clean-bg-t"));
    }
    const t = chip.firstElementChild;
    if (t.textContent !== label) t.textContent = label;
    if (chip.dataset.tip !== tip) { chip.dataset.tip = tip; chip.setAttribute("aria-label", tip.replace(/\n/g, ". ")); }
    const pill = head.querySelector(":scope > .pill");
    if (pill && chip.previousElementSibling !== pill) pill.after(chip);
  };
  // «Кратко | Подробно» и «Лента | Доска» при узкой шапке прячет CSS (@container hd); здесь они же — пунктами в «Ещё»:
  // клик по пункту — клик по спрятанной кнопке (она остаётся в разметке), так режим переключает само ядро
  const headFold = () => {
    const head = document.querySelector("main > .head");
    if (!head) return;
    for (const s of head.querySelectorAll(":scope > .seg:not(.clean-view, .clean-board)")) {
      s.classList.add(s.querySelector(".ce-n") || /^(Лента|Feed)/.test(s.textContent) ? "clean-board" : "clean-view");
    }
    const menu = head.querySelector(".menu-wrap > .menu");
    if (!menu || menu.querySelector(".clean-fold-i")) return;
    const items = [];
    for (const cls of ["clean-view", "clean-board"]) {
      const seg = head.querySelector(`:scope > .seg.${cls}`);
      if (!seg || getComputedStyle(seg).display !== "none") continue;
      for (const b of seg.children) {
        const it = hub.el("button", "menu-item check clean-fold-i", b.firstChild.textContent + (b.querySelector(".ce-n") ? ` ${b.querySelector(".ce-n").textContent}` : ""));
        it.type = "button";
        it.tabIndex = -1;
        it.setAttribute("role", "menuitemcheckbox");
        it.setAttribute("aria-checked", b.getAttribute("aria-pressed"));
        it.title = b.title;
        it.addEventListener("click", () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); b.click(); });
        items.push(it);
      }
      items.push(hub.el("div", "menu-sep"));
    }
    menu.prepend(...items);
  };
  // Сводка направления на «Доске»: ядро кладёт её в шапку (.head-meta > .dir-recap), CSS прячет — шапка не растёт; здесь она же
  // встаёт первой строкой тела доски и листается с ней. Копия, не перенос: ядро перерисовывает шапку на каждом снимке;
  // кнопки копии нажимают кнопки оригинала (он остаётся в DOM скрытым)
  const boardRecap = () => {
    const body = document.querySelector("main > .boards-body"), src = document.querySelector("main > .head .head-meta > .dir-recap");
    const mine = body?.querySelector(":scope > .clean-recap");
    if (!body || !src) { mine?.remove(); return; }
    const sig = src.outerHTML;
    if (mine?.dataset.sig === sig) return;
    const copy = src.cloneNode(true);
    copy.className = "clean-recap";
    copy.dataset.sig = sig;
    copy.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
      document.querySelectorAll("main > .head .head-meta > .dir-recap button")[i]?.click();
      b.disabled = true;
    }));
    if (mine) mine.replaceWith(copy); else body.prepend(copy);
  };
  setInterval(() => { if (on()) headNote(); }, 20000);   // минуты идут и без перерисовки ядра
  const unAvatars = () => {
    for (const av of document.querySelectorAll(".byline .av[data-clean-av]")) { delete av.dataset.cleanAv; av.style.removeProperty("--clean-av"); }
    for (const box of document.querySelectorAll(".reply-box[data-clean]")) {
      box.querySelector(".clean-who")?.replaceWith(document.createTextNode(box.dataset.clean));
      box.closest(".row").querySelector(":scope > .g")?.replaceChildren(document.createTextNode("●"));
      delete box.dataset.clean;
    }
  };
  // «+ Группа», «Авто» и «Сброс» — сразу под группами (до спящих), каждая своей строкой и словами, что она делает
  const G = RU ? { add: "Новая группа", auto: "Разложить по группам", reset: "Вернуть стандартные группы" }
    : { add: "New group", auto: "Sort into groups", reset: "Restore default groups" };
  const groupTools = () => {
    const list = document.getElementById("list"), tools = list?.querySelector(":scope > .g-tools");
    if (!tools) return;
    const rest = list.querySelector(":scope > details.resting");
    if (rest && tools.nextElementSibling !== rest) list.insertBefore(tools, rest);
    for (const [sel, text] of [[".add-group", G.add], [".auto", G.auto], [".btn:not(.add-group, .auto)", G.reset]]) {
      const b = tools.querySelector(`:scope > ${sel}`);
      if (b && b.textContent !== text) b.textContent = text;
    }
  };
  // край списка при прокрутке — плавно: маска только с той стороны, куда есть что листать
  const fade = () => {
    const l = document.getElementById("list");
    if (!l) return;
    if (!l.dataset.cleanFadeOn) { l.dataset.cleanFadeOn = "1"; l.addEventListener("scroll", fade, { passive: true }); }
    const v = on() ? [l.scrollTop > 1 && "up", l.scrollTop + l.clientHeight < l.scrollHeight - 1 && "down"].filter(Boolean).join(" ") : "";
    if (v) { if (l.dataset.cleanFade !== v) l.dataset.cleanFade = v; } else if (l.hasAttribute("data-clean-fade")) delete l.dataset.cleanFade;
  };
  addEventListener("resize", fade, { passive: true });
  // затухание под лентой (за полем ввода) гаснет к концу прокрутки: --clean-end на main, 1 — вся глубина 80, 0 — лента у низа
  const feedEnd = () => {
    const f = document.querySelector("main > .feed");
    if (!f) return;
    if (!f.dataset.cleanEndOn) { f.dataset.cleanEndOn = "1"; f.addEventListener("scroll", feedEnd, { passive: true }); }
    const k = on() ? Math.round(Math.min(1, Math.max(0, (f.scrollHeight - f.clientHeight - f.scrollTop) / 80)) * 100) / 100 : 1;
    if (f.parentElement.style.getPropertyValue("--clean-end") !== String(k)) f.parentElement.style.setProperty("--clean-end", String(k));
  };
  addEventListener("resize", feedEnd, { passive: true });
  // подсказки полей — короче, как в макете: «Найти…», «Задача или вопрос хабу…» (про пробел для записи — в подсказке
  // микрофона); прежние — в data-clean-ph, чтобы вернуть без темы
  const FIND = RU ? "Найти…" : "Find…";
  const shortHint = (ph) => { const h = ph.split(" · ")[0].trim(); return h && !h.endsWith("…") ? h + "…" : h; };
  const placeholders = () => {
    const f = document.getElementById("filter");
    if (f && f.placeholder !== FIND) { f.dataset.cleanPh = f.placeholder; f.placeholder = FIND; }
    for (const ta of document.querySelectorAll("form.composer textarea")) {
      const h = ta.placeholder && shortHint(ta.placeholder);
      if (h && h !== ta.placeholder) { ta.dataset.cleanPh = ta.placeholder; ta.placeholder = h; }
    }
  };
  const unPlaceholders = () => {
    for (const i of document.querySelectorAll("[data-clean-ph]")) { i.placeholder = i.dataset.cleanPh; delete i.dataset.cleanPh; }
  };
  // «·» между частями строки — отдельным знаком (серым 28%, через 6), слова — 55%: в строке «работает» ядро пишет
  // « · 9 мин 12 с» в начало части (и переписывает каждую секунду), под полем — «73 тыс токенов · » в конце
  const sep = () => hub.el("span", "clean-sep", "·");
  const ESC = RU ? [["Esc: остановить", "Esc для остановки"]] : [];
  const separators = () => {
    for (const part of document.querySelectorAll(".row.working > .b > span.muted")) {
      const t = part.textContent;
      if (!t.startsWith(" · ")) continue;
      let rest = t.slice(3);
      for (const [a, b] of ESC) if (rest === a) rest = b;
      part.textContent = rest;
      if (!part.previousElementSibling?.classList.contains("clean-sep") || part.previousSibling !== part.previousElementSibling) part.before(sep());
    }
    for (const tok of document.querySelectorAll(".stat-ctx-tok:not([data-clean])")) {
      const t = tok.textContent;
      if (!t.endsWith(" · ")) continue;
      tok.dataset.clean = "";
      tok.replaceChildren(document.createTextNode(t.slice(0, -3)), sep());
    }
  };
  // бейдж исполнителей «2 ›»: место под него держит невидимый двойник строки — ему нужно только число
  const forkCounts = () => {
    for (const r of document.querySelectorAll("#list li.has-forks > .srow[data-fw]")) {
      const n = r.dataset.fw.replace(/\D/g, "");
      if (r.dataset.cleanFw !== n) r.dataset.cleanFw = n;
    }
  };
  // «Отправить» видна всегда (макет): с голосом ядро в пустом поле ставит на её место микрофон (тема уводит его влево) —
  // тогда справа кнопка темы; она отправляет форму так же, как кнопка ядра без голоса (пустое — ядро подскажет)
  const SEND = RU ? "Отправить" : "Send";
  const sendButtons = () => {
    for (const bar of document.querySelectorAll("form.composer .bar:has(> .btn.round.mic):not(:has(> .clean-send))")) {
      const b = hub.el("button", "btn round send clean-send");
      b.type = "submit";
      b.title = SEND;
      b.setAttribute("aria-label", SEND);
      bar.append(b);
    }
  };
  // идёт запись голоса: в кнопке записи — четыре бегущих столбика (стили — clean.css); ядро пересоздаёт содержимое кнопки при смене
  // режима, поэтому их кладёт обход
  const recBars = () => {
    for (const b of document.querySelectorAll("form.composer.rec .bar > .btn.round.stop:not(:has(> .clean-bars))")) {
      const bars = hub.el("span", "clean-bars");
      bars.append(...[0, 1, 2, 3].map(() => hub.el("i")));
      b.append(bars);
    }
  };
  // «Ответить» — значком: слова — в подсказке; « · » перед ней в «ответила на ваше сообщение» — знаком, который тема прячет.
  // Раскрытая переписка: от кнопки ядра остаётся шеврон — подпись «Свернуть». Меню группы без заголовка — имя для чтения с экрана
  const COLLAPSE = RU ? "Свернуть" : "Collapse";
  const actions = () => {
    for (const b of document.querySelectorAll(".row .reply-btn:not([title])")) {
      b.title = b.textContent.trim();
      const dot = b.previousSibling;
      if (b.parentElement.matches(".reply-box > .meta") && dot?.nodeType === 3 && dot.nodeValue === " · ") dot.replaceWith(hub.el("span", "clean-dot", " · "));
    }
    for (const h of document.querySelectorAll('.chat-head[aria-expanded="true"]:not([data-clean-label])')) {
      h.dataset.cleanLabel = "";
      h.setAttribute("aria-label", COLLAPSE);
      h.title = COLLAPSE;
    }
    for (const p of document.querySelectorAll(".gpop.menu:not([aria-label])")) {
      const t = p.querySelector(":scope > .gpop-t")?.textContent;
      if (t) p.setAttribute("aria-label", t);
    }
  };
  // очередь над полем (strip.js ядра кладёт её строки в общую полосу «Ждёт вас»): здесь строки очереди и «Ждёт вас»
  // (вопрос, разрешение) переезжают в одну плашку — язычок над язычком токенов; «Не дошло» остаётся в полосе. Подписи кнопок уходят в подсказки (значки без
  // слов на телефоне и «Сейчас» вместо «Отправить сейчас» на широком); ядро пересоздаёт полосу целиком при смене состава строк
  const NOW = RU ? "Сейчас" : "Now";
  const queuePlate = () => {
    for (const host of document.querySelectorAll(".strip-host")) {
      const rows = host.querySelectorAll(":scope > .strip > .strip-row:is([data-k=queue], [data-k=wait])");
      if (!rows.length) continue;
      let plate = host.querySelector(":scope > .clean-queue");
      if (!plate) {
        plate = hub.el("div", "clean-queue");
        plate.setAttribute("role", "region");
        plate.setAttribute("aria-label", T("web.strip.waiting", RU ? "Ждёт вас" : "Waiting for you"));
        host.append(plate);
      }
      for (const r of rows) {
        // обычная строка очереди — с подсказкой «уйдёт, когда закончит ход» и кнопками; «К сведению», «Убрано», «Выполняется» — свои
        const item = r.dataset.k === "queue" && !r.querySelector(":scope > button.t") && r.querySelector(":scope > .t[title]") && r.querySelector(":scope > .btn");
        r.dataset.clean = r.dataset.k === "wait" ? "wait" : item ? "item" : r.matches(":has(> button.t)") ? "fyi" : r.matches(".strip-more") ? "more" : r.matches(".strip-sum") ? "sum" : "state";
        if (item) {
          for (const b of r.querySelectorAll(":scope > .btn")) {
            const now = !b.classList.contains("quiet");
            b.classList.add(now ? "clean-now" : "clean-del");
            b.title = b.getAttribute("aria-label") || b.textContent.trim();
            b.setAttribute("aria-label", b.title);
            if (now) b.dataset.short = NOW;
          }
        }
        plate.append(r);
      }
      for (const box of host.querySelectorAll(":scope > .strip:empty")) box.remove();
    }
  };
  // тема выключена: полоса пересобирается ядром из строк (подпись состава сбрасываем — иначе оно оставит плашку как есть)
  const unPlate = () => {
    for (const host of document.querySelectorAll(".strip-host:has(> .clean-queue)")) delete host.dataset.sig;
  };
  const sweep = () => {
    if (!on()) return;
    tagBylines(document); splitTabs(); rowTitles(); waitCounts(); chevrons(); maskIcons(); searchBox(); foldButtons(); emptySearch();
    avatars(); boardCount(); headNote(); groupTools(); fade(); feedEnd(); placeholders(); separators(); forkCounts(); sendButtons(); recBars(); actions(); queuePlate(); headFold();
    boardRecap();
  };
  let queued = false;   // лента меняется часто — не чаще кадра
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; sweep(); }); } }).observe(document.body, { childList: true, subtree: true, characterData: true });

  // лимиты — внизу боковой панели (место sidebar.footer), из снимка ядра: «corp  5 ч 10%  неделя 1%»; доля и сброс — в подсказке
  // окно без названия (шлюз присылает новые, например seven_day_overage_included) в строку не попадает — сырой ключ вместо подписи хуже, чем ничего
  const SHORT = { five_hour: ["web.limits.short_five_hour", "5 ч"], seven_day: ["web.limits.short_week", "неделя"],
    seven_day_opus: ["web.limits.short_week_opus", "Opus"], seven_day_sonnet: ["web.limits.short_week_sonnet", "Sonnet"] };
  const FULL = { five_hour: ["web.limits.name_five_hour", "5 часов"], seven_day: ["web.limits.name_week", "Неделя"],
    seven_day_opus: ["web.limits.name_week_opus", "Неделя · Opus"], seven_day_sonnet: ["web.limits.name_week_sonnet", "Неделя · Sonnet"] };
  hub.addSlot("sidebar.footer", {
    id: "clean-limits",
    render(root, snap) {
      const wins = on() ? Object.entries(snap?.limits?.windows || {}).filter(([name, w]) => name in SHORT && typeof w.used === "number") : [];
      if (!wins.length) { root.replaceChildren(); return; }
      const order = Object.keys(SHORT);
      wins.sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
      const line = hub.el("span", "clean-lim");
      const acc = snap?.accounts?.on ? snap?.account?.active : null;
      if (acc) line.append(hub.el("span", "limseg limacc", acc));
      const now = Date.now() / 1000;
      // цвет процента — как LimitsBlock.tone в нативе: экономия — жёлтый (красного и оранжевого «кончается» в ней нет),
      // иначе 95%+ и «не работает» (limits.status = rejected) — красный, 80–95% — оранжевый, остальное — серый
      const stopped = snap?.limits?.status === "rejected", eco = !!snap?.economy?.on;
      const tone = (u) => eco ? "eco" : stopped || u >= 95 ? "high" : u >= 80 ? "warn" : "ok";
      for (const [name, w] of wins) {
        const used = w.resets && w.resets < now ? 0 : Math.round(w.used * 100);
        const seg = hub.el("span", "limseg");
        seg.dataset.tone = tone(used);
        const reset = w.resets && w.resets > now ? new Date(w.resets * 1000).toLocaleString(hub.locale || undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
        seg.dataset.full = T(...FULL[name]);
        seg.title = seg.dataset.full + (reset ? ` · ${reset}` : "");   // в строке — короткие названия; полное имя и сброс — в подсказке
        const [k, fb] = SHORT[name];
        seg.append(hub.el("span", "limname", T(k, fb)), hub.el("span", "limpct", `${used}%`));
        line.append(seg);
      }
      line.title = [...line.querySelectorAll(".limseg[data-full]")].map((x) => `${x.dataset.full} ${x.querySelector(".limpct").textContent}`).join(" · ");
      if (acc) {   // аккаунты работают: клик — лимиты всех аккаунтов
        line.classList.add("limlink");
        line.tabIndex = 0;
        line.setAttribute("role", "link");
        const open = () => hub.openSettings?.("accounts");
        line.addEventListener("click", open);
        line.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
      }
      root.replaceChildren(line);
    },
  });

  // значок сессии: ядро ставит попап на левый верхний угол аватарки, по которой кликнули (у DOMRect есть x и y), — и закрывает её.
  // Тема сдвигает попап сразу после появления (до кадра): ниже аватарки, не влезает — выше, потом справа и слева.
  // Окно для телефона — нижняя шторка ядра, там ничего не двигаем
  let anchor = null;
  addEventListener("pointerdown", () => { anchor = null; }, true);
  addEventListener("click", (e) => { anchor = e.target.closest?.(".avatar, .head-av") || null; }, true);
  const placePalette = (pop) => {
    if (!on() || !anchor?.isConnected || matchMedia("(max-width: 760px)").matches) return;
    const a = anchor.getBoundingClientRect(), r = pop.getBoundingClientRect(), G = 8, W = innerWidth, H = innerHeight;
    const across = (v) => Math.max(G, Math.min(v, W - r.width - G)), along = (v) => Math.max(G, Math.min(v, H - r.height - G));
    const spots = [
      [a.bottom + G + r.height <= H - G, across(a.left), a.bottom + G],
      [a.top - G - r.height >= G, across(a.left), a.top - G - r.height],
      [a.right + G + r.width <= W - G, a.right + G, along(a.top)],
      [a.left - G - r.width >= G, a.left - G - r.width, along(a.top)],
    ];
    const [, x, y] = spots.find((s) => s[0]) || spots[0];
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
  };
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) if (n.classList?.contains("palette") && n.classList.contains("gpop")) placePalette(n);
  }).observe(document.body, { childList: true });

  // theme-color у ядра — по системной схеме (prefers-color-scheme), а Clean светлая или тёмная сама по себе: на телефоне
  // строка состояния и адресная строка красились бы чужим цветом. Пока тема выбрана — оба тега получают цвет шелла
  // (--c-shell в clean.css: фон под окнами; читать его из стиля нельзя — при первом запуске таблица ещё не загружена),
  // при выключении — свои прежние значения
  let tcSaved = null;
  const themeColor = () => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    if (!metas.length) return;
    if (on()) {
      tcSaved ??= metas.map((m) => m.content);
      for (const m of metas) m.content = document.documentElement.classList.contains("th-clean-dark") ? "#121214" : "#f1f1f3";
    } else if (tcSaved) {
      metas.forEach((m, i) => { if (tcSaved[i]) m.content = tcSaved[i]; });
      tcSaved = null;
    }
  };

  // Запись голоса с клавиатуры. Ядро (recorder.js) на одиночный Esc отменяет запись, на Enter ничего не делает; в теме:
  // - Enter во время записи — остановить и отправить: нажимается стоп-кнопка ядра (метода записи у плагина нет);
  // - Esc дважды быстрее VOICE_ESC_MS — отмена (второй Esc отдаётся ядру: оно отменяет, как «Отмена»);
  // - одиночный Esc запись не трогает: его съедает окно в фазе перехвата раньше ядра (оно ловит Esc на document).
  // «Идёт запись» — по полоске записи ядра: .recstrip с часами [data-rec-clock] (запись) или с «Отмена» (запись и открытие
  // микрофона). Слушатель один и постоянный, взводить и снимать нечего: вне записи и вне темы он ничего не делает.
  // Enter не трогает чужие поля (поиск, диалоги, кнопки), Esc действует где угодно — как у ядра.
  const VOICE_ESC_MS = 400, SPENT_MS = 800;
  let lastEsc = 0, spentAt = 0;   // spentAt: когда сработали Enter или двойной Esc — полоска ещё может не успеть смениться
  const recStrip = () => document.querySelector("form.composer.rec .recstrip");
  const fieldFocused = (a) => {
    if (!a || a === document.body) return false;
    if (a.closest?.("dialog[open], [role=dialog], [role=menu], [role=listbox]")) return true;
    if (a.matches?.("input, textarea, select, button, a, summary, [role=button], [contenteditable]:not([contenteditable=false])")) {
      return !a.matches?.("form.composer textarea, form.composer .btn.stop");   // поле ввода «Разговора» и стоп записи — свои
    }
    return false;
  };
  addEventListener("keydown", (e) => {
    if (!on() || (e.key !== "Escape" && e.key !== "Enter")) return;
    const strip = recStrip(), clock = strip?.querySelector("[data-rec-clock]");
    if (!strip || !strip.querySelector(".linkbtn")) { lastEsc = 0; return; }
    const spent = e.timeStamp - spentAt < SPENT_MS;
    if (e.key === "Escape") {
      if (spent) { e.stopImmediatePropagation(); return; }   // отмена уже ушла, полоска ещё не сменилась
      if (e.repeat) { e.stopImmediatePropagation(); return; }   // удержание — не второе нажатие
      if (lastEsc && e.timeStamp - lastEsc <= VOICE_ESC_MS) { lastEsc = 0; spentAt = e.timeStamp; return; }   // отмену сделает ядро
      lastEsc = e.timeStamp;
      e.stopImmediatePropagation();
      return;
    }
    if (!clock || spent || e.repeat || e.isComposing || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || fieldFocused(document.activeElement)) return;
    const stop = document.querySelector("form.composer.rec .bar > .btn.round.stop");
    if (!stop) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    spentAt = e.timeStamp;
    stop.click();
  }, true);

  const sync = () => {
    let id = "";
    try { id = JSON.parse(localStorage.getItem("hub.theme") || "null")?.id || ""; } catch { /* нет */ }
    const was = on();
    document.documentElement.classList.toggle("th-clean", MINE.test(id));
    document.documentElement.classList.toggle("th-clean-dark", MINE.test(id) && /-dark\.json$/.test(id));
    if (was !== on()) {
      for (const b of document.querySelectorAll(".byline[data-clean]")) delete b.dataset.clean;
      if (!on()) {
        unmaskIcons(); unAvatars(); fade(); feedEnd(); unPlaceholders(); unPlate();
        for (const h of document.querySelectorAll(".chat-head[data-clean-label]")) { h.removeAttribute("aria-label"); h.removeAttribute("title"); delete h.dataset.cleanLabel; }

        for (const x of document.querySelectorAll(".search-row .clean-x, .clean-bg, .clean-fold, .clean-fold-show, .clean-send, .clean-bars, .ce-n, .clean-recap")) x.remove();
      }
      hub.redraw?.();
    }
    themeColor();
    sweep();
  };
  addEventListener("hub-theme", sync);
  addEventListener("storage", sync);
  sync();
}

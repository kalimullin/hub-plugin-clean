// Voice over a draft. With text or a file in a field, a microphone stands next to send, and what is said goes out in
// one message with the draft: the typed text, an empty line, "🎤 voice: …", with the field's files (an empty field keeps
// the core's own voice message). The core draws its microphone only in an empty field and its input.record() does not
// start over a draft, so the theme brings its own: hub.dictate (Plugin API 1.31) into a field that is never put on the
// page. Its words come back through onText ({ inserted: false }), are joined with the draft here, and the core's own
// form sends them (its submit: the same client_id, refusal handling and attachments as a typed message).
//
// Where the button lives: inside the bottom row's .spacer, the one node of the core's row that the core never rewrites
// (the row itself is re-synced on every snapshot and would drop a foreign button), so it sits right before send and Tab
// reaches it between the field and send.
//
// While it records, the card looks like the core's own voice message (dot, clock, ×, the dark pill with bars): the form
// gets .clean-vt-rec (clean.css styles it with the same rules as .rec), the strip goes into the spacer, and the core's
// own timer ticks the clock through [data-rec-clock]. Keys: Enter and Space stop and send, double Esc cancels (main.js).
//
// The core rebuilds the chat's form when the owner opens another chat and comes back, so a recording belongs to the chat,
// not to a form node: a new form of the same chat takes over the running recording (button, strip, record look), and the
// words go to the form of that chat that is newest — on the page, or, when the owner is in another chat by then, the last
// one they left (the core's own submit of that form still sends to its chat with the chat's draft and files, as the core's
// voice message does). While the recording runs or is being recognised, sending the draft without it is held back: Enter,
// ⌘/Ctrl+Enter and send stop the recording and the draft goes out with the words in one message.
//
// mountVoiceText(hub, on) → { sweep, reset, space, enter }: sweep on every redraw (cheap), reset when the theme is switched
// off, space(keydown) and enter(keydown) from the theme's key listener.
export const REC = "clean-vt-rec";   // the form class while a recording over a draft runs

// what the button is doing, read from the core's dictate button (it repaints itself): rec, opening, busy or idle
export function modeOf(b) {
  if (!b || b.hidden) return "idle";
  if (b.classList.contains("stop")) return "rec";
  if (b.querySelector(".spin-dot")) return b.disabled ? "busy" : "opening";
  return "idle";
}

// the message: the draft first, then the voice part; an empty draft — the voice alone (as the core's voice message)
export const joined = (typed, head, said) => {
  const voice = `🎤 ${head}: ${said}`;
  return typed.trim() ? `${typed.trim()}\n\n${voice}` : voice;
};

// which chat a form is: the session field (#msg) is the open chat's, named by the address; any other field (a plugin's
// hub.input) is known by its node only
export const chatOf = (form, hash = location.hash) => (form.querySelector("textarea#msg") ? "chat:" + (hash || "#") : null);

export function mountVoiceText(hub, on) {
  const none = { sweep() {}, reset() {}, space() {}, enter: () => false };
  if (hub.capabilities?.dictate !== 1 || typeof hub.dictate !== "function") return none;
  const T = (k, fb, o) => { try { const v = hub.t?.(k, o); return v && v !== k ? v : fb; } catch { return fb; } };
  const mics = new Map();   // form → its controller; forms that left the page are dropped on sweep (unless they record)
  let held = null;   // the controller whose button is pressed now (hold — speak — release)
  for (const type of ["pointerup", "pointercancel"]) document.addEventListener(type, () => { const me = held; held = null; me?.paint(); });

  function controller(form) {
    const proxy = document.createElement("textarea");   // never on the page: dictate hands the words to onText
    let shown = "";
    const me = { form, chat: chatOf(form), held: () => held === me, sending: false };
    const b = hub.dictate(proxy, {
      space: false,   // Space in an empty field stays the core's voice message; this mic is the button only
      onText: (said) => deliver(me, said),
      onError: (text) => { if (text) hub.banner?.(text); },
    });
    if (!b) return null;
    me.button = b;
    // hold — speak — release: while the press lasts the strip says "Release to send", as the core's own does
    b.addEventListener("pointerdown", (e) => { if (e.button === 0) held = me; }, true);
    const strip = hub.el("div", "recstrip");
    me.strip = strip;
    const cancel = hub.el("button", "btn round quiet rec-cancel");
    cancel.type = "button";
    cancel.append(hub.icon?.("deny") || "×");
    cancel.setAttribute("aria-label", T("web.voice.cancel", "Cancel"));
    cancel.title = T("web.voice.cancel", "Cancel");
    // the core cancels a recording on Esc; marked, so the theme's "one Esc does not cancel" lets it through
    cancel.addEventListener("click", () => { const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true }); e.cleanVt = true; document.dispatchEvent(e); });
    const paint = (moved = false) => {
      const m = modeOf(b), sig = m + (me.held() ? "+" : "");
      me.form.classList.toggle(REC, m !== "idle");
      // the core's labels speak of inserting: here the words are sent
      if (m === "rec" && b.getAttribute("aria-label") !== T("web.voice.stop_send", "Stop and send")) {
        b.setAttribute("aria-label", T("web.voice.stop_send", "Stop and send"));
        b.title = T("web.voice.stop_send", "Stop and send");
      } else if (m === "idle" && b.getAttribute("aria-label") !== T("web.voice.voice_message", "Voice message") && !b.classList.contains("err")) {
        b.setAttribute("aria-label", T("web.voice.voice_message", "Voice message"));
        b.title = T("web.voice.voice_title", "Voice message");
      }
      if (sig === shown && !moved) return;
      shown = sig;
      const t = (text) => hub.el("span", "t", text);
      if (m === "rec") {
        const clock = t("0:00");
        clock.dataset.recClock = "1";   // the core's timer writes the time into every [data-rec-clock]
        strip.replaceChildren(hub.el("span", "rec-dot"), clock, hub.el("span", "spacer"),
          ...(me.held() ? [hub.el("span", "hint", T("web.voice.release_to_send", "Release to send"))] : []), cancel);
      } else if (m === "opening") strip.replaceChildren(hub.el("span", "spin-dot"), t(T("web.voice.opening_mic_dots", "Turning on the microphone…")), hub.el("span", "spacer"), cancel);
      else if (m === "busy") strip.replaceChildren(hub.el("span", "spin-dot"), t(T("web.voice.recognizing_dots", "Recognizing…")));
      else strip.replaceChildren();
      if (m === "idle") strip.remove();
      else if (strip.parentNode !== b.parentNode) b.before(strip);
    };
    me.paint = paint;
    new MutationObserver(() => paint()).observe(b, { attributes: true, attributeFilter: ["class", "disabled", "hidden"], childList: true });
    return me;
  }

  // the words are back: joined with what the chat's field holds now, and the core's form sends them with its files. The
  // form is the chat's newest one: on the page — as typed; the owner is in another chat — the form they left (its field
  // keeps the draft as it was, nobody could type into it since), whose submit the core still runs: to that chat, with the
  // chat's files, clearing its draft. Not into the open chat: the words belong where the recording started.
  function deliver(me, said) {
    const form = me.form, ta = form.querySelector("textarea");
    const head = T("web.voice.head", "voice");
    if (!ta) {   // nowhere to put them: say them, do not lose them
      hub.banner?.(T("web.voice.dictate_lost", `🎤 ${said}`, { text: said }));
      return;
    }
    ta.value = joined(ta.value, head, said);
    me.sending = true;   // our own send passes the hold on sending below
    try {
      if (form.isConnected && form.requestSubmit) {
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        form.requestSubmit();
      } else form.dispatchEvent(new Event("submit", { cancelable: true }));   // a form off the page: requestSubmit does nothing
    } finally { me.sending = false; }
  }

  // a recording of a chat whose form left the page (the owner opened another chat or the core rebuilt it): the chat's new
  // form takes it over
  const runningFor = (chat) => {
    if (!chat) return null;
    for (const [form, me] of mics) if (me.chat === chat && !form.isConnected && modeOf(me.button) !== "idle") return me;
    return null;
  };
  function adopt(me, form) {
    mics.delete(me.form);
    me.form.classList.remove(REC);
    me.form = form;
    mics.set(form, me);
  }

  const sweep = () => {
    if (!on()) return reset();
    for (const [form, me] of mics) if (!form.isConnected && modeOf(me.button) === "idle") { me.button.remove(); mics.delete(form); }
    for (const form of document.querySelectorAll("form.composer")) {
      const spacer = form.querySelector(":scope > .bar:not(.reply-bar) > .spacer");
      if (!spacer || !form.querySelector(":scope textarea")) continue;
      let me = mics.get(form);
      if (!me) {
        me = runningFor(chatOf(form));
        if (me) adopt(me, form);
        else { me = controller(form); if (!me) continue; mics.set(form, me); }
      }
      if (me.button.parentNode !== spacer) { spacer.append(me.button); me.paint(true); }
    }
  };
  // the theme is off: the buttons and the record look go; a recording already running ends on its own
  function reset() {
    for (const [form, me] of mics) { me.button.remove(); me.strip.remove(); form.classList.remove(REC); }
    mics.clear();
  }

  // Space while a click-started recording runs, with the caret in that field: stop and send, as for the core's voice
  // message (the core's dictation leaves Space to the field). Held Space and other fields are left alone. Called from the
  // theme's one keydown listener (main.js, capture phase on window).
  const space = (e) => {
    if (e.code !== "Space" || e.repeat || !on()) return;
    for (const me of mics.values()) {
      if (modeOf(me.button) !== "rec" || me.held()) continue;
      const a = document.activeElement;
      if (a !== me.form.querySelector("textarea") && a?.matches?.("input, textarea, select, button, [contenteditable]:not([contenteditable=false])")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      me.button.click();
      return;
    }
  };

  // Sending the draft while its recording runs or is being recognised would send it without the words, and the words alone
  // after it. Enter (any modifiers but Shift) in that field and the form's own submit (the send button) stop the recording
  // instead — the draft goes out with the words in one message; while the mic opens or the words are recognised they wait.
  // enter(keydown) is called from the theme's one key listener (main.js, capture phase on window), before the core's field
  // sees the key; true — the key is taken.
  const holding = (me) => !!me && !me.sending && modeOf(me.button) !== "idle";
  const stopOrWait = (me) => { if (modeOf(me.button) === "rec") me.button.click(); };   // a keyboard-like click: stop and send
  const enter = (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing || !on()) return false;
    const a = document.activeElement, form = a?.closest?.("form.composer"), me = form && mics.get(form);
    if (!holding(me) || a !== form.querySelector("textarea")) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) stopOrWait(me);   // a held Enter stops once; its repeats must not reach the core's field either
    return true;
  };
  document.addEventListener("submit", (e) => {
    const me = mics.get(e.target);
    if (!on() || !holding(me)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    stopOrWait(me);
  }, true);

  return { sweep, reset, space, enter };
}

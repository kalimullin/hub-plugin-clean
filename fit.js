// The bottom row of the composer card in the Clean theme: «+», the status chips (executors, model, effort), plugin buttons
// (the composer.tools place), the camera, the mic and send. CSS container queries cannot see how much room the buttons on the
// right take, so the room is shared here, by measuring: what stays and what gives way is decided by the real width, not by a
// button count. The classes go on .dock-inner; what they do is in clean.css (the section «bottom row and status line»).
//
// Steps the status line gives way in (the number is an index into STEPS), each next one only if the room is short:
//   0 — as is; 1 — short labels (abbreviated executors label, «Opus»); 2 — labels shrink with an ellipsis; 3 — effort goes into the model menu;
//   4 — the model goes; 5 — the executors go.
// Plugin buttons that do not fit one row with «+», camera, mic and send wrap to a row above; they go there too when in one
// row the status would vanish altogether (step 5) and above it fits.

export const GAP = 8;                       // gap between neighbours in the row
export const MIN = { par: 96, mod: 72, eff: 64 };   // down to how many px a label shrinks with an ellipsis (button padding and chevron included)
export const CHIPS = ["par", "mod", "eff"];
export const STEPS = [[], ["short"], ["short", "shrink"], ["short", "shrink", "noeff"], ["short", "shrink", "noeff", "nomod"], ["short", "shrink", "noeff", "nomod", "nopar"]];
const CLASSES = ["clean-up", ...["short", "shrink", "noeff", "nomod", "nopar"].map((n) => "clean-fit-" + n)];

// Which step the status line needs to fit into room px. Button widths by name: long — with full labels, short — with short
// ones; a missing button (a session without effort) has no key.
export function pickStep({ long, short }, room) {
  const sum = (w, names, floor) => {
    const ws = names.filter((k) => w[k] != null).map((k) => (floor ? Math.min(w[k], MIN[k]) : w[k]));
    return ws.length ? ws.reduce((a, b) => a + b, 0) + GAP * (ws.length - 1) : 0;
  };
  if (sum(long, CHIPS) <= room) return 0;
  if (sum(short, CHIPS) <= room) return 1;
  if (sum(short, CHIPS, true) <= room) return 2;
  if (sum(short, ["par", "mod"], true) <= room) return 3;
  if (sum(short, ["par"], true) <= room) return 4;
  return 5;
}

// Hooks into the page. on() tells whether the theme is selected. Returns { hook, reset }: hook is called on every page redraw
// (cheap), reset — when the theme is switched off.
export function mountFit(on) {
  let ro = null, mo = null, dock = null, queued = false;
  const supported = () => typeof CSS !== "undefined" && CSS.supports?.("anchor-name: --a");
  const shown = (e) => !!e && e.getClientRects().length > 0;

  const clear = (d) => {
    for (const c of CLASSES) d.classList.remove(c);
    d.style.removeProperty("--fit-l");
    d.style.removeProperty("--fit-r");
    delete d.dataset.fit;
    for (const k of CHIPS) { const w = d.querySelector(`:scope > .status > .stat-${k}`); if (w) w.style.minWidth = ""; }
  };
  const set = (d, names) => { for (const c of CLASSES) d.classList.toggle(c, names.includes(c)); };

  const run = () => {
    queued = false;
    const d = document.querySelector(".dock-inner");
    if (!d || !on() || !supported()) { if (d) clear(d); return; }
    const card = d.querySelector(":scope > form.composer"), status = d.querySelector(":scope > .status");
    const bar = card?.querySelector(":scope > .bar:not(.reply-bar)");
    if (!card || !status || !bar || card.classList.contains("rec") || card.classList.contains("clean-vt-rec")) { clear(d); return; }
    for (const e of [d, card, bar, d.querySelector(":scope > .slot-host.composer")]) if (e) ro?.observe(e);

    const chips = {};
    for (const k of CHIPS) { const w = status.querySelector(`:scope > .stat-${k}`); if (w) chips[k] = w; }
    const widths = () => { const o = {}; for (const [k, w] of Object.entries(chips)) if (shown(w)) o[k] = w.getBoundingClientRect().width; return o; };
    const plus = card.querySelector(":scope > .attach");
    for (const w of Object.values(chips)) w.style.minWidth = "";   // left from the last run: widths are measured without it

    // The layout for a given wrap of plugin buttons: the free room on the bottom row — between «+» and the nearest button on
    // the right, 8 px off each — and the step of the status line (button widths with full and with short labels).
    const layout = (up) => {
      const mode = up ? ["clean-up"] : [];
      set(d, mode);
      const sr = status.getBoundingClientRect(), cr = card.getBoundingClientRect();
      const left = shown(plus) ? plus.getBoundingClientRect().right + GAP : cr.left + 12;
      let right = cr.right - 12;
      const occupants = [...bar.querySelectorAll(":scope > .mic, :scope > .send, :scope > .slot-composer-tools, :scope > .spacer > .dictate"), ...d.querySelectorAll(".vf-slot .btn")];
      for (const e of occupants) {
        if (!shown(e)) continue;
        const r = e.getBoundingClientRect();
        if (Math.min(r.bottom, sr.bottom) - Math.max(r.top, sr.top) > 4) right = Math.min(right, r.left - GAP);   // on the same row as the status
      }
      const long = widths();
      set(d, [...mode, "clean-fit-short"]);
      const step = pickStep({ long, short: widths() }, right - left);
      return { up, step, left, right, sr };
    };
    // Plugin buttons stay in one row while they fit with «+», camera, mic and send; otherwise they go a row above. If in one row
    // nothing is left for the status at all (step 5) and above it fits, the buttons go above: losing the executors and the
    // model altogether is worse than an extra row.
    set(d, []);
    let best = layout(bar.scrollWidth > bar.clientWidth + 1);
    if (best.step === 5 && !best.up) { const alt = layout(true); if (alt.step < 5) best = alt; }
    best = layout(best.up);
    d.style.setProperty("--fit-l", `${Math.max(0, Math.round(best.left - best.sr.left))}px`);
    d.style.setProperty("--fit-r", `${Math.max(0, Math.round(best.sr.right - best.right))}px`);
    set(d, [...(best.up ? ["clean-up"] : []), ...STEPS[best.step].map((n) => "clean-fit-" + n)]);
    d.dataset.fit = String(best.step);
    // shrinking with an ellipsis does not go below MIN: else a label is left as «Op…»
    const short = (set(d, [...(best.up ? ["clean-up"] : []), "clean-fit-short"]), widths());
    set(d, [...(best.up ? ["clean-up"] : []), ...STEPS[best.step].map((n) => "clean-fit-" + n)]);
    for (const [k, w] of Object.entries(chips)) w.style.minWidth = best.step >= 2 && short[k] != null ? `${Math.min(Math.ceil(short[k]), MIN[k])}px` : "";
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };

  const hook = () => {
    const d = on() ? document.querySelector(".dock-inner") : null;
    if (d === dock) return;
    ro?.disconnect(); mo?.disconnect();
    dock = d;
    if (!d) return;
    ro = new ResizeObserver(schedule);
    mo = new MutationObserver((list) => { if (list.some((m) => m.target !== d)) schedule(); });   // our own classes on .dock-inner do not count
    mo.observe(d, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden", "class"] });
    ro.observe(d);
    schedule();
    document.fonts?.ready?.then(schedule);
  };
  const reset = () => {
    ro?.disconnect(); mo?.disconnect(); ro = mo = null;
    const d = document.querySelector(".dock-inner");
    if (d) clear(d);
    dock = null;
  };
  return { hook, reset, run: schedule };
}

// The live waveform of a voice recording (the composer strip of the core and the theme's own over a draft, voicetext.js).
// The core opens the microphone and keeps its stream to itself, so the theme wraps navigator.mediaDevices.getUserMedia once
// and remembers the last audio-only stream the page got: the microphone is never opened a second time. While a recording
// strip with the clock [data-rec-clock] is on the page, a 54×24 canvas stands before the clock and shows the level of that
// stream: 14 bars (2 wide, step 4, radius 1) glide left, the newest enters at the right. When the stream ends or the
// strip is gone, the loop stops and the audio context is closed. With reduced motion the bars stand still at half height
// and no audio context is made at all (the core's own timer keeps counting).
//
// The strip is rebuilt by the core (or by voicetext.js) from time to time and the clock text is rewritten every 500 ms, so
// the canvas lives in its own host node that is put back before the clock after every rebuild (sweep), never inside .t.

const BARS = 14, STEP = 4, W = 54, H = 24, MIN = 4;   // the old static mask: 54×24, bar 2, step 4, r1
const EVERY = 80;   // ms between two new bars: 14 bars are about a second of sound
const CLOCK = "form.composer:is(.rec, .clean-vt-rec) .recstrip > .t[data-rec-clock]";

// level of a block of samples in 0..1: -60 dB is silence, -18 dB a loud voice; the low end is never zero (MIN px)
export const levelOf = (buf) => {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
  const db = 20 * Math.log10(Math.sqrt(sum / buf.length) || 1e-6);
  return Math.min(1, Math.max(0, (db + 60) / 38));
};
export const barHeight = (level) => MIN + Math.round(level * (H - MIN));

export function mountWave(on) {
  let last = null;   // the newest audio-only stream the page got
  const md = typeof navigator !== "undefined" ? navigator.mediaDevices : null;
  if (md?.getUserMedia && !md.getUserMedia.cleanWave) {
    const open = md.getUserMedia.bind(md);
    const wrapped = function (c) {   // the call stays synchronous: iOS hands the microphone out only inside the press
      const p = open(c);
      if (c && c.audio && !c.video) p.then((s) => { last = s; }, () => {});
      return p;
    };
    wrapped.cleanWave = true;
    try { md.getUserMedia = wrapped; } catch { /* a frozen object: the bars stay low */ }
  }
  const live = (s) => !!s && s.getAudioTracks().some((t) => t.readyState === "live");

  let run = null;   // {host, canvas, ctx, an, buf, raf, bars, at, calm, tint}
  const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function draw(r, now) {
    const g = r.canvas.getContext("2d");
    const k = r.canvas.width / W;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, W, H);
    if (now - r.tintAt > 500) { r.tint = getComputedStyle(r.host).color; r.tintAt = now; }
    g.fillStyle = r.tint;
    const slide = r.calm ? 0 : Math.min(1, (now - r.at) / EVERY) * STEP;   // the row glides left between two new bars
    for (let i = 0; i < r.bars.length; i++) {
      const h = r.bars[i], x = i * STEP - slide;
      g.beginPath();
      if (g.roundRect) g.roundRect(x, (H - h) / 2, 2, h, 1); else g.rect(x, (H - h) / 2, 2, h);
      g.fill();
    }
  }

  function frame(now) {
    const r = run;
    if (!r) return;
    if (!r.host.isConnected && !document.querySelector(CLOCK)) return stop();   // the strip is gone
    if (r.stream && !live(r.stream)) return stop();   // the recording ended
    if (r.an && now - r.at >= EVERY) {
      let level = 0;
      try {
        if (r.ctx.state === "running") { r.an.getByteTimeDomainData(r.buf); level = levelOf(r.buf); }
      } catch { level = 0; }
      r.bars.push(barHeight(level));
      r.bars.shift();
      r.at = now;
    }
    draw(r, now);
    r.raf = requestAnimationFrame(frame);
  }

  function stop() {
    const r = run;
    run = null;
    if (!r) return;
    cancelAnimationFrame(r.raf);
    try { r.src?.disconnect(); } catch { /* already gone */ }
    r.ctx?.close?.().catch?.(() => {});
    r.host.remove();
  }

  function start(clock) {
    const host = document.createElement("span");
    host.className = "clean-wave";
    host.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    host.append(canvas);
    clock.before(host);
    const r = run = { host, canvas, ctx: null, an: null, src: null, buf: null, raf: 0, stream: null, calm: calm(),
      bars: Array.from({ length: BARS + 1 }, () => MIN), at: performance.now(), tint: "currentColor", tintAt: -1e9 };
    if (r.calm) {   // standing bars at half height, drawn once; no audio context
      r.bars = r.bars.map(() => H / 2);
      draw(r, performance.now());
      r.raf = requestAnimationFrame(frame);
      return;
    }
    if (live(last)) {
      r.stream = last;
      const AC = window.AudioContext || window.webkitAudioContext;
      try {
        try { r.ctx = new AC({ sinkId: { type: "none" } }); } catch { r.ctx = new AC(); }   // as the core does: nothing is played
        r.ctx.resume?.().catch?.(() => {});
        r.an = r.ctx.createAnalyser();
        r.an.fftSize = 512;
        r.src = r.ctx.createMediaStreamSource(last);
        r.src.connect(r.an);
        r.buf = new Uint8Array(r.an.fftSize);
      } catch { r.ctx?.close?.().catch?.(() => {}); r.ctx = r.an = r.src = null; }
    }
    r.raf = requestAnimationFrame(frame);
  }

  return {
    // after every redraw of the page: a strip with a clock gets the canvas, a strip rebuilt without it gets it back
    sweep() {
      if (!on()) return stop();
      const clock = document.querySelector(CLOCK);
      if (!clock) return stop();
      if (!run) start(clock);
      else if (run.host.nextSibling !== clock) clock.before(run.host);
    },
    reset: stop,
  };
}

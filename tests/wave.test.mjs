// The live waveform of a recording (wave.js): levels, bar heights, the getUserMedia wrapper and the lifecycle of the canvas.
// Run: node --test tests/. No browser: the page is a handful of stubs.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const WAVE = pathToFileURL(path.join(import.meta.dirname, "..", "wave.js")).href;
const { levelOf, barHeight, mountWave } = await import(WAVE);

const block = (amp) => Uint8Array.from({ length: 512 }, (_, i) => 128 + Math.round(Math.sin(i / 3) * amp * 128));

test("silence is level 0 and still a visible bar, a loud voice is full height", () => {
  assert.equal(levelOf(block(0)), 0);
  assert.equal(barHeight(0), 4);
  assert.equal(barHeight(levelOf(block(0.5))), 24);
  const quiet = levelOf(block(0.01)), loud = levelOf(block(0.2));
  assert.ok(quiet < loud && barHeight(quiet) < barHeight(loud));
});

// a page with a recording strip: the clock node, a host, a fake audio context and a manual frame clock
function page({ calm = false, strip = true } = {}) {
  const w = { frames: [], closed: 0, opened: 0, inserted: [], level: 128 };
  const clock = { before: (n) => { w.inserted.push(n); n.isConnected = true; } };
  const canvas = { width: 0, height: 0, getContext: () => ({ setTransform() {}, clearRect() {}, beginPath() {}, roundRect() {}, rect() {}, fill() {}, set fillStyle(v) {} }) };
  const host = { className: "", isConnected: false, nextSibling: null, setAttribute() {}, append() {}, remove() { host.isConnected = false; } };
  globalThis.document = { createElement: (t) => (t === "canvas" ? canvas : host), querySelector: () => (w.strip ? clock : null) };
  w.strip = strip;
  globalThis.window = { devicePixelRatio: 2, AudioContext: class {
    constructor() { this.state = "running"; w.opened++; }
    resume() { return Promise.resolve(); }
    close() { w.closed++; return Promise.resolve(); }
    createAnalyser() { return { fftSize: 0, getByteTimeDomainData: (b) => b.fill(w.level) }; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  } };
  globalThis.matchMedia = () => ({ matches: calm });
  globalThis.performance = { now: () => w.now };
  globalThis.getComputedStyle = () => ({ color: "#000" });
  globalThis.requestAnimationFrame = (f) => { w.frames.push(f); return w.frames.length; };
  globalThis.cancelAnimationFrame = () => {};
  const track = { readyState: "live" };
  w.track = track;
  const stream = { getAudioTracks: () => [track] };
  let gum = async () => stream;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { get getUserMedia() { return gum; }, set getUserMedia(f) { gum = f; } } } });
  w.now = 0;
  w.step = (ms = 100) => { w.now += ms; const f = w.frames.shift(); f?.(w.now); };
  return w;
}

test("the wrapper remembers the audio stream the core opened and leaves the call itself alone", async () => {
  const w = page();
  const wave = mountWave(() => true);
  const got = await navigator.mediaDevices.getUserMedia({ audio: true });
  assert.ok(got, "the stream still comes back to the caller");
  wave.sweep();
  assert.equal(w.opened, 1, "one analysis context for the recording");
  assert.equal(w.inserted.length, 1, "the canvas stands before the clock");
  wave.sweep();
  assert.equal(w.opened, 1, "a second sweep does not start a second run");
});

test("a video request is not taken for the microphone", async () => {
  const w = page();
  const wave = mountWave(() => true);
  await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  wave.sweep();
  assert.equal(w.opened, 0, "no stream was remembered: the bars stay low, nothing is opened");
});

test("the context is closed when the stream ends, and when the strip goes away", async () => {
  const w = page();
  const wave = mountWave(() => true);
  await navigator.mediaDevices.getUserMedia({ audio: true });
  wave.sweep();
  w.step(); w.step();
  w.track.readyState = "ended";
  w.step();
  assert.equal(w.closed, 1);
  const w2 = page();
  const wave2 = mountWave(() => true);
  await navigator.mediaDevices.getUserMedia({ audio: true });
  wave2.sweep();
  w2.strip = false;
  wave2.sweep();
  assert.equal(w2.closed, 1);
});

test("reduced motion makes no audio context", async () => {
  const w = page({ calm: true });
  const wave = mountWave(() => true);
  await navigator.mediaDevices.getUserMedia({ audio: true });
  wave.sweep();
  assert.equal(w.opened, 0);
  assert.equal(w.inserted.length, 1);
});

test("the theme off: nothing is started", async () => {
  const w = page();
  const wave = mountWave(() => false);
  await navigator.mediaDevices.getUserMedia({ audio: true });
  wave.sweep();
  assert.equal(w.opened, 0);
  assert.equal(w.inserted.length, 0);
});

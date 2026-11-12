// Show engine for output.html: loads a song's assets, runs its Hydra program, and keeps the
// cue clock + beat clock that the song code reads (C, CB, beats, tempo, ramp, …).
// Needs: hydra (makeGlobal), core.js, assets.js, scenes.js.

window.TAU = Math.PI * 2;

// ---------------- clocks ----------------
const clock = {
  cueTimes: [],   // Hydra `time` when scene n (index n-1) started
  cueBeats: [],   // beat count when scene n started
  beats: 0,       // beats since the song started (integrated, so tempo changes stay smooth)
  bpm: 0, fromBpm: 0, rampStart: 0, rampDur: 0,
  last: null,
};

window.tempo = () => {
  if (clock.rampDur <= 0) return clock.bpm;
  const p = Math.min(1, Math.max(0, (time - clock.rampStart) / clock.rampDur));
  return clock.fromBpm + (clock.bpm - clock.fromBpm) * p;
};
window.beats = () => clock.beats;
window.C = (n) => (clock.cueTimes[n - 1] == null ? null : time - clock.cueTimes[n - 1]);
window.CB = (n) => (clock.cueBeats[n - 1] == null ? null : clock.beats - clock.cueBeats[n - 1]);
window.ramp = (n, secs) => {
  const c = C(n);
  if (c === null) return 0;
  return secs <= 0 ? 1 : Math.min(1, c / secs);
};
window.smooth = (n, secs) => { const p = ramp(n, secs); return p * p * (3 - 2 * p); };
window.softBeats = (b, k) => (b == null || b <= 0 ? 0 : b < k ? (b * b) / (2 * k) : b - k / 2);
window.stepUp = (b, every, rise = 0.25) => {
  if (b == null || b < every) return 0;
  const n = Math.floor(b / every);
  return n - 1 + Math.min(1, (b - n * every) / rise);
};

// ---------------- assets ----------------
const isVideoFile = (f) => /\.(mp4|m4v|webm|mov)$/i.test(f);
const blobs = new Map();   // asset name -> Promise<object URL>  (whole file in memory: no streaming during the show)

function assetFile(name) {
  const f = ASSETS[name];
  if (!f) throw new Error(`Unknown asset "${name}" (not in js/assets.js)`);
  return f;
}

function fetchAsset(name) {
  if (!blobs.has(name)) {
    const p = fetch('assets/' + assetFile(name))
      .then(r => { if (!r.ok) throw new Error(`could not load ${name} (${r.status})`); return r.blob(); })
      .then(b => URL.createObjectURL(b));
    p.catch(() => blobs.delete(name));
    blobs.set(name, p);
  }
  return blobs.get(name);
}

const programAssets = (def) => Object.values(def.sources || {}).map(s => s.asset);
function preloadProgram(def) { programAssets(def).forEach(n => fetchAsset(n).catch(() => {})); }

// free memory used by songs that are no longer near
function pruneAssets(keepDefs) {
  const keep = new Set(keepDefs.flatMap(programAssets));
  for (const [name, p] of blobs) {
    if (!keep.has(name)) { blobs.delete(name); p.then(u => URL.revokeObjectURL(u)).catch(() => {}); }
  }
}

// ---------------- feeds: things that fill a Hydra source slot ----------------
class ImageFeed {
  constructor(url, place) { this.url = url; this.place = place; }
  async prepare() {
    const img = await loadImageUrl(this.url);
    this.aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
    this.canvas = fitToCanvas(img, this.place, OUT_W, OUT_H);
  }
  // slot.aspect = the image's own width / height (song code can use L.name.aspect)
  attach(slot) { initSlot(slot, this.canvas, false); slot.aspect = this.aspect; }
  start() {} tick() {} stop() {}
}

class VideoFeed {
  // from: seconds to start at and loop back to (to skip frames at the start of a file)
  // rate: playback speed (1 = normal, 1.5 = 50% faster)
  constructor(url, place, loop, from = 0, rate = 1) {
    const v = this.v = document.createElement('video');
    this.from = from;
    this.manualLoop = loop && from > 0;      // the browser's own loop would go back to 0
    v.muted = true; v.playsInline = true; v.loop = loop && !from; v.preload = 'auto'; v.src = url;
    v.defaultPlaybackRate = rate; v.playbackRate = rate;
    this.place = place;
    this.canvas = document.createElement('canvas');
    this.canvas.width = OUT_W; this.canvas.height = OUT_H;
    this.g = this.canvas.getContext('2d');
    this.dirty = true;
  }
  prepare() {
    return new Promise((resolve, reject) => {
      const v = this.v;
      if (v.readyState >= 2) return resolve();
      const t = setTimeout(resolve, 8000);   // don't hang the show on a slow video
      v.addEventListener('loadeddata', () => { clearTimeout(t); resolve(); }, { once: true });
      v.addEventListener('error', () => { clearTimeout(t); reject(new Error('could not play ' + this.v.src)); }, { once: true });
    });
  }
  attach(slot) { this.draw(); initSlot(slot, this.canvas, true); }
  start() { const v = this.v; v.currentTime = this.from; v.playbackRate = v.defaultPlaybackRate; this.dirty = true; v.play().catch(() => {}); }
  stop() { this.v.pause(); }
  draw() {
    const v = this.v;
    if (v.readyState < 2 || !v.videoWidth) return;
    if (this.from && (v.currentTime < this.from - 0.001 || v.seeking)) return;   // never show the skipped frames
    this.g.clearRect(0, 0, OUT_W, OUT_H);
    this.g.drawImage(v, ...placeRect(v.videoWidth, v.videoHeight, this.place, OUT_W, OUT_H));
  }
  tick() {
    const v = this.v;
    if (this.manualLoop && !v.paused && (v.ended || (v.duration && v.currentTime >= v.duration - 0.03))) {
      v.currentTime = this.from;
      v.play().catch(() => {});
    }
    if (!v.paused || this.dirty) { this.draw(); this.dirty = v.readyState < 2; }
  }
  release() { this.v.pause(); this.v.removeAttribute('src'); this.v.load(); }
}

// Video whose ends don't meet: two copies, the next loop fades in `fade` s before the end.
// In code: L.name.chain((chain, loop) => chain.…) — loop.t() / loop.beats() count from that
// copy's own start, so per-loop effects reset on every loop.
class XfadeLoop {
  constructor(url, place, fade) {
    this.fade = fade;
    this.feeds = [new VideoFeed(url, place, false), new VideoFeed(url, place, false)];
    this.active = 0; this.incoming = -1; this.started = false;
    this.startBeat = [0, 0]; this.startTime = [0, 0];
    this.x = 0;   // how much of copy 1 is showing
  }
  prepare() { return Promise.all(this.feeds.map(f => f.prepare())); }
  attach(slotA, slotB) { this.slots = [slotA, slotB]; this.feeds[0].attach(slotA); this.feeds[1].attach(slotB); }
  startCopy(i) { this.feeds[i].start(); this.startBeat[i] = clock.beats; this.startTime[i] = time; }
  start() {
    this.feeds[1].stop();
    this.active = 0; this.incoming = -1; this.started = true;
    this.startCopy(0);
  }
  stop() { this.started = false; this.feeds.forEach(f => f.stop()); }
  tick() {
    if (this.started) {
      const act = this.feeds[this.active].v;
      if (this.incoming < 0 && act.duration && act.currentTime >= act.duration - this.fade) {
        this.incoming = 1 - this.active;
        this.startCopy(this.incoming);
      }
      if (this.incoming >= 0) {
        const p = Math.min(1, this.feeds[this.incoming].v.currentTime / this.fade);
        this.x = this.incoming === 1 ? p : 1 - p;
        if (p >= 1) { this.feeds[this.active].stop(); this.active = this.incoming; this.incoming = -1; }
      } else {
        this.x = this.active;
      }
    }
    this.feeds.forEach(f => f.tick());
  }
  chain(fn) {
    const loop = (i) => ({ t: () => time - this.startTime[i], beats: () => clock.beats - this.startBeat[i] });
    return fn(src(this.slots[0]), loop(0)).blend(fn(src(this.slots[1]), loop(1)), () => this.x);
  }
  release() { this.feeds.forEach(f => f.release()); }
}

function initSlot(slot, canvas, dynamic) {
  if (slot.tex) slot.tex.destroy();
  slot.init({ src: canvas, dynamic });
}

// ---------------- programs (pre-show / songs) ----------------
// prepare: load everything without touching what's on screen; activate: swap in instantly.
async function prepareProgram(def) {
  const entries = Object.entries(def.sources || {});
  const items = await Promise.all(entries.map(async ([key, spec]) => {
    const url = await fetchAsset(spec.asset);
    const place = sourcePlace(spec);
    let feed;
    if (!isVideoFile(assetFile(spec.asset))) feed = new ImageFeed(url, place);
    else if (spec.loop === 'xfade') feed = new XfadeLoop(url, place, spec.fade || 2);
    else feed = new VideoFeed(url, place, spec.loop !== false, spec.from || 0, spec.rate || 1);
    await feed.prepare();
    return { key, spec, feed, video: isVideoFile(assetFile(spec.asset)) };
  }));
  return { def, items };
}

let running = null;   // { def, items }

function activateProgram(prog, startScene) {
  const slots = hydra.s;
  let n = 0;
  const L = {};
  for (const it of prog.items) {
    if (it.feed instanceof XfadeLoop) { it.feed.attach(slots[n], slots[n + 1]); n += 2; L[it.key] = it.feed; }
    else { it.feed.attach(slots[n]); L[it.key] = slots[n]; n += 1; }
  }
  if (n > slots.length) throw new Error('Too many sources in one song');

  // stop the old program's videos
  if (running) running.items.forEach(it => it.feed.release && it.feed.release());
  running = prog;

  // clocks: as if the song had been playing up to `startScene`, following the cue timestamps
  const scenes = prog.def.scenes || [];
  clock.cueTimes = []; clock.cueBeats = []; clock.beats = 0; clock.last = time;
  const target = scenes[startScene - 1];
  clock.bpm = clock.fromBpm = (target && target.bpm) || 0; clock.rampDur = 0;
  const atK = target ? parseAt(target.at) : null;
  for (let j = 1; j <= startScene; j++) {
    const atJ = parseAt(scenes[j - 1].at);
    const ago = atK != null && atJ != null ? Math.max(0, atK - atJ) : (startScene - j) * 30;
    clock.cueTimes[j - 1] = time - ago;
    clock.cueBeats[j - 1] = -ago * (scenes[j - 1].bpm || clock.bpm) / 60;
  }

  // videos: play the ones whose part of the song is running now
  prog.items.forEach(it => {
    if (!it.video) return;
    const k = Math.max(startScene, 1);
    const started = (it.spec.startAt || 1) <= k || !scenes.length;
    const stopped = it.spec.stopAt && it.spec.stopAt <= k;
    if (started && !stopped) it.feed.start();
  });

  window.L = L;
  runCode(codeFor(prog.def, startScene));
}

// The code that should be running at scene k: the last scene up to k that has its own code
// (a scene that resets everything), otherwise the song's code.
function codeFor(def, k) {
  const scenes = def.scenes || [];
  for (let j = Math.min(k, scenes.length); j >= 1; j--) if (scenes[j - 1].code) return scenes[j - 1].code;
  return def.code;
}

function runCode(code) {
  resetOutputs();
  fxReset();
  new Function(code)();
  fxScreen();   // live whole-screen effects on top (js/livefx.js)
}

function fireScene(k) {
  const scene = running.def.scenes[k - 1];
  clock.cueTimes[k - 1] = time;
  clock.cueBeats[k - 1] = clock.beats;
  if (scene.bpm) {
    clock.fromBpm = tempo();
    clock.bpm = scene.bpm;
    clock.rampStart = time;
    clock.rampDur = scene.bpmRamp || 0;
  }
  running.items.forEach(it => {
    if (!it.video) return;
    if (it.spec.startAt === k) it.feed.start();
    if (it.spec.stopAt === k) it.feed.stop();
  });
  if (scene.code) runCode(scene.code);
}

function resetOutputs() {
  hydra.o.forEach(o => solid(0, 0, 0, 0).out(o));
  render(o0);
}

function engineTick() {
  if (clock.last != null) {
    const dt = Math.max(0, Math.min(0.25, time - clock.last));
    clock.beats += (dt * tempo()) / 60;
  }
  if (clock.last != null) fxTick(Math.max(0, Math.min(0.25, time - clock.last)), tempo());
  clock.last = time;
  if (running) running.items.forEach(it => it.feed.tick());
  requestAnimationFrame(engineTick);
}

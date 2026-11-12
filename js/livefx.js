// Live FX: effects the operator can switch on/off at any time, on top of the cued scenes.
// Built from the lab presets (index.html). Loaded by control.html (names, keys) and
// output.html (the effects themselves).
//
// 'fg'     acts on the foreground layers a song wraps in fx(() => chain)
// 'screen' acts on the whole picture
// Each effect eases in/out over FX_FADE seconds, follows the song's beat, and is scaled by
// the FX amount slider.

const LIVE_FX = [
  { id: 'spin',    key: '1', label: 'Spin',          on: 'fg',     desc: 'Foregrounds turn (1 turn / 16 beats)' },
  { id: 'pulse',   key: '2', label: 'Pulse',         on: 'fg',     desc: 'Foregrounds zoom in/out on every beat' },
  { id: 'liquid',  key: '3', label: 'Liquid',        on: 'fg',     desc: 'Foregrounds wobble like liquid' },
  { id: 'twist',   key: '4', label: 'Twist',         on: 'fg',     desc: 'Foregrounds swirl' },
  { id: 'kaleido', key: '5', label: 'Kaleidoscope',  on: 'fg',     desc: 'Foregrounds mirrored 6 ways' },
  { id: 'echo',    key: '6', label: 'Echo copies',   on: 'fg',     desc: 'Fading, bigger copies behind the foregrounds' },
  { id: 'color',   key: '7', label: 'Color cycle',   on: 'fg',     desc: 'Foreground colours rotate' },
  { id: 'glitch',  key: '8', label: 'Glitch',        on: 'fg',     desc: 'Foregrounds jump sideways in bands' },
  { id: 'rgb',     key: '9', label: 'RGB split',     on: 'screen', desc: 'Whole picture splits into red / cyan' },
  { id: 'trails',  key: '0', label: 'Trails',        on: 'screen', desc: 'Whole picture leaves zooming trails' },
];

const FX_FADE = 1.5;   // seconds to ease an effect in or out

// ---------------- output side ----------------
const FX = {
  on: {}, k: {},     // switched on? / current strength 0..1
  amount: 1,         // operator's FX amount slider (0..2)
  beat: 0,           // own beat clock (keeps running even in songs without a bpm)
  spin: 0, hue: 0,   // accumulated angle / hue so they don't jump when strength changes
};
LIVE_FX.forEach(f => { FX.on[f.id] = false; FX.k[f.id] = 0; });

const fxK = (id) => FX.k[id] * FX.amount;

function fxTick(dt, bpm) {
  const step = dt / FX_FADE;
  for (const f of LIVE_FX) {
    const target = FX.on[f.id] ? 1 : 0;
    FX.k[f.id] += Math.max(-step, Math.min(step, target - FX.k[f.id]));
  }
  const bps = (bpm || 60) / 60;
  FX.beat += dt * bps;
  // spin: turn while on; when switched off, settle back to upright (nearest full turn)
  if (FX.on.spin) FX.spin += dt * bps * (Math.PI * 2 / 16) * fxK('spin');
  else FX.spin += (Math.round(FX.spin / (Math.PI * 2)) * Math.PI * 2 - FX.spin) * Math.min(1, dt * 1.2);
  // colour cycle: same idea for the hue
  if (FX.on.color) FX.hue += dt * bps * 0.05 * fxK('color');
  else FX.hue += (Math.round(FX.hue) - FX.hue) * Math.min(1, dt * 1.2);
}

// Wrap a foreground so the live FX can act on it.  make: () => a fresh Hydra chain.
// The layer is first drawn into its own buffer, and the effects (which need several copies of
// it) read that buffer — otherwise one shader would need more image inputs than the GPU allows.
// Each fx() uses two of the outputs o4…o11 (so up to 4 foregrounds per song).
const FX_FIRST_OUTPUT = 4;
let fxNextOutput = FX_FIRST_OUTPUT;
function fxReset() { fxNextOutput = FX_FIRST_OUTPUT; }

// fx(make): the layer with live FX, as a chain.
// fxLayer(make): the same, but returns a function giving fresh copies of it — for scenes that
// draw the layer several times (e.g. rotated copies, each with its own opacity).
function fx(make) { return fxLayer(make)(); }

function fxLayer(make) {
  const outs = typeof hydra !== "undefined" && hydra.o;
  if (!outs || fxNextOutput + 1 >= outs.length) return make;   // no buffers left: no live FX on this layer
  const layerBuf = outs[fxNextOutput++], fxBuf = outs[fxNextOutput++];
  make().out(layerBuf);
  const layer = () => fg(layerBuf);
  const beat = (period) => Math.sin(FX.beat * Math.PI * 2 / period);

  // distortions (Liquid wobble, Twist swirl, Glitch presets)
  const warped = () => layer()
    .modulate(noise(3, 0.2), () => 0.05 * fxK('liquid'))
    .modulateRotate(osc(2, 0.1), () => 0.6 * fxK('twist'))
    .modulateScrollX(noise(3, 0.8).pixelate(1, 24).thresh(0.25), () => 0.08 * fxK('glitch'));

  // Kaleidoscope preset: 80% size, breathing ±10%
  const mirrored = () => warped().blend(
    kaleidoscope(warped(), 6).scale(() => 0.8 + 0.1 * beat(8)),
    () => Math.min(1, fxK('kaleido')));

  // Spin + Pulse, Color cycle; i > 0 = echo copy i (bigger, lagging, fainter)
  const moved = (i) => spin(mirrored(), () => FX.spin - i * 0.12 * fxK('echo'))
    .scale(() => (1 + 0.08 * fxK('pulse') * beat(1)) * (1 + i * 0.12 * fxK('echo')))
    .hue(() => FX.hue)
    .saturate(() => 1 + 0.5 * fxK('color'));   // (not colorama: it turns pure white black)

  const copy = (i) => moved(i).color(1, 1, 1, () => Math.min(1, fxK('echo')) * (1 - i * 0.24));
  copy(3).layer(copy(2)).layer(copy(1)).layer(moved(0)).out(fxBuf);
  return () => fg(fxBuf);
}

// Whole-screen effects: the song draws into o0; this draws o0 -> o3 (trails) -> o2 (RGB split)
// and shows o2.  Songs must not use o2 / o3.
function fxScreen() {
  src(o0)
    .blend(src(o3).scale(1.012), () => Math.min(0.8, 0.75 * fxK("trails")))
    .out(o3);
  const shift = () => 0.012 * fxK('rgb') * Math.sin(FX.beat * Math.PI * 2 / 4);
  src(o3).color(1, 0, 0, 0.5).scrollX(shift)
    .add(src(o3).color(0, 1, 1, 0.5).scrollX(() => -shift()))
    .out(o2);
  render(o2);
}

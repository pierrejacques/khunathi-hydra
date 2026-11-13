// The show, transcribed from cues.md. Shared by control.html (what the operator reads) and
// output.html (what gets drawn).
//
// Order: PRE (on screen before the first GO), then each song's scenes.
// Every GO starts the next scene. Scenes inside a song build on each other, so a song is ONE
// Hydra program (code) that reads the cue clock to know which scenes have started.
//
// Song fields:
//   title, en       names shown to the operator
//   transition      'cut' (straight in, e.g. when it starts on the image already showing) or
//                   'black' (fade through black)
//   sources         { name: { asset, fit | width, anchor, loop, fade, startAt, stopAt } }  -> L.name in the code
//                     asset    name from cues.md (files are listed in js/assets.js)
//                     fit      'cover' fills the frame, 'fill' stretches to the frame,
//                              'raw' keeps the image as is (for panX on very wide images)
//                     width    0.45 = centred, 45% of the output width, aspect kept
//                     loop     videos loop by default; 'xfade' = cross-fade each loop into the next
//                              (for videos whose ends don't meet), fade = seconds of overlap
//                     anchor   'bottom' = sits on the bottom edge of the screen instead of centred
//                     startAt  scene number when a video starts playing from its beginning
//                     stopAt   scene number when a video stops (its part of the song is over)
//                     from     seconds to start at and loop back to (skip frames at the start)
//   scenes          one per GO, in order:
//                     name, at ('m:ss' in the song), when (moment in the music), bpm,
//                     bpmRamp (seconds to glide from the previous bpm), does (shown to the operator),
//                     tip (an optional hint for the operator),
//                     code (optional: this scene resets everything and runs its own Hydra code from
//                     here on, instead of the song's code)
//   code            Hydra code. Helpers (all return numbers; wrap them in () => … for animation):
//                     C(n)         seconds since scene n started, null before
//                     CB(n)        beats since scene n started, null before (follows bpm changes)
//                     beats()      beats since the song started; tempo() current bpm
//                     ramp(n, s)   0 before scene n, then rises linearly to 1 over s seconds
//                     smooth(n, s) same with an ease in/out
//                     softBeats(b, k)  like b, but accelerates from standstill over k beats (null -> 0)
//                     stepUp(b, every, rise)  0,1,2,… going up one every `every` beats, each step
//                                  easing in over `rise` beats
//                     TAU = 2π;  fg(), spin(), kaleidoscope(), .over(), .lakeWave() from core.js
//                     fx(() => chain)  wrap each foreground so the live FX buttons act on it
//                     fxLayer(() => chain)  same, but returns a function giving copies of the result
//                                  (for layers drawn several times, e.g. rotated copies)
//                     Songs draw to o0 (o1 is free); o2 and up belong to the live FX.

const PRE = {
  title: 'Pre-show',
  note: 'Shown while waiting. GO starts 撒马尔罕.',
  sources: {
    bg: { asset: 'samarkand-bg-blue', fit: 'cover' },
  },
  code: `src(L.bg).out()`,
};

// Stand-in for songs whose visuals aren't in cues.md yet: a slow, dark colour drift,
// so rehearsals can run through the whole show.
const placeholderSong = (title, en) => ({
  title,
  en,
  transition: 'black',
  sources: {},
  scenes: [{ name: 'Placeholder', at: '0:00', when: 'At the start of the song', does: ['Visuals for this song are not designed yet'] }],
  code: `
osc(2, 0.02, 0.4)
  .modulate(noise(1.5, 0.05), 0.4)
  .color(0.35, 0.25, 0.5)
  .saturate(0.5)
  .brightness(-0.25)
  .out()`,
});

// 撒马尔罕 from 加速段落 (scene 6) on: everything resets, so it's a program of its own.
const SAMARKAND_PART2 = `
// ---- tuning: values marked * are guesses, the rest come from cues.md ----
const RING_HUE_BEATS = 16   // * ring's hue turns once every 16 beats (6 s at 160 bpm)
const RING_TURN_BEATS = 32  // * ring turns once every 32 beats = half the hue's speed (12 s)
const D3_IN = 2             // * s, three dancers fade in
const D3_SMALL = 0.6        // 60% width for the first 6 beats…
const D3_SMALL_OPACITY = 0.8 // …at opacity 0.8 (the 2 big beats are at full opacity)
const D3_SHIFT = 0.15       // then 100% width, moved 15% of the screen to the left
const D3_COPIES = 8         // a faint copy every 100 ms, 8 in all
const D3_COPY_GAP = 0.1     // s
const D3_COPY_TURN = 6.75 * Math.PI / 180   // each copy 6.75° further clockwise (around the bottom middle)
const D3_COPY_OPACITY = 0.2

// ---- scene 6: purple tiles, static; scene 7 cuts to the purple blooming video ----
const background = src(L.purple).blend(src(L.purpleBloom), () => C(7) === null ? 0 : 1)

// ---- scene 7: purple ring, its bottom middle on the screen's bottom middle, Overlay blend;
//      hue turns with the beat, the ring turns clockwise around the screen's bottom middle at half
//      that speed.  (Hydra's y runs down: (0.5, 1) is the bottom middle of the screen.) ----
const BOTTOM_MIDDLE = [0.5, 1]
const ring = spinAt(
    fg(L.purpleRing).hue(() => (CB(7) || 0) / RING_HUE_BEATS),
    () => TAU * (CB(7) || 0) / RING_TURN_BEATS, ...BOTTOM_MIDDLE)

// ---- scene 7: three dancers (light on black -> Lighten), an 8-beat loop, every 2nd loop mirrored ----
//   beats 0–6: centred, 78% wide
//   beats 6–8: 100% wide, 15% to the left, plus a faint copy every 100 ms (8 in all), each turned
//              6.75° further clockwise around the bottom middle of the screen
const d3Beat = () => Math.max(0, CB(7) || 0)
const d3Wide = () => d3Beat() % 8 >= 6
const d3WideSecs = () => (d3Beat() % 8 - 6) * 60 / (tempo() || 160)
const d3Mirror = () => Math.floor(d3Beat() / 8) % 2 === 1 ? -1 : 1     // 2nd, 4th, … loop
const dancers3 = fxLayer(() => fg(L.dancers3))                    // drawn once (with live FX), copied below
const posed = () => dancers3()
  .scale(() => d3Wide() ? 1 : D3_SMALL)
  .moveBy(() => d3Wide() ? -D3_SHIFT : 0, 0)
const d3Copy = (k) => spinAt(posed(), k * D3_COPY_TURN, ...BOTTOM_MIDDLE).scale(1, d3Mirror, 1)   // + = clockwise
const d3CopyOpacity = (k) => () =>
  d3Wide() && d3WideSecs() >= k * D3_COPY_GAP ? D3_COPY_OPACITY * ramp(7, D3_IN) : 0

let picture = background.overlay(ring, () => C(7) === null ? 0 : 1)
for (let k = D3_COPIES; k >= 1; k--) picture = picture.over(d3Copy(k), d3CopyOpacity(k), 1)
picture
  // 6 small beats (no copies): Difference; 2 big beats (with copies): Lighten
  .difference(posed().scale(1, d3Mirror, 1), () => d3Wide() ? 0 : ramp(7, D3_IN) * D3_SMALL_OPACITY)
  .over(posed().scale(1, d3Mirror, 1), () => d3Wide() ? ramp(7, D3_IN) : 0, 1)
  .out()`;

// 长安西郊夜巴黎 scenes 3–4 (the montage, then the cross-fade into 念经): one program, so 念经
// can cross-fade from the montage.
const YEBALI_MONTAGE = `
// ---- tuning: values marked * are guesses, the rest come from cues.md ----
const GRAIN = 0.18          // * film grain strength on the group clip
const GROUP_HUE = 0.06      // * random hue shift up to ±0.06 per round (not on the 1st round)
const CLOUD_WAVE = 0.012    // * how much the clouds wave sideways
const BIRDS_W = 0.37        // 37vw
const XFADE = 2             // * s, cross-fade into 念经 (scene 4)
const BW_WAVE = 0.006       // * how much the black & white picture floats
const CHAR_AFTER = 7        // beats into 念经 before the characters appear
const CHAR_IN = 0.5         // * s, their fade-in
const CHAR_CELL = 0.2       // grain cells about 20vh
const CHAR_MIN = 0.1        // * darkest the noise makes the characters (0 = gone)
const CHAR_OPACITY = 0.3

const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }

// ---- scene 3: 8-beat montage, hard cuts: 5 beats group, 2 beats clouds, 1 beat mountains + birds ----
const mb = () => Math.max(0, CB(3) || 0)
const round = () => Math.floor(mb() / 8)
const phase = () => mb() % 8
const isGroup = () => phase() < 5
const isCloud = () => phase() >= 5 && phase() < 7

// group: film grain (moves every frame), plus a slight random hue shift each round after the first
const group = grainy(L.group, GRAIN, () => Math.floor(time * 24))
  .hue(() => round() === 0 ? 0 : (rnd(round(), 1) - 0.5) * 2 * GROUP_HUE)
// clouds: sideways waving, slow, so they float
const cloud = src(L.cloud).lakeWave(CLOUD_WAVE, 1.5, () => (C(3) || 0) * 1.2)
// birds (Darken): start just above the screen, right edge on the screen's right edge, then fly at 45°
// down-left through the screen and out again in 2/3 of the beat (Hydra's y runs down)
const birdsH = BIRDS_W * ASPECT / L.birds.aspect   // its height in screen-height units (from its own proportions)
const BIRDS_SPEED = 1.5                  // 1.5x: crosses the screen in 2/3 of the beat
const birdsT = () => (phase() - 7) * BIRDS_SPEED   // 0..1 = entering to gone
const travel = 1 + birdsH                 // down until its top passes the bottom edge (screen heights)
const birds = fg(L.birds).moveBy(
  () => (1 - BIRDS_W / 2 - 0.5) - birdsT() * travel / ASPECT,    // x: same distance as y, in pixels
  () => (-birdsH / 2 - 0.5) + birdsT() * travel)
const montage = src(L.mountains)
  .darken(birds, () => phase() >= 7 ? 1 : 0)
  .blend(cloud, () => isCloud() ? 1 : 0)
  .blend(group, () => isGroup() ? 1 : 0)

// ---- scene 4: cross-fade to the black & white picture, floating; after 3 beats the characters
//      appear with Difference, dimmed and brightened by coarse moving noise (cells ~20vh) so they
//      drift between readable and unreadable ----
const bw = src(L.bw)
  .lakeWave(BW_WAVE, 1.2, () => (C(4) || 0) * 0.9)
  .modulateScrollY(osc(1.5, 0.05), BW_WAVE * 0.6)
// noise() runs -1..1: ×0.5 + 0.5 -> 0..1, then more contrast so cells swing clearly dark / bright
const coarse = noise(1 / CHAR_CELL, 0.25).color(0.5, 0.5, 0.5).add(solid(0.5, 0.5, 0.5))
  .contrast(2.2).add(solid(CHAR_MIN, CHAR_MIN, CHAR_MIN))
const characters = src(L.characters).mult(coarse)
const charOpacity = () => {
  const b = CB(4)
  return b === null || b < CHAR_AFTER ? 0 : Math.min(1, (b - CHAR_AFTER) * 60 / (tempo() || 73) / CHAR_IN)
}
const chant = bw.difference(characters, () => CHAR_OPACITY * charOpacity())

montage
  .blend(chant, () => smooth(4, XFADE))
  .out()`;

const SONGS = [
  {
    title: '撒马尔罕',
    en: 'Samarkand',
    transition: 'cut',   // starts on the same tiles as the pre-show
    sources: {
      bg:      { asset: 'samarkand-bg-blue', fit: 'cover' },
      door:    { asset: 'samarkand-fg-door', width: 0.25 },
      bloom:   { asset: 'samarkand-bg-blue-blooming', fit: 'cover', loop: 'xfade', fade: 2, startAt: 4, stopAt: 6 },
      dancers: { asset: 'samarkand-fg-4dancers', width: 0.65, startAt: 5, stopAt: 6 },
      // from 加速段落 (scene 6)
      purple:      { asset: 'samarkand-bg-purple', fit: 'cover' },
      purpleBloom: { asset: 'samarkand-bg-purple-blooming', fit: 'cover', startAt: 7 },
      purpleRing:  { asset: 'samarkand-bg-purple-rotate', width: 1.09375, anchor: 'bottom' },
      // starts at frame 2 and loops back to frame 2: frames 0–1 have a white background (24 fps)
      dancers3:    { asset: 'samarkand-fg-3dancers', width: 1, startAt: 7, from: 2 / 24 },
    },
    scenes: [
      {
        name: '开场', at: '0:00', bpm: 66,
        when: '当贝斯开始演奏第一个音，全曲开始时',
        does: ['Door fades in over 20 s', 'Door ripples like a reflection on a lake, with the beat'],
      },
      {
        name: '吉他进', at: '1:00', bpm: 66,
        when: '吉他开始演奏乐句',
        does: ['Background hue swings back and forth with the beat, colours get richer'],
      },
      {
        name: 'Chorus', at: '2:00', bpm: 66,
        when: '两把吉他共同演奏和弦',
        does: ['Door becomes a turning kaleidoscope (Normal blend), breathing in and out',
               'Every 4 beats the background splashes outwards'],
      },
      {
        name: '主题出现', at: '2:28', bpm: 66,
        when: '主音吉他演奏主题',
        does: ['Door fades out', 'Background fades to the blooming tiles video (hue keeps swinging)', 'Video fades a step closer to white every 2 beats, resets each loop'],
      },
      {
        name: '推进', at: '2:56', bpm: 76, bpmRamp: 5,
        when: '鼓组整体进来以后',
        does: ['Four dancers fade in (Difference), leaving a turning copy every 2 beats (each holds 1 beat, then fades over 4)',
               'Effects speed up to 76 bpm over 5 s'],
        tip: '中段可加 Kaleidoscope (Live FX key 5)',
      },
      {
        name: '加速段落', at: '5:08', bpm: 160,
        when: '在中间暂停之后，吉他重新加快进入',
        does: ['Everything resets: purple tiles only, static'],
        code: SAMARKAND_PART2,
      },
      {
        name: '鼓组进入', at: '5:32', bpm: 160,
        when: '鼓组加强后进入规整节奏',
        does: ['Background becomes the purple blooming video',
               'Purple ring overlays it from the bottom, turning and changing colour with the beat',
               'Three dancers fade in: 6 beats centred (60%, opacity 0.8, Difference), then 2 beats big and shifted with a fan of 8 faint copies; every 2nd round mirrored'],
      },
    ],
    code: `
// ---- tuning: values marked * are guesses, the rest come from cues.md ----
const DOOR_IN = 20          // s, door fade-in (scene 1)
const WAVE_AMP = 0.005      // * lake wave strength (fraction of the width)
const WAVE_BEATS = 4        // * one wave cycle every 4 beats
const HUE_RANGE = 0.15      // * ± part of the colour wheel (0.15 = ±54°)  (scene 2)
const HUE_BEATS = 8         // * one back-and-forth every 8 beats
const HUE_SAT = 1.3         // * colours get richer as the swing starts (from the lab's "Color cycle" preset)
// chorus kaleidoscope = the lab's "Kaleidoscope" preset, with its speeds turned into beats
const TURN_BEATS = 32       // door turns once every 32 beats inside the kaleidoscope (lab: 0.2 rad/s)
const KALEID_SIDES = 6      // kaleidoscope mirrors
const KALEID_IN = 2         // * s, cross-fade from the plain door to the kaleidoscope
const KALEID_SIZE = 0.8     // kaleidoscope at 80% size…
const BREATHE = 0.1         // …breathing ±10%
const BREATHE_BEATS = 8     // one breath every 8 beats (lab: every 6.3 s)
const SPLASH_EVERY = 4      // beats between splashes
const SPLASH_BEATS = 1      // * how long one splash lasts
const SPLASH_SCALE = 0.35   // * how far the copy zooms out (+35%)
const SPLASH_TURN = 0.12    // * how far it turns while zooming (radians, ≈7°)
const SPLASH_OPACITY = 0.8
const BLOOM_IN = 2          // * s, cross-fade to the blooming video (scene 4)
const BLOOM_STEP = 0.06     // * how much closer to white (#FFFFFF) every 2 beats
const DOOR_OUT = 3          // * s, door fade-out (scene 4)
const DANCERS_IN = 3        // * s, dancers fade-in
const DANCERS_OPACITY = 0.8
const DANCER_EVERY = 2      // a new copy every 2 beats…
const DANCER_TURN = 70 * Math.PI / 180 // …turned 70° further than the previous one
const DANCER_HOLD = 1       // beats a copy stays at full opacity…
const DANCER_FADE = 4       // …then beats to fade out (so 3 copies overlap at most)

const easeOut = (p) => 1 - Math.pow(1 - p, 3)

// ---- background: tiles; scene 2 swings the hue; scene 3 adds the splash every 4 beats ----
const bgHue = () => C(2) === null ? 0
  : Math.sin(CB(2) * TAU / HUE_BEATS) * HUE_RANGE * smooth(2, 2)
const tiles = () => src(L.bg).hue(bgHue).saturate(() => 1 + (HUE_SAT - 1) * smooth(2, 2))

// Splash: one copy of the background zooms out, turns a little and fades.
// 0..1 progress of the current splash (1 = finished, waiting for the next one)
const splashP = () => CB(3) === null ? 1 : Math.min(1, (CB(3) % SPLASH_EVERY) / SPLASH_BEATS)
const splash = spin(
    fg(L.bg).hue(bgHue).scale(() => 1 + SPLASH_SCALE * easeOut(splashP())),
    () => SPLASH_TURN * easeOut(splashP()))
  .color(1, 1, 1, () => SPLASH_OPACITY * (1 - splashP()))

// ---- scene 4: blooming video; keeps the hue swing (and richer colours) from scene 2;
//      steps closer to white every 2 beats, reset on each loop ----
const bloom = L.bloom.chain((v, loop) => v
  .hue(bgHue)
  .saturate(() => 1 + (HUE_SAT - 1) * smooth(2, 2))
  .blend(solid(1, 1, 1, 1), () => Math.min(1, BLOOM_STEP * stepUp(loop.beats(), 2, 0.25))))

const background = tiles()
  .layer(splash)
  .blend(bloom, () => ramp(4, BLOOM_IN))

// ---- door: Lighten, lake wave from the start ----
const wave = () => fg(L.door).lakeWave(WAVE_AMP, 3, () => beats() * TAU / WAVE_BEATS)

// ---- scene 3: the door spins INSIDE a 6-way kaleidoscope (the pattern morphs as it turns),
//      80% size breathing ±10%, Normal blend — cross-fades in from the plain door ----
const kaleidoDoor = () => kaleidoscope(spin(wave(), () => TAU * softBeats(CB(3), 2) / TURN_BEATS), KALEID_SIDES)
  .scale(() => 1 + (KALEID_SIZE - 1 + BREATHE * Math.sin((CB(3) || 0) * TAU / BREATHE_BEATS)) * smooth(3, KALEID_IN))
const door = () => wave().blend(kaleidoDoor(), () => smooth(3, KALEID_IN))
const doorLighten = () => 1 - smooth(3, KALEID_IN)        // Lighten -> Normal along with the cross-fade

const doorOpacity = () => ramp(1, DOOR_IN) * (1 - ramp(4, DOOR_OUT))

// ---- scene 5: four dancers, inverted (white on black), Difference (white inverts what's under it) ----
// Every DANCER_EVERY beats a new copy appears, turned DANCER_TURN further than the previous one; each
// copy holds for DANCER_HOLD beats, then fades out over DANCER_FADE beats. Slot j = the j-th newest copy.
const dancers = fxLayer(() => fg(L.dancers).invert())               // drawn once (with live FX), copied below
const copyNo = (j) => Math.floor((CB(5) || 0) / DANCER_EVERY) - j        // which copy slot j shows (0, 1, 2…)
const copyFade = (j) => copyNo(j) < 0 ? 0
  : Math.max(0, Math.min(1, 1 - ((CB(5) || 0) - copyNo(j) * DANCER_EVERY - DANCER_HOLD) / DANCER_FADE))
const dancerCopy = (j) => spin(dancers(), () => Math.max(0, copyNo(j)) * DANCER_TURN)
const copyOpacity = (j) => () => DANCERS_OPACITY * ramp(5, DANCERS_IN) * copyFade(j)

// foregrounds go through fx() so the operator's live FX can act on them
let picture = background.over(fx(door), doorOpacity, doorLighten)
for (let j = Math.ceil((DANCER_HOLD + DANCER_FADE) / DANCER_EVERY); j >= 0; j--) picture = picture.difference(dancerCopy(j), copyOpacity(j))
picture.out()`,
  },
  {
    title: '阿舍里尼',
    en: 'Asalini',
    transition: 'black',
    sources: {
      sand:    { asset: 'asalini-bg-sand', fit: 'cover', stopAt: 5 },
      purple:  { asset: 'asalini-bg-purple', fit: 'cover', startAt: 2, stopAt: 5 },
      ox:      { asset: 'asalini-fg-ox', width: 0.35 },
      wheelsB: { asset: 'asalini-bg-wheels-b', fit: 'cover', startAt: 4, stopAt: 7 },
      wheelsA: { asset: 'asalini-bg-wheels-a', fit: 'cover', startAt: 4, stopAt: 7 },
      wheel:   { asset: 'asalini-fg-wheel', width: 0.4167 },
      dark:    { asset: 'asalini-bg-dark', fit: 'cover' },
      monks:   { asset: 'asalini-fg-monks', width: 0.4167 },
      wave:    { asset: 'asalini-bg-wave', fit: 'cover', startAt: 7, rate: 1.5, from: 1 / 24 },   // 1.5x, skip frame 0 (24 fps) for a cleaner loop
      swim:    { asset: 'asalini-fg-swim', fit: 'cover', startAt: 7, from: 2 / 24 },              // skip frames 0–1 (white background)
    },
    scenes: [
      {
        name: '开头', at: '0:00', bpm: 74,
        when: '鼓组及悠远的吉他',
        does: ['Sand video'],
      },
      {
        name: '吉他主题进入', at: '1:04', bpm: 76,
        when: '吉他主题进入',
        does: ['Quick switch to the purple video, its hue swaying slightly'],
      },
      {
        name: '第二把吉他进入', at: '1:29', bpm: 76,
        when: '第二把吉他进入',
        does: ['Ox steps in (opacity 0.6): one more copy every beat, stepping down-left; every 4 beats it restarts further left (4 positions, then repeats)'],
      },
      {
        name: '副歌', at: '2:20', bpm: 75,
        when: '4句人声唱完以后进入',
        does: ['Everything eases out quickly into the wheels video (b)', 'After 16 beats it fades by itself into wheels (a)'],
      },
      {
        name: 'gong出现', at: '2:46', bpm: 75,
        when: 'gong出现',
        does: ['Wheel in the centre as a kaleidoscope the whole time'],
      },
      {
        name: '贝斯桥段', at: '3:42', bpm: 78,
        when: '贝斯桥段',
        does: ['Fades to the dark background; the monks replace the wheel, same kaleidoscope rhythm, and turn (a turn every 12 beats) when plain'],
      },
      {
        name: '推起', at: '4:58', bpm: 157,
        when: '蓄力后再次进入高潮',
        does: ['Everything resets: wave video at 1.5x speed, hue swaying in a small range',
               'Swimmers on top (Lighten, opacity 0.7), floating as if on water'],
        code: `
const WAVE_HUE = 0.06       // * hue sways ±0.06 of the colour wheel (≈22°)…
const WAVE_HUE_BEATS = 16   // * …once every 16 beats
const SWIM_OPACITY = 0.7
const FLOAT_AMP = 0.012     // * how much the swimmers wobble sideways…
const FLOAT_LIFT = 0.008    // * …and bob up and down

// swimmers: light figures on black -> Lighten (black = no change); floating on water =
// a slow sideways ripple plus a gentle up/down bob, on the clock (not the beat)
const swim = src(L.swim)
  .lakeWave(FLOAT_AMP, 2, () => time * 1.1)
  .modulateScrollY(osc(2, 0.08, 0), FLOAT_LIFT)

src(L.wave)
  .hue(() => Math.sin((CB(7) || 0) * TAU / WAVE_HUE_BEATS) * WAVE_HUE)
  .over(swim, SWIM_OPACITY, 1)
  .out()`,
      },
    ],
    code: `
// ---- tuning: values marked * are guesses, the rest come from cues.md ----
const SWITCH_SECS = 0.3      // * the "quick switch" sand -> purple (scene 2)
const PURPLE_HUE = 0.05      // * purple's hue sways ±0.05 of the colour wheel (≈18°) around zero…
const PURPLE_HUE_BEATS = 8   // * …once every 8 beats
const OX_TOP = 0.17          // 17vh from the top
const OX_STEP = 0.22         // each copy: transform(-22%, 22%) of the ox's own size
const OX_LOOP_SHIFT = 0.13   // each loop starts 13vw further left (4 loops, then back)
const EASE_OUT = 0.5         // * s, "quickly ease-out" at 副歌 (scene 4)
const WHEELS_AFTER = 16      // beats until wheels (b) fades into wheels (a)
const WHEELS_FADE = 2        // * s
const TURN_BEATS = 12        // wheel turns once every 12 beats…
const PHASE_BEATS = 8        // …for 8 beats, then 8 beats of kaleidoscope, and so on
const KALEID_SWITCH = 0.25   // * beats to cross between turning and kaleidoscope
const BRIDGE_FADE = 2        // * s, fade to the dark background and the monks (scene 6)

// ---- backgrounds: sand -> purple (quick switch) -> wheels b -> (16 beats) wheels a -> dark ----
const purple = src(L.purple).hue(() => Math.sin((CB(2) || 0) * TAU / PURPLE_HUE_BEATS) * PURPLE_HUE)
const wheelsToA = () => {
  const b = CB(4)
  return b === null || b < WHEELS_AFTER ? 0 : Math.min(1, (b - WHEELS_AFTER) * 60 / (tempo() || 75) / WHEELS_FADE)
}
const background = src(L.sand)
  .blend(purple, () => ramp(2, SWITCH_SECS))
  .blend(src(L.wheelsB).blend(src(L.wheelsA), wheelsToA), () => ramp(4, EASE_OUT))
  .blend(src(L.dark), () => ramp(6, BRIDGE_FADE))

// ---- scene 3: ox, Normal blend, 35% wide. A 4-beat loop: beat 1 puts it 17vh from the top with
//      its right edge on the screen's right edge; every next beat adds a copy at
//      transform(-22%, 22%) from the previous one. Each loop clears and starts 13vw further left;
//      after 4 loops it starts over at the first position. Everything instant.
//      (Positions in screen fractions; Hydra's y runs down from the top.) ----
const oxW = 0.35
const oxH = oxW * ASPECT / L.ox.aspect                       // its height as a fraction of the screen
const ox = fxLayer(() => fg(L.ox))                           // drawn centred, moved below
const oxBeat = () => Math.max(0, CB(3) || 0)
const oxLoop = () => Math.floor(oxBeat() / 4) % 4
const oxCopy = (i) => {
  const cx = () => 1 - oxW / 2 - i * OX_STEP * oxW - oxLoop() * OX_LOOP_SHIFT   // centre x
  const cy = () => OX_TOP + oxH / 2 + i * OX_STEP * oxH                                  // centre y
  return ox().moveBy(() => cx() - 0.5, () => cy() - 0.5)
}
const OX_OPACITY = 0.6
const oxOpacity = (i) => () => C(3) === null ? 0 : OX_OPACITY * (oxBeat() % 4 >= i ? 1 : 0) * (1 - ramp(4, EASE_OUT))

// ---- scene 5: the wheel as a kaleidoscope (the lab preset) the whole time.
//      scene 6: the monks alternate 8 beats plain (turning, a turn every 12 beats) / 8 beats kaleidoscope ----
const gongBeat = () => Math.max(0, CB(5) || 0)
const turnedBeats = () => {           // beats spent turning so far (the turn pauses during kaleidoscope)
  const b = gongBeat(), n = Math.floor(b / (2 * PHASE_BEATS))
  return n * PHASE_BEATS + Math.min(b % (2 * PHASE_BEATS), PHASE_BEATS)
}
const kaleidoAmount = () => {
  if (CB(5) === null) return 0
  const p = gongBeat() % (2 * PHASE_BEATS)
  if (p >= PHASE_BEATS) return Math.min(1, (p - PHASE_BEATS) / KALEID_SWITCH)
  return gongBeat() >= 2 * PHASE_BEATS ? Math.max(0, 1 - p / KALEID_SWITCH) : 0
}
const kaleido = (layer) => kaleidoscope(spin(layer(), () => TAU * gongBeat() / 32), 6)
  .scale(() => 0.8 + 0.1 * Math.sin(gongBeat() * TAU / 8))
// wheel: kaleidoscope the whole time; monks: turning when plain, alternating with the kaleidoscope
const gong = (layer) => spin(layer(), () => TAU * turnedBeats() / TURN_BEATS).blend(kaleido(layer), kaleidoAmount)
const wheel = fxLayer(() => fg(L.wheel))
const monks = fxLayer(() => fg(L.monks))

let picture = background
for (let i = 0; i < 4; i++) picture = picture.over(oxCopy(i), oxOpacity(i), 0)
picture
  .over(kaleido(wheel), () => C(5) === null ? 0 : 1 - ramp(6, BRIDGE_FADE), 0)
  .over(gong(monks), () => ramp(6, BRIDGE_FADE), 0)
  .out()`,
  },
  {
    title: '长安西郊夜巴黎',
    en: 'Yebali',
    transition: 'black',
    sources: {
      intro:      { asset: 'yebali-bg-intro', fit: 'cover', stopAt: 3 },
      group:      { asset: 'yebali-bg-group', fit: 'cover', startAt: 3, stopAt: 5 },
      cloud:      { asset: 'yebali-bg-cloud', fit: 'cover' },
      mountains:  { asset: 'yebali-bg-mountains', fit: 'cover' },
      birds:      { asset: 'yebali-fg-birds', width: 0.37 },
      bw:         { asset: 'yebali-bg-bw', fit: 'cover' },
      characters: { asset: 'yebali-fg-characters', fit: 'cover' },
      green:      { asset: 'yebali-bg-green', fit: 'cover', startAt: 5 },
    },
    scenes: [
      {
        name: 'Intro', at: '0:00',
        when: '无节奏的即兴',
        does: ['Intro video (no beat sync in this part)'],
      },
      {
        name: '敲锣', at: '2:28',
        when: '即兴突然变得激烈',
        does: ['Chaos: random glitch bursts, invert flashes, hue jumps, sudden zooms / turns / flips'],
      },
      {
        name: '副歌', at: '3:20', bpm: 85,
        when: '鼓进入节奏，吉他独奏',
        does: ['Resets to an 8-beat montage, hard cuts:',
               '5 beats group video with film grain (+ a new slight hue shift each round after the 1st)',
               '2 beats floating clouds', '1 beat mountains with the birds (Darken) shooting through diagonally'],
        code: YEBALI_MONTAGE,
      },
      {
        name: '念经', at: '5:48', bpm: 73,
        when: '鼓停止，开始念经',
        does: ['Cross-fades to the floating black & white picture',
               'After 7 beats the 9 characters appear (Difference, opacity 0.3), drifting in and out of readability'],
      },
      {
        name: '推进', at: '9:39', bpm: 73,
        when: '鼓再进节奏，推动最后的一段',
        does: ['Resets to the green video, made vivid: beat zoom-pulse, flash, richer colours, hue swing, RGB hits'],
        code: `
// ---- tuning: values marked * are guesses ----
const SAT = 1.4             // * richer colours
const CONTRAST = 1.15       // *
const PULSE = 0.04          // * zoom-in on each beat, easing back
const FLASH = 0.08          // * brightness flash on each beat
const HUE = 0.08            // * hue swing ±0.08 of the colour wheel…
const HUE_BEATS = 16        // * …every 16 beats
const SPLIT = 0.008         // * RGB split hit every 4 beats

const b = () => CB(5) || 0
const onBeat = () => Math.exp(-(b() % 1) * 5)            // 1 on the beat, fading through it
const on4 = () => Math.exp(-(b() % 4) * 3)               // 1 on every 4th beat
const green = () => src(L.green)
  .scale(() => 1 + PULSE * onBeat())
  .saturate(SAT).contrast(CONTRAST)
  .brightness(() => FLASH * onBeat())
  .hue(() => Math.sin(b() * TAU / HUE_BEATS) * HUE)
green().color(1, 0, 0, 0.5).scrollX(() => SPLIT * on4())
  .add(green().color(0, 1, 1, 0.5).scrollX(() => -SPLIT * on4()))
  .out()`,
      },
    ],
    code: `
// ---- scenes 1–2 (no bpm: everything here runs on the clock, not the beat) ----
// tuning: values marked * are guesses
const STEPS_PER_SEC = 8     // * how often the chaos re-rolls (8 times a second)
const BUILD_SECS = 1        // * chaos comes in over 1 s

// a repeatable random number for step n (k picks independent streams)
const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }
const step = () => Math.floor((C(2) || 0) * STEPS_PER_SEC)
const chaos = () => C(2) === null ? 0 : ramp(2, BUILD_SECS)
const on = (k, p) => chaos() > 0 && rnd(step(), k) < p          // event k happens this step with chance p

// hue jumps: a new random hue every few steps, held in between (abrupt, no easing)
const hueJump = () => chaos() > 0 && rnd(Math.floor(step() / 3), 4) < 0.6 ? rnd(Math.floor(step() / 3), 5) : 0
// sudden transforms
const zoom = () => on(6, 0.3) ? 1 + 0.5 * rnd(step(), 7) : 1
const turn = () => on(8, 0.15) ? (rnd(step(), 9) - 0.5) * 0.6 : 0
const flip = () => on(10, 0.12) ? -1 : 1
// invert flashes
const invertFlash = () => on(11, 0.18) ? 1 : 0

spin(src(L.intro).scale(zoom, flip, 1), turn)
  .hue(hueJump)
  .invert(invertFlash)
  .out(o1)

// glitch bursts: strong on some steps, a constant crackle on the rest
const glitchAmount = () => chaos() * (on(12, 0.4) ? 0.5 + 0.5 * rnd(step(), 13) : 0.15)
glitchy(o1, glitchAmount, step).out()`,
  },
  {
    title: '喀喇昆仑',
    en: 'Kargyraa',
    transition: 'black',
    sources: {
      blue:  { asset: 'kargyraa-bg-blue', fit: 'cover' },
      green: { asset: 'kargyraa-bg-green', fit: 'cover' },
    },
    scenes: [
      {
        name: '开场', at: '0:00', bpm: 64,
        when: '曲目开始',
        does: ['Blue and green videos take turns every 16 beats (cuts)',
               'From beat 32 the hue starts swinging slightly, the swing growing slowly wider with time'],
      },
    ],
    code: `
// ---- tuning: values marked * are guesses, the rest come from cues.md ----
const SWITCH_BEATS = 16     // blue 16 beats, green 16 beats, …
const HUE_FROM = 32         // hue starts swinging at beat 32
const HUE_START = 0.01      // * starting swing: ±0.01 of the colour wheel (≈4°, very slight)
const HUE_GROW = 0.0015     // * added per beat — ≈ ±0.2 after 2½ minutes, ±0.35 after 4½
const HUE_MAX = 0.5         // ±0.5 = the whole colour wheel
const HUE_BEATS = 8         // * one swing back and forth every 8 beats

const b = () => Math.max(0, CB(1) || 0)
const isGreen = () => Math.floor(b() / SWITCH_BEATS) % 2 === 1
const range = () => b() < HUE_FROM ? 0 : Math.min(HUE_MAX, HUE_START + (b() - HUE_FROM) * HUE_GROW)
const hue = () => Math.sin((b() - HUE_FROM) * TAU / HUE_BEATS) * range()

src(L.blue)
  .blend(src(L.green), () => isGreen() ? 1 : 0)
  .hue(hue)
  .out()`,
  },
  {
    title: '潮气吹过后山破庙时',
    en: 'Misty Mountain Pagoda',
    transition: 'black',
    sources: {
      mist:      { asset: 'pagoda-bg-mist', fit: 'fill' },   // cues.md says "pagoda-bg-cloud" — no such asset; mist is the pagoda video
      mountains: { asset: 'pagoda-bg-mountains', fit: 'raw' },
    },
    scenes: [
      {
        name: '开场', at: '0:00', bpm: 64,
        when: '曲目开始，吉他进入',
        does: ['Misty mountains video, plain'],
      },
      {
        name: '吉他升高八度', at: '2:22', bpm: 65,
        when: '吉他升高八度',
        does: ['Wide ink mountains fade in with a mirrored copy (Lighten), slowly panning back and forth',
               'Faint blue wash on top, its hue slowly swinging'],
      },
      {
        name: '高潮', at: '3:14', bpm: 69,
        when: '主音吉他和泛音笛的演奏愈发激烈',
        does: ['Streaked glitch + RGB split, random positions and directions, hitting on every beat'],
      },
      {
        name: '低落',
        bpm: 65,
        when: '吉他降低八度',
        does: ['Mountains, wash and effects fade out; back to the misty video'],
      },
    ],
    code: `
// ---- tuning: values marked * are guesses, the rest come from cues.md ----
const MOUNTAINS_IN = 4      // * s, mountains fade in (scene 2)
const PAN_SECS = 45         // * s for one sweep (right-to-left, then the same back)
const WASH = [0x41 / 255, 0xBA / 255, 0xF7 / 255]   // #41BAF7
const WASH_OPACITY = 0.1
const WASH_HUE = 0.08       // * hue swings ±0.08 of the colour wheel (±29°)…
const WASH_HUE_SECS = 30    // * …once every 30 s (not tied to the beat)
const GLITCH_IN = 2         // * s, glitch / RGB split come in (scene 3)
const GLITCH_BASE = 0.25    // * glitch strength between hits
const GLITCH_STEPS = 4      // new random pattern (positions, direction) 4 times per beat
const BACK_SECS = 4         // * s, fade back to the opening video (scene 4)

// ---- scene 2: ink mountains at full height, left edge on the screen's left edge, panning until
//      its right edge meets the screen's right edge and back; a mirrored copy (mirrored around the
//      screen's middle, so it moves the opposite way) is laid over it with Lighten ----
const width = L.mountains.aspect / ASPECT         // image width in screen widths (≈ 2)
const left = () => {
  const p = ((C(2) || 0) % (2 * PAN_SECS)) / PAN_SECS  // 0..2
  return (1 - width) * (p < 1 ? p : 2 - p)             // 0 -> right edge aligned -> back
}
const mountains = () => fg(L.mountains).panX(width, left)
const pair = () => mountains().over(mountains().scale(1, -1, 1), 1, 1)

// faint #41BAF7 wash, hue slowly swinging back and forth
const wash = () => solid(WASH[0], WASH[1], WASH[2], WASH_OPACITY)
  .hue(() => Math.sin((C(2) || 0) * TAU / WASH_HUE_SECS) * WASH_HUE)

// mountains + wash are drawn into o1, so the glitch below can tear the finished picture apart
pair().layer(wash()).out(o1)

// ---- scene 3: streaked glitch + RGB split (glitchy() in core.js): strongest on each beat,
//      never fully calm in between; positions, band sizes, direction (horizontal / vertical) and
//      split direction re-roll GLITCH_STEPS times per beat.
//      (A flat colour wash can't show a glitch on its own, so it tears mountains + wash.) ----
const amount = () => smooth(3, GLITCH_IN) * (1 - smooth(4, BACK_SECS))
const hit = () => amount() * (GLITCH_BASE + (1 - GLITCH_BASE) * Math.exp(-(beats() % 1) * 4))
const seed = () => Math.floor(beats() * GLITCH_STEPS)
const mountainScene = glitchy(o1, hit, seed)

// ---- scenes 1 and 4: the misty video; scene 2 fades the mountains in, scene 4 fades them out ----
src(L.mist)
  .blend(mountainScene, () => ramp(2, MOUNTAINS_IN) * (1 - ramp(4, BACK_SECS)))
  .out()`,
  },
];

// Every GO in show order: { song, scene } (scene is 1-based). Step 0 is the pre-show.
const STEPS = [{ song: -1, scene: 0 }];
SONGS.forEach((song, si) => song.scenes.forEach((_, k) => STEPS.push({ song: si, scene: k + 1 })));

// 'm:ss' -> seconds (null if missing)
const parseAt = (at) => {
  if (!at) return null;
  const [m, s] = String(at).split(':').map(Number);
  return m * 60 + (s || 0);
};

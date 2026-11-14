// Shared by the lab (index.html) and the show output (output.html):
// custom Hydra effects and placing images / video frames on the output canvas.

window.P = window.P || { amount: 1, speed: 1, hue: 0.3 };  // lab slider values
window.ASPECT = 16 / 9;

function registerEffects(hydra) {
  const set = (def) => hydra.synth.setFunction(def);

  // fg(s1): like src(), but transparent outside the image instead of repeating it at the edges.
  set({
    name: 'fg', type: 'src',
    inputs: [{ type: 'sampler2D', name: 'tex', default: NaN }],
    glsl: `   vec2 inb = step(vec2(0.0), _st) * step(_st, vec2(1.0));
   return texture2D(tex, _st) * inb.x * inb.y;`
  });

  // spin(chain, angle) / kaleidoscope(chain, sides, aim): rotate / mirror without squashing on 16:9.
  set({
    name: 'spinA', type: 'coord',
    inputs: [{ type: 'float', name: 'angle', default: 0 }, { type: 'float', name: 'aspect', default: 1.7778 }],
    glsl: `   vec2 xy = _st - vec2(0.5);
   xy.x *= aspect;
   xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * xy;
   xy.x /= aspect;
   return xy + 0.5;`
  });
  // spinAt(chain, angle, px, py): rotate around the point (px, py) of the screen.
  // Hydra's y runs DOWN: (0,0) = top left, (0.5,1) = bottom middle, (0.5,0.5) = centre.
  // Positive angle = clockwise on screen (checked on the output, Nov 2026).
  set({
    name: 'spinP', type: 'coord',
    inputs: [
      { type: 'float', name: 'angle', default: 0 },
      { type: 'float', name: 'aspect', default: 1.7778 },
      { type: 'float', name: 'px', default: 0.5 },
      { type: 'float', name: 'py', default: 0.5 },
    ],
    glsl: `   vec2 p = vec2(px, py);
   vec2 xy = _st - p;
   xy.x *= aspect;
   xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * xy;
   xy.x /= aspect;
   return xy + p;`
  });
  // aim: turns the slice of the image that gets mirrored around (radians); 0 = the slice just right of centre
  set({
    name: 'kaleidA', type: 'coord',
    inputs: [
      { type: 'float', name: 'nSides', default: 6 },
      { type: 'float', name: 'aspect', default: 1.7778 },
      { type: 'float', name: 'aim', default: 0 },
    ],
    glsl: `   vec2 st = _st - 0.5;
   st.x *= aspect;
   float r = length(st);
   float a = atan(st.y, st.x);
   float seg = 6.2832 / nSides;
   a = mod(a, seg);
   a = abs(a - seg * 0.5) + aim;
   st = r * vec2(cos(a), sin(a));
   st.x /= aspect;
   return st + 0.5;`
  });

  // ripple(amp, freq, speed): gentle water-surface wobble in both directions (lab presets).
  set({
    name: 'ripple', type: 'coord',
    inputs: [
      { type: 'float', name: 'amp', default: 0.004 },
      { type: 'float', name: 'freq', default: 4 },
      { type: 'float', name: 'speed', default: 0.8 },
    ],
    glsl: `   vec2 st = _st;
   float t = time * speed;
   float k = freq * 6.2832;
   st.x += amp * (sin(st.y * k + t) + 0.5 * sin(st.y * k * 2.3 - t * 1.4));
   st.y += amp * 0.6 * (sin(st.x * k * 1.3 + t * 0.8) + 0.4 * sin(st.x * k * 3.1 + t * 1.7));
   return st;`
  });

  // panX(width, left): show an image wider than the screen at full screen height.
  //   width = image width in screen widths, left = where its left edge is (0 = screen's left edge,
  //   1 - width = its right edge on the screen's right edge). Use with fg() and a source with fit: 'raw'.
  set({
    name: 'panX', type: 'coord',
    inputs: [{ type: 'float', name: 'width', default: 1 }, { type: 'float', name: 'left', default: 0 }],
    glsl: `   return vec2((_st.x - left) / width, _st.y);`
  });

  // moveBy(x, y): move the picture right by x and down by y (screen fractions), WITHOUT wrapping
  // around the edges like Hydra's scrollX / scrollY do. Use with fg() so what moves off is gone.
  set({
    name: 'moveBy', type: 'coord',
    inputs: [{ type: 'float', name: 'x', default: 0 }, { type: 'float', name: 'y', default: 0 }],
    glsl: `   return _st - vec2(x, y);`
  });

  // lakeWave(amp, freq, phase): horizontal-only wobble, like a reflection on a lake.
  // phase drives the motion (the show feeds it the beat clock, so the waves move with the tempo).
  set({
    name: 'lakeWave', type: 'coord',
    inputs: [
      { type: 'float', name: 'amp', default: 0.005 },
      { type: 'float', name: 'freq', default: 3 },
      { type: 'float', name: 'phase', default: 0 },
    ],
    glsl: `   vec2 st = _st;
   float k = freq * 6.2832;
   st.x += amp * (sin(st.y * k + phase) + 0.45 * sin(st.y * k * 2.7 - phase * 2.0) + 0.2 * sin(st.y * k * 6.1 + phase * 3.0));
   return st;`
  });

  // a.lighten(b, amount): "Lighten" blend mode — keeps the brighter of the two per channel,
  // only where b is visible (b's alpha, so fades via .color(1,1,1,opacity) still work).
  set({
    name: 'lighten', type: 'combine',
    inputs: [{ type: 'float', name: 'amount', default: 1 }],
    glsl: `   vec3 l = max(_c0.rgb, _c1.rgb);
   return vec4(mix(_c0.rgb, l, clamp(_c1.a * amount, 0.0, 1.0)), _c0.a);`
  });

  // a.brighter(b): per channel, whichever is brighter (Lighten between two layers, alpha too).
  // Used to stack copies of white-on-black layers without their black parts hiding each other.
  set({
    name: 'brighter', type: 'combine',
    inputs: [],
    // colours weighted by alpha first, so invisible pixels (e.g. inverted transparency = white) don't count
    glsl: `   return vec4(max(_c0.rgb * _c0.a, _c1.rgb * _c1.a), max(_c0.a, _c1.a));`
  });

  // a.overlay(b, opacity): "Overlay" blend mode, where b is visible.
  set({
    name: 'overlay', type: 'combine',
    inputs: [{ type: 'float', name: 'opacity', default: 1 }],
    glsl: `   vec3 b = _c0.rgb, l = _c1.rgb;
   vec3 o = mix(2.0 * b * l, 1.0 - 2.0 * (1.0 - b) * (1.0 - l), step(0.5, b));
   return vec4(mix(b, o, clamp(_c1.a * opacity, 0.0, 1.0)), _c0.a);`
  });

  // a.over(b, opacity, lighten): put b on top of a.
  //   lighten = 1 -> "Lighten" blend mode, 0 -> "Normal"; in between cross-fades the two modes.
  set({
    name: 'over', type: 'combine',
    inputs: [{ type: 'float', name: 'opacity', default: 1 }, { type: 'float', name: 'lighten', default: 0 }],
    glsl: `   vec3 top = mix(_c1.rgb, max(_c0.rgb, _c1.rgb), clamp(lighten, 0.0, 1.0));
   return vec4(mix(_c0.rgb, top, clamp(_c1.a * opacity, 0.0, 1.0)), _c0.a);`
  });

  // glitchy(tex, amount, seed): heavy glitch over a whole picture (render it to an output first).
  //   amount 0..1 (0 = untouched), seed = which random pattern (change it to re-roll).
  //   Each pattern picks a random direction (mostly horizontal, sometimes vertical) and mixes:
  //   thin bands of random count shifted sideways, some smeared into long streaks, a few
  //   inverted; random blocks jumping off; an RGB split in a random direction.
  set({
    name: 'glitchy', type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'amount', default: 1 },
      { type: 'float', name: 'seed', default: 0 },
    ],
    glsl: `   vec2 uv = _st;
   float A = clamp(amount, 0.0, 1.0);
   float r1 = fract(sin(seed * 12.9898 + 1.0) * 43758.5453);
   float r2 = fract(sin(seed * 78.233 + 2.0) * 43758.5453);
   float r3 = fract(sin(seed * 39.425 + 3.0) * 43758.5453);
   float horiz = step(0.3, r1);
   float across = mix(uv.x, uv.y, horiz);
   float along = mix(uv.y, uv.x, horiz);
   float n1 = floor(mix(10.0, 90.0, r2));
   float b1 = floor(across * n1);
   float h1 = fract(sin(b1 * 91.7 + seed * 17.3) * 43758.5453);
   float on1 = step(1.0 - 0.45 * A, h1);
   float shift1 = (fract(sin(b1 * 13.1 + seed * 5.7) * 43758.5453) - 0.5) * 0.35 * A;
   float h1b = fract(sin(b1 * 47.3 + seed * 3.1) * 43758.5453);
   float anchor = fract(sin(b1 * 7.7 + seed) * 43758.5453);
   float streak = step(0.55, h1b) * on1;
   float along2 = mix(along + shift1 * on1, anchor + (along - anchor) * 0.04, streak);
   vec2 cells = floor(mix(vec2(3.0, 4.0), vec2(14.0, 18.0), vec2(r3, r2)));
   vec2 bid = floor(uv * cells);
   float hb = fract(sin(dot(bid, vec2(12.9898, 78.233)) + seed * 9.1) * 43758.5453);
   float onb = step(1.0 - 0.18 * A, hb);
   vec2 boff = (vec2(fract(sin(hb * 311.0) * 4375.5), fract(sin(hb * 173.0) * 4375.5)) - 0.5) * 0.2 * A * onb;
   vec2 p = horiz > 0.5 ? vec2(along2, uv.y) : vec2(uv.x, along2);
   p += boff;
   float ang = r3 * 6.2832;
   float mag = (0.004 + 0.02 * max(on1, onb)) * A;
   vec2 off = vec2(cos(ang), sin(ang)) * mag;
   vec4 mid = texture2D(tex, clamp(p, 0.0, 1.0));
   vec3 col = vec3(texture2D(tex, clamp(p + off, 0.0, 1.0)).r, mid.g, texture2D(tex, clamp(p - off, 0.0, 1.0)).b);
   col = mix(col, 1.0 - col, step(0.93, h1b) * on1);
   return vec4(col, mid.a);`
  });

  // glitchSpots(tex, amount, clock, density): a gentler glitch that pops up in small patches here and
  //   there. The screen is an irregular grid of ~40 patches; each has its own random timing (so bursts
  //   never line up), and each step a patch glitches with chance `density`. A burst is short: small band
  //   shifts, sometimes a streak, a slight RGB fringe in a random direction.
  //   amount 0..1 = overall strength, clock = a counter (e.g. beats() * 2: new chances twice a beat).
  set({
    name: 'glitchSpots', type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'amount', default: 1 },
      { type: 'float', name: 'clock', default: 0 },
      { type: 'float', name: 'density', default: 0.12 },
    ],
    glsl: `   vec2 uv = _st;
   vec2 grid = vec2(8.0, 5.0);
   float row = floor(uv.y * grid.y);
   float ux = uv.x + fract(sin(row * 17.13) * 437.585) / grid.x;
   vec2 cell = vec2(floor(ux * grid.x), row);
   vec2 local = vec2(fract(ux * grid.x), fract(uv.y * grid.y));
   float h0 = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
   float t = clock + h0 * 7.0;
   float stp = floor(t);
   float r = fract(sin(dot(cell + stp * vec2(1.7, 9.2), vec2(39.3, 11.7))) * 43758.5453);
   float env = step(1.0 - density, r) * clamp(amount, 0.0, 1.0) * (1.0 - fract(t));
   float band = floor(local.y * mix(3.0, 12.0, fract(r * 7.3)));
   float hb = fract(sin(band * 91.7 + stp * 13.1 + h0 * 31.0) * 43758.5453);
   vec2 p = uv + vec2((hb - 0.5) * 0.06 * env * step(0.35, hb), 0.0);
   float cx = (cell.x + 0.5) / grid.x;
   float streak = step(0.75, fract(r * 13.7)) * step(0.5, hb) * step(0.001, env);
   p.x = mix(p.x, cx + (p.x - cx) * 0.15, streak);
   float ang = fract(r * 5.1) * 6.2832;
   vec2 off = vec2(cos(ang), sin(ang)) * 0.006 * env;
   vec4 mid = texture2D(tex, clamp(p, 0.0, 1.0));
   vec3 col = vec3(texture2D(tex, clamp(p + off, 0.0, 1.0)).r, mid.g, texture2D(tex, clamp(p - off, 0.0, 1.0)).b);
   return vec4(col, mid.a);`
  });

  // grainy(tex, amount, seed, coarse, coarseSize): film grain — fine per-pixel noise, strongest in the
  //   mid-tones (amount ≈ 0.1 subtle … 0.3 heavy), plus optional coarse luminance grain: brightness-only
  //   blotches coarseSize pixels wide (coarse ≈ 0.05 … 0.2). Change seed every frame
  //   (e.g. Math.floor(time * 24)) so the grain moves.
  set({
    name: 'grainy', type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'amount', default: 0.12 },
      { type: 'float', name: 'seed', default: 0 },
      { type: 'float', name: 'coarse', default: 0 },
      { type: 'float', name: 'coarseSize', default: 4 },
    ],
    glsl: `   vec4 c = texture2D(tex, _st);
   vec2 px = floor(_st * resolution);
   float n = fract(sin(dot(px + seed * vec2(17.31, 41.97), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
   vec2 cp = floor(_st * resolution / max(coarseSize, 1.0));
   float nc = fract(sin(dot(cp + seed * vec2(5.17, 13.93), vec2(39.346, 11.135))) * 43758.5453) - 0.5;
   float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
   float w = 0.4 + 2.4 * lum * (1.0 - lum);
   vec3 col = c.rgb * (1.0 + nc * coarse * 2.0) + n * amount * w;
   return vec4(clamp(col, 0.0, 1.0), c.a);`
  });

  // a.dodge(b, opacity): "Color Dodge" blend mode — brightens a by b (a / (1 - b)), where b is visible.
  // Black in b = no change; light parts of b blow a out towards white.
  set({
    name: 'dodge', type: 'combine',
    inputs: [{ type: 'float', name: 'opacity', default: 1 }],
    glsl: `   vec3 d = min(_c0.rgb / max(1.0 - _c1.rgb, vec3(0.001)), vec3(1.0));
   return vec4(mix(_c0.rgb, d, clamp(_c1.a * opacity, 0.0, 1.0)), _c0.a);`
  });

  // a.darken(b, opacity): "Darken" blend mode — keeps the darker of the two per channel, where b is
  // visible (so white in b = no change).
  set({
    name: 'darken', type: 'combine',
    inputs: [{ type: 'float', name: 'opacity', default: 1 }],
    glsl: `   return vec4(mix(_c0.rgb, min(_c0.rgb, _c1.rgb), clamp(_c1.a * opacity, 0.0, 1.0)), _c0.a);`
  });

  // a.difference(b, opacity): "Difference" blend mode, where b is visible (black in b = no change).
  set({
    name: 'difference', type: 'combine',
    inputs: [{ type: 'float', name: 'opacity', default: 1 }],
    glsl: `   return vec4(mix(_c0.rgb, abs(_c0.rgb - _c1.rgb), clamp(_c1.a * opacity, 0.0, 1.0)), _c0.a);`
  });

  if (typeof window.fg !== 'function') window.fg = hydra.synth.fg;
  if (typeof window.grainy !== 'function') window.grainy = hydra.synth.grainy;
  if (typeof window.glitchSpots !== 'function') window.glitchSpots = hydra.synth.glitchSpots;
  if (typeof window.glitchy !== 'function') window.glitchy = hydra.synth.glitchy;
  window.spin = (chain, angle) => chain.spinA(angle, () => ASPECT);
  window.kaleidoscope = (chain, sides, aim = 0) => chain.kaleidA(sides, () => ASPECT, aim);
  window.spinAt = (chain, angle, px, py) => chain.spinP(angle, () => ASPECT, px, py);
}

// Where an image / video frame goes on a W×H canvas.
// place: 'cover' fills the frame, 'contain' fits it whole, 'fill' stretches it to the frame,
//        { width: f } centred; f <= 3 is a fraction of the output width (0.45 = 45%, 1.09 = 109%),
//                     f > 3 is pixels on a 1920-wide output. Aspect ratio is always kept.
//                     anchor: 'bottom' puts the image's bottom edge on the screen's bottom edge.
function placeRect(iw, ih, place, W, H) {
  let s;
  if (place === 'fill') return [0, 0, W, H];
  if (place && place.width) s = (place.width <= 3 ? place.width * W : place.width * W / 1920) / iw;
  else if (place === 'cover') s = Math.max(W / iw, H / ih);
  else s = Math.min(W / iw, H / ih);
  const dw = iw * s, dh = ih * s;
  const y = place && place.anchor === 'bottom' ? H - dh : (H - dh) / 2;
  return [(W - dw) / 2, y, dw, dh];
}

function fitToCanvas(img, place, W, H) {
  const c = document.createElement('canvas');
  if (place === 'raw') {   // the image as it is (for panning across very wide images)
    c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  }
  c.width = W; c.height = H;
  const iw = img.naturalWidth || img.videoWidth || img.width, ih = img.naturalHeight || img.videoHeight || img.height;
  c.getContext('2d').drawImage(img, ...placeRect(iw, ih, place, W, H));
  return c;
}

function sourcePlace(source) {
  return source.width ? { width: source.width, anchor: source.anchor } : (source.fit || 'contain');
}

function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

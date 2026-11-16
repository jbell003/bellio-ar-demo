/* Beach Runner, modern sponsored edition. Plain HTML5 canvas, no libraries, no build step.
   All art is vector drawn in code and all sounds are generated with WebAudio.
   Photos are read on the device only and are never uploaded. */
(function () {
'use strict';

/* ---------- config ---------- */
const DEF = {
  gameTitle: 'Beach Runner', tagline: '',
  sponsor: {
    name: 'Haid Electric', signTop: 'HAID', signBar: 'ELECTRIC', city: 'PANAMA CITY - FL', phone: '(850) 832-8397', slogan: 'We give you the power', poweredBy: 'Powered by Haid Electric',
    colors: { board: '#23272e', text: '#ffffff', accent: '#ffe600', accent2: '#4cc9f0' },
    scene: { storefront: true, van: true, billboards: true, banners: true, powerLines: true }
  },
  colors: { shirt: '#4a525e', shorts: '#2d3b5c', hat: '#ffe600', button: '#ffe600', buttonText: '#1b1f27', panel: '#12161d', panelText: '#f4f6fa', accent: '#ffe600' },
  skyColors: ['#1c2452', '#3b3a7c', '#7a4a8f', '#c8607f', '#f0836a', '#ffb067', '#ffd58a'],
  collectibles: { common: { name: 'Bolt', plural: 'Bolts', points: 10 }, rare: { name: 'Mega Bolt', plural: 'Mega Bolts', points: 50 } },
  cta: { heading: 'Need an electrician in Panama City?', buttonText: 'Call Haid Electric', link: 'tel:+18508328397' },
  studio: { name: 'Bellio Gulf Coast', heading: 'Want a game like this for your business?', buttonText: 'Get a game like this', link: 'https://jbell003.github.io/bellio-gulf-coast/#contact' },
  disclaimer: 'Sample demo by Bellio Gulf Coast. Not an official Haid Electric game.',
  photoNote: 'Your photo stays on your phone', storageKey: 'beachRunner.haid'
};
function merge(a, b) {
  const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  if (!b) return o;
  for (const k in b) {
    if (Array.isArray(b[k])) o[k] = b[k].slice();
    else if (b[k] && typeof b[k] === 'object' && a[k] && typeof a[k] === 'object') o[k] = merge(a[k], b[k]);
    else if (b[k] !== undefined && b[k] !== null) o[k] = b[k];
  }
  return o;
}
const CFG = merge(DEF, window.GAME_CONFIG || {});
const SP_ = CFG.sponsor, SC = SP_.colors, COL = CFG.colors;
const $ = (id) => document.getElementById(id);
const FONT = 'Inter, "SF Pro Display", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const HEAVY = '"Arial Black", "Helvetica Neue", Impact, Arial, sans-serif';

const store = {
  get(k) { try { return localStorage.getItem(CFG.storageKey + '.' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(CFG.storageKey + '.' + k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(CFG.storageKey + '.' + k); } catch (e) {} }
};

/* ---------- constants ---------- */
const T = 16, G = 112, HZ = 86;      // tile size, ground top, horizon (world units; the view is 144 tall, bottom anchored)
const STEP = 1 / 120;
const RUN = 86, JUMPV = 292, GRAV = 830, FALLMUL = 1.2, JCUT = 190, MAXFALL = 430;
const PW = 10, PH = 24;              // player hitbox

/* ---------- helpers ---------- */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };
function hex2rgb(h) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(h, a) { const c = hex2rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
function mix(a, b, t) { const x = hex2rgb(a), y = hex2rgb(b); return '#' + ((1 << 24) | (Math.round(lerp(x[0], y[0], t)) << 16) | (Math.round(lerp(x[1], y[1], t)) << 8) | Math.round(lerp(x[2], y[2], t))).toString(16).slice(1); }
function shade(h, f) { return f < 1 ? mix(h, '#000000', 1 - f) : mix(h, '#ffffff', f - 1); }
function skyAt(t) { const s = CFG.skyColors, p = clamp(t, 0, 1) * (s.length - 1), i = Math.min(s.length - 2, Math.floor(p)); return mix(s[i], s[i + 1], p - i); }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((s) => gr.addColorStop(s[0], s[1])); return gr; }
function spaced(g, str, cx, y, sp) {
  let w = 0; for (const ch of str) w += g.measureText(ch).width + sp; w -= sp; let x = cx - w / 2;
  g.textAlign = 'left'; for (const ch of str) { g.fillText(ch, x, y); x += g.measureText(ch).width + sp; }
}
function fitText(g, str, font, maxW, size, sp) { // shrink font until the (spaced) text fits
  let s = size; for (let i = 0; i < 40; i++) { g.font = font.replace('{s}', s); let w = 0; for (const ch of str) w += g.measureText(ch).width + (sp || 0) * s; if (w - (sp || 0) * s <= maxW) break; s *= 0.94; } return s;
}

/* ---------- vector assets (drawn once) ---------- */
const AS = {};
const BOLT = [[0.60, 0.00], [0.16, 0.56], [0.45, 0.56], [0.34, 1.00], [0.86, 0.38], [0.55, 0.38], [0.74, 0.00]];
function boltPath(g, cx, cy, s) { g.beginPath(); BOLT.forEach((p, i) => { const x = cx + (p[0] - 0.5) * s, y = cy + (p[1] - 0.5) * s; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }
function boltSprite(c1, c2, glow, size) {
  const c = mk(size, size), g = c.getContext('2d'), m = size / 2;
  const gr = g.createRadialGradient(m, m, 0, m, m, m); gr.addColorStop(0, rgba(glow, 0.7)); gr.addColorStop(0.45, rgba(glow, 0.22)); gr.addColorStop(1, rgba(glow, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const bs = size * 0.62; boltPath(g, m, m, bs);
  const lg = g.createLinearGradient(0, m - bs / 2, 0, m + bs / 2); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.35, c1); lg.addColorStop(1, c2);
  g.fillStyle = lg; g.fill(); g.lineJoin = 'round'; g.lineWidth = size * 0.025; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
  return c;
}
function heartSprite(full) {
  const s = 64, c = mk(s, s), g = c.getContext('2d');
  g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(2, 36, 6, 8, 24, 10); g.bezierCurveTo(30, 11, 32, 16, 32, 18); g.bezierCurveTo(32, 16, 34, 11, 40, 10); g.bezierCurveTo(58, 8, 62, 36, 32, 56); g.closePath();
  g.fillStyle = full ? vgrad(g, 8, 56, [[0, '#ff8aa0'], [1, '#e8294f']]) : 'rgba(255,255,255,.18)'; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = full ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.35)'; g.stroke();
  if (full) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(21, 20, 5, 3, -0.6, 0, 7); g.fill(); }
  return c;
}
function glowSprite(color, size) { const c = mk(size, size), g = c.getContext('2d'), m = size / 2, gr = g.createRadialGradient(m, m, 0, m, m, m); gr.addColorStop(0, rgba(color, 0.9)); gr.addColorStop(0.3, rgba(color, 0.3)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; }
function cloudSprite(w, h, seed) {
  const c = mk(w, h), g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const r = h * (0.28 + hash(seed + i) * 0.3), x = r + (w - 2 * r) * (i / 8), y = h * 0.62 - (Math.sin(i / 8 * Math.PI)) * h * 0.22 * (0.5 + hash(seed + i * 3));
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,236,226,.95)'); gr.addColorStop(0.55, 'rgba(255,196,190,.55)'); gr.addColorStop(1, 'rgba(255,170,180,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}
// the sponsor sign: clean text and colors, recreated in code (not a photo of the logo)
function makeSign() {
  const w = 720, h = 340, c = mk(w, h), g = c.getContext('2d');
  const board = SC.board, txt = SC.text, acc = SC.accent;
  rr(g, 6, 6, w - 12, h - 12, 34); g.fillStyle = vgrad(g, 0, h, [[0, shade(board, 1.25)], [1, shade(board, 0.8)]]); g.fill();
  g.lineWidth = 6; g.strokeStyle = rgba(txt, 0.28); g.stroke();
  rr(g, 22, 22, w - 44, h - 44, 24); g.lineWidth = 3; g.strokeStyle = rgba(acc, 0.85); g.stroke();
  // swoosh streak with a lightning notch
  g.fillStyle = txt; g.beginPath(); g.moveTo(54, 86); g.lineTo(w * 0.42, 70); g.lineTo(w * 0.47, 70); g.lineTo(w * 0.42, 80); g.lineTo(w - 54, 72); g.lineTo(w - 54, 77); g.lineTo(w * 0.45, 90); g.lineTo(w * 0.42, 90); g.lineTo(w * 0.40, 95); g.closePath(); g.fill();
  boltPath(g, w / 2 + 6, 70, 54); g.fillStyle = acc; g.fill();
  // big word
  g.fillStyle = txt; g.textBaseline = 'alphabetic';
  const top = String(SP_.signTop || SP_.name).toUpperCase(); const fs = fitText(g, top, '900 {s}px ' + HEAVY, w - 130, 150, 0.04);
  g.font = '900 ' + fs + 'px ' + HEAVY; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3; spaced(g, top, w / 2, 98 + fs * 0.78, fs * 0.04); g.shadowColor = 'transparent';
  // bar
  const by = 98 + fs * 0.78 + 16; g.fillStyle = '#0a0c10'; g.fillRect(40, by, w - 80, 56);
  g.fillStyle = txt; const bar = String(SP_.signBar || '').toUpperCase(); if (bar) { const bs = fitText(g, bar, '800 {s}px ' + FONT, w - 140, 40, 0.28); g.font = '800 ' + bs + 'px ' + FONT; spaced(g, bar, w / 2, by + 40, bs * 0.28); }
  g.fillStyle = rgba(txt, 0.75); const city = String(SP_.city || '').toUpperCase(); if (city) { const cs = fitText(g, city, '700 {s}px ' + FONT, w - 160, 26, 0.3); g.font = '700 ' + cs + 'px ' + FONT; spaced(g, city, w / 2, by + 56 + 38, cs * 0.3); }
  return c;
}
function drawPalm(g, bx, by, h, lean, sil, seed) {
  const tx = bx + lean * 13, ty = by - h, N = 14;
  // trunk, tapered, slightly curved
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, x0 = bx + lean * 13 * t0 * t0, y0 = by - h * t0, x1 = bx + lean * 13 * t1 * t1, y1 = by - h * t1;
    g.lineCap = 'round'; g.lineWidth = lerp(4.2, 2.4, t0); g.strokeStyle = sil || (i % 2 ? '#9b6b3c' : '#86592f'); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  const fr = [[-2.9, 25], [-2.35, 27], [-1.75, 22], [-1.2, 22], [-0.7, 27], [-0.2, 25], [-3.1, 17], [0.0, 17]];
  fr.forEach((f, k) => {
    const a = f[0] + (hash(seed * 9 + k) - 0.5) * 0.2, L = f[1], droop = 0.55 + hash(seed + k) * 0.25;
    const dx = Math.cos(a), dy = Math.sin(a);
    const tipx = tx + dx * L, tipy = ty + dy * L * 0.55 + L * droop * 0.5 * Math.abs(dx);
    const cx1 = tx + dx * L * 0.55, cy1 = ty + dy * L * 0.75 - 4, cx2 = tx + dx * L * 0.55, cy2 = ty + dy * L * 0.35 + 3;
    g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(cx1, cy1, tipx, tipy); g.quadraticCurveTo(cx2, cy2, tx, ty); g.closePath();
    if (sil) g.fillStyle = sil; else { const gr = g.createLinearGradient(tx, ty, tipx, tipy); gr.addColorStop(0, '#2f8f55'); gr.addColorStop(1, '#1d6a43'); g.fillStyle = gr; }
    g.fill();
    if (!sil) { g.lineWidth = 0.5; g.strokeStyle = 'rgba(190,255,200,.55)'; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(cx1, (cy1 + cy2) / 2 - 1, tipx, tipy); g.stroke(); }
  });
  if (!sil) { g.fillStyle = '#4a2f18'; g.beginPath(); g.arc(tx - 1.6, ty + 2, 1.5, 0, 7); g.arc(tx + 1.6, ty + 2.4, 1.5, 0, 7); g.fill(); }
}
function buildAssets() {
  AS.bolt = boltSprite('#ffe600', '#ffb300', '#ffe600', 128);
  AS.mega = boltSprite('#bdf3ff', '#2aa7d4', SC.accent2, 128);
  AS.boltC = boltSprite(SC.accent, shade(SC.accent, 0.7), SC.accent, 128);
  AS.megaC = boltSprite('#ffffff', shade(SC.accent2, 0.8), SC.accent2, 128);
  AS.heart = heartSprite(true); AS.heartE = heartSprite(false);
  AS.glowW = glowSprite('#fff4d0', 96); AS.glowY = glowSprite(SC.accent, 96); AS.glowB = glowSprite(SC.accent2, 96); AS.glowO = glowSprite('#ffc27a', 96);
  AS.clouds = [cloudSprite(260, 90, 3), cloudSprite(200, 70, 17), cloudSprite(320, 100, 31)];
  AS.sign = makeSign();
  AS.palms = [0, 1, 2].map((v) => {
    const k = 5, c = mk(70 * k, 100 * k), g = c.getContext('2d'); g.scale(k, k);
    const h = [40, 34, 46][v], lean = [1, -1, 1][v]; drawPalm(g, 35, 96, h, lean, null, v + 1); c.ax = 35; c.ay = 96; c.k = k; return c;
  });
  AS.brandImg = AS.sign.toDataURL('image/png');
}

/* ---------- characters (vector) ---------- */
let HEAD = null;   // photo head canvas, or null for the default character
function drawHeadDefault(g) {
  // hard hat character head, centered on (0,0), radius 8.5
  const skin = vgrad(g, -8, 9, [[0, '#ffd6ae'], [1, '#f0a877']]);
  g.fillStyle = skin; g.beginPath(); g.arc(0, 0, 8.3, 0, 7); g.fill();
  g.lineWidth = 0.7; g.strokeStyle = 'rgba(80,40,20,.35)'; g.stroke();
  // hat
  g.beginPath(); g.moveTo(-9.2, -1.6); g.bezierCurveTo(-9.2, -11.4, 9.2, -11.4, 9.2, -1.6); g.closePath();
  g.fillStyle = vgrad(g, -10, -1, [[0, shade(COL.hat, 1.25)], [1, shade(COL.hat, 0.85)]]); g.fill(); g.lineWidth = 0.6; g.strokeStyle = shade(COL.hat, 0.55); g.stroke();
  g.fillStyle = shade(COL.hat, 0.8); rr(g, -10.6, -2.6, 21.2, 2.4, 1.2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-3.4, -7, 2.6, 1.2, -0.5, 0, 7); g.fill();
  g.fillStyle = shade(COL.hat, 0.9); rr(g, -1, -10.4, 2, 7.6, 1); g.fill();
  // face
  g.fillStyle = '#2a1f2e'; g.beginPath(); g.ellipse(-3, 2.1, 1.15, 1.5, 0, 0, 7); g.ellipse(3, 2.1, 1.15, 1.5, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-2.6, 1.6, 0.45, 0, 7); g.arc(3.4, 1.6, 0.45, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,110,110,.38)'; g.beginPath(); g.ellipse(-5.2, 4.6, 1.7, 1.1, 0, 0, 7); g.ellipse(5.2, 4.6, 1.7, 1.1, 0, 0, 7); g.fill();
  g.lineWidth = 0.9; g.lineCap = 'round'; g.strokeStyle = '#8e3a3a'; g.beginPath(); g.arc(0, 3.6, 2.6, 0.25, Math.PI - 0.25); g.stroke();
}
// st: {face, phase, air, vy, sq, run}. Origin = top-left of the 18x26 sprite box.
function drawChar(g, x, y, st) {
  const face = st.face < 0 ? -1 : 1, ph = st.phase || 0;
  g.save(); g.translate(x + 9, y + 26);
  const air = !!st.air, vy = st.vy || 0;
  let sy = 1, sx = 1;
  if (air) { sy = 1 + clamp(Math.abs(vy) / 1400, 0, 0.14); sx = 1 / sy; }
  if (st.sq > 0) { sy = 1 - 0.22 * (st.sq / 0.16); sx = 1 + 0.2 * (st.sq / 0.16); }
  g.scale(sx, sy);
  const bob = st.run ? Math.abs(Math.sin(ph * Math.PI)) * 0.9 : (air ? 0 : Math.sin((st.idle || 0) * 2.2) * 0.25);
  // soft contact shadow is drawn by the caller
  g.save(); g.scale(face, 1);
  const sw = st.run ? Math.sin(ph * Math.PI) : 0;
  // back arm
  const limb = (x0, y0, x1, y1, w, col) => { g.lineCap = 'round'; g.lineWidth = w; g.strokeStyle = col; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const skin = '#f0b085';
  const armA = air ? -1.3 : sw * 1.0, legA = air ? 0.9 : sw;
  limb(-4.6, -11 - bob, -4.6 - Math.sin(armA) * 1, -11 - bob + 5.4 * Math.cos(armA) - (air ? 3 : 0), 2.5, shade(skin, 0.86));
  // legs
  const foot = (s, back) => {
    const fx = s * Math.sin(legA) * 3.6 + (air ? s * 2 : 0), fy = -Math.max(0, s * Math.cos(legA)) * (st.run ? 2.4 : 0) - (air ? 1.6 + (s > 0 ? 1.4 : 0) : 0);
    limb(s * 1.9, -4.6 - bob, fx + s * 0.5, fy - 1.2, 2.4, back ? shade(skin, 0.85) : skin);
    g.fillStyle = back ? shade('#f4f6fa', 0.82) : '#f4f6fa'; g.beginPath(); g.ellipse(fx + 0.8, fy - 0.8, 3, 1.7, 0, 0, 7); g.fill();
    g.fillStyle = SC.accent; g.fillRect(fx - 0.6, fy - 0.9, 2.8, 0.7);
  };
  foot(-1, true);
  // shorts + torso
  g.fillStyle = vgrad(g, -9, -3, [[0, shade(COL.shorts, 1.2)], [1, shade(COL.shorts, 0.8)]]); rr(g, -4.8, -8 - bob, 9.6, 5, 1.8); g.fill();
  g.fillStyle = vgrad(g, -15, -8, [[0, shade(COL.shirt, 1.25)], [1, shade(COL.shirt, 0.85)]]); rr(g, -5.4, -15 - bob, 10.8, 8, 2.6); g.fill();
  boltPath(g, 0.3, -11.2 - bob, 4.2); g.fillStyle = SC.accent; g.fill();
  foot(1, false);
  // front arm
  limb(4.6, -11 - bob, 4.6 + Math.sin(armA) * 1, -11 - bob + 5.4 * Math.cos(-armA) - (air ? 3.4 : 0), 2.5, skin);
  g.fillStyle = skin; g.beginPath(); g.arc(4.6 + Math.sin(armA), -11 - bob + 5.4 * Math.cos(-armA) - (air ? 3.4 : 0), 1.4, 0, 7); g.fill();
  g.restore();
  // head (never mirrored)
  const hy = -17.5 - bob * 0.7;
  if (HEAD && !st.noPhoto) {
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 2.5; g.shadowOffsetY = 1; g.drawImage(HEAD, -9, hy - 9, 18, 18); g.restore();
  } else { g.save(); g.translate(0, hy); if (face < 0) g.scale(1, 1); drawHeadDefault(g); g.restore(); }
  g.restore();
}

/* ---------- enemies (vector) ---------- */
function drawCrab(g, e, t) {
  const x = e.x, y = e.y, w = Math.sin(t * 9 + e.x * 0.05);
  g.save(); g.translate(x + 7, y + 4);
  g.lineCap = 'round';
  for (let s = -1; s <= 1; s += 2) {
    g.strokeStyle = '#b8301f'; g.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) { const o = Math.sin(t * 10 + i * 1.7 + (s > 0 ? 1.5 : 0)) * 0.9; g.beginPath(); g.moveTo(s * 3, 1.8 + i * 0.4); g.lineTo(s * (5.4 + i * 0.7), 3.6 + i * 0.5 + o); g.lineTo(s * (6.2 + i * 0.6), 4.2 + i * 0.5); g.stroke(); }
    // arm and claw
    const up = -1.6 + w * s * 0.8;
    g.lineWidth = 1.2; g.strokeStyle = '#d83a28'; g.beginPath(); g.moveTo(s * 4.4, 0.4); g.lineTo(s * 5.6, up); g.stroke();
    g.fillStyle = vgrad(g, up - 2, up + 2, [[0, '#ff7a59'], [1, '#d83a28']]); g.beginPath(); g.arc(s * 5.8, up - 0.6, 1.9, 0.3, Math.PI * 2 - 0.5 * s + (s > 0 ? 0 : 0)); g.lineTo(s * 5.8, up - 0.6); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 1.7, -2.6, 1.25, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(s * 1.7, -2.5, 0.6, 0, 7); g.fill();
    g.strokeStyle = '#d83a28'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(s * 1.7, -1.4); g.lineTo(s * 1.7, -2.2); g.stroke();
  }
  g.fillStyle = vgrad(g, -3.4, 4, [[0, '#ff8c68'], [1, '#d03626']]); g.beginPath(); g.ellipse(0, 1, 6, 3.7, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-1.4, -0.4, 2.8, 1, -0.2, 0, 7); g.fill();
  g.restore();
}
function drawGull(g, e, t) {
  const flap = Math.sin(t * 11 + e.ph * 2);
  g.save(); g.translate(e.x + 7, e.y + 4); if (e.dir > 0) g.scale(-1, 1);
  // far wing
  const wing = (k, col) => { g.save(); g.rotate(-0.5 + flap * 0.9 * k); g.fillStyle = col; g.beginPath(); g.moveTo(1, 0); g.quadraticCurveTo(5, -9, 12, -8); g.quadraticCurveTo(8, -3, 4.4, 1.2); g.closePath(); g.fill(); g.fillStyle = '#6c7a8c'; g.beginPath(); g.moveTo(9.6, -8.4); g.quadraticCurveTo(12.6, -8.6, 13.4, -9.4); g.quadraticCurveTo(11, -6.4, 8.6, -6); g.closePath(); g.fill(); g.restore(); };
  wing(1, '#d8e0ea');
  g.fillStyle = vgrad(g, -3, 4, [[0, '#ffffff'], [1, '#dfe7f0']]); g.beginPath(); g.ellipse(2, 1, 6.6, 3, 0.05, 0, 7); g.fill();
  g.beginPath(); g.moveTo(8, 0.6); g.lineTo(11.4, -0.2); g.lineTo(9, 2.4); g.closePath(); g.fill();
  g.beginPath(); g.arc(-4.4, -0.6, 2.7, 0, 7); g.fill();
  g.fillStyle = '#ffb429'; g.beginPath(); g.moveTo(-6.8, -0.8); g.lineTo(-9.8, 0.2); g.lineTo(-6.8, 0.9); g.closePath(); g.fill();
  g.fillStyle = '#222'; g.beginPath(); g.arc(-4.9, -1.1, 0.5, 0, 7); g.fill();
  wing(0.85, '#ffffff');
  g.restore();
}
function drawUrchin(g, e, t) {
  const cx = e.x + 6, cy = e.y + 6.2;
  const pulse = 0.5 + 0.5 * Math.sin(t * 4 + e.x);
  g.globalAlpha = 0.25 + pulse * 0.15; g.drawImage(AS.glowO, cx - 11, cy - 11, 22, 22); g.globalAlpha = 1;
  g.lineCap = 'round';
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + Math.sin(t * 2 + i) * 0.04, r0 = 4, r1 = 6.4 + (i % 2) * 0.6; g.lineWidth = 0.9; g.strokeStyle = '#3a1a66'; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); g.fillStyle = '#d6a8ff'; g.beginPath(); g.arc(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 0.45, 0, 7); g.fill(); }
  const gr = g.createRadialGradient(cx - 1.4, cy - 1.8, 0.5, cx, cy, 4.8); gr.addColorStop(0, '#d46bff'); gr.addColorStop(1, '#5b1f93');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 4.7, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx - 1.7, cy - 0.5, 1, 1.2, 0, 0, 7); g.ellipse(cx + 1.7, cy - 0.5, 1, 1.2, 0, 0, 7); g.fill();
  g.fillStyle = '#2a0a44'; g.beginPath(); g.arc(cx - 1.5, cy - 0.3, 0.55, 0, 7); g.arc(cx + 1.5, cy - 0.3, 0.55, 0, 7); g.fill();
  g.strokeStyle = '#2a0a44'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(cx - 2.8, cy - 2); g.lineTo(cx - 0.8, cy - 1.2); g.moveTo(cx + 2.8, cy - 2); g.lineTo(cx + 0.8, cy - 1.2); g.stroke();
}

/* ---------- sponsor scene pieces (also used in the parallax layers) ---------- */
function drawStore(g, x, gy, w, h) {
  const board = SC.board, acc = SC.accent;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + w / 2, gy, w * 0.58, 2.4, 0, 0, 7); g.fill();
  g.fillStyle = vgrad(g, gy - h, gy, [[0, shade(board, 1.35)], [1, shade(board, 0.85)]]); rr(g, x, gy - h, w, h, 2); g.fill();
  g.fillStyle = shade(board, 0.6); g.fillRect(x - 2, gy - h - 3, w + 4, 4); g.fillStyle = rgba(acc, 0.85); g.fillRect(x - 2, gy - h + 1, w + 4, 0.8);
  const sw = Math.min(w * 0.7, (h - 33) * 720 / 340), sh = sw * 340 / 720; g.drawImage(AS.sign, x + (w - sw) / 2, gy - h + 5, sw, sh);
  // windows (warm glow) and door
  const wy = gy - 22, ww = w * 0.26;
  [x + w * 0.07, x + w - w * 0.07 - ww].forEach((wx) => {
    g.fillStyle = vgrad(g, wy, wy + 15, [[0, '#fff1b8'], [1, '#ffc94d']]); rr(g, wx, wy, ww, 15, 1.4); g.fill();
    g.strokeStyle = shade(board, 0.5); g.lineWidth = 0.9; g.stroke(); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + 15); g.stroke();
  });
  const dx = x + w / 2 - 7; g.fillStyle = shade(board, 0.55); rr(g, dx, gy - 22, 14, 22, 1.5); g.fill();
  g.fillStyle = vgrad(g, gy - 20, gy - 6, [[0, 'rgba(255,241,184,.9)'], [1, 'rgba(255,201,77,.7)']]); rr(g, dx + 2, gy - 20, 10, 14, 1); g.fill();
  // awning
  const ay = gy - 27, n = 10, aw = (w + 6) / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#f6f7fa' : acc; g.beginPath(); g.moveTo(x - 3 + i * aw, ay); g.lineTo(x - 3 + (i + 1) * aw, ay); g.lineTo(x - 5 + (i + 1) * aw, ay + 6); g.lineTo(x - 5 + i * aw, ay + 6); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 4, ay + 6, w + 8, 1.6);
  if (SP_.phone) { g.fillStyle = '#10141c'; g.font = '800 3.7px ' + FONT; g.textAlign = 'center'; g.fillText(SP_.phone, x + w / 2, ay + 4.3); }
  // neon bolt
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(AS.boltC, x + w - 17, gy - h + 8, 22, 22); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}
function drawVan(g, x, gy, s) {
  s = s || 1; const L = 60 * s, Hh = 26 * s, acc = SC.accent;
  g.save(); g.translate(x, gy);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(L / 2, 0, L * 0.58, 2.2 * s, 0, 0, 7); g.fill();
  // ladder rack
  g.strokeStyle = '#59616f'; g.lineWidth = 0.9 * s; g.beginPath(); g.moveTo(6 * s, -Hh - 3 * s); g.lineTo(L - 18 * s, -Hh - 3 * s); g.moveTo(6 * s, -Hh - 5.6 * s); g.lineTo(L - 18 * s, -Hh - 5.6 * s); g.stroke();
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo((7 + i * 4.6) * s, -Hh - 5.6 * s); g.lineTo((7 + i * 4.6) * s, -Hh - 3 * s); g.stroke(); }
  // body
  g.beginPath(); g.moveTo(0, -4 * s); g.lineTo(0, -Hh + 3 * s); g.quadraticCurveTo(0, -Hh, 3 * s, -Hh); g.lineTo(L - 17 * s, -Hh); g.lineTo(L - 7 * s, -Hh * 0.62); g.lineTo(L - 1 * s, -Hh * 0.55); g.quadraticCurveTo(L + 1 * s, -Hh * 0.5, L + 1 * s, -Hh * 0.35); g.lineTo(L + 1 * s, -4 * s); g.closePath();
  g.fillStyle = vgrad(g, -Hh, 0, [[0, '#ffffff'], [0.7, '#e5e9f0'], [1, '#bfc6d2']]); g.fill(); g.lineWidth = 0.6 * s; g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke();
  // windows
  g.fillStyle = vgrad(g, -Hh, -Hh * 0.5, [[0, '#9fd8ee'], [1, '#4f7e98']]); g.beginPath(); g.moveTo(L - 16 * s, -Hh + 2.4 * s); g.lineTo(L - 8.4 * s, -Hh * 0.64); g.lineTo(L - 16 * s, -Hh * 0.64); g.closePath(); g.fill();
  // side logo + stripe
  const sw = 26 * s, sh = sw * 340 / 720; g.drawImage(AS.sign, 6 * s, -Hh + 4 * s, sw, sh);
  g.fillStyle = acc; g.fillRect(1 * s, -9 * s, L - 3 * s, 2 * s);
  boltPath(g, L - 26 * s, -Hh + 8 * s, 8 * s); g.fillStyle = acc; g.fill(); g.lineWidth = 0.4 * s; g.strokeStyle = '#10141c'; g.stroke();
  // wheels
  [12 * s, L - 14 * s].forEach((wx) => { g.fillStyle = '#12151b'; g.beginPath(); g.arc(wx, -3.6 * s, 5 * s, 0, 7); g.fill(); g.fillStyle = '#9aa3b2'; g.beginPath(); g.arc(wx, -3.6 * s, 2.3 * s, 0, 7); g.fill(); g.fillStyle = '#4b5361'; g.beginPath(); g.arc(wx, -3.6 * s, 0.9 * s, 0, 7); g.fill(); });
  g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(L + 0.4 * s, -Hh * 0.42, 1 * s, 1.6 * s, 0, 0, 7); g.fill();
  g.restore();
}
function drawBillboard(g, x, gy, w) {
  const h = w * 340 / 720, py = gy - h - 22;
  g.fillStyle = '#3b3f4a'; g.fillRect(x + w * 0.2, py + h, 3, 22); g.fillRect(x + w * 0.8 - 3, py + h, 3, 22);
  g.fillStyle = '#20232b'; rr(g, x - 3, py - 3, w + 6, h + 6, 3); g.fill();
  g.drawImage(AS.sign, x, py, w, h);
  g.fillStyle = '#20232b'; for (let i = 0; i < 3; i++) g.fillRect(x + w * (0.2 + i * 0.3), py - 6, 1.4, 4);
  g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) g.drawImage(AS.glowW, x + w * (0.2 + i * 0.3) - 7, py - 12, 14, 14); g.globalCompositeOperation = 'source-over';
}
function drawBanner(g, x, y, w) {
  const h = w * 340 / 720; g.strokeStyle = '#2b2f38'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + w * 0.2, y + 1); g.moveTo(x + w, y - 3); g.lineTo(x + w * 0.8, y + 1); g.stroke();
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 2; g.shadowOffsetY = 1; g.drawImage(AS.sign, x + w * 0.12, y, w * 0.76, h * 0.76); g.restore();
}
function drawLamp(g, x, gy, h, glow) {
  g.strokeStyle = '#2b2f38'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy - h); g.quadraticCurveTo(x, gy - h - 3, x + 5, gy - h - 3); g.stroke();
  g.fillStyle = '#fff2c0'; g.beginPath(); g.ellipse(x + 5.4, gy - h - 2.4, 2.6, 1.1, 0, 0, 7); g.fill();
  if (glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85; g.drawImage(AS.glowO, x - 9, gy - h - 14, 28, 28); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
}
function drawBuilding(g, x, gy, w, h, col, awn, label) {
  g.fillStyle = vgrad(g, gy - h, gy, [[0, shade(col, 1.18)], [1, shade(col, 0.82)]]); rr(g, x, gy - h, w, h, 2); g.fill();
  g.fillStyle = shade(col, 0.7); g.fillRect(x - 1.5, gy - h - 2.5, w + 3, 3);
  const cols = Math.max(2, Math.floor(w / 18));
  for (let i = 0; i < cols; i++) { const wx = x + 5 + i * ((w - 10) / cols), ww = (w - 10) / cols - 4; g.fillStyle = hash(Math.floor(x) + i * 7) > 0.35 ? vgrad(g, gy - h + 6, gy - h + 20, [[0, '#ffe9a8'], [1, '#ffbf55']]) : 'rgba(40,50,80,.75)'; rr(g, wx, gy - h + 7, ww, 12, 1.2); g.fill(); }
  const ay = gy - 17; for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f6fa' : awn; g.fillRect(x + i * (w / 8), ay, w / 8, 5); }
  g.fillStyle = 'rgba(255,230,160,.85)'; rr(g, x + w * 0.38, gy - 12, w * 0.24, 12, 1); g.fill();
  if (label) { g.fillStyle = '#10141c'; g.font = '800 4px ' + FONT; g.textAlign = 'center'; g.fillText(label, x + w / 2, ay + 3.8); }
}

/* ---------- parallax layers (pre-rendered, period tiles) ---------- */
const LAYERS = {};
const LY0 = 28, LH = 100;   // world y range covered by layer tiles
function mkLayer(period, kl, draw, haze, hazeA) {
  const c = mk(period * kl, LH * kl), g = c.getContext('2d'); g.setTransform(kl, 0, 0, kl, 0, -LY0 * kl); draw(g, period);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgba(haze, hazeA); g.fillRect(0, 0, c.width, c.height);
  c.period = period; return c;
}
function buildLayers(k) {
  const kl = clamp(k, 1.2, 3), haze = skyAt(0.95);
  // far skyline: hazy condo towers and a ferris wheel silhouette
  LAYERS.sky = mkLayer(800, kl, (g, P) => {
    let x = 6;
    while (x < P - 40) {
      const w = 16 + hash(x) * 16, h = 18 + hash(x + 3) * 30, col = mix('#6a5a9a', '#4a3f86', hash(x + 9));
      g.fillStyle = vgrad(g, HZ - h, HZ + 4, [[0, shade(col, 1.2)], [1, col]]); g.fillRect(x, HZ - h + 2, w, h + 2);
      if (hash(x + 5) > 0.5) g.fillRect(x + w * 0.2, HZ - h - 4, w * 0.6, 6);
      for (let wy = HZ - h + 5; wy < HZ - 1; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3.6) if (hash(wx * 13 + wy * 7) > 0.8) { g.fillStyle = 'rgba(255,224,150,.85)'; g.fillRect(wx, wy, 1.4, 1.8); }
      x += w + 4 + hash(x + 11) * 30;
    }
    const wx = 560, wy = HZ - 24; g.strokeStyle = '#5c4f93'; g.lineWidth = 1.1; g.beginPath(); g.arc(wx, wy, 21, 0, 7); g.stroke(); g.beginPath(); g.arc(wx, wy, 13, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a) * 21, wy + Math.sin(a) * 21); g.stroke(); g.fillStyle = '#7a6bb0'; g.beginPath(); g.arc(wx + Math.cos(a) * 21, wy + Math.sin(a) * 21, 1.5, 0, 7); g.fill(); }
    g.lineWidth = 1.6; g.beginPath(); g.moveTo(wx - 14, HZ + 3); g.lineTo(wx, wy); g.lineTo(wx + 14, HZ + 3); g.stroke();
  }, haze, 0.5);
  // rolling dune hills
  LAYERS.hills = mkLayer(480, kl, (g, P) => {
    g.beginPath(); g.moveTo(0, 130);
    for (let x = 0; x <= P; x += 4) { const a = x / P * Math.PI * 2; g.lineTo(x, 104 + 4.5 * Math.sin(a * 2 + 1) + 2.6 * Math.sin(a * 5 + 2) + 1.2 * Math.sin(a * 11)); }
    g.lineTo(P, 130); g.closePath(); g.fillStyle = vgrad(g, 98, 126, [[0, '#8a5b8e'], [1, '#5a3d78']]); g.fill();
  }, haze, 0.38);
  // utility poles with sagging power lines, billboards, silhouette palms
  LAYERS.mid = mkLayer(560, kl, (g, P) => {
    drawPalm(g, 40, 118, 38, 1, '#4a3b78', 1); drawPalm(g, 330, 118, 44, -1, '#4a3b78', 2);
    if (SP_.scene.powerLines) {
      const poles = [70, 280, 490];
      poles.forEach((px) => { g.strokeStyle = '#2a2a3a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px, 122); g.lineTo(px, 62); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(px - 8, 66); g.lineTo(px + 8, 66); g.moveTo(px - 6, 72); g.lineTo(px + 6, 72); g.stroke(); });
      const all = poles.concat(poles.map((p) => p + P), poles.map((p) => p - P));
      all.sort((a, b) => a - b);
      for (let i = 0; i < all.length - 1; i++) {
        const a = all[i], b = all[i + 1];
        [[-8, 66], [8, 66], [-6, 72], [6, 72]].forEach((o, j) => { g.strokeStyle = 'rgba(30,28,44,.85)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(a + o[0], o[1]); g.quadraticCurveTo((a + b) / 2 + o[0] * 0.2, o[1] + 11 + j, b + o[0], o[1]); g.stroke(); });
      }
    }
    if (SP_.scene.billboards) drawBillboard(g, 150, 124, 70);
  }, haze, 0.28);
  // street: sidewalk strip, neighbors, the sponsor storefront, the van and lamps
  LAYERS.street = mkLayer(960, kl, (g, P) => {
    g.fillStyle = vgrad(g, 112, 128, [[0, '#d9d2c4'], [0.4, '#b9b2a8'], [0.41, '#3b3d4a'], [1, '#2a2b36']]); g.fillRect(0, 112, P, 20);
    g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 8; x < P; x += 26) g.fillRect(x, 121.5, 12, 0.8);
    drawBuilding(g, 14, 112, 78, 36, '#7fb7c9', '#ff7a59', 'CAFE');
    if (SP_.scene.van) drawVan(g, 260, 118, 1.05);
    drawPalm(g, 360, 112, 36, 1, null, 3);
    drawBuilding(g, 400, 112, 96, 44, '#e8a3a0', '#4cc9f0', 'SURF SHOP');
    if (SP_.scene.storefront) drawStore(g, 540, 112, 112, 62);
    drawBuilding(g, 690, 112, 84, 34, '#9ec59a', '#ffe600', 'GELATO');
    drawPalm(g, 790, 112, 40, -1, null, 4);
    if (SP_.scene.van) drawVan(g, 820, 118, 1.0);
    [118, 252, 520, 676, 880].forEach((lx) => drawLamp(g, lx, 112, 36, true));
  }, haze, 0.1);
}

/* ---------- audio (original, WebAudio) ---------- */
const Snd = {
  ctx: null, master: null, lp: null, muted: false, musicOn: false, timer: null, step: 0, next: 0, noise: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.6;
      this.lp = this.ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 9000; this.lp.connect(this.master); this.master.connect(this.ctx.destination);
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = n;
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.6; },
  tone(f, d, type, v, f2, t) {
    const c = this.ctx; if (!c || this.muted) return;
    const t0 = c.currentTime + (t || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v || 0.12, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
    o.connect(g); g.connect(this.lp); o.start(t0); o.stop(t0 + d + 0.03);
  },
  hiss(d, v, f, t) {
    const c = this.ctx; if (!c || this.muted || !this.noise) return;
    const t0 = c.currentTime + (t || 0), s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    s.buffer = this.noise; fl.type = 'bandpass'; fl.frequency.value = f || 2000; fl.Q.value = 0.7;
    g.gain.setValueAtTime(v || 0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
    s.connect(fl); fl.connect(g); g.connect(this.lp); s.start(t0); s.stop(t0 + d + 0.03);
  },
  jump() { this.tone(260, 0.16, 'sine', 0.16, 640); this.tone(520, 0.1, 'triangle', 0.05, 980, 0.02); },
  land() { this.hiss(0.07, 0.06, 500); },
  coin() { this.tone(1320, 0.1, 'triangle', 0.1); this.tone(1760, 0.22, 'sine', 0.1, null, 0.06); this.tone(2640, 0.2, 'sine', 0.04, null, 0.06); },
  shell() { [880, 1108, 1319, 1760].forEach((f, i) => { this.tone(f, 0.22, 'triangle', 0.09, null, i * 0.07); this.tone(f * 2, 0.2, 'sine', 0.03, null, i * 0.07); }); this.hiss(0.2, 0.05, 6000, 0.1); },
  heart() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.14, null, i * 0.07)); },
  stomp() { this.tone(300, 0.14, 'triangle', 0.18, 90); this.hiss(0.09, 0.1, 900); },
  hurt() { this.tone(380, 0.4, 'sawtooth', 0.1, 70); this.tone(190, 0.4, 'sine', 0.12, 60); },
  splash() { this.hiss(0.4, 0.18, 1400); this.tone(520, 0.25, 'sine', 0.08, 120); },
  check() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.1, null, i * 0.08)); },
  win() { const m = [523, 659, 784, 1047, 784, 1047, 1319, 1568]; m.forEach((f, i) => { this.tone(f, 0.26, 'triangle', 0.1, null, i * 0.13); this.tone(f / 2, 0.26, 'sine', 0.12, null, i * 0.13); }); },
  over() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.36, 'sine', 0.18, f * 0.96, i * 0.2)); },
  blip() { this.tone(660, 0.1, 'sine', 0.08); },
  // original loop: C - Am - F - G, relaxed beach groove
  startMusic() { if (!this.ctx) return; this.stopMusic(); this.musicOn = true; this.step = 0; this.next = this.ctx.currentTime + 0.1; this.timer = setInterval(() => this.sched(), 80); },
  stopMusic() { this.musicOn = false; if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  sched() {
    const c = this.ctx; if (!c || !this.musicOn) return;
    const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12), eighth = 60 / 112 / 2;
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    const lead = [0, 2, 1, 2, 3, 2, 1, -1], rootsHit = [1, 0, 0, 1, 1, 0, 1, 0];
    while (this.next < c.currentTime + 0.35) {
      const i = this.step % 32, ch = chords[Math.floor(i / 8)], k = i % 8, t = this.next - c.currentTime;
      if (!this.muted) {
        const li = lead[k]; if (li >= 0) { const note = li === 3 ? ch[0] + 12 : ch[li] + 12; this.tone(mtof(note), eighth * 1.3, 'triangle', 0.04, null, t); }
        if (k === 0) { ch.forEach((n) => this.tone(mtof(n), eighth * 7, 'sine', 0.018, null, t)); }
        if (rootsHit[k]) this.tone(mtof(ch[0] - 12 + (k === 4 ? 7 : 0)), eighth * 1.3, 'sine', 0.14, null, t);
        if (k % 2 === 1) this.hiss(0.05, 0.022, 8000, t);
        if (k === 0 || k === 4) this.tone(120, 0.14, 'sine', 0.15, 42, t);
      }
      this.next += eighth; this.step++;
    }
  }
};
/* ---------- level ---------- */
function buildLevel() {
  const L = { grounds: [], planks: [], items: [], enemies: [], decor: [], checkpoints: [], flagX: 0, end: 0, totalCoins: 0, totalShells: 0 };
  let c = 0;
  const ground = (a, b, top, kind) => L.grounds.push({ x: a * T, w: (b - a) * T, y: top === undefined ? G : top, kind: kind || 'sand' });
  const plank = (a, w, y) => L.planks.push({ x: a * T, w: w * T, y });
  const coin = (x, y) => { L.items.push({ t: 'coin', x, y, got: false }); L.totalCoins++; };
  const coinRow = (a, y, n, step) => { for (let i = 0; i < n; i++) coin(a * T + i * (step || 1) * T, y); };
  const coinArc = (cx, y, n, hgt) => { for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); coin(cx * T + (t - 0.5) * (n - 1) * 13, y - Math.sin(t * Math.PI) * hgt); } };
  const shell = (a, y) => { L.items.push({ t: 'shell', x: a * T, y, got: false }); L.totalShells++; };
  const heart = (a, y) => L.items.push({ t: 'heart', x: a * T, y, got: false });
  const crab = (a, b, top) => L.enemies.push({ t: 'crab', x: a * T, y: (top || G) - 8, w: 14, h: 8, x0: a * T, x1: b * T, dir: 1, alive: true, sq: 0 });
  const gull = (a, b, y, ph) => L.enemies.push({ t: 'gull', x: a * T, y, by: y, w: 14, h: 8, x0: a * T, x1: b * T, dir: 1, alive: true, sq: 0, ph: ph || 0 });
  const urchin = (a, top) => L.enemies.push({ t: 'urchin', x: a * T, y: (top || G) - 11, w: 12, h: 11, alive: true, sq: 0 });
  const deco = (t, a, extra) => L.decor.push(Object.assign({ t, x: a * T }, extra || {}));
  const cp = (a) => L.checkpoints.push({ x: a * T, on: false });
  const start = (n) => { if (n) cp(c + 2); };

  // 1 intro
  ground(c, c + 22); deco('shop', c + 3.5); deco('hint', c + 11, { text: 'hint1' }); deco('hint', c + 19, { text: 'hint2' });
  coinRow(c + 8, 90, 5); deco('palm', c + 17, { v: 0 }); deco('tuft', c + 11); deco('umbrella', c + 20); coin(c + 15 * 1, 96); c += 22;
  // 2 crabs
  start(1); ground(c, c + 22); deco('hint', c + 4.5, { text: 'hint3' }); crab(c + 6, c + 11); crab(c + 14, c + 20); coinArc(c + 8.5, 88, 5, 10); coinArc(c + 17, 88, 5, 10);
  deco('palm', c + 2, { v: 1 }); deco('tuft', c + 12); deco('star', c + 21); c += 22;
  // 3 first gap
  start(1); ground(c, c + 9); ground(c + 11, c + 22); coinArc(c + 10, 92, 5, 22); crab(c + 14, c + 20); deco('palm', c + 5, { v: 2 }); deco('tuft', c + 17); c += 22;
  // 4 dune
  start(1); ground(c, c + 6); ground(c + 6, c + 14, G - 16); ground(c + 14, c + 24); coinRow(c + 7, 80, 6); shell(c + 10, 66); crab(c + 7, c + 13, G - 16);
  urchin(c + 18.5); coinArc(c + 18.5, 90, 5, 14); deco('palm', c + 2, { v: 0 }); deco('umbrella', c + 22); c += 24;
  // 5 pier
  start(1); ground(c, c + 9, G, 'pier'); ground(c + 11, c + 19, G, 'pier'); ground(c + 21, c + 30, G, 'pier');
  gull(c + 5, c + 17, 80); gull(c + 22, c + 29, 86, 2); coinArc(c + 10, 92, 5, 20); coinArc(c + 20, 92, 5, 20); coinRow(c + 13, 96, 4);
  deco('torch', c + 2); deco('torch', c + 28); deco('torch', c + 15); deco('banner', c + 3.5, { w: 40 }); c += 30;
  // 6 stairs
  start(1); ground(c, c + 24); plank(c + 4, 3, 92); plank(c + 8, 3, 76); plank(c + 12, 3, 60); plank(c + 16, 3, 76);
  coinRow(c + 4.5, 82, 2); coinRow(c + 8.5, 66, 2); coin(c + 12.6 * 1, 50); shell(c + 13, 46); heart(c + 17, 62); coinRow(c + 19, 98, 3);
  crab(c + 19, c + 23); deco('palm', c + 1, { v: 1 }); deco('tuft', c + 6); c += 24;
  // 7 urchins
  start(1); ground(c, c + 22); urchin(c + 6); urchin(c + 11); urchin(c + 12.5); coinArc(c + 6.4, 90, 5, 18); coinArc(c + 12, 82, 6, 20);
  crab(c + 16, c + 21); deco('palm', c + 3, { v: 2 }); deco('star', c + 9); c += 22;
  // 8 wide gap with a stepping plank
  start(1); ground(c, c + 7); ground(c + 10, c + 22); plank(c + 8.2, 1.5, 100); coinArc(c + 8.5, 92, 5, 24);
  gull(c + 12, c + 20, 72, 1); coinRow(c + 13, 100, 4); deco('palm', c + 2, { v: 0 }); deco('tuft', c + 19); c += 22;
  // 9 palm grove
  start(1); ground(c, c + 24); deco('palm', c + 3, { v: 0 }); deco('palm', c + 9, { v: 2 }); deco('palm', c + 16, { v: 1 }); deco('palm', c + 22, { v: 0 });
  crab(c + 6, c + 12); crab(c + 14, c + 20); shell(c + 12, 96); coinRow(c + 4, 94, 4); coinRow(c + 16, 94, 4); deco('umbrella', c + 1); deco('poweredby', c + 19); c += 24;
  // 10 long pier
  start(1); ground(c, c + 8, G, 'pier'); ground(c + 10, c + 16, G, 'pier'); ground(c + 19, c + 34, G, 'pier'); plank(c + 17, 1.5, 100);
  gull(c + 6, c + 18, 82); gull(c + 24, c + 33, 78, 3); crab(c + 21, c + 28); coinArc(c + 9, 92, 5, 20); coinArc(c + 17.7, 88, 5, 22); coinRow(c + 29, 96, 3);
  deco('torch', c + 3); deco('torch', c + 14); deco('torch', c + 32); deco('banner', c + 22, { w: 40 }); c += 34;
  // 11 crab party
  start(1); ground(c, c + 24); crab(c + 4, c + 8); crab(c + 10, c + 15); crab(c + 17, c + 22); urchin(c + 23); coinArc(c + 6, 88, 5, 10); coinArc(c + 12.5, 88, 5, 10);
  deco('palm', c + 1, { v: 1 }); deco('tuft', c + 9); c += 24;
  // 12 twin dunes
  start(1); ground(c, c + 4); ground(c + 4, c + 9, G - 16); ground(c + 9, c + 14, G - 32); ground(c + 14, c + 19, G - 16); ground(c + 19, c + 26);
  coinRow(c + 4.5, 80, 4); coinRow(c + 9.5, 64, 4); shell(c + 11.5, 50); crab(c + 10, c + 13, G - 32); coinRow(c + 14.5, 80, 4); deco('palm', c + 24, { v: 2 }); deco('umbrella', c + 1); c += 26;
  // 13 gap with gulls
  start(1); ground(c, c + 8); ground(c + 10, c + 22); gull(c + 3, c + 9, 86); gull(c + 12, c + 20, 90, 2); coinArc(c + 9, 88, 5, 26); coinRow(c + 13, 100, 4);
  crab(c + 14, c + 20); deco('palm', c + 2, { v: 1 }); c += 22;
  // 14 finale
  start(1); ground(c, c + 32); urchin(c + 8); crab(c + 11, c + 16); crab(c + 18, c + 22); coinArc(c + 8.4, 88, 5, 16); coinArc(c + 14, 84, 6, 14); coinRow(c + 19, 96, 5);
  deco('palm', c + 4, { v: 2 }); deco('palm', c + 28, { v: 0 }); deco('tuft', c + 24); shell(c + 14, 62); coin(c + 14, 76);
  L.flagX = (c + 26) * T; deco('van', c + 19); c += 32; L.end = c * T;
  L.grounds.sort((a, b) => a.x - b.x);
  return L;
}
function topAt(L, x) { let t = 999; L.grounds.forEach((g) => { if (x >= g.x && x <= g.x + g.w && g.y < t) t = g.y; }); return t; }

/* ---------- state ---------- */
const cv = $('game'), ctx = cv.getContext('2d');
let W = 224, H = 144, S = 2, DPR = 1, offY = 0, K = 2;
let L = buildLevel(), P = null, Gm = null;
let mode = 'manual', photo = null, remember = false;
const input = { left: false, right: false, jump: false };
const isTouch = window.matchMedia && matchMedia('(pointer:coarse)').matches;
const parts = [], pops = [];
let timeScale = 1, bestScore = parseInt(store.get('best') || '0', 10) || 0;
let attractX = 0, shake = 0, tNow = 0;

function newGame() {
  L = buildLevel(); parts.length = 0; pops.length = 0;
  P = { x: 40, y: G - PH, w: PW, h: PH, vx: 0, vy: 0, on: true, coy: 0, buf: 0, face: 1, hearts: 3, inv: 0, hurt: 0, anim: 0, dead: false, maxX: 0, hop: 0, splashed: false, sq: 0, idle: 0, airT: 0, dustT: 0 };
  Gm = { state: 'play', t: 0, score: 0, coins: 0, shells: 0, stomps: 0, camX: 0, timer: 0, cp: { x: 40 }, banner: 'GO!', bannerT: 1.4, bonus: 0, fw: 0, fade: 1, flash: 0, lookX: 0 };
  Gm.camX = 0;
}
function startPlay() {
  Snd.init(); newGame(); showOnly(null); $('btnPause').hidden = false; document.body.classList.add('playing');
  Snd.startMusic(); Snd.blip();
}

/* ---------- player / world update ---------- */
function setJump(down) {
  if (down && !input.jump) { if (P) P.buf = 0.13; }
  input.jump = down;
}
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function burst(x, y, color, n, spd, kind) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (0.3 + Math.random()) * (spd || 60); parts.push({ k: kind || 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 0.7 + Math.random() * 0.9, g: 260, rot: Math.random() * 6 }); }
}
function sparkle(x, y, color, n, power) {
  power = power || 1;
  parts.push({ k: 'ring', x, y, vx: 0, vy: 0, life: 0.38, max: 0.38, color, size: 2, g: 0, grow: 22 * power });
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + Math.random() * 0.5, s = (22 + Math.random() * 38) * power; parts.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 14, life: 0.45 + Math.random() * 0.45, max: 0.9, color: i % 3 === 0 ? '#ffffff' : color, size: 1.1 + Math.random() * 1.7, g: 60, rot: Math.random() * 3 }); }
}
function puff(x, y, n, dir, size) {
  for (let i = 0; i < n; i++) parts.push({ k: 'dust', x: x + (Math.random() - 0.5) * 5, y: y - Math.random() * 1.5, vx: (dir || 0) * (8 + Math.random() * 14) + (Math.random() - 0.5) * 22, vy: -(3 + Math.random() * 11), life: 0.42 + Math.random() * 0.3, max: 0.7, color: '#f4dca4', size: (size || 1.7) * (0.7 + Math.random() * 0.8), g: -8, grow: 5 });
}
function splashFx(x, y) {
  parts.push({ k: 'ring', x, y, vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#d8f4fb', size: 2, g: 0, grow: 30 });
  for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.15 + Math.random() * 0.7), s = 40 + Math.random() * 70; parts.push({ k: 'drop', x: x + (Math.random() - 0.5) * 6, y, vx: Math.cos(a) * s * 0.5, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, max: 0.9, color: '#bfe9f5', size: 0.8 + Math.random() * 1, g: 260 }); }
}
function pop(x, y, text) { pops.push({ x, y, text, life: 0.9 }); }
function addScore(n, x, y) { Gm.score += n; if (x !== undefined) pop(x, y, '+' + n); }

function respawn() {
  P.x = Gm.cp.x; P.y = G - PH; P.vx = 0; P.vy = 0; P.on = true; P.inv = 2.2; P.splashed = false; Gm.camX = Math.max(0, P.x - W * 0.34); Gm.fade = 0.6; sparkle(P.x + 5, P.y + 12, SC.accent2, 14, 1.2);
}
function hurtPlayer(fromX) {
  if (P.inv > 0 || Gm.state !== 'play') return;
  P.hearts--; Snd.hurt(); shake = 0.25; Gm.flash = 0.5;
  if (P.hearts <= 0) return die(false);
  P.inv = 1.8; P.hurt = 0.28; P.vy = -190; P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 70; P.on = false;
}
function die(fell) {
  Gm.state = 'dying'; Gm.timer = fell ? 0.9 : 1.5; P.dead = true; P.vx = 0; P.vy = fell ? 0 : -230; Snd.stopMusic();
}
function stompBounce(e) {
  e.alive = false; e.sq = 0.4; P.vy = input.jump ? -290 : -200; P.on = false; Gm.stomps++; Snd.stomp();
  burst(e.x + e.w / 2, e.y + e.h / 2, e.t === 'gull' ? '#ffffff' : '#ff8a6a', 12, 80); parts.push({ k: 'ring', x: e.x + e.w / 2, y: e.y + e.h / 2, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ffffff', size: 2, g: 0, grow: 20 }); puff(e.x + e.w / 2, e.y + e.h, 4, 0, 1.4);
  addScore(e.t === 'gull' ? 150 : 100, e.x, e.y - 8);
}

function moveAndCollide(dt) {
  // horizontal
  P.x += P.vx * dt;
  const camMin = Gm.camX; if (P.x < camMin) { P.x = camMin; if (P.vx < 0) P.vx = 0; }
  for (const g of L.grounds) {
    if (g.x > P.x + P.w + 40) break;
    if (P.x < g.x + g.w && P.x + P.w > g.x && P.y + P.h > g.y + 0.01 && P.y < g.y + (g.kind === 'pier' ? 7 : 80)) {
      if (P.vx > 0 || P.x + P.w / 2 < g.x + g.w / 2) P.x = g.x - P.w; else P.x = g.x + g.w;
      if (Math.abs(P.vx) > 0) P.vx = 0;
    }
  }
  // vertical
  const prevBottom = P.y + P.h;
  P.vy = Math.min(MAXFALL, P.vy + (P.vy > 0 ? GRAV * FALLMUL : GRAV) * dt); P.y += P.vy * dt; P.on = false;
  for (const g of L.grounds) {
    if (g.x > P.x + P.w + 40) break;
    const th = g.kind === 'pier' ? 7 : 80;
    if (P.x < g.x + g.w && P.x + P.w > g.x && P.y + P.h > g.y && P.y < g.y + th) {
      if (P.vy >= 0 && prevBottom <= g.y + 4) { P.y = g.y - P.h; P.vy = 0; P.on = true; }
      else if (P.vy < 0 && P.y > g.y + th - 6) { P.y = g.y + th; P.vy = 0; }
    }
  }
  if (P.vy >= 0) for (const p of L.planks) {
    if (P.x < p.x + p.w && P.x + P.w > p.x && P.y + P.h >= p.y && prevBottom <= p.y + 2) { P.y = p.y - P.h; P.vy = 0; P.on = true; }
  }
}

function updatePlay(dt) {
  Gm.t += dt; const p = P;
  if (Gm.bannerT > 0) Gm.bannerT -= dt;
  if (p.inv > 0) p.inv -= dt; if (p.hurt > 0) p.hurt -= dt;
  const dir = mode === 'auto' ? 1 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (p.hurt <= 0) { p.vx = approach(p.vx, dir * RUN, (p.on ? 900 : 520) * dt); if (dir) p.face = dir; }
  if (p.buf > 0) p.buf -= dt;
  if (p.on) p.coy = 0.09; else if (p.coy > 0) p.coy -= dt;
  if (p.buf > 0 && p.coy > 0) { p.vy = -JUMPV; p.on = false; p.coy = 0; p.buf = 0; Snd.jump(); puff(p.x + 5, p.y + p.h, 5, -p.face, 1.5); p.sq = 0; }
  if (!input.jump && p.vy < -JCUT) p.vy = -JCUT;
  const wasOn = p.on, vyBefore = p.vy;
  moveAndCollide(dt);
  if (!wasOn && p.on) { if (p.airT > 0.12 && vyBefore > 140) { puff(p.x + 5, p.y + p.h, 7, 0, 2); Snd.land(); p.sq = 0.16; } p.airT = 0; } else if (!p.on) p.airT += dt;
  if (p.sq > 0) p.sq -= dt;
  if (p.x > p.maxX) p.maxX = p.x;
  p.anim += dt * (p.on ? Math.abs(p.vx) / 17 : 0); p.idle += dt;
  p.dustT -= dt; if (p.on && Math.abs(p.vx) > 40 && p.dustT <= 0) { p.dustT = 0.1; puff(p.x + 5 - p.face * 3, p.y + p.h, 1, -p.face, 1.1); }
  // fell in the water
  if (!p.splashed && p.y + p.h > 126 && topAt(L, p.x + p.w / 2) > 126 && p.vy > 0) { p.splashed = true; splashFx(p.x + 5, 124); Snd.splash(); }
  if (p.y > 150) {
    p.hearts--; if (p.hearts <= 0) { die(true); } else { respawn(); }
    return;
  }
  // checkpoints
  for (const c of L.checkpoints) if (!c.on && p.x > c.x) { c.on = true; Gm.cp = { x: c.x }; Snd.check(); pop(c.x, 70, 'CHECKPOINT'); }
  // items
  const hb = { x: p.x - 2, y: p.y, w: p.w + 4, h: p.h };
  for (const it of L.items) {
    if (it.got) continue;
    const r = it.t === 'coin' ? { x: it.x - 4, y: it.y - 4, w: 8, h: 8 } : { x: it.x - 5, y: it.y - 5, w: 10, h: 10 };
    if (overlap(hb, r)) {
      it.got = true;
      if (it.t === 'coin') { Gm.coins++; addScore(CFG.collectibles.common.points); Snd.coin(); sparkle(it.x, it.y, SC.accent, 9, 1); }
      else if (it.t === 'shell') { Gm.shells++; addScore(CFG.collectibles.rare.points, it.x, it.y - 6); Snd.shell(); sparkle(it.x, it.y, SC.accent2, 16, 1.5); }
      else { if (p.hearts < 3) p.hearts++; addScore(0); Snd.heart(); pop(it.x, it.y - 6, '+1 LIFE'); sparkle(it.x, it.y, '#ff6b8a', 12, 1.2); }
    }
  }
  // enemies
  const prevBottom = p.y + p.h - p.vy * dt;
  for (const e of L.enemies) {
    if (!e.alive) { if (e.sq > 0) e.sq -= dt; continue; }
    if (e.t === 'crab') { e.x += e.dir * 22 * dt; if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } else if (e.x + e.w > e.x1) { e.x = e.x1 - e.w; e.dir = -1; } }
    else if (e.t === 'gull') { e.x += e.dir * 30 * dt; if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } else if (e.x + e.w > e.x1) { e.x = e.x1 - e.w; e.dir = -1; } e.y = e.by + Math.sin(Gm.t * 3 + e.ph) * 7; }
    if (e.x > p.x + 200 || e.x < p.x - 200) continue;
    const eb = { x: e.x + 1, y: e.y + 1, w: e.w - 2, h: e.h - 1 };
    if (overlap(p, eb)) {
      if (e.t !== 'urchin' && p.vy > 20 && prevBottom <= e.y + 6) stompBounce(e);
      else hurtPlayer(e.x + e.w / 2);
    }
  }
  // finish
  if (p.x + p.w > L.flagX + 2 && Gm.state === 'play') winGame();
  // camera
  Gm.lookX += (clamp(p.vx, 0, RUN) * 0.28 - Gm.lookX) * Math.min(1, dt * 2.5);
  const target = clamp(p.x - W * 0.33 + Gm.lookX, 0, L.end - W);
  Gm.camX += (target - Gm.camX) * (1 - Math.exp(-dt * 6)); if (Gm.camX < 0) Gm.camX = 0;
  if (Gm.fade > 0) Gm.fade = Math.max(0, Gm.fade - dt * 1.8); if (Gm.flash > 0) Gm.flash = Math.max(0, Gm.flash - dt * 1.4);
}

function winGame() {
  Gm.state = 'win'; Gm.timer = 0; P.vx = 0; P.x = Math.min(P.x, L.flagX + 4); Snd.stopMusic(); Snd.win();
  const secs = Gm.t; Gm.timeBonus = Math.max(0, Math.round(120 - secs)) * 10; Gm.heartBonus = P.hearts * 100;
  Gm.final = Gm.score + Gm.timeBonus + Gm.heartBonus; Gm.newBest = Gm.final > bestScore;
  if (Gm.newBest) { bestScore = Gm.final; store.set('best', String(bestScore)); }
  $('btnPause').hidden = true;
}
function updateWin(dt) {
  Gm.timer += dt; const p = P;
  p.vx = 0; p.vy = Math.min(MAXFALL, p.vy + GRAV * dt); p.y += p.vy * dt;
  const gy = G - PH; if (p.y >= gy) { p.y = gy; p.vy = 0; p.on = true; if (Gm.timer > 0.4) { p.vy = -170; p.on = false; } }
  Gm.fw -= dt; if (Gm.fw <= 0 && Gm.timer < 2.8) { Gm.fw = 0.32; const fx = L.flagX + (Math.random() - 0.3) * 120, fy = 20 + Math.random() * 40, cols = ['#ffd23f', '#ff6b4a', '#7dffb0', '#9fe3ff', '#ff9ad5']; const c = cols[(Math.random() * cols.length) | 0]; sparkle(fx, fy, c, 26, 2.4); Snd.tone(900 + Math.random() * 500, 0.1, 'triangle', 0.05, 300); }
  if (Gm.timer > 3.0 && Gm.state === 'win') { Gm.state = 'winscreen'; showWin(); }
}
function updateDying(dt) {
  Gm.timer -= dt; P.vy += GRAV * dt; P.y += P.vy * dt;
  if (Gm.timer <= 0) { Gm.state = 'overscreen'; Snd.over(); showOver(); $('btnPause').hidden = true; }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; } q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.grow) q.size += q.grow * dt; if (q.k === 'dust') { q.vx *= 0.96; } }
  for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.life -= dt; q.y -= 16 * dt; if (q.life <= 0) pops.splice(i, 1); }
  if (shake > 0) shake -= dt;
  if (Gm && Gm.fade > 0 && Gm.state !== 'play') Gm.fade = Math.max(0, Gm.fade - dt * 1.8);
  if (Gm && Gm.flash > 0 && Gm.state !== 'play') Gm.flash = Math.max(0, Gm.flash - dt * 1.4);
}
function updateMenu(dt) {
  attractX += 42 * dt; if (attractX > 2600) { attractX = 0; L = buildLevel(); }
  P.x = attractX + W * 0.33; Gm.camX = attractX; P.vx = RUN; P.face = 1; P.anim += dt * 5; P.inv = 0; P.dead = false;
  const gap = topAt(L, P.x + 5) > G + 1; P.on = !gap; P.y = G - PH - (gap ? 12 : 0);
  L.enemies.forEach((e) => { if (e.t === 'crab') { e.x += e.dir * 22 * dt; if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } else if (e.x + e.w > e.x1) { e.x = e.x1 - e.w; e.dir = -1; } } else if (e.t === 'gull') { e.x += e.dir * 30 * dt; if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } else if (e.x + e.w > e.x1) { e.x = e.x1 - e.w; e.dir = -1; } e.y = e.by + Math.sin(performance.now() / 330 + e.ph) * 7; } });
}
function update(dt) {
  if (!Gm) return;
  const st = Gm.state;
  if (st === 'menu') { updateMenu(dt); updateParts(dt); return; }
  if (st === 'play') updatePlay(dt); else if (st === 'win' || st === 'winscreen') updateWin(dt); else if (st === 'dying') updateDying(dt);
  updateParts(dt);
}


/* ---------- rendering ---------- */
const px = (n) => n / S;   // css pixels -> world units, so text keeps one size on screen
let SAND = null;
function sandPattern() {
  if (SAND) return SAND;
  const tex = mk(512, 256), g = tex.getContext('2d');
  for (let i = 0; i < 420; i++) { const x = hash(i * 3) * 512, y = hash(i * 3 + 1) * 256, r = 1 + hash(i * 3 + 2) * 3.2; g.fillStyle = hash(i + 99) > 0.55 ? 'rgba(255,248,214,.5)' : 'rgba(150,100,40,.22)'; g.beginPath(); g.ellipse(x, y, r * 1.5, r, 0, 0, 7); g.fill(); }
  const p = ctx.createPattern(tex, 'repeat'); if (p && p.setTransform) { p.setTransform(new DOMMatrix().scale(0.25)); SAND = p; } else SAND = false; return SAND;
}
function drawLayer(c, par, cam) {
  const p = c.period, kl = c.width / p; let sx = mod(cam * par, p), dx = 0;
  while (dx < W) { const sw = Math.min(p - sx, W - dx + 0.5); ctx.drawImage(c, sx * kl, 0, sw * kl, c.height, dx, LY0, sw, LH); dx += sw; sx = 0; }
}
function drawSky(cam, t) {
  const g = ctx, top = -offY - 2;
  const s = CFG.skyColors, gr = g.createLinearGradient(0, top, 0, HZ + 1); s.forEach((c, i) => gr.addColorStop(i / (s.length - 1), c));
  g.fillStyle = gr; g.fillRect(0, top, W, HZ + 1 - top);
  // stars
  for (let i = 0; i < 40; i++) {
    const x = mod(hash(i * 3 + 1) * W - cam * 0.015, W), y = top + hash(i * 3 + 2) * (HZ - top) * 0.45, a = 0.35 + 0.35 * Math.sin(t * 1.6 + i * 2.3);
    g.fillStyle = 'rgba(255,244,220,' + clamp(a * (1 - (y - top) / ((HZ - top) * 0.5)), 0, 1) + ')'; g.fillRect(x, y, 0.55, 0.55);
  }
  const sx = W * 0.7 - cam * 0.02, sy = HZ - 5;
  g.globalCompositeOperation = 'lighter';
  g.drawImage(AS.glowO, sx - 80, sy - 80, 160, 160);
  // soft sun rays
  g.save(); g.translate(sx, sy); for (let i = 0; i < 7; i++) { const a = -Math.PI + (i + 0.5) / 7 * Math.PI + Math.sin(t * 0.2 + i) * 0.03; g.rotate(0); g.fillStyle = 'rgba(255,214,150,.032)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.05) * 260, Math.sin(a - 0.05) * 260); g.lineTo(Math.cos(a + 0.05) * 260, Math.sin(a + 0.05) * 260); g.closePath(); g.fill(); } g.restore();
  g.globalCompositeOperation = 'source-over';
  const sg = g.createRadialGradient(sx, sy, 2, sx, sy, 17); sg.addColorStop(0, '#fffbe0'); sg.addColorStop(0.7, '#ffe9a6'); sg.addColorStop(1, 'rgba(255,214,140,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 17, 0, 7); g.fill();
  // clouds
  for (let i = 0; i < 5; i++) {
    const c = AS.clouds[i % 3], w = 70 + (i % 3) * 30, h = w * c.height / c.width, x = mod(i * (W * 0.42 + 40) - cam * (0.04 + (i % 3) * 0.015) + t * (1.5 + i * 0.4), W + 2 * w) - w, y = top + 18 + hash(i + 40) * Math.max(10, HZ - top - 62);
    g.globalAlpha = 0.5 + 0.35 * hash(i + 7); g.drawImage(c, x, y, w, h);
  }
  g.globalAlpha = 1;
  // sea
  g.fillStyle = vgrad(g, HZ, 124, [[0, '#ffb98a'], [0.18, '#d8789a'], [0.55, '#4f4a96'], [1, '#26336f']]); g.fillRect(0, HZ, W, 124 - HZ);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const y = HZ + 2 + i * 2.3, w = (3 + i * 1.5) * (0.55 + 0.45 * Math.sin(t * 1.8 + i * 1.9)), cxx = sx + Math.sin(t * 0.9 + i) * 2;
    g.fillStyle = 'rgba(255,230,170,' + (0.5 - i * 0.025) + ')'; g.fillRect(cxx - w / 2, y, w, 0.7);
  }
  g.globalCompositeOperation = 'source-over';
}
function drawWater(cam, t) {
  const g = ctx;
  g.fillStyle = vgrad(g, 121, 152, [[0, '#35b9d6'], [0.3, '#1b8bb8'], [1, '#0d3a66']]); g.fillRect(0, 121, W, 40);
  for (let r = 0; r < 4; r++) {
    const y0 = 122 + r * 6.5, amp = 1.1 - r * 0.15, sp = 1.2 + r * 0.35;
    g.beginPath(); g.moveTo(0, 160);
    for (let x = 0; x <= W + 4; x += 4) g.lineTo(x, y0 + Math.sin((x + cam * (1 + r * 0.2)) / (9 + r * 3) + t * sp + r) * amp);
    g.lineTo(W + 4, 160); g.closePath(); g.fillStyle = r === 0 ? 'rgba(220,248,255,.28)' : 'rgba(255,255,255,' + (0.10 - r * 0.02) + ')'; g.fill();
  }
  g.strokeStyle = 'rgba(240,252,255,.55)'; g.lineWidth = 0.6; g.beginPath();
  for (let x = 0; x <= W + 4; x += 3) { const y = 122 + Math.sin((x + cam) / 9 + t * 1.2) * 1.1; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
}
function topRound(g, x, y, w, h, r1, r2) {
  g.beginPath(); g.moveTo(x + r1, y); g.lineTo(x + w - r2, y); g.arcTo(x + w, y, x + w, y + r2, r2); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.lineTo(x, y + r1); g.arcTo(x, y, x + r1, y, r1); g.closePath();
}
function drawGround(cam, t) {
  const g = ctx;
  for (const gd of L.grounds) {
    if (gd.x + gd.w < cam - 4 || gd.x > cam + W + 4) continue;
    const x = gd.x - cam;
    if (gd.kind === 'pier') {
      for (let p = gd.x + 6; p < gd.x + gd.w - 4; p += 48) { const sx = p - cam; g.fillStyle = vgrad(g, gd.y + 7, 150, [[0, '#6a4426'], [1, '#2e1d10']]); g.fillRect(sx, gd.y + 7, 4, 44); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(sx, gd.y + 7, 0.8, 30); g.fillStyle = 'rgba(216,244,251,.8)'; g.fillRect(sx - 1.4, 121.4, 6.8, 1); }
      g.fillStyle = vgrad(g, gd.y, gd.y + 7, [[0, '#d39b62'], [0.15, '#b87b45'], [1, '#7a4c28']]); rr(g, x, gd.y, gd.w, 7, 1); g.fill();
      g.fillStyle = 'rgba(255,240,210,.45)'; g.fillRect(x, gd.y, gd.w, 0.8);
      g.fillStyle = 'rgba(60,30,10,.4)'; for (let p = 0; p < gd.w; p += 8) g.fillRect(x + p, gd.y + 0.8, 0.6, 5.6);
      // railing with string lights
      g.fillStyle = '#4d3a2c'; for (let p = 2; p < gd.w; p += 32) g.fillRect(x + p, gd.y - 10, 1.6, 10);
      g.fillRect(x, gd.y - 10, gd.w, 1.1);
      const lights = Math.floor(gd.w / 8);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < lights; i++) { const lx = x + 4 + i * 8, sag = Math.sin(((i * 8) % 32) / 32 * Math.PI) * 2.4, ly = gd.y - 8.6 + sag; g.globalAlpha = 0.65 + 0.3 * Math.sin(t * 2 + i); g.drawImage(AS.glowO, lx - 3.4, ly - 3.4, 6.8, 6.8); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      continue;
    }
    const left = L.grounds.find((o) => o !== gd && o.x + o.w === gd.x && o.kind !== 'pier'), right = L.grounds.find((o) => o !== gd && o.x === gd.x + gd.w && o.kind !== 'pier');
    const rl = (!left || left.y > gd.y) ? 3.5 : 0, rrr = (!right || right.y > gd.y) ? 3.5 : 0, depth = 160 - gd.y;
    topRound(g, x, gd.y, gd.w, depth, rl, rrr);
    g.fillStyle = vgrad(g, gd.y, gd.y + 44, [[0, '#fbe8b0'], [0.08, '#f2d48c'], [0.5, '#e2b86c'], [1, '#c4914c']]); g.fill();
    const pat = sandPattern(); if (pat) { g.save(); g.clip(); g.fillStyle = pat; g.fillRect(x, gd.y, gd.w, depth); g.restore(); }
    g.fillStyle = 'rgba(255,252,230,.85)'; g.fillRect(x + rl, gd.y, gd.w - rl - rrr, 0.9);
    g.fillStyle = 'rgba(110,70,25,.28)'; if (rl) g.fillRect(x, gd.y + rl, 1, depth); if (rrr) g.fillRect(x + gd.w - 1, gd.y + rrr, 1, depth);
  }
  for (const p of L.planks) {
    if (p.x + p.w < cam - 4 || p.x > cam + W + 4) continue;
    const x = p.x - cam;
    g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, x + 1, p.y + 3.4, p.w - 2, 2, 1); g.fill();
    g.fillStyle = vgrad(g, p.y, p.y + 4.4, [[0, '#d9a56b'], [1, '#8a5530']]); rr(g, x, p.y, p.w, 4.4, 1.6); g.fill();
    g.fillStyle = 'rgba(255,240,210,.5)'; g.fillRect(x + 1, p.y + 0.3, p.w - 2, 0.7);
    g.fillStyle = 'rgba(60,30,10,.35)'; for (let q = 8; q < p.w; q += 8) g.fillRect(x + q, p.y + 0.8, 0.6, 3.2);
    g.fillStyle = '#5a3a20'; g.fillRect(x + 2, p.y + 4.4, 1.2, 3); g.fillRect(x + p.w - 3.2, p.y + 4.4, 1.2, 3);
  }
}
function drawTuft(g, x, y, t) { g.strokeStyle = '#7fbf5a'; g.lineWidth = 0.7; g.lineCap = 'round'; for (let i = -2; i <= 2; i++) { const sw = Math.sin(t * 1.6 + x + i) * 0.8; g.beginPath(); g.moveTo(x + i * 0.9, y); g.quadraticCurveTo(x + i * 1.6 + sw, y - 4, x + i * 2.6 + sw * 1.6, y - 6.5 + Math.abs(i)); g.stroke(); } }
function drawUmbrella(g, x, y) {
  g.fillStyle = '#e9e2d6'; g.fillRect(x - 0.6, y - 28, 1.4, 28);
  for (let i = 0; i < 6; i++) { const a0 = Math.PI + i / 6 * Math.PI, a1 = Math.PI + (i + 1) / 6 * Math.PI; g.fillStyle = i % 2 ? '#fdfdfd' : SC.accent; g.beginPath(); g.moveTo(x, y - 27); g.arc(x, y - 22.5, 15, a0, a1); g.lineTo(x, y - 27); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, y, 11, 1.5, 0, 0, 7); g.fill();
}
function drawFlagPole(cam, t) {
  const g = ctx, fx = L.flagX - cam; if (fx < -90 || fx > W + 60) return;
  const acc = SC.accent;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(fx + 1, G, 9, 2, 0, 0, 7); g.fill();
  g.fillStyle = vgrad(g, G - 4, G, [[0, '#8a8f99'], [1, '#4b505a']]); rr(g, fx - 6, G - 4, 14, 4, 1.5); g.fill();
  g.fillStyle = vgrad(g, G - 92, G, [[0, '#ffffff'], [1, '#b9c0cc']]); rr(g, fx - 0.4, G - 92, 3, 90, 1.5); g.fill();
  g.globalCompositeOperation = 'lighter'; g.drawImage(AS.glowY, fx - 11, G - 106, 25, 25); g.globalCompositeOperation = 'source-over';
  g.fillStyle = acc; g.beginPath(); g.arc(fx + 1.1, G - 93, 2.4, 0, 7); g.fill();
  const fw = 30, fh = 18, fy = G - 89;
  g.beginPath(); g.moveTo(fx + 2.6, fy);
  for (let i = 0; i <= 10; i++) { const u = i / 10; g.lineTo(fx + 2.6 + u * fw, fy + Math.sin(t * 6 + u * 5) * (0.5 + u * 1.8) + u * 1.5); }
  for (let i = 10; i >= 0; i--) { const u = i / 10; g.lineTo(fx + 2.6 + u * fw, fy + fh - u * 2.5 + Math.sin(t * 6 + u * 5) * (0.5 + u * 1.8)); }
  g.closePath(); g.fillStyle = vgrad(g, fy, fy + fh, [[0, shade(SC.board, 1.3)], [1, shade(SC.board, 0.85)]]); g.fill(); g.lineWidth = 0.6; g.strokeStyle = acc; g.stroke();
  boltPath(g, fx + 14, fy + 9, 11); g.fillStyle = acc; g.fill();
  g.fillStyle = '#fff'; g.font = '900 ' + 5 + 'px ' + HEAVY; g.textAlign = 'center'; g.fillText(String(SP_.signTop || SP_.name).toUpperCase().slice(0, 6), fx + 18, fy + 16);
}
function drawDecor(cam, t) {
  const g = ctx;
  for (const d of L.decor) {
    const x = d.x - cam; if (x < -150 || x > W + 150) continue;
    if (d.t === 'palm') { const c = AS.palms[d.v || 0]; g.save(); g.translate(x, G + 2); g.transform(1, 0, Math.sin(t * 1.3 + d.x * 0.1) * 0.025, 1, 0, 0); g.drawImage(c, -35, -96, 70, 100); g.restore(); }
    else if (d.t === 'shop') { if (SP_.scene.storefront) drawStore(g, x, G, 108, 64); }
    else if (d.t === 'van') { if (SP_.scene.van) drawVan(g, x, G + 2, 1.15); }
    else if (d.t === 'banner') { if (SP_.scene.banners) { g.fillStyle = '#4d3a2c'; g.fillRect(x, G - 30, 1.4, 21); g.fillRect(x + d.w, G - 30, 1.4, 21); drawBanner(g, x, G - 29, d.w); } }
    else if (d.t === 'poweredby') {
      g.fillStyle = '#39424f'; g.fillRect(x - 28, G - 22, 2, 22); g.fillRect(x + 26, G - 22, 2, 22);
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 3; g.shadowOffsetY = 1.2; g.fillStyle = vgrad(g, G - 40, G - 20, [[0, shade(SC.board, 1.3)], [1, shade(SC.board, 0.85)]]); rr(g, x - 36, G - 40, 72, 17, 4); g.fill(); g.restore();
      g.lineWidth = 0.6; g.strokeStyle = SC.accent; rr(g, x - 36, G - 40, 72, 17, 4); g.stroke();
      boltPath(g, x - 28, G - 31.5, 9); g.fillStyle = SC.accent; g.fill();
      g.fillStyle = '#fff'; g.font = '800 4.7px ' + FONT; g.textAlign = 'left'; g.fillText(SP_.poweredBy || '', x - 21, G - 29.6);
    }
    else if (d.t === 'tuft') drawTuft(g, x, G + 0.5, t);
    else if (d.t === 'star') { g.fillStyle = '#ff9f43'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.6 : 4; g.lineTo(x + Math.cos(a) * r, G - 2.5 + Math.sin(a) * r); } g.closePath(); g.fill(); }
    else if (d.t === 'umbrella') drawUmbrella(g, x, G);
    else if (d.t === 'torch') drawLamp(g, x, G, 28, true);
  }
  // checkpoints
  for (const c of L.checkpoints) {
    const x = c.x - cam; if (x < -20 || x > W + 20) continue;
    g.fillStyle = '#e9eef6'; rr(g, x, G - 24, 1.8, 24, 0.9); g.fill();
    const wv = c.on ? Math.sin(t * 7) * 0.9 : 0;
    g.beginPath(); g.moveTo(x + 1.8, G - 24); g.quadraticCurveTo(x + 7, G - 24 + wv - 1, x + 12, G - 21 + wv); g.quadraticCurveTo(x + 7, G - 18 + wv, x + 1.8, G - 17); g.closePath();
    g.fillStyle = c.on ? SC.accent : '#8590a2'; g.fill();
    boltPath(g, x + 6.2, G - 20.6 + wv * 0.5, 5); g.fillStyle = c.on ? '#23272e' : '#5a6372'; g.fill();
    if (c.on) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 + 0.2 * Math.sin(t * 4); g.drawImage(AS.glowY, x - 6, G - 36, 26, 26); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  }
  drawFlagPole(cam, t);
}
function drawHints(cam) {
  const g = ctx; g.font = '700 ' + px(15) + 'px ' + FONT; g.textAlign = 'center'; g.lineJoin = 'round';
  for (const d of L.decor) {
    if (d.t !== 'hint') continue; const x = d.x - cam; if (x < -150 || x > W + 150) continue;
    const s = hintText(d.text);
    g.lineWidth = px(4); g.strokeStyle = 'rgba(20,16,50,.55)'; g.strokeText(s, x, G - 84); g.fillStyle = '#fff'; g.fillText(s, x, G - 84);
  }
}
function hintText(k) {
  if (k === 'hint1') return (mode === 'auto' || isTouch) ? 'Tap to jump' : 'Press Space to jump';
  if (k === 'hint2') return 'Hold for a higher jump';
  return 'Stomp the crabs!';
}
function drawItems(cam, t) {
  const g = ctx;
  for (const it of L.items) {
    if (it.got) continue; const x = it.x - cam; if (x < -20 || x > W + 20) continue;
    const bob = Math.sin(t * 3 + it.x * 0.07) * 1.6;
    if (it.t === 'coin') { const s = 17 + Math.sin(t * 5 + it.x) * 1.2; g.save(); g.translate(x, it.y + bob); g.rotate(Math.sin(t * 2.4 + it.x * 0.05) * 0.18); g.drawImage(AS.boltC, -s / 2, -s / 2, s, s); g.restore(); }
    else if (it.t === 'shell') { const s = 27 + Math.sin(t * 4) * 2; g.save(); g.translate(x, it.y + bob); g.rotate(Math.sin(t * 1.6) * 0.15); g.drawImage(AS.megaC, -s / 2, -s / 2, s, s); g.restore(); }
    else { const s = 12 + Math.sin(t * 6) * 0.8; g.drawImage(AS.heart, x - s / 2, it.y + bob - s / 2, s, s); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(AS.glowO, x - 11, it.y + bob - 11, 22, 22); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  }
}
function drawEnemies(cam, t) {
  const g = ctx;
  for (const e of L.enemies) {
    const x = e.x - cam; if (x < -30 || x > W + 30) continue;
    g.save(); g.translate(-cam, 0);
    if (!e.alive) { if (e.sq > 0 && e.t === 'crab') { g.globalAlpha = e.sq / 0.4; g.translate(e.x + 7, e.y + e.h); g.scale(1.25, 0.28); g.translate(-(e.x + 7), -(e.y + e.h)); drawCrab(g, e, t); } g.restore(); continue; }
    if (e.t !== 'gull') { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(e.x + e.w / 2, e.y + e.h + 0.3, e.w * 0.5, 1.4, 0, 0, 7); g.fill(); }
    if (e.t === 'crab') drawCrab(g, e, t); else if (e.t === 'gull') drawGull(g, e, t); else drawUrchin(g, e, t);
    g.restore();
  }
}
function drawPlayerWorld(cam, t) {
  const p = P; if (!p) return; const g = ctx;
  const ground = topAt(L, p.x + p.w / 2);
  if (ground < 400 && !p.dead) { const h = clamp((ground - (p.y + p.h)) / 60, 0, 1); g.fillStyle = 'rgba(30,18,40,' + (0.28 * (1 - h * 0.7)) + ')'; g.beginPath(); g.ellipse(p.x + p.w / 2 - cam, ground + 0.4, 6 * (1 - h * 0.4), 1.5, 0, 0, 7); g.fill(); }
  g.save(); if (p.inv > 0 && Gm.state === 'play') g.globalAlpha = 0.55 + 0.35 * Math.sin(t * 28);
  const run = p.on && Math.abs(p.vx) > 12;
  drawChar(g, p.x - 4 - cam, p.y - 2, { face: p.face, phase: p.anim, air: !p.on || p.dead, vy: p.vy, sq: p.sq, run, idle: p.idle });
  g.restore();
}
function drawParts(cam) {
  const g = ctx;
  for (const q of parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x - cam;
    if (q.k === 'spark') {
      g.globalCompositeOperation = 'lighter'; g.fillStyle = q.color; g.globalAlpha = a; g.save(); g.translate(x, q.y); g.rotate(q.rot + q.life * 3);
      const s = q.size * (0.5 + a * 0.6); g.beginPath(); g.moveTo(0, -s * 2); g.lineTo(s * 0.45, -s * 0.45); g.lineTo(s * 2, 0); g.lineTo(s * 0.45, s * 0.45); g.lineTo(0, s * 2); g.lineTo(-s * 0.45, s * 0.45); g.lineTo(-s * 2, 0); g.lineTo(-s * 0.45, -s * 0.45); g.closePath(); g.fill(); g.restore();
      g.globalAlpha = a * 0.5; g.drawImage(AS.glowW, x - s * 2, q.y - s * 2, s * 4, s * 4); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    } else if (q.k === 'ring') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.9; g.lineWidth = 0.8 * a + 0.2; g.strokeStyle = q.color; g.beginPath(); g.arc(x, q.y, q.size, 0, 7); g.stroke(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    else if (q.k === 'dust') { const gr = g.createRadialGradient(x, q.y, 0, x, q.y, q.size); gr.addColorStop(0, rgba(q.color, 0.55 * a)); gr.addColorStop(1, rgba(q.color, 0)); g.fillStyle = gr; g.fillRect(x - q.size, q.y - q.size, q.size * 2, q.size * 2); }
    else { g.globalAlpha = a; g.fillStyle = q.color; g.beginPath(); g.arc(x, q.y, q.size * 0.8, 0, 7); g.fill(); g.globalAlpha = 1; }
  }
  g.font = '800 ' + px(16) + 'px ' + FONT; g.textAlign = 'center'; g.lineJoin = 'round';
  for (const q of pops) { const a = clamp(q.life / 0.5, 0, 1), x = q.x - cam; g.globalAlpha = a; g.lineWidth = px(4); g.strokeStyle = 'rgba(20,16,50,.6)'; g.strokeText(q.text, x, q.y); g.fillStyle = '#fff6b0'; g.fillText(q.text, x, q.y); }
  g.globalAlpha = 1;
}

/* ---------- HUD (drawn in screen pixels, glassy) ---------- */
function glass(g, x, y, w, h, r) {
  rr(g, x, y, w, h, r); g.fillStyle = 'rgba(14,18,30,.46)'; g.fill();
  g.fillStyle = vgrad(g, y, y + h, [[0, 'rgba(255,255,255,.16)'], [0.5, 'rgba(255,255,255,0)']]); g.fill();
  g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke();
}
function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
function fmtTime(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + pad(s % 60, 2); }
function drawHUD(t) {
  const g = ctx, cssW = CW, right = 100, m = 12;
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.imageSmoothingEnabled = true;
  const usable = cssW - right - m;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  glass(g, m, 10, 128, 42, 21);
  g.font = '700 10px ' + FONT; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText('SCORE', m + 16, 25);
  g.font = '800 20px ' + FONT; g.fillStyle = '#fff'; g.fillText(pad(Gm.score, 6), m + 16, 45);
  glass(g, m + 136, 10, 86, 42, 21);
  g.font = '700 10px ' + FONT; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText('TIME', m + 152, 25);
  g.font = '800 20px ' + FONT; g.fillStyle = SC.accent; g.fillText(fmtTime(Gm.t), m + 152, 45);
  // hearts and pickups
  glass(g, m, 58, Math.min(usable, 226), 34, 17);
  for (let i = 0; i < 3; i++) { const beat = P.hearts === 1 && i === 0 ? 1 + 0.12 * Math.sin(t * 9) : 1, s = 18 * beat; g.drawImage(i < P.hearts ? AS.heart : AS.heartE, m + 10 + i * 22 - (s - 18) / 2, 66 - (s - 18) / 2, s, s); }
  g.drawImage(AS.boltC, m + 78, 60, 28, 28); g.font = '800 15px ' + FONT; g.fillStyle = '#fff'; g.fillText('x' + Gm.coins, m + 104, 80);
  const mx = m + 104 + g.measureText('x' + Gm.coins).width + 8; g.drawImage(AS.megaC, mx, 59, 30, 30); g.fillText('x' + Gm.shells, mx + 28, 80);
  // progress
  const bx = m + 4, by = 104, bw = usable - 4, prog = clamp(P.x / L.flagX, 0, 1);
  rr(g, bx, by, bw, 7, 3.5); g.fillStyle = 'rgba(255,255,255,.2)'; g.fill();
  if (prog > 0.002) { rr(g, bx, by, Math.max(7, bw * prog), 7, 3.5); g.fillStyle = vgrad(g, by, by + 7, [[0, '#fff7a8'], [1, SC.accent]]); g.fill(); }
  g.globalCompositeOperation = 'lighter'; g.drawImage(AS.boltC, bx + bw * prog - 15, by - 12, 30, 30); g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#fff'; g.beginPath(); g.arc(bx + bw, by + 3.5, 5, 0, 7); g.fill(); g.fillStyle = SC.board; g.beginPath(); g.arc(bx + bw, by + 3.5, 2.5, 0, 7); g.fill();
  if (Gm.bannerT > 0 && Gm.state === 'play') {
    const u = clamp(1 - Gm.bannerT / 1.4, 0, 1), sc = 0.8 + Math.min(1, u * 5) * 0.2 + u * 0.1, a = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
    g.save(); g.translate(cssW / 2, CH * 0.36); g.scale(sc, sc); g.globalAlpha = clamp(a, 0, 1); g.textAlign = 'center'; g.font = '900 64px ' + FONT; g.lineWidth = 8; g.lineJoin = 'round'; g.strokeStyle = 'rgba(20,16,50,.5)'; g.strokeText(Gm.banner, 0, 0); g.fillStyle = vgrad(g, -50, 10, [[0, '#ffffff'], [1, SC.accent]]); g.fillText(Gm.banner, 0, 0); g.restore();
  }
}

function render(t) {
  const g = ctx; tNow = t;
  g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const cam = Gm ? Gm.camX : 0;
  g.save(); g.translate(0, offY);
  if (shake > 0) g.translate((Math.random() - 0.5) * 1.6 * Math.min(1, shake * 5), (Math.random() - 0.5) * 1.6 * Math.min(1, shake * 5));
  drawSky(cam, t);
  if (LAYERS.sky) { drawLayer(LAYERS.sky, 0.1, cam); drawLayer(LAYERS.hills, 0.22, cam); drawLayer(LAYERS.mid, 0.36, cam); drawLayer(LAYERS.street, 0.62, cam); }
  drawWater(cam, t); drawDecor(cam, t); drawGround(cam, t); drawItems(cam, t); drawEnemies(cam, t); drawPlayerWorld(cam, t); drawHints(cam); drawParts(cam);
  g.restore();
  // screen-space finishing: vignette, damage flash, fade
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const cw = CW, ch = CH, vg = g.createRadialGradient(cw / 2, ch * 0.55, Math.min(cw, ch) * 0.35, cw / 2, ch * 0.55, Math.max(cw, ch) * 0.8); vg.addColorStop(0, 'rgba(10,8,30,0)'); vg.addColorStop(1, 'rgba(10,8,30,.4)'); g.fillStyle = vg; g.fillRect(0, 0, cw, ch);
  if (Gm && Gm.flash > 0) { g.fillStyle = 'rgba(255,50,50,' + (Gm.flash * 0.5) + ')'; g.fillRect(0, 0, cw, ch); }
  if (Gm && (Gm.state === 'play' || Gm.state === 'dying' || Gm.state === 'win' || Gm.state === 'paused')) drawHUD(t);
  if (Gm && Gm.fade > 0) { g.fillStyle = 'rgba(8,10,24,' + Gm.fade + ')'; g.fillRect(0, 0, cw, ch); }
}

/* ---------- layout ---------- */
const stage = $('stage');
let CW = 320, CH = 180, layerK = 0;
function resize() {
  const r = stage.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
  CW = Math.max(1, r.width); CH = Math.max(1, r.height);
  S = clamp(Math.min(CW / 190, CH / 144), 1, 4);
  if (CW / S > 420) S = CW / 420;
  W = Math.ceil(CW / S); H = clamp(Math.ceil(CH / S), 144, 440); offY = H - 144; K = S * DPR;
  cv.width = Math.ceil(W * K); cv.height = Math.ceil(H * K); cv.style.width = (W * S) + 'px'; cv.style.height = (H * S) + 'px';
  const kq = Math.round(clamp(K, 1.2, 3) * 4) / 4; if (kq !== layerK) { layerK = kq; buildLayers(kq); }
  SAND = null;
}

/* ---------- screens ---------- */
const SCREENS = ['startScreen', 'pauseScreen', 'winScreen', 'overScreen'];
function showOnly(id) { SCREENS.forEach((s) => { $(s).hidden = s !== id; }); }
function statRows(rows) { return rows.map((r) => '<tr' + (r[2] ? ' class="total"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join(''); }
const cn = CFG.collectibles;
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function showWin() {
  document.body.classList.remove('playing');
  $('winSub').textContent = 'You reached the finish flag!';
  $('winStats').innerHTML = statRows([
    ['Time', fmtTime(Gm.t)], [cn.common.plural, Gm.coins + ' / ' + L.totalCoins], [cn.rare.plural, Gm.shells + ' / ' + L.totalShells],
    ['Hearts left', P.hearts + ' / 3'], ['Points', Gm.score], ['Time bonus', '+' + Gm.timeBonus], ['Heart bonus', '+' + Gm.heartBonus],
    ['FINAL SCORE', Gm.final, true]].concat(Gm.newBest ? [['NEW BEST SCORE!', '']] : [], [['Best on this device', bestScore]]));
  showOnly('winScreen');
}
function showOver() {
  document.body.classList.remove('playing');
  $('overSub').textContent = 'The tide got you this time. Give it another go!';
  $('overStats').innerHTML = statRows([['Time', fmtTime(Gm.t)], [cn.common.plural, Gm.coins + ' / ' + L.totalCoins], [cn.rare.plural, Gm.shells + ' / ' + L.totalShells], ['Score', Gm.score, true], ['Best on this device', bestScore]]);
  showOnly('overScreen');
}
function toMenu() {
  Snd.stopMusic(); newGame(); Gm.state = 'menu'; Gm.fade = 0; attractX = 0; showOnly('startScreen'); $('btnPause').hidden = true; document.body.classList.remove('playing'); refreshAvatar();
}
function pauseGame() {
  if (!Gm || Gm.state !== 'play') return;
  Gm.state = 'paused'; Snd.stopMusic(); showOnly('pauseScreen'); input.left = input.right = input.jump = false; clearBtnStates();
}
function resumeGame() { if (Gm && Gm.state === 'paused') { Gm.state = 'play'; showOnly(null); Snd.startMusic(); last = performance.now(); } }

/* ---------- input ---------- */
function clearBtnStates() { ['btnLeft', 'btnRight', 'btnJump'].forEach((id) => $(id).classList.remove('on')); }
function holdBtn(id, onDown, onUp) {
  const el = $(id), ptrs = new Set();
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); Snd.init(); try { el.setPointerCapture(e.pointerId); } catch (x) {} ptrs.add(e.pointerId); el.classList.add('on'); onDown(); });
  const up = (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (!ptrs.size) { el.classList.remove('on'); onUp(); } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
holdBtn('btnLeft', () => { input.left = true; }, () => { input.left = false; });
holdBtn('btnRight', () => { input.right = true; }, () => { input.right = false; });
holdBtn('btnJump', () => setJump(true), () => setJump(false));
// tap anywhere on the game to jump (hold for a higher jump)
(function () {
  let id = null;
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); Snd.init(); id = e.pointerId; try { cv.setPointerCapture(id); } catch (x) {} setJump(true); });
  const up = (e) => { if (e.pointerId === id) { id = null; setJump(false); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
})();
const KEYS = { left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], jump: [' ', 'ArrowUp', 'w', 'W', 'z', 'Z', 'x', 'X'] };
const keyDown = { jump: new Set() };
window.addEventListener('keydown', (e) => {
  Snd.init();
  const k = e.key;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const inCrop = !$('cropModal').hidden; if (inCrop) { if (k === 'Escape') cancelCrop(); return; }
  const menu = !$('startScreen').hidden, endScr = !$('winScreen').hidden || !$('overScreen').hidden;
  if ((k === 'Enter' || k === ' ') && (menu || endScr) && !(e.target && /^(INPUT|A|BUTTON|LABEL)$/.test(e.target.tagName))) { e.preventDefault(); startPlay(); return; }
  if (k === 'm' || k === 'M') { toggleMute(); return; }
  if (k === 'p' || k === 'P' || k === 'Escape') { if (Gm && Gm.state === 'play') pauseGame(); else if (Gm && Gm.state === 'paused') resumeGame(); return; }
  if (KEYS.left.includes(k)) { input.left = true; e.preventDefault(); }
  if (KEYS.right.includes(k)) { input.right = true; e.preventDefault(); }
  if (KEYS.jump.includes(k)) { e.preventDefault(); if (!e.repeat) keyDown.jump.add(k); setJump(true); }
});
window.addEventListener('keyup', (e) => {
  const k = e.key;
  if (KEYS.left.includes(k)) input.left = false;
  if (KEYS.right.includes(k)) input.right = false;
  if (KEYS.jump.includes(k)) { keyDown.jump.delete(k); if (!keyDown.jump.size) setJump(false); }
});
window.addEventListener('blur', () => { input.left = input.right = false; setJump(false); keyDown.jump.clear(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); else last = performance.now(); });
document.addEventListener('contextmenu', (e) => { if (e.target === cv || e.target.closest('#controls')) e.preventDefault(); });

/* ---------- mute / mode ---------- */
function toggleMute() { Snd.setMuted(!Snd.muted); store.set('muted', Snd.muted ? '1' : '0'); refreshMute(); if (!Snd.muted) { Snd.init(); Snd.blip(); } }
function refreshMute() {
  $('icoSound').hidden = Snd.muted; $('icoMuted').hidden = !Snd.muted;
  $('btnMute').setAttribute('aria-pressed', Snd.muted ? 'true' : 'false'); $('btnMute').setAttribute('aria-label', Snd.muted ? 'Unmute sound' : 'Mute sound');
}
function setMode(m) {
  mode = m; store.set('mode', m); document.body.classList.toggle('auto', m === 'auto');
  $('modeAuto').classList.toggle('on', m === 'auto'); $('modeManual').classList.toggle('on', m === 'manual');
  $('modeAuto').setAttribute('aria-pressed', m === 'auto'); $('modeManual').setAttribute('aria-pressed', m === 'manual');
  $('helpText').textContent = m === 'auto'
    ? 'Auto-run: you run by yourself. Tap anywhere or press the JUMP button. Hold for a higher jump. Space or Up also works.'
    : 'Left and Right buttons or arrow keys to move. Tap, JUMP button, Space or Up to jump. Hold for a higher jump. M mutes.';
}
$('btnMute').addEventListener('click', () => { toggleMute(); $('btnMute').blur(); });
$('btnPause').addEventListener('click', () => { Snd.init(); pauseGame(); $('btnPause').blur(); });
$('btnResume').addEventListener('click', resumeGame);
$('btnQuit').addEventListener('click', toMenu);
$('btnPlay').addEventListener('click', startPlay);
$('btnWinAgain').addEventListener('click', startPlay); $('btnOverAgain').addEventListener('click', startPlay);
$('btnWinMenu').addEventListener('click', toMenu); $('btnOverMenu').addEventListener('click', toMenu);
$('modeAuto').addEventListener('click', () => setMode('auto')); $('modeManual').addEventListener('click', () => setMode('manual'));

/* ---------- photo head (stays on the device) ---------- */
function buildHead() {
  if (!photo) { HEAD = null; return; }
  const R = 160, out = mk(R, R), g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.save(); g.beginPath(); g.arc(R / 2, R / 2, R / 2 - 6, 0, Math.PI * 2); g.clip(); g.drawImage(photo, 6, 6, R - 12, R - 12); g.restore();
  g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(R / 2, R / 2, R / 2 - 4, 0, Math.PI * 2); g.stroke();
  HEAD = out;
}
function drawAvatar(canvas, scale) {
  const g = canvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const gl = glowSpriteSafe(); if (gl) { g.globalAlpha = 0.5; g.drawImage(gl, -2, 8, canvas.width / scale + 4, canvas.height / scale * 0.8); g.globalAlpha = 1; }
  drawChar(g, (canvas.width / scale - 18) / 2, canvas.height / scale - 28, { face: 1, phase: 0, idle: tNow, run: false });
  g.setTransform(1, 0, 0, 1, 0, 0);
}
function glowSpriteSafe() { return AS.glowW || null; }
function refreshAvatar() {
  drawAvatar($('avatarPrev'), 8); $('btnRemove').hidden = !photo;
  $('btnFace').textContent = photo ? 'Change your face' : 'Add your face';
}
function loadSavedPhoto() {
  const d = store.get('photo'); if (!d) return;
  const img = new Image(); img.onload = () => { const c = mk(96, 96); c.getContext('2d').drawImage(img, 0, 0, 96, 96); photo = c; remember = true; buildHead(); refreshAvatar(); };
  img.src = d;
}
function removePhoto() { photo = null; remember = false; store.del('photo'); buildHead(); refreshAvatar(); }
$('btnRemove').addEventListener('click', removePhoto);
$('btnFace').addEventListener('click', () => { const fc = $('faceChoice'); fc.hidden = !fc.hidden; });

/* ---------- crop dialog ---------- */
const CS = 300, CR = 128;
const crop = { img: null, scale: 1, min: 1, ox: 0, oy: 0, z: 100, tmp: null };
const cc = $('cropCanvas'), cg = cc.getContext('2d');
function cropClamp() {
  const iw = crop.img.naturalWidth * crop.scale, ih = crop.img.naturalHeight * crop.scale;
  crop.ox = Math.min(CS / 2 - CR, Math.max(CS / 2 + CR - iw, crop.ox)); crop.oy = Math.min(CS / 2 - CR, Math.max(CS / 2 + CR - ih, crop.oy));
}
function cropAuto() {
  const im = crop.img; crop.z = 120; $('zoom').value = 120; crop.scale = crop.min * 1.2;
  const iw = im.naturalWidth * crop.scale, ih = im.naturalHeight * crop.scale;
  crop.ox = CS / 2 - iw / 2; crop.oy = CS / 2 - (ih > iw ? ih * 0.42 : ih / 2); cropClamp(); cropDraw();
}
function cropZoom(z) {
  const im = crop.img; if (!im) return; z = clamp(z, 100, 400);
  const ix = (CS / 2 - crop.ox) / crop.scale, iy = (CS / 2 - crop.oy) / crop.scale;
  crop.z = z; crop.scale = crop.min * z / 100; crop.ox = CS / 2 - ix * crop.scale; crop.oy = CS / 2 - iy * crop.scale; cropClamp(); $('zoom').value = Math.round(z); cropDraw();
}
let cropRaf = 0;
function cropDraw() {
  const im = crop.img; if (!im) return;
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.imageSmoothingEnabled = true; cg.fillStyle = '#000'; cg.fillRect(0, 0, CS, CS);
  cg.drawImage(im, crop.ox, crop.oy, im.naturalWidth * crop.scale, im.naturalHeight * crop.scale);
  cg.save(); cg.beginPath(); cg.rect(0, 0, CS, CS); cg.arc(CS / 2, CS / 2, CR, 0, Math.PI * 2, true); cg.fillStyle = 'rgba(8,10,20,.68)'; cg.fill('evenodd'); cg.restore();
  cg.lineWidth = 3; cg.strokeStyle = '#ffffff'; cg.beginPath(); cg.arc(CS / 2, CS / 2, CR, 0, Math.PI * 2); cg.stroke();
  if (!cropRaf) cropRaf = requestAnimationFrame(() => { cropRaf = 0; cropPreview(); });
}
function cropOutput() {
  const im = crop.img, out = mk(96, 96), g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
  const sx = (CS / 2 - CR - crop.ox) / crop.scale, sy = (CS / 2 - CR - crop.oy) / crop.scale, sw = 2 * CR / crop.scale;
  g.drawImage(im, sx, sy, sw, sw, 0, 0, 96, 96); return out;
}
function cropPreview() {
  if (!crop.img) return;
  const keepPhoto = photo, keepHead = HEAD;
  photo = cropOutput(); buildHead(); drawAvatar($('cropPrev'), 4);
  photo = keepPhoto; HEAD = keepHead;
}
function openCrop(file) {
  const err = $('cropErr'); err.hidden = true;
  if (!file) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    crop.img = img; crop.min = Math.max(2 * CR / img.naturalWidth, 2 * CR / img.naturalHeight);
    $('optRemember').checked = remember; $('cropNote').textContent = CFG.photoNote;
    $('cropModal').hidden = false; $('faceChoice').hidden = true; cropAuto(); URL.revokeObjectURL(url);
  };
  img.onerror = () => { URL.revokeObjectURL(url); alert('Sorry, that photo could not be opened. Please try a different picture.'); };
  img.src = url;
}
function cancelCrop() { $('cropModal').hidden = true; crop.img = null; }
function applyCrop() {
  if (!crop.img) return;
  photo = cropOutput(); remember = $('optRemember').checked;
  if (remember) { try { store.set('photo', photo.toDataURL('image/jpeg', 0.88)); } catch (e) {} } else store.del('photo');
  buildHead(); refreshAvatar(); cancelCrop();
}
['fileCam', 'fileGal'].forEach((id) => $(id).addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; openCrop(f); }));
$('zoom').addEventListener('input', (e) => cropZoom(parseFloat(e.target.value)));
$('btnAuto').addEventListener('click', cropAuto);
$('btnCropUse').addEventListener('click', applyCrop); $('btnCropCancel').addEventListener('click', cancelCrop);
(function () {
  const ptrs = new Map(); let pinch = 0, pz = 100;
  const pos = (e) => { const r = cc.getBoundingClientRect(); return { x: (e.clientX - r.left) * CS / r.width, y: (e.clientY - r.top) * CS / r.height }; };
  cc.addEventListener('pointerdown', (e) => { e.preventDefault(); cc.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, pos(e)); if (ptrs.size === 2) { const a = [...ptrs.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); pz = crop.z; } });
  cc.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId) || !crop.img) return; const p = pos(e), o = ptrs.get(e.pointerId);
    if (ptrs.size === 1) { crop.ox += p.x - o.x; crop.oy += p.y - o.y; cropClamp(); cropDraw(); }
    ptrs.set(e.pointerId, p);
    if (ptrs.size === 2) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch > 0) cropZoom(pz * d / pinch); }
  });
  const up = (e) => { ptrs.delete(e.pointerId); pinch = 0; };
  cc.addEventListener('pointerup', up); cc.addEventListener('pointercancel', up);
  cc.addEventListener('wheel', (e) => { e.preventDefault(); cropZoom(crop.z * (e.deltaY < 0 ? 1.08 : 0.92)); }, { passive: false });
})();

/* ---------- main loop ---------- */
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt * timeScale;
  let n = 0; while (acc >= STEP && n < 600) { if (Gm && Gm.state !== 'paused') update(STEP); acc -= STEP; n++; }
  if (acc > STEP * 4) acc = 0;
  render(now / 1000);
}

/* ---------- init ---------- */
function init() {
  buildAssets();
  document.title = CFG.gameTitle + ' | ' + SP_.name + ' edition';
  const rs = document.documentElement.style;
  rs.setProperty('--btn', COL.button); rs.setProperty('--btnText', COL.buttonText); rs.setProperty('--panel', COL.panel); rs.setProperty('--panelText', COL.panelText); rs.setProperty('--accent', COL.accent);
  rs.setProperty('--board', SC.board); rs.setProperty('--blue', SC.accent2);
  $('gameTitle').textContent = CFG.gameTitle;
  $('tagline').textContent = CFG.tagline || '';
  const lg = $('brandLogo'); lg.src = AS.brandImg; lg.alt = SP_.name + ' sign'; lg.hidden = false;
  $('poweredBy').textContent = SP_.poweredBy || '';
  $('photoNote').textContent = CFG.photoNote;
  $('startDisclaimer').textContent = CFG.disclaimer; $('footText').textContent = CFG.disclaimer;
  const fs = $('footStudio'); fs.href = CFG.studio.link; fs.textContent = CFG.studio.buttonText;
  [['winCtaHead', 'winCta', 'winStudioHead', 'winStudio'], ['overCtaHead', 'overCta', 'overStudioHead', 'overStudio']].forEach((p) => {
    $(p[0]).textContent = CFG.cta.heading; const a = $(p[1]); a.href = CFG.cta.link; a.textContent = CFG.cta.buttonText;
    $(p[2]).textContent = CFG.studio.heading; const b = $(p[3]); b.href = CFG.studio.link; b.textContent = CFG.studio.buttonText;
  });
  Snd.muted = store.get('muted') === '1'; refreshMute();
  setMode(store.get('mode') || (isTouch ? 'auto' : 'manual'));
  resize(); window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  toMenu(); loadSavedPhoto();
  requestAnimationFrame(frame);
}
init();

// small, read-only handles for testing and debugging
window.BeachRunner = {
  config: CFG,
  get game() { return Gm; }, get player() { return P; }, get level() { return L; }, get input() { return input; },
  get hasPhoto() { return !!photo; }, get mode() { return mode; }, get view() { return { W, H, S, DPR }; },
  setTimeScale(v) { timeScale = v; }, start: startPlay, setMode,
  setPhotoCanvas(c) { photo = c; buildHead(); refreshAvatar(); }
};
})();

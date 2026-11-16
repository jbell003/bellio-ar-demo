/* Beach Runner - an original retro side-scroller. Plain HTML5 canvas, no libraries, no build step.
   All art is drawn in code or from tiny pixel maps below. All sounds are generated with WebAudio.
   Photos are read on the device only and are never uploaded. */
(function () {
'use strict';

/* ---------- config ---------- */
const DEF = {
  businessName: 'Bellio Gulf Coast', gameTitle: 'Beach Runner', tagline: '', logo: '',
  signText: '', flagLetter: '',
  colors: { shirt: '#ff6b4a', shorts: '#1fa3b5', hat: '#ffcf3a', button: '#ff8a3d', buttonText: '#2b1a3a', panel: '#2b1a3a', panelText: '#fff4d6', accent: '#ffcf3a' },
  skyColors: ['#1b1346', '#3a1b6b', '#6a2a86', '#a2368a', '#d94a7b', '#f2686b', '#fb8d5c', '#ffb55a'],
  collectibles: { common: { name: 'Coin', plural: 'Coins', points: 10 }, rare: { name: 'Seashell', plural: 'Seashells', points: 50 } },
  cta: { heading: 'Want a game like this for your business?', buttonText: 'Get a game like this', link: 'https://jbell003.github.io/bellio-gulf-coast/#contact' },
  photoNote: 'Your photo stays on your phone', storageKey: 'beachRunner.bellio'
};
function merge(a, b) {
  const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  if (!b) return o;
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') o[k] = merge(a[k], b[k]);
    else if (b[k] !== undefined && b[k] !== null) o[k] = b[k];
  }
  return o;
}
const CFG = merge(DEF, window.GAME_CONFIG || {});
if (!CFG.signText) CFG.signText = CFG.businessName;
if (!CFG.flagLetter) CFG.flagLetter = (CFG.businessName || 'B').trim().charAt(0).toUpperCase();
const COL = CFG.colors;
const $ = (id) => document.getElementById(id);

const store = {
  get(k) { try { return localStorage.getItem(CFG.storageKey + '.' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(CFG.storageKey + '.' + k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(CFG.storageKey + '.' + k); } catch (e) {} }
};

/* ---------- constants ---------- */
const T = 16, G = 112;               // tile size, ground top (world y). World view is 144 high, bottom anchored.
const STEP = 1 / 120;
const RUN = 86, JUMPV = 292, GRAV = 830, FALLMUL = 1.2, JCUT = 190, MAXFALL = 430;
const PW = 10, PH = 24;              // player hitbox
const SPW = 18, SPH = 26;            // player sprite size (hitbox sits at x+4, y+2)

/* ---------- small helpers ---------- */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };
function shade(hex, f) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
  const n = parseInt(m[1], 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function spr(rows, pal) {
  const w = Math.max.apply(null, rows.map((r) => r.length)), c = mk(w, rows.length), g = c.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = pal[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
  return c;
}

/* ---------- 5x7 pixel font ---------- */
const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110', E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001', I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000', Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100', U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 11011 10001', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110', 2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11110 00001 00001 01110 00001 00001 11110', 4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000', 8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  '.': '00000 00000 00000 00000 00000 01100 01100', '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00010 00100 00000 00100',
  ':': '00000 01100 01100 00000 01100 01100 00000', '-': '00000 00000 00000 11111 00000 00000 00000', '+': '00000 00100 00100 11111 00100 00100 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000', ',': '00000 00000 00000 00000 01100 00100 01000', "'": '00100 00100 01000 00000 00000 00000 00000',
  '&': '01100 10010 10100 01000 10101 10010 01101', 'x': '00000 00000 10001 01010 00100 01010 10001', '%': '11001 11010 00010 00100 01000 01011 10011'
};
const glyphCache = {};
function glyph(ch, color) {
  const key = ch + color; if (glyphCache[key]) return glyphCache[key];
  const def = FONT[ch]; const c = mk(5, 7);
  if (def) { const g = c.getContext('2d'); g.fillStyle = color; def.split(' ').forEach((row, y) => { for (let x = 0; x < 5; x++) if (row[x] === '1') g.fillRect(x, y, 1, 1); }); }
  glyphCache[key] = c; return c;
}
function textWidth(s) { return s.length * 6 - 1; }
function drawText(g, str, x, y, color, shadow) {
  str = String(str).toUpperCase();
  if (shadow) { for (let i = 0; i < str.length; i++) g.drawImage(glyph(str[i], shadow), x + i * 6 + 1, y + 1); }
  for (let i = 0; i < str.length; i++) g.drawImage(glyph(str[i], color), x + i * 6, y);
}

/* ---------- sprites ---------- */
const SP = {};
function buildSprites() {
  const pal = { O: '#2b1a3a', S: '#f0b07a', s: '#d99562', T: COL.shirt, t: shade(COL.shirt, 0.8), P: COL.shorts, p: shade(COL.shorts, 0.75), F: '#fff4d6', E: '#2b1a3a', B: '#ff8f7a', M: '#a8433a', H: COL.hat, h: shade(COL.hat, 0.78) };
  const torso = [
    '....OOOOOOOO....', '...OTTTTTTTTO...', '..OSOTTtTTTOSO..', '..OSOTTTTTTOSO..', '...OOPPPPPPOO...', '....OPPPPPPO....'];
  const legs = {
    idle: ['....OPPOOPPO....', '....OSSOOSSO....', '....OSSOOSSO....', '...OFFFOOFFFO...', '...OOOOOOOOOO...'],
    run1: ['....OPPOOPPO....', '...OSSO..OSSO...', '..OSSO....OSSO..', '..OFFFO...OFFFO.', '..OOOOO...OOOOO.'],
    run2: ['....OPPOOPPO....', '....OSSOOSSO....', '....OSSOOSSO....', '....OFFOOFFO....', '....OOOOOOOO....'],
    jump: ['....OPPOOPPO....', '...OSSO..OSSO...', '..OSSO.....OSSO.', '..OFFFO....OOOO.', '..OOOOO.........']
  };
  SP.body = {}; for (const k in legs) SP.body[k] = spr(torso.concat(legs[k]), pal);
  SP.headDefault = (function () {
    const rows = ['.....OOOOOO.....', '...OOHHHHHHOO...', '..OHHHHHHHHHHO..', '..OHHHHHHHHHHO..', '.OhhhhhhhhhhhhO.', '.OOOOOOOOOOOOOO.', '.OSSSSSSSSSSSSO.', '.OSSEESSSSEESSO.', '.OSSEESSSSEESSO.', '.OSSSSSSSSSSSSO.', '.OSBBSSSSSSBBSO.', '.OSSSMSSSSMSSSO.', '.OSSSSMMMMSSSSO.', '..OSSSSSSSSSSO..', '...OOSSSSSSOO...', '.....OOOOOO.....'];
    const c = mk(18, 18), g = c.getContext('2d'); g.drawImage(spr(rows, pal), 1, 2); return c;
  })();
  SP.head = SP.headDefault;
  const cp = { O: '#5b1a14', Y: '#ffd23f', y: '#e0a21f', W: '#fff7c2' };
  SP.coin = spr(['..OOOO..', '.OYYYYO.', 'OYWYYYyO', 'OYWYYYyO', 'OYWYYYyO', 'OYYYYyyO', '.OyyyyO.', '..OOOO..'], cp);
  SP.shell = spr(['...OOOO...', '..OPPPPO..', '.OPpPPpPO.', 'OPpPPPPpPO', 'OPpPPPPpPO', 'OPPpPPpPPO', '.OPPpppPPO', '..OOPPOO..', '....OO....'], { O: '#7a2e55', P: '#ffd6e0', p: '#e58fb0' });
  SP.heart = spr(['.OO...OO.', 'OXXOOOXXO', 'OXWXXXXXO', 'OXXXXXXXO', '.OXXXXXO.', '..OXXXO..', '...OXO...', '....O....'], { O: '#4a0d24', X: '#ff4d6d', W: '#ffd0da' });
  SP.heartEmpty = spr(['.OO...OO.', 'OxxOOOxxO', 'OxxxxxxxO', 'OxxxxxxxO', '.OxxxxxO.', '..OxxxO..', '...OxO...', '....O....'], { O: '#4a0d24', x: '#5a3a5e' });
  const crabPal = { R: '#e8452c', r: '#b52a1c', W: '#ffffff', K: '#222222' };
  SP.crab = [
    spr(['RR..W....W..RR', 'RR..K....K..RR', '.RR.RRRRRR.RR.', '..RRRRRRRRRR..', '.RRRrRRRRrRRR.', '..RRRRRRRRRR..', '...R.R..R.R...', '..R..R..R..R..'], crabPal),
    spr(['RR..W....W..RR', 'RR..K....K..RR', '.RR.RRRRRR.RR.', '..RRRRRRRRRR..', '.RRRrRRRRrRRR.', '..RRRRRRRRRR..', '..R.R....R.R..', '...R..R.R..R..'], crabPal)
  ];
  SP.crabSquash = spr(['..............', '..............', '..............', '..............', '.RRRRRRRRRRRR.', 'RRRKRRRRRRKRRR', '.RrRRrRRrRRrR.', '..............'], crabPal);
  const gp = { W: '#fdfdfd', G: '#8e9aa8', Y: '#ffc233', K: '#222222' };
  SP.gull = [
    spr(['G..............G', 'GG............GG', '.WGG........GGW.', '..WWGG....GGWW..', 'YYWKWWWWWWWWW...', '..WWWWWWWWWWW...', '....WWWWWWWW....', '......WWWW......', '................'], gp),
    spr(['................', '................', '......WWWW......', 'YYWKWWWWWWWWW...', '..WWWWWWWWWWWW..', '.GWWGWWWWWWGWWG.', 'GG..GWWWWWWG..GG', 'G..............G', '................'], gp)
  ];
  SP.urchin = spr(['....K..K....', '..K.KKKK.K..', '.K.KPPPPK.K.', '..KPPPPPPK..', 'KKKPPEPEPKKK', '..KPPPPPPK..', 'KKKPPPPPPKKK', '..KPPPPPPK..', '.K.KPPPPK.K.', '..K.KKKK.K..', '....K..K....'], { K: '#2a1550', P: '#b33a9e', E: '#fff4d6' });
  SP.starfish = spr(['...OO...', '...OO...', 'OOOOOOOO', '.OOOOOO.', '..OOOO..', '.OO..OO.', '.O....O.'].map((r) => r.replace(/O/g, 'Q')), { Q: '#ff9f43' });
  SP.tuft = spr(['..G...G.', '.GG..GG.', '.GG.GGG.', 'GGGGGGGG'], { G: '#6fae4f' });
  // clouds
  SP.clouds = [34, 50, 26].map((w, i) => {
    const h = 9 + i * 2, c = mk(w, h), g = c.getContext('2d');
    for (let r = 0; r < h; r++) { const t = r / (h - 1); const inset = Math.round((1 - Math.sin(Math.min(1, (r + 1) / h) * Math.PI / 2)) * w * 0.28); g.fillStyle = r < 2 ? '#ffd9c0' : (r > h - 3 ? '#e58aa5' : '#ffb3b0'); g.fillRect(inset, r, w - inset * 2, 1); }
    return c;
  });
  // palms
  SP.palm = [makePalm(1, 40, false), makePalm(-1, 34, false), makePalm(1, 46, false)];
  SP.palmSil = [makePalm(1, 40, true), makePalm(-1, 52, true), makePalm(1, 34, true)];
}
function makePalm(lean, height, sil) {
  const w = 64, h = height + 34, c = mk(w, h), g = c.getContext('2d');
  const bx = 32, by = h - 2; let tx = bx, ty = by;
  for (let i = 0; i < height; i++) {
    const t = i / height; const x = Math.round(bx + lean * t * t * 12), y = by - i; tx = x; ty = y;
    g.fillStyle = sil ? '#4a2a6a' : ((i >> 1) % 2 ? '#a06f3e' : '#85592f');
    g.fillRect(x - (t > 0.75 ? 1 : 2), y, t > 0.75 ? 3 : 4, 1);
  }
  const leaves = [[-1, 24, 8, 26], [1, 24, 8, 26], [-1, 17, 16, 18], [1, 17, 16, 18], [-1, 12, -2, 14], [1, 12, -2, 14]];
  leaves.forEach((lf, k) => {
    const dir = lf[0], len = lf[1], up = lf[2], droop = lf[3];
    for (let s = 0; s <= len; s++) {
      const tt = s / len, px = Math.round(tx + dir * len * tt), py = Math.round(ty - up * tt + droop * tt * tt);
      if (sil) { g.fillStyle = '#4a2a6a'; g.fillRect(px, py, 2, 3); }
      else {
        g.fillStyle = '#1c6b45'; g.fillRect(px, py + 2, 2, 1);
        g.fillStyle = k < 2 ? '#2e9e5b' : '#27874e'; g.fillRect(px, py, 2, 2);
        if (s % 3 === 0) { g.fillStyle = '#58c97c'; g.fillRect(px, py - 1, 1, 1); }
      }
    }
  });
  if (!sil) { g.fillStyle = '#4a2f18'; g.fillRect(tx - 2, ty + 2, 2, 2); g.fillRect(tx + 1, ty + 2, 2, 2); }
  c.anchorX = bx; c.anchorY = by; return c;
}

/* ---------- audio (original chiptune, WebAudio) ---------- */
const Snd = {
  ctx: null, master: null, muted: false, musicOn: false, timer: null, step: 0, next: 0, noise: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.55; this.master.connect(this.ctx.destination);
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = n;
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.55; },
  tone(f, d, type, v, f2, t) {
    const c = this.ctx; if (!c || this.muted) return;
    const t0 = c.currentTime + (t || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(v || 0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + d + 0.03);
  },
  hiss(d, v, f, t) {
    const c = this.ctx; if (!c || this.muted || !this.noise) return;
    const t0 = c.currentTime + (t || 0), s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    s.buffer = this.noise; fl.type = 'bandpass'; fl.frequency.value = f || 2000; fl.Q.value = 0.8;
    g.gain.setValueAtTime(v || 0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
    s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t0); s.stop(t0 + d + 0.03);
  },
  jump() { this.tone(300, 0.13, 'square', 0.1, 720); },
  coin() { this.tone(988, 0.06, 'square', 0.09); this.tone(1319, 0.2, 'square', 0.09, null, 0.06); },
  shell() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.09, null, i * 0.07)); },
  heart() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.16, null, i * 0.06)); },
  stomp() { this.tone(260, 0.12, 'square', 0.12, 90); this.hiss(0.08, 0.12, 900); },
  hurt() { this.tone(420, 0.35, 'sawtooth', 0.12, 70); },
  splash() { this.hiss(0.35, 0.18, 1200); this.tone(500, 0.2, 'sine', 0.08, 120); },
  check() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, null, i * 0.08)); },
  win() { const m = [523, 659, 784, 1047, 784, 1047, 1319, 1568]; m.forEach((f, i) => { this.tone(f, 0.16, 'square', 0.1, null, i * 0.13); this.tone(f / 2, 0.16, 'triangle', 0.14, null, i * 0.13); }); },
  over() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.18, f * 0.96, i * 0.2)); },
  blip() { this.tone(660, 0.06, 'square', 0.07); },
  // tiny original loop: C - Am - F - G, bouncy beach groove
  startMusic() { if (!this.ctx) return; this.stopMusic(); this.musicOn = true; this.step = 0; this.next = this.ctx.currentTime + 0.1; this.timer = setInterval(() => this.sched(), 80); },
  stopMusic() { this.musicOn = false; if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  sched() {
    const c = this.ctx; if (!c || !this.musicOn) return;
    const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12), eighth = 60 / 128 / 2;
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    const lead = [0, 2, 1, 2, 3, 2, 1, -1], rootsHit = [1, 0, 0, 1, 1, 0, 1, 0];
    while (this.next < c.currentTime + 0.35) {
      const i = this.step % 32, ch = chords[Math.floor(i / 8)], k = i % 8, t = this.next - c.currentTime;
      if (!this.muted) {
        const li = lead[k]; if (li >= 0) { const note = li === 3 ? ch[0] + 12 : ch[li] + 12; this.tone(mtof(note), eighth * 0.85, 'square', 0.035, null, t); }
        if (rootsHit[k]) this.tone(mtof(ch[0] - 12 + (k === 4 ? 7 : 0)), eighth * 1.1, 'triangle', 0.13, null, t);
        if (k % 2 === 1) this.hiss(0.04, 0.03, 7000, t);
        if (k === 0 || k === 4) this.tone(130, 0.1, 'sine', 0.14, 45, t);
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
  ground(c, c + 22); deco('sign', c + 3); deco('hint', c + 11, { text: 'hint1' }); deco('hint', c + 19, { text: 'hint2' });
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
  deco('torch', c + 2); deco('torch', c + 28); deco('torch', c + 15); c += 30;
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
  crab(c + 6, c + 12); crab(c + 14, c + 20); shell(c + 12, 96); coinRow(c + 4, 94, 4); coinRow(c + 16, 94, 4); deco('umbrella', c + 1); c += 24;
  // 10 long pier
  start(1); ground(c, c + 8, G, 'pier'); ground(c + 10, c + 16, G, 'pier'); ground(c + 19, c + 34, G, 'pier'); plank(c + 17, 1.5, 100);
  gull(c + 6, c + 18, 82); gull(c + 24, c + 33, 78, 3); crab(c + 21, c + 28); coinArc(c + 9, 92, 5, 20); coinArc(c + 17.7, 88, 5, 22); coinRow(c + 29, 96, 3);
  deco('torch', c + 3); deco('torch', c + 14); deco('torch', c + 32); c += 34;
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
  L.flagX = (c + 26) * T; c += 32; L.end = c * T;
  L.grounds.sort((a, b) => a.x - b.x);
  return L;
}
function topAt(L, x) { let t = 999; L.grounds.forEach((g) => { if (x >= g.x && x <= g.x + g.w && g.y < t) t = g.y; }); return t; }

/* ---------- state ---------- */
const cv = $('game'), ctx = cv.getContext('2d');
let W = 256, H = 144, S = 4, DPR = 1, offY = 0;
let L = buildLevel(), P = null, Gm = null;
let mode = 'manual', pixelLook = true, photo = null, remember = false;
const input = { left: false, right: false, jump: false };
const isTouch = window.matchMedia && matchMedia('(pointer:coarse)').matches;
const parts = [], pops = [];
let timeScale = 1, bestScore = parseInt(store.get('best') || '0', 10) || 0;
let attractX = 0, shake = 0;

function newGame() {
  L = buildLevel(); parts.length = 0; pops.length = 0;
  P = { x: 40, y: G - PH, w: PW, h: PH, vx: 0, vy: 0, on: true, coy: 0, buf: 0, face: 1, hearts: 3, inv: 0, hurt: 0, anim: 0, dead: false, maxX: 0, hop: 0, splashed: false };
  Gm = { state: 'play', t: 0, score: 0, coins: 0, shells: 0, stomps: 0, camX: 0, timer: 0, cp: { x: 40 }, banner: 'GO!', bannerT: 1.2, bonus: 0, fw: 0 };
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
function burst(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (0.4 + Math.random()) * (spd || 60); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.4, color, size: Math.random() < 0.4 ? 2 : 1 }); }
}
function pop(x, y, text) { pops.push({ x, y, text, life: 0.9 }); }
function addScore(n, x, y) { Gm.score += n; if (x !== undefined) pop(x, y, '+' + n); }

function respawn() {
  P.x = Gm.cp.x; P.y = G - PH; P.vx = 0; P.vy = 0; P.on = true; P.inv = 2.2; P.splashed = false; Gm.camX = Math.max(0, P.x - W * 0.38);
}
function hurtPlayer(fromX) {
  if (P.inv > 0 || Gm.state !== 'play') return;
  P.hearts--; Snd.hurt(); shake = 0.2;
  if (P.hearts <= 0) return die(false);
  P.inv = 1.8; P.hurt = 0.28; P.vy = -190; P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 70; P.on = false;
}
function die(fell) {
  Gm.state = 'dying'; Gm.timer = fell ? 0.9 : 1.5; P.dead = true; P.vx = 0; P.vy = fell ? 0 : -230; Snd.stopMusic();
}
function stompBounce(e) {
  e.alive = false; e.sq = 0.4; P.vy = input.jump ? -290 : -200; P.on = false; Gm.stomps++; Snd.stomp();
  burst(e.x + e.w / 2, e.y + e.h / 2, e.t === 'gull' ? '#ffffff' : '#ff8a6a', 8, 70);
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
  if (p.buf > 0 && p.coy > 0) { p.vy = -JUMPV; p.on = false; p.coy = 0; p.buf = 0; Snd.jump(); }
  if (!input.jump && p.vy < -JCUT) p.vy = -JCUT;
  moveAndCollide(dt);
  if (p.x > p.maxX) p.maxX = p.x;
  p.anim += dt * (p.on ? Math.abs(p.vx) / 9 : 0);
  // fell in the water
  if (!p.splashed && p.y + p.h > 126 && topAt(L, p.x + p.w / 2) > 126 && p.vy > 0) { p.splashed = true; burst(p.x + 5, 124, '#bfe9f5', 14, 80); Snd.splash(); }
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
      if (it.t === 'coin') { Gm.coins++; addScore(CFG.collectibles.common.points); Snd.coin(); burst(it.x, it.y, '#ffd23f', 5, 40); }
      else if (it.t === 'shell') { Gm.shells++; addScore(CFG.collectibles.rare.points, it.x, it.y - 6); Snd.shell(); burst(it.x, it.y, '#ffd6e0', 10, 60); }
      else { if (p.hearts < 3) p.hearts++; addScore(0); Snd.heart(); pop(it.x, it.y - 6, '+1 LIFE'); burst(it.x, it.y, '#ff4d6d', 8, 50); }
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
  const target = clamp(p.x - W * 0.36, 0, L.end - W);
  Gm.camX += (target - Gm.camX) * Math.min(1, dt * 8); if (Gm.camX < 0) Gm.camX = 0;
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
  Gm.fw -= dt; if (Gm.fw <= 0 && Gm.timer < 2.8) { Gm.fw = 0.32; const fx = L.flagX + (Math.random() - 0.3) * 120, fy = 20 + Math.random() * 40, cols = ['#ffd23f', '#ff6b4a', '#7dffb0', '#9fe3ff', '#ff9ad5']; const c = cols[(Math.random() * cols.length) | 0]; burst(fx, fy, c, 22, 70); Snd.tone(900 + Math.random() * 500, 0.1, 'triangle', 0.05, 300); }
  if (Gm.timer > 3.0 && Gm.state === 'win') { Gm.state = 'winscreen'; showWin(); }
}
function updateDying(dt) {
  Gm.timer -= dt; P.vy += GRAV * dt; P.y += P.vy * dt;
  if (Gm.timer <= 0) { Gm.state = 'overscreen'; Snd.over(); showOver(); $('btnPause').hidden = true; }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; } q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.life -= dt; q.y -= 18 * dt; if (q.life <= 0) pops.splice(i, 1); }
  if (shake > 0) shake -= dt;
}
function updateMenu(dt) {
  attractX += 42 * dt; if (attractX > 2600) { attractX = 0; L = buildLevel(); }
  P.x = attractX + W * 0.36; Gm.camX = attractX; P.vx = RUN; P.face = 1; P.anim += dt * 9; P.inv = 0; P.dead = false;
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
function text2(str, x, y, color, shadow, sc) {
  str = String(str).toUpperCase(); sc = sc || 1;
  if (shadow) for (let i = 0; i < str.length; i++) ctx.drawImage(glyph(str[i], shadow), x + i * 6 * sc + sc, y + sc, 5 * sc, 7 * sc);
  for (let i = 0; i < str.length; i++) ctx.drawImage(glyph(str[i], color), x + i * 6 * sc, y, 5 * sc, 7 * sc);
}
const mod = (a, n) => ((a % n) + n) % n;
const HZ = 86;

function drawSky(cam, t) {
  const cols = CFG.skyColors, n = cols.length, top = -offY;
  for (let i = 0; i < n; i++) {
    const y0 = top + Math.floor(i * (HZ - top) / n), y1 = i === n - 1 ? HZ : top + Math.floor((i + 1) * (HZ - top) / n);
    ctx.fillStyle = cols[i]; ctx.fillRect(0, y0, W, y1 - y0 + 1);
  }
  for (let i = 0; i < 46; i++) {
    const x = mod(hash(i * 3 + 1) * W - cam * 0.02, W), y = top + hash(i * 3 + 2) * (HZ - top) * 0.5;
    if (mod(t * 1.7 + hash(i) * 5, 2.2) < 1.9) { ctx.fillStyle = i % 5 === 0 ? '#ffffff' : '#ffe9c4'; ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1); }
  }
  // sun
  const sx = Math.round(W * 0.66 - cam * 0.03), r = 24;
  for (let k = 0; k <= r; k++) {
    if (k > 0 && k < 14 && k % 4 === 0) continue;
    const hw = Math.floor(Math.sqrt(r * r - k * k)); ctx.fillStyle = lerpColor('#ff9f4a', '#fff2a8', k / r); ctx.fillRect(sx - hw, HZ - k, hw * 2, 1);
  }
  // clouds
  for (let i = 0; i < 4; i++) {
    const c = SP.clouds[i % 3], x = mod(i * (W / 3 + 30) - cam * 0.08 + t * 2.2, W + 90) - 50, y = top + 14 + ((i * 37) % Math.max(20, HZ - top - 54));
    ctx.globalAlpha = 0.85; ctx.drawImage(c, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
  }
  // sea
  for (let y = HZ; y < 122; y += 2) { ctx.fillStyle = lerpColor('#f27f6b', '#2c2f7a', (y - HZ) / 36); ctx.fillRect(0, y, W, 2); }
  for (let y = HZ + 2; y < 118; y += 3) {
    const k = (y - HZ) / 32, w = Math.round(4 + k * 16 * hash(y)), sh = Math.round(Math.sin(t * 3 + y) * 2);
    if (hash(Math.floor(t * 3) + y * 7) > 0.35) { ctx.fillStyle = '#ffe3a0'; ctx.fillRect(sx + sh - (w >> 1), y, w, 1); }
  }
  // far silhouettes
  const P1 = 640, off = -mod(cam * 0.12, P1);
  for (let rep = 0; rep < 2; rep++) {
    const ox = Math.round(off + rep * P1);
    ctx.fillStyle = '#5a2f7e';
    for (let i = 0; i < 6; i++) ctx.fillRect(ox + 100 + i * 7, HZ - 6 + i, 90 - i * 14, 1);
    for (let r = 0; r < 14; r++) ctx.fillRect(ox + 268 + (r >> 2), HZ - 14 + r, 8 - (r >> 2) * 2 + (r > 10 ? 0 : 0), 1);
    ctx.fillRect(ox + 267, HZ - 16, 10, 2); ctx.fillRect(ox + 269, HZ - 20, 6, 4); ctx.fillRect(ox + 270, HZ - 22, 4, 2);
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ffe9a0' : '#ffb55a'; ctx.fillRect(ox + 270, HZ - 19, 4, 2);
    ctx.fillStyle = '#5a2f7e'; ctx.fillRect(ox + 380, HZ - 5, 140, 2); for (let i = 0; i < 12; i++) ctx.fillRect(ox + 384 + i * 12, HZ - 3, 2, 5);
    ctx.fillRect(ox + 500, HZ - 10, 14, 5); ctx.fillRect(ox + 498, HZ - 11, 18, 2);
  }
  // far dunes
  for (let x = 0; x < W + 2; x += 2) {
    const wx = x + cam * 0.3, h = 101 + Math.round(5 * Math.sin(wx / 41) + 3 * Math.sin(wx / 17) + 2 * Math.sin(wx / 9));
    ctx.fillStyle = '#7b3d7a'; ctx.fillRect(x, h, 2, 124 - h); ctx.fillStyle = '#b0568a'; ctx.fillRect(x, h, 2, 1);
  }
  // mid palms
  const P2 = 480, off2 = -mod(cam * 0.45, P2), pl = [[40, 0], [190, 1], [330, 2]];
  for (let rep = 0; rep < 2; rep++) pl.forEach((q) => { const sp = SP.palmSil[q[1]], x = Math.round(off2 + rep * P2 + q[0] - sp.anchorX); if (x > -70 && x < W + 10) ctx.drawImage(sp, x, 114 - sp.anchorY); });
}

function drawWater(cam, t) {
  const cols = ['#2aa3c7', '#1e86b3', '#176a9a', '#0f4e7d'];
  for (let y = 122, i = 0; y < 150; y += 5, i++) { ctx.fillStyle = cols[Math.min(3, i)]; ctx.fillRect(0, y, W, 5); }
  const sh = Math.floor(cam + t * 18);
  for (let row = 0; row < 4; row++) {
    const y = 122 + row * 7, o = mod(sh * (1 + row * 0.2), 24);
    ctx.fillStyle = row === 0 ? '#d8f4fb' : '#6fd0e8';
    for (let x = -24 + (row % 2) * 12; x < W + 24; x += 24) ctx.fillRect(Math.round(x - o + 24), y, 8, 1);
  }
}

function drawGround(cam) {
  for (const g of L.grounds) {
    if (g.x + g.w < cam - 2 || g.x > cam + W + 2) continue;
    const x = g.x - cam;
    if (g.kind === 'pier') {
      for (let px = g.x + 6; px < g.x + g.w - 4; px += 48) { const sx = px - cam; ctx.fillStyle = '#5a3419'; ctx.fillRect(sx, g.y + 7, 4, 40); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(sx, g.y + 7, 1, 40); ctx.fillStyle = '#d8f4fb'; ctx.fillRect(sx - 1, 122, 6, 1); }
      ctx.fillStyle = '#a1683a'; ctx.fillRect(x, g.y, g.w, 7);
      ctx.fillStyle = '#c98f55'; ctx.fillRect(x, g.y, g.w, 1);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(x, g.y + 6, g.w, 1);
      for (let px = 0; px < g.w; px += 8) { ctx.fillStyle = '#7a4a28'; ctx.fillRect(x + px, g.y + 1, 1, 5); }
      // railing posts
      ctx.fillStyle = '#6b4226'; for (let px = 2; px < g.w; px += 32) ctx.fillRect(x + px, g.y - 9, 2, 9);
      ctx.fillRect(x, g.y - 9, g.w, 1);
      continue;
    }
    const bottom = 144 + 10, depth = bottom - g.y;
    ctx.fillStyle = '#e8c36a'; ctx.fillRect(x, g.y, g.w, depth);
    ctx.fillStyle = '#d3a550'; ctx.fillRect(x, g.y + 24, g.w, depth);
    ctx.fillStyle = '#f9eab0'; ctx.fillRect(x, g.y, g.w, 2);
    ctx.fillStyle = '#f2d684'; ctx.fillRect(x, g.y + 2, g.w, 2);
    const x0 = Math.max(g.x, Math.floor(cam / 4) * 4), x1 = Math.min(g.x + g.w, cam + W + 4);
    for (let wx = x0; wx < x1; wx += 4) for (let wy = g.y + 5; wy < bottom; wy += 4) {
      const h = hash(wx * 7 + wy * 131 + 5);
      if (h < 0.16) { ctx.fillStyle = wy > g.y + 24 ? '#b98a3c' : '#d4aa54'; ctx.fillRect(wx - cam + (h > 0.08 ? 1 : 0), wy, 2, 1); }
      else if (h > 0.93) { ctx.fillStyle = '#fff6d0'; ctx.fillRect(wx - cam, wy, 1, 1); }
    }
    ctx.fillStyle = '#b98a3c';
    const left = L.grounds.find((o) => o !== g && o.x + o.w === g.x && o.kind !== 'pier'), right = L.grounds.find((o) => o !== g && o.x === g.x + g.w && o.kind !== 'pier');
    if (!left || left.y > g.y) ctx.fillRect(x, g.y + 2, 1, left ? left.y - g.y : depth);
    if (!right || right.y > g.y) ctx.fillRect(x + g.w - 1, g.y + 2, 1, right ? right.y - g.y : depth);
  }
  for (const p of L.planks) {
    if (p.x + p.w < cam - 2 || p.x > cam + W + 2) continue;
    const x = Math.round(p.x - cam);
    ctx.fillStyle = '#6b4226'; ctx.fillRect(x, p.y + 4, p.w, 1); ctx.fillStyle = '#a1683a'; ctx.fillRect(x, p.y, p.w, 4);
    ctx.fillStyle = '#d29a60'; ctx.fillRect(x, p.y, p.w, 1);
    for (let px = 8; px < p.w; px += 8) { ctx.fillStyle = '#7a4a28'; ctx.fillRect(x + px, p.y + 1, 1, 3); }
    ctx.fillStyle = '#5a3419'; ctx.fillRect(x + 2, p.y + 5, 2, 3); ctx.fillRect(x + p.w - 4, p.y + 5, 2, 3);
  }
}

function hintText(k) {
  if (k === 'hint1') return (mode === 'auto' || isTouch) ? 'TAP TO JUMP' : 'SPACE OR UP TO JUMP';
  if (k === 'hint2') return 'HOLD FOR A HIGH JUMP';
  return 'STOMP THE CRABS!';
}
function drawDecor(cam, t) {
  for (const d of L.decor) {
    const x = Math.round(d.x - cam);
    if (x < -80 || x > W + 80) continue;
    if (d.t === 'palm') { const sp = SP.palm[d.v || 0]; ctx.drawImage(sp, x - sp.anchorX, G + 2 - sp.anchorY); }
    else if (d.t === 'sign') {
      const txt = CFG.signText.toUpperCase(), w = textWidth(txt) + 12, bx = x - (w >> 1);
      ctx.fillStyle = '#5a3419'; ctx.fillRect(x - 5, G - 26, 3, 26); ctx.fillRect(x + 3, G - 26, 3, 26);
      ctx.fillStyle = '#3a2210'; ctx.fillRect(bx - 1, G - 46, w + 2, 20); ctx.fillStyle = '#a1683a'; ctx.fillRect(bx, G - 45, w, 18); ctx.fillStyle = '#c98f55'; ctx.fillRect(bx, G - 45, w, 1);
      text2(txt, bx + 6, G - 40, '#fff4d6', '#3a2210'); ctx.fillStyle = '#ffcf3a'; ctx.fillRect(bx + 6, G - 31, w - 12, 1);
    }
    else if (d.t === 'tuft') ctx.drawImage(SP.tuft, x, G - 3);
    else if (d.t === 'star') ctx.drawImage(SP.starfish, x, G - 3);
    else if (d.t === 'umbrella') {
      ctx.fillStyle = '#7a4a28'; ctx.fillRect(x, G - 26, 2, 26);
      for (let row = 0; row < 8; row++) { const hw = Math.round(16 * Math.sqrt(1 - Math.pow((7 - row) / 8, 2))); for (let sx = -hw; sx < hw; sx += 4) { ctx.fillStyle = ((sx / 4) & 1) ? '#fff4d6' : '#ff6b4a'; ctx.fillRect(x + 1 + sx, G - 34 + row, Math.min(4, hw - sx), 1); } }
      ctx.fillStyle = '#3a2210'; ctx.fillRect(x - 15, G - 26, 32, 1);
    }
    else if (d.t === 'torch') {
      ctx.fillStyle = '#6b4226'; ctx.fillRect(x, G - 20, 2, 20);
      const f = Math.floor(t * 8 + d.x) % 3; ctx.fillStyle = '#ff6b2a'; ctx.fillRect(x - 1, G - 26 - (f === 0 ? 1 : 0), 4, 6); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, G - 24, 2, 4 - (f === 1 ? 1 : 0));
    }
  }
  // checkpoints
  for (const c of L.checkpoints) {
    const x = Math.round(c.x - cam); if (x < -20 || x > W + 20) continue;
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(x, G - 22, 2, 22);
    const wv = c.on ? Math.round(Math.sin(t * 8) * 1) : 0; ctx.fillStyle = c.on ? '#7dffb0' : '#8a7a9a'; ctx.fillRect(x + 2, G - 22 + wv, 9, 3); ctx.fillRect(x + 2, G - 19 + wv, 7, 3); ctx.fillRect(x + 2, G - 16 + wv, 5, 2);
  }
  // finish flag
  const fx = Math.round(L.flagX - cam);
  if (fx > -140 && fx < W + 40) {
    const sx = fx - 70, s = 'FINISH', w = textWidth(s) + 10;
    ctx.fillStyle = '#5a3419'; ctx.fillRect(sx + (w >> 1) - 1, G - 14, 3, 14); ctx.fillStyle = '#3a2210'; ctx.fillRect(sx - 1, G - 28, w + 2, 15); ctx.fillStyle = '#7dffb0'; ctx.fillRect(sx, G - 27, w, 13); text2(s, sx + 5, G - 24, '#1a3a2a');
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(fx - 5, G - 4, 12, 4); ctx.fillStyle = '#5a3419'; ctx.fillRect(fx - 5, G - 1, 12, 1);
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(fx, G - 90, 3, 87); ctx.fillStyle = '#c9b88f'; ctx.fillRect(fx + 2, G - 90, 1, 87);
    ctx.fillStyle = '#ffcf3a'; ctx.fillRect(fx - 1, G - 94, 5, 5); ctx.fillStyle = '#fff2a8'; ctx.fillRect(fx, G - 93, 2, 2);
    const fh = 16, fw = 26, fy = G - 88;
    for (let col = 0; col < fw; col++) { const o = Math.round(Math.sin(t * 6 + col * 0.35) * (1 + col * 0.05)), hh = fh - Math.floor(col * 0.3); ctx.fillStyle = col % 8 < 4 ? COL.shirt : shade(COL.shirt, 0.85); ctx.fillRect(fx + 3 + col, fy + o + Math.floor(col * 0.15), 1, hh); }
    text2(CFG.flagLetter.toUpperCase().charAt(0), fx + 8, fy + 4, '#fff4d6', '#00000066');
  }
}

function drawHints(cam) {
  for (const d of L.decor) {
    if (d.t !== 'hint') continue; const x = Math.round(d.x - cam); if (x < -120 || x > W + 120) continue;
    const s = hintText(d.text); text2(s, x - (textWidth(s) >> 1), G - 80, '#fff4d6', '#3a1b4a');
  }
}
function drawItems(cam, t) {
  for (const it of L.items) {
    if (it.got) continue; const x = Math.round(it.x - cam); if (x < -12 || x > W + 12) continue;
    const bob = Math.round(Math.sin(t * 4 + it.x * 0.07) * 1.5);
    if (it.t === 'coin') { const w = [8, 6, 3, 6][Math.floor(t * 8 + it.x * 0.05) % 4]; ctx.drawImage(SP.coin, 0, 0, 8, 8, x - (w >> 1), Math.round(it.y) - 4 + bob, w, 8); }
    else if (it.t === 'shell') { ctx.drawImage(SP.shell, x - 5, Math.round(it.y) - 5 + bob); if (Math.floor(t * 3) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, Math.round(it.y) - 6 + bob, 1, 1); } }
    else ctx.drawImage(SP.heart, x - 4, Math.round(it.y) - 4 + bob);
  }
}
function drawEnemies(cam, t) {
  for (const e of L.enemies) {
    const x = Math.round(e.x - cam); if (x < -20 || x > W + 20) continue;
    if (!e.alive) { if (e.sq > 0 && e.t === 'crab') ctx.drawImage(SP.crabSquash, x, Math.round(e.y)); continue; }
    if (e.t === 'crab') ctx.drawImage(SP.crab[Math.floor(t * 4 + e.x * 0.02) % 2], x, Math.round(e.y));
    else if (e.t === 'gull') {
      const f = SP.gull[Math.floor(t * 5 + e.ph) % 2], gx = x - 1, gy = Math.round(e.y) - 1;
      if (e.dir > 0) { ctx.save(); ctx.translate(gx + 16, gy); ctx.scale(-1, 1); ctx.drawImage(f, 0, 0); ctx.restore(); } else ctx.drawImage(f, gx, gy);
    } else ctx.drawImage(SP.urchin, x, Math.round(e.y));
  }
}
function pickFrame(p) { if (!p.on) return 'jump'; if (Math.abs(p.vx) > 12) return Math.floor(p.anim) % 2 ? 'run1' : 'run2'; return 'idle'; }
function blitPlayer(g, x, y, frame, face, bob, smoothHead) {
  g.save();
  if (face < 0) { g.translate(x + 17, y + 15); g.scale(-1, 1); g.drawImage(SP.body[frame], 0, 0); }
  else g.drawImage(SP.body[frame], x + 1, y + 15);
  g.restore();
  if (smoothHead) g.imageSmoothingEnabled = true;
  g.drawImage(SP.head, x, y + (bob ? 1 : 0), 18, 18);
  g.imageSmoothingEnabled = false;
}
function drawPlayer(cam, t) {
  const p = P; if (!p) return;
  if (p.inv > 0 && Gm.state === 'play' && Math.floor(t * 18) % 2) return;
  const fr = pickFrame(p), bob = fr === 'run1' || (fr === 'run2' && false);
  blitPlayer(ctx, Math.round(p.x - cam) - 4, Math.round(p.y) - 2, p.dead ? 'jump' : fr, p.face, bob, !!photo && !pixelLook);
}
function drawParts(cam) {
  for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life * 2.5); ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), q.size, q.size); }
  ctx.globalAlpha = 1;
  for (const q of pops) text2(q.text, Math.round(q.x - cam) - (textWidth(q.text) >> 1), Math.round(q.y), '#fff4d6', '#000');
}
function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
function fmtTime(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + pad(s % 60, 2); }
function drawHUD() {
  ctx.save(); ctx.translate(0, 0);
  const rm = Math.ceil(96 * DPR / S);
  ctx.fillStyle = 'rgba(20,10,40,.45)'; ctx.fillRect(0, 0, W, 36);
  text2('SCORE ' + pad(Gm.score, 6), 4, 4, '#fff4d6', '#000');
  const ts = 'TIME ' + fmtTime(Gm.t); text2(ts, W - rm - textWidth(ts) - 2, 4, '#ffd23f', '#000');
  for (let i = 0; i < 3; i++) ctx.drawImage(i < P.hearts ? SP.heart : SP.heartEmpty, 4 + i * 11, 15);
  ctx.drawImage(SP.coin, 42, 15); text2('x' + Gm.coins, 52, 16, '#fff4d6', '#000');
  const sx = 52 + (String(Gm.coins).length + 1) * 6 + 6; ctx.drawImage(SP.shell, sx, 14); text2('x' + Gm.shells, sx + 12, 16, '#fff4d6', '#000');
  const bw = W - 8 - rm, prog = clamp(P.x / L.flagX, 0, 1);
  ctx.fillStyle = '#000'; ctx.fillRect(4, 28, bw, 4); ctx.fillStyle = '#4a3a6a'; ctx.fillRect(5, 29, bw - 2, 2); ctx.fillStyle = '#7dffb0'; ctx.fillRect(5, 29, Math.round((bw - 2) * prog), 2);
  ctx.fillStyle = '#fff4d6'; ctx.fillRect(4 + bw - 3, 24, 1, 8); ctx.fillStyle = COL.shirt; ctx.fillRect(4 + bw - 2, 24, 4, 3);
  ctx.fillStyle = COL.accent; ctx.fillRect(4 + Math.round((bw - 2) * prog), 27, 3, 6);
  if (Gm.bannerT > 0 && Gm.state === 'play') { const s = Gm.banner, sc = 3; text2(s, (W >> 1) - ((textWidth(s) * sc) >> 1), 52, '#ffd23f', '#000', sc); }
  ctx.restore();
}

function render(t) {
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
  const cam = Math.round(Gm ? Gm.camX : 0);
  ctx.save(); ctx.translate(0, offY);
  if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 2), Math.round((Math.random() - 0.5) * 2));
  drawSky(cam, t); drawWater(cam, t); drawDecor(cam, t); drawGround(cam); drawItems(cam, t); drawEnemies(cam, t); drawPlayer(cam, t); drawHints(cam); drawParts(cam);
  ctx.restore();
  if (Gm && (Gm.state === 'play' || Gm.state === 'dying' || Gm.state === 'win')) drawHUD();
}

/* ---------- layout ---------- */
const stage = $('stage');
function resize() {
  const r = stage.getBoundingClientRect(); DPR = window.devicePixelRatio || 1;
  const cw = Math.max(1, Math.floor(r.width * DPR)), ch = Math.max(1, Math.floor(r.height * DPR));
  S = Math.max(1, Math.min(Math.floor(cw / 224), Math.floor(ch / 144)));
  W = Math.min(380, Math.ceil(cw / S)); H = clamp(Math.ceil(ch / S), 144, 440); offY = H - 144;
  cv.width = W * S; cv.height = H * S; cv.style.width = (W * S / DPR) + 'px'; cv.style.height = (H * S / DPR) + 'px';
  const sky = CFG.skyColors[0]; stage.style.background = sky; document.documentElement.style.setProperty('--sky', sky);
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
  Snd.stopMusic(); newGame(); Gm.state = 'menu'; attractX = 0; showOnly('startScreen'); $('btnPause').hidden = true; document.body.classList.remove('playing'); refreshAvatar();
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
  if (!photo) { SP.head = SP.headDefault; return; }
  if (pixelLook) {
    // step down to 16x16, then cut a pixel circle with a dark outline
    let src = photo, size = photo.width;
    while (size > 32) { const h = Math.max(32, size >> 1), t = mk(h, h), g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, h, h); src = t; size = h; }
    const small = mk(16, 16), sg = small.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(src, 0, 0, 16, 16);
    const sd = sg.getImageData(0, 0, 16, 16).data, out = mk(18, 18), og = out.getContext('2d'), od = og.createImageData(18, 18);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
      const dx = x + 0.5 - 9, dy = y + 0.5 - 9, d = Math.sqrt(dx * dx + dy * dy), o = (y * 18 + x) * 4;
      if (d <= 8) {
        const sx = clamp(x - 1, 0, 15), sy = clamp(y - 1, 0, 15), si = (sy * 16 + sx) * 4;
        // gentle pop so small faces read well
        for (let k = 0; k < 3; k++) od.data[o + k] = clamp((sd[si + k] - 128) * 1.12 + 132, 0, 255);
        od.data[o + 3] = 255;
      } else if (d <= 9.1) { od.data[o] = 43; od.data[o + 1] = 26; od.data[o + 2] = 58; od.data[o + 3] = 255; }
    }
    og.putImageData(od, 0, 0); SP.head = out;
  } else {
    const R = 72, out = mk(R, R), g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.save(); g.beginPath(); g.arc(R / 2, R / 2, R / 2 - 4, 0, Math.PI * 2); g.clip(); g.drawImage(photo, 4, 4, R - 8, R - 8); g.restore();
    g.lineWidth = 4; g.strokeStyle = '#2b1a3a'; g.beginPath(); g.arc(R / 2, R / 2, R / 2 - 2, 0, Math.PI * 2); g.stroke(); SP.head = out;
  }
}
function drawAvatar(canvas, scale) {
  const g = canvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = false;
  g.setTransform(scale, 0, 0, scale, 0, 0); blitPlayer(g, 0, 0, 'idle', 1, false, !!photo && !pixelLook); g.setTransform(1, 0, 0, 1, 0, 0);
}
function refreshAvatar() {
  drawAvatar($('avatarPrev'), 4); $('btnRemove').hidden = !photo;
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
function cropZoom(z, keep) {
  const im = crop.img; if (!im) return; z = clamp(z, 100, 400);
  const ix = (CS / 2 - crop.ox) / crop.scale, iy = (CS / 2 - crop.oy) / crop.scale;
  crop.z = z; crop.scale = crop.min * z / 100; crop.ox = CS / 2 - ix * crop.scale; crop.oy = CS / 2 - iy * crop.scale; cropClamp(); $('zoom').value = Math.round(z); cropDraw();
}
let cropRaf = 0;
function cropDraw() {
  const im = crop.img; if (!im) return;
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.imageSmoothingEnabled = true; cg.fillStyle = '#000'; cg.fillRect(0, 0, CS, CS);
  cg.drawImage(im, crop.ox, crop.oy, im.naturalWidth * crop.scale, im.naturalHeight * crop.scale);
  cg.save(); cg.beginPath(); cg.rect(0, 0, CS, CS); cg.arc(CS / 2, CS / 2, CR, 0, Math.PI * 2, true); cg.fillStyle = 'rgba(10,5,25,.66)'; cg.fill('evenodd'); cg.restore();
  cg.lineWidth = 3; cg.strokeStyle = '#fff4d6'; cg.beginPath(); cg.arc(CS / 2, CS / 2, CR, 0, Math.PI * 2); cg.stroke();
  if (!cropRaf) cropRaf = requestAnimationFrame(() => { cropRaf = 0; cropPreview(); });
}
function cropOutput() {
  const im = crop.img, out = mk(96, 96), g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
  const sx = (CS / 2 - CR - crop.ox) / crop.scale, sy = (CS / 2 - CR - crop.oy) / crop.scale, sw = 2 * CR / crop.scale;
  g.drawImage(im, sx, sy, sw, sw, 0, 0, 96, 96); return out;
}
function cropPreview() {
  if (!crop.img) return;
  const keepPhoto = photo, keepHead = SP.head, keepPix = pixelLook;
  photo = cropOutput(); pixelLook = $('optPixel').checked; buildHead(); drawAvatar($('cropPrev'), 3);
  photo = keepPhoto; SP.head = keepHead; pixelLook = keepPix;
}
function openCrop(file) {
  const err = $('cropErr'); err.hidden = true;
  if (!file) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    crop.img = img; crop.min = Math.max(2 * CR / img.naturalWidth, 2 * CR / img.naturalHeight);
    $('optPixel').checked = pixelLook; $('optRemember').checked = remember; $('cropNote').textContent = CFG.photoNote;
    $('cropModal').hidden = false; $('faceChoice').hidden = true; cropAuto(); URL.revokeObjectURL(url);
  };
  img.onerror = () => { URL.revokeObjectURL(url); alert('Sorry, that photo could not be opened. Please try a different picture.'); };
  img.src = url;
}
function cancelCrop() { $('cropModal').hidden = true; crop.img = null; }
function applyCrop() {
  if (!crop.img) return;
  photo = cropOutput(); pixelLook = $('optPixel').checked; remember = $('optRemember').checked; store.set('pixel', pixelLook ? '1' : '0');
  if (remember) { try { store.set('photo', photo.toDataURL('image/jpeg', 0.88)); } catch (e) {} } else store.del('photo');
  buildHead(); refreshAvatar(); cancelCrop();
}
['fileCam', 'fileGal'].forEach((id) => $(id).addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; openCrop(f); }));
$('optPixel').addEventListener('change', cropDraw);
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
let last = performance.now(), acc = 0, running = true;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt * timeScale;
  let n = 0; while (acc >= STEP && n < 600) { if (Gm && Gm.state !== 'paused') update(STEP); acc -= STEP; n++; }
  if (acc > STEP * 4) acc = 0;
  render(now / 1000);
}

/* ---------- init ---------- */
function init() {
  buildSprites();
  document.title = CFG.gameTitle + ' | ' + CFG.businessName;
  const rs = document.documentElement.style;
  rs.setProperty('--btn', COL.button); rs.setProperty('--btnText', COL.buttonText); rs.setProperty('--panel', COL.panel); rs.setProperty('--panelText', COL.panelText); rs.setProperty('--accent', COL.accent);
  $('gameTitle').textContent = CFG.gameTitle.toUpperCase();
  $('tagline').textContent = CFG.tagline ? CFG.tagline + ' By ' + CFG.businessName + '.' : 'By ' + CFG.businessName + '.';
  if (CFG.logo) { const lg = $('brandLogo'); lg.src = CFG.logo; lg.alt = CFG.businessName + ' logo'; lg.hidden = false; }
  $('photoNote').textContent = CFG.photoNote;
  ['startCta'].forEach((id) => { const a = $(id); a.href = CFG.cta.link; a.textContent = CFG.cta.heading; });
  [['winCtaHead', 'winCta'], ['overCtaHead', 'overCta']].forEach((p) => { $(p[0]).textContent = CFG.cta.heading; const a = $(p[1]); a.href = CFG.cta.link; a.textContent = CFG.cta.buttonText; });
  Snd.muted = store.get('muted') === '1'; refreshMute();
  const pxs = store.get('pixel'); if (pxs !== null) pixelLook = pxs === '1';
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

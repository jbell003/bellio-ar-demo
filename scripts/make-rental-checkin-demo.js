// Generates sample "AR Guest Guide" assets for a vacation rental check-in demo:
// 4 unique high-detail signs (Check-in, WiFi, House rules, Pool/beach path),
// 4 short SAMPLE placeholder videos, a printable sheet, and the custom viewer page.
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { execFileSync } from 'child_process';
import { CLIENTS, OUT, ROOT, config } from './lib.js';

const SLUG = 'rental-checkin-demo';
const DIR = path.join(CLIENTS, SLUG);
fs.mkdirSync(DIR, { recursive: true });

const STEPS = [
  {
    n: 1,
    file: 'step1',
    label: 'Check-in',
    caption: 'Welcome! Door code is on your booking message',
    code: 'GUEST-CHECKIN',
    title: 'Welcome!',
    lines: ['Door code is on your', 'booking message'],
    bg: '#0B3A4A',
    accent: '#FFB703',
    ink: '#E8F6F8',
  },
  {
    n: 2,
    file: 'step2',
    label: 'WiFi',
    caption: 'WiFi: scan the router card',
    code: 'GUEST-WIFI',
    title: 'WiFi',
    lines: ['Scan the router card', 'for the network name'],
    bg: '#12315C',
    accent: '#4CC9F0',
    ink: '#F0F7FF',
  },
  {
    n: 3,
    file: 'step3',
    label: 'House rules',
    caption: 'Quiet hours 10pm',
    code: 'GUEST-RULES',
    title: 'House rules',
    lines: ['Quiet hours 10pm', 'Please be kind to neighbors'],
    bg: '#4A1C14',
    accent: '#F4A261',
    ink: '#FFF6EE',
  },
  {
    n: 4,
    file: 'step4',
    label: 'Pool / beach path',
    caption: 'Beach path: out the back gate, turn left',
    code: 'GUEST-BEACH',
    title: 'Beach path',
    lines: ['Out the back gate,', 'then turn left'],
    bg: '#134E4A',
    accent: '#F4D35E',
    ink: '#F3FFFB',
  },
];

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function busyBorder(g, w, h, pal, rnd) {
  for (let i = 0; i < 36; i++) {
    for (let j = 0; j < 3; j++) {
      const side = i % 4;
      let x, y;
      if (side === 0) { x = 10 + (i * 43) % (w - 20); y = 8 + j * 18; }
      else if (side === 1) { x = w - 40 - j * 18; y = 10 + (i * 43) % (h - 20); }
      else if (side === 2) { x = 10 + (i * 47) % (w - 20); y = h - 40 - j * 18; }
      else { x = 8 + j * 18; y = 10 + (i * 41) % (h - 20); }
      g.fillStyle = pal[(i * 3 + j) % pal.length];
      g.save();
      g.translate(x, y);
      g.rotate((i + j) * 0.7);
      const k = (i + j) % 4;
      if (k === 0) { g.beginPath(); g.arc(0, 0, 7 + (i % 5), 0, 6.28); g.fill(); }
      else if (k === 1) g.fillRect(-8, -5, 16, 10);
      else if (k === 2) { g.beginPath(); g.moveTo(0, -9); g.lineTo(8, 7); g.lineTo(-8, 7); g.closePath(); g.fill(); }
      else { g.fillRect(-3, -10, 6, 20); g.fillRect(-10, -3, 20, 6); }
      g.restore();
    }
  }
  for (let x = 50; x < w - 50; x += 20) {
    for (const y of [55, h - 70]) {
      g.fillStyle = ((x / 20) | 0) % 2 ? pal[0] : pal[1];
      g.fillRect(x, y, 18, 12);
    }
  }
}

function sampleBadge(g, w) {
  g.fillStyle = 'rgba(2,48,71,0.92)';
  g.fillRect(70, 70, w - 140, 128);
  g.strokeStyle = '#ffb703';
  g.lineWidth = 6;
  g.strokeRect(70, 70, w - 140, 128);
}

function footerBar(g, w, h, code) {
  g.fillStyle = '#023047';
  g.fillRect(60, h - 58, w - 120, 38);
  g.fillStyle = '#ffb703';
  g.font = 'bold 18px monospace';
  g.textAlign = 'left';
  g.fillText(code, 80, h - 32);
  g.fillStyle = '#90e0ef';
  g.font = '14px sans-serif';
  g.textAlign = 'right';
  g.fillText('SAMPLE PLACEHOLDER', w - 80, h - 32);
  g.textAlign = 'left';
}

function featureTicks(g, y, pal) {
  for (let i = 0; i < 40; i++) {
    g.fillStyle = i % 2 ? pal[0] : pal[1];
    g.fillRect(100 + i * 20, y, 12 + (i % 3) * 4, 28);
  }
}

function drawKey(g, x, y, scale, metal, dark) {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.fillStyle = metal;
  g.beginPath();
  g.arc(0, 0, 36, 0, 6.28);
  g.fill();
  g.fillStyle = dark;
  g.beginPath();
  g.arc(0, 0, 16, 0, 6.28);
  g.fill();
  g.fillStyle = metal;
  g.fillRect(20, -10, 90, 20);
  g.fillRect(86, 8, 14, 28);
  g.fillRect(108, 8, 14, 22);
  g.restore();
}

function drawWifi(g, x, y, color) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.fillStyle = color;
  [[40, 10], [70, 16], [100, 22]].forEach(([r, lw], i) => {
    g.lineWidth = lw;
    g.beginPath();
    g.arc(0, 30, r, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  });
  g.beginPath();
  g.arc(0, 30, 12, 0, 6.28);
  g.fill();
  g.restore();
}

function drawClock(g, x, y, face, hand, ring) {
  g.save();
  g.translate(x, y);
  g.fillStyle = face;
  g.beginPath();
  g.arc(0, 0, 90, 0, 6.28);
  g.fill();
  g.strokeStyle = ring;
  g.lineWidth = 10;
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.strokeStyle = ring;
    g.lineWidth = i % 3 === 0 ? 5 : 3;
    g.beginPath();
    g.moveTo(Math.cos(a) * 68, Math.sin(a) * 68);
    g.lineTo(Math.cos(a) * 80, Math.sin(a) * 80);
    g.stroke();
  }
  g.strokeStyle = hand;
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -48);
  g.stroke();
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(36, 8);
  g.stroke();
  g.fillStyle = hand;
  g.beginPath();
  g.arc(0, 0, 8, 0, 6.28);
  g.fill();
  g.restore();
}

function drawPath(g, x, y) {
  // Back gate and a left-turning path with waves
  g.save();
  g.translate(x, y);
  // gate posts
  g.fillStyle = '#6B3F1A';
  g.fillRect(-130, -40, 28, 150);
  g.fillRect(102, -40, 28, 150);
  g.fillStyle = '#C4A574';
  for (let i = 0; i < 6; i++) g.fillRect(-96 + i * 32, -20, 22, 110);
  g.fillStyle = '#8B5A2B';
  g.fillRect(-130, -55, 260, 22);
  // path turning left
  g.fillStyle = '#E9C46A';
  g.beginPath();
  g.moveTo(-20, 110);
  g.lineTo(40, 110);
  g.quadraticCurveTo(90, 140, 90, 200);
  g.lineTo(20, 200);
  g.quadraticCurveTo(30, 150, -20, 140);
  g.closePath();
  g.fill();
  g.fillStyle = '#2A9D8F';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(150 + i * 8, 150 + i * 18, 50 - i * 6, 10, 0, 0, 6.28);
    g.fill();
  }
  // left arrow
  g.fillStyle = '#E63946';
  g.beginPath();
  g.moveTo(-40, 175);
  g.lineTo(-110, 175);
  g.lineTo(-110, 155);
  g.lineTo(-170, 190);
  g.lineTo(-110, 225);
  g.lineTo(-110, 205);
  g.lineTo(-40, 205);
  g.closePath();
  g.fill();
  g.restore();
}

function drawSign(step) {
  const W = 1000, H = 1000;
  const c = createCanvas(W, H), g = c.getContext('2d');
  const rnd = rng(100 + step.n * 97);
  g.fillStyle = step.ink;
  g.fillRect(0, 0, W, H);

  const pal = {
    1: ['#023047', '#ffb703', '#00A896', '#90E0EF', '#E76F51', '#2A9D8F', '#E9C46A', '#264653'],
    2: ['#031D44', '#4CC9F0', '#4361EE', '#F72585', '#7209B7', '#4CC9F0', '#FFD166', '#023047'],
    3: ['#4A1C14', '#F4A261', '#E76F51', '#E9C46A', '#2A9D8F', '#023047', '#FFB703', '#6D2E1C'],
    4: ['#134E4A', '#F4D35E', '#2A9D8F', '#E9C46A', '#00A896', '#023047', '#E76F51', '#90E0EF'],
  }[step.n];
  busyBorder(g, W, H, pal, rnd);

  // Unique inner texture so the four signs do not look alike
  if (step.n === 1) {
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(0,168,150,${0.08 + rnd() * 0.18})`;
      g.beginPath();
      g.ellipse(80 + rnd() * 840, 230 + rnd() * 620, 18 + rnd() * 30, 6 + rnd() * 10, rnd() * 3, 0, 6.28);
      g.fill();
    }
  } else if (step.n === 2) {
    for (let i = 0; i < 18; i++) {
      g.strokeStyle = `rgba(76,201,240,${0.15 + rnd() * 0.25})`;
      g.lineWidth = 2 + rnd() * 3;
      g.beginPath();
      g.arc(500, 520, 40 + i * 22, 0, 6.28);
      g.stroke();
    }
  } else if (step.n === 3) {
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        if ((i + j) % 2) {
          g.fillStyle = 'rgba(244,162,97,0.12)';
          g.fillRect(80 + i * 70, 230 + j * 55, 70, 55);
        }
      }
    }
  } else {
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = `rgba(42,157,143,${0.25 + (i % 3) * 0.1})`;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(80, 280 + i * 70);
      g.bezierCurveTo(300, 240 + i * 70, 700, 320 + i * 70, 920, 280 + i * 70);
      g.stroke();
    }
  }

  sampleBadge(g, W);
  g.fillStyle = step.accent;
  g.font = 'bold 36px sans-serif';
  g.textAlign = 'left';
  g.fillText(step.label.toUpperCase(), 95, 118);
  g.fillStyle = '#fff';
  g.font = 'bold 22px sans-serif';
  wrapText(g, step.caption, W - 190).slice(0, 2).forEach((ln, i) => g.fillText(ln, 95, 146 + i * 26));
  g.fillStyle = '#90e0ef';
  g.font = '16px sans-serif';
  g.fillText('SAMPLE PLACEHOLDER  -  Bellio Gulf Coast AR Guest Guide', 95, 192);

  // Center artwork
  if (step.n === 1) {
    // Door / welcome plaque
    g.fillStyle = '#6B3F1A';
    g.fillRect(310, 280, 380, 500);
    g.strokeStyle = '#E9C46A';
    g.lineWidth = 10;
    g.strokeRect(310, 280, 380, 500);
    g.fillStyle = '#C4A574';
    g.fillRect(340, 320, 320, 200);
    g.fillStyle = '#023047';
    g.font = 'bold 54px sans-serif';
    g.textAlign = 'center';
    g.fillText('WELCOME', 500, 410);
    g.font = 'bold 28px sans-serif';
    g.fillText('to your stay', 500, 455);
    g.fillStyle = '#E9C46A';
    g.beginPath();
    g.arc(620, 600, 22, 0, 6.28);
    g.fill();
    g.fillStyle = '#5C3317';
    g.beginPath();
    g.arc(620, 600, 8, 0, 6.28);
    g.fill();
    drawKey(g, 430, 620, 1, '#FFB703', '#5C3317');
    g.textAlign = 'left';
  } else if (step.n === 2) {
    g.fillStyle = '#031D44';
    g.fillRect(250, 300, 500, 420);
    g.strokeStyle = '#4CC9F0';
    g.lineWidth = 8;
    g.strokeRect(250, 300, 500, 420);
    drawWifi(g, 500, 380, '#4CC9F0');
    // Router card
    g.fillStyle = '#0B1B36';
    g.fillRect(310, 520, 380, 160);
    g.strokeStyle = '#FFD166';
    g.lineWidth = 4;
    g.strokeRect(310, 520, 380, 160);
    g.fillStyle = '#FFD166';
    g.font = 'bold 22px monospace';
    g.textAlign = 'left';
    g.fillText('NETWORK  GUEST-WIFI', 330, 570);
    g.fillText('CARD     SCAN HERE', 330, 610);
    g.fillStyle = '#4CC9F0';
    g.font = '16px sans-serif';
    g.fillText('SAMPLE  -  not a real network', 330, 650);
    // Antenna bars unique to this card
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i < 4 ? '#4CC9F0' : '#31587A';
      g.fillRect(620 + i * 22, 430 - i * 16, 16, 30 + i * 16);
    }
    g.textAlign = 'left';
  } else if (step.n === 3) {
    drawClock(g, 500, 430, '#FFF6EE', '#E76F51', '#4A1C14');
    g.fillStyle = '#4A1C14';
    g.fillRect(220, 560, 560, 200);
    g.strokeStyle = '#F4A261';
    g.lineWidth = 6;
    g.strokeRect(220, 560, 560, 200);
    g.fillStyle = '#F4A261';
    g.font = 'bold 48px sans-serif';
    g.textAlign = 'center';
    g.fillText('QUIET HOURS', 500, 630);
    g.fillStyle = '#fff';
    g.font = 'bold 64px sans-serif';
    g.fillText('10pm', 500, 710);
    g.textAlign = 'left';
  } else {
    // Pool tile + beach path
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        g.fillStyle = (i + j) % 2 ? '#2A9D8F' : '#00A896';
        g.fillRect(200 + i * 100, 250 + j * 50, 100, 50);
      }
    }
    g.strokeStyle = '#023047';
    g.lineWidth = 4;
    g.strokeRect(200, 250, 600, 150);
    g.fillStyle = '#023047';
    g.font = 'bold 36px sans-serif';
    g.textAlign = 'center';
    g.fillText('POOL  /  BEACH PATH', 500, 340);
    g.textAlign = 'left';
    drawPath(g, 500, 520);
  }

  featureTicks(g, 870, [pal[0], pal[1]]);
  footerBar(g, W, H, step.code);

  const out = path.join(DIR, `${step.file}.jpg`);
  fs.writeFileSync(out, c.toBuffer('image/jpeg', { quality: 0.93 }));
  console.log('wrote', out);
}

function wrapText(g, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const trial = line ? line + ' ' + w : w;
    if (g.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = trial;
  }
  if (line) lines.push(line);
  return lines;
}

function makeVideo(step) {
  const W = 960, H = 960;
  const frameDir = fs.mkdtempSync(path.join('/tmp', `rental-vid-${step.n}-`));
  const frames = 80;
  for (let f = 0; f < frames; f++) {
    const c = createCanvas(W, H), g = c.getContext('2d');
    g.fillStyle = step.bg;
    g.fillRect(0, 0, W, H);
    // gentle motion bar / corner marks so it is clearly a video
    const t = f / (frames - 1);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(0, 0, W, 160);
    g.fillRect(0, H - 140, W, 140);
    g.strokeStyle = step.accent;
    g.lineWidth = 14;
    g.strokeRect(24, 24, W - 48, H - 48);
    g.fillStyle = step.accent;
    g.fillRect(40, 40, 260, 48);
    g.fillStyle = step.bg;
    g.font = 'bold 26px sans-serif';
    g.textAlign = 'left';
    g.fillText('SAMPLE VIDEO', 54, 73);

    g.fillStyle = step.ink;
    g.font = 'bold 28px sans-serif';
    g.fillText('AR Guest Guide  -  ' + step.label, 40, 140);

    const bounce = Math.sin(t * Math.PI * 2) * 8;
    g.fillStyle = '#fff';
    g.font = 'bold 56px sans-serif';
    g.textAlign = 'center';
    g.fillText(step.title, W / 2, 360 + bounce);

    g.fillStyle = step.accent;
    g.font = 'bold 36px sans-serif';
    const lines = step.lines;
    lines.forEach((ln, i) => g.fillText(ln, W / 2, 450 + i * 52));

    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = '22px sans-serif';
    g.fillText('Bellio Gulf Coast  -  sample wording only', W / 2, 620);
    g.fillText('Replace this clip with your rental\'s own check-in video', W / 2, 656);

    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(120, 760, 720, 16);
    g.fillStyle = step.accent;
    g.fillRect(120, 760, 720 * t, 16);
    g.textAlign = 'left';
    fs.writeFileSync(path.join(frameDir, `f${String(f).padStart(4, '0')}.jpg`), c.toBuffer('image/jpeg', { quality: 0.85 }));
  }
  const out = path.join(DIR, `${step.file}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-framerate', '10', '-i', path.join(frameDir, 'f%04d.jpg'),
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '64k', '-t', '8', '-shortest', '-movflags', '+faststart', out,
  ], { stdio: 'inherit' });
  console.log('wrote', out);
}

for (const step of STEPS) {
  drawSign(step);
  makeVideo(step);
}

fs.writeFileSync(path.join(DIR, 'client.json'), JSON.stringify({
  name: 'AR Guest Guide - Sample Check-in',
  type: 'instructions',
  hint: 'Point at any sign on the printed sheet',
  link: 'https://belliogulfcoast.com',
  linkText: 'Get an AR Guest Guide for your rental',
  steps: STEPS.map(s => ({
    label: s.label,
    caption: s.caption,
    image: `${s.file}.jpg`,
    video: `${s.file}.mp4`,
  })),
}, null, 2));
console.log('rental-checkin-demo assets ready in', DIR);

// Compile .mind, copy videos, write QR (HTML from the shared template is replaced next).
execFileSync('node', [path.join(ROOT, 'scripts/build.js'), SLUG], { stdio: 'inherit' });

const dst = path.join(OUT, SLUG);
fs.copyFileSync(path.join(ROOT, 'templates/rental-checkin.html'), path.join(dst, 'index.html'));
fs.copyFileSync(path.join(DIR, 'step1.jpg'), path.join(dst, 'welcome-sign.jpg'));
console.log('wrote custom viewer', path.join(dst, 'index.html'));

// Printable US Letter guest-guide sheet
const qrPath = path.join(OUT, 'qr', `${SLUG}.png`);
const { baseUrl } = config();
const url = `${baseUrl}/${SLUG}/`;
const W = 1275, H = 1650;
const sheet = createCanvas(W, H), g = sheet.getContext('2d');
g.fillStyle = '#fff';
g.fillRect(0, 0, W, H);

g.fillStyle = '#023047';
g.fillRect(0, 0, W, 170);
g.fillStyle = '#ffb703';
g.font = 'bold 46px sans-serif';
g.fillText('Sample Guest Guide Signs', 40, 70);
g.fillStyle = '#fff';
g.font = 'bold 24px sans-serif';
g.fillText('AR check-in  -  Bellio Gulf Coast', 40, 112);
g.fillStyle = '#90e0ef';
g.font = '18px sans-serif';
g.fillText('SAMPLE PLACEHOLDER  -  replace with your rental\'s own signs and videos', 40, 148);

g.fillStyle = '#e8f4f8';
g.fillRect(40, 190, W - 80, 120);
g.strokeStyle = '#023047';
g.lineWidth = 2;
g.strokeRect(40, 190, W - 80, 120);
g.fillStyle = '#023047';
g.font = 'bold 22px sans-serif';
g.fillText('How to use (no app needed)', 60, 225);
g.font = '18px sans-serif';
g.fillText('1. Scan the QR code with your phone camera', 60, 255);
g.fillText('2. Tap Start and allow the camera', 60, 280);
g.fillText('3. Point at any sign below  -  a short video plays on top of it', 60, 305);

const qr = await loadImage(qrPath);
g.drawImage(qr, W - 230, 200, 110, 110);
g.fillStyle = '#023047';
g.font = '12px sans-serif';
g.textAlign = 'center';
g.fillText('Scan me', W - 175, 325);
g.textAlign = 'left';

const cardW = 560, cardH = 560, gapX = 35, gapY = 24;
const startX = 50, startY = 330;
for (let i = 0; i < 4; i++) {
  const col = i % 2, row = (i / 2) | 0;
  const x = startX + col * (cardW + gapX);
  const y = startY + row * (cardH + gapY);
  g.fillStyle = '#f7f7f7';
  g.fillRect(x, y, cardW, cardH);
  g.strokeStyle = '#023047';
  g.lineWidth = 3;
  g.strokeRect(x, y, cardW, cardH);

  const img = await loadImage(path.join(DIR, STEPS[i].file + '.jpg'));
  const pad = 16;
  const maxW = cardW - pad * 2, maxH = 420;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const iw = img.width * scale, ih = img.height * scale;
  const ix = x + (cardW - iw) / 2, iy = y + 52;
  g.drawImage(img, ix, iy, iw, ih);

  g.fillStyle = '#ffb703';
  g.fillRect(x, y, cardW, 42);
  g.fillStyle = '#023047';
  g.font = 'bold 22px sans-serif';
  g.textAlign = 'center';
  g.fillText(STEPS[i].label, x + cardW / 2, y + 29);
  g.fillStyle = '#555';
  g.font = '14px sans-serif';
  g.fillText('Point phone here for video', x + cardW / 2, y + cardH - 16);
  g.textAlign = 'left';
}

g.fillStyle = '#023047';
g.fillRect(0, H - 130, W, 130);
g.fillStyle = '#ffb703';
g.font = 'bold 22px sans-serif';
g.fillText('Bellio Gulf Coast  -  Panama City, FL', 40, H - 90);
g.fillStyle = '#fff';
g.font = '16px sans-serif';
g.fillText('Web AR with MindAR (free). Live demo: ' + url, 40, H - 60);
g.fillText('This sheet is a SAMPLE. Swap in your own Welcome sign and short check-in videos.', 40, H - 32);

const pngPath = path.join(dst, 'guest-guide-sheet.png');
fs.writeFileSync(pngPath, sheet.toBuffer('image/png'));
console.log('wrote', pngPath);

const htmlPath = '/tmp/guest-guide-sheet.html';
const pngData = fs.readFileSync(pngPath).toString('base64');
fs.writeFileSync(htmlPath, `<!doctype html><html><body style="margin:0"><img src="data:image/png;base64,${pngData}" style="width:8.5in;height:11in"/></body></html>`);
const pdfPath = path.join(dst, 'guest-guide-sheet.pdf');
execFileSync('google-chrome', [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  '--print-to-pdf-no-header',
  `file://${htmlPath}`,
], { stdio: 'inherit' });
console.log('wrote', pdfPath, (fs.statSync(pdfPath).size / 1024).toFixed(0) + 'KB');

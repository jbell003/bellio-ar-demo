// Generates sample "Build a Birdhouse" AR Instructions assets (3 step images + 3 placeholder videos).
// Images are intentionally high-detail / high-contrast for MindAR tracking. Videos are labeled SAMPLE PLACEHOLDER.
import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { execFileSync } from 'child_process';
import { CLIENTS } from './lib.js';

const DIR = path.join(CLIENTS, 'assembly-demo');
fs.mkdirSync(DIR, { recursive: true });

let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pal = ['#8B4513', '#D2691E', '#A0522D', '#CD853F', '#DEB887', '#F4A460', '#2F4F2F', '#556B2F', '#6B8E23', '#228B22', '#FFD700', '#FF8C00', '#4682B4', '#1E90FF', '#C71585', '#DC143C'];

function woodGrain(g, x, y, w, h) {
  g.fillStyle = '#C4A574';
  g.fillRect(x, y, w, h);
  for (let i = 0; i < 80; i++) {
    g.strokeStyle = `rgba(${90 + (rnd() * 40) | 0},${60 + (rnd() * 30) | 0},${30 + (rnd() * 20) | 0},${0.15 + rnd() * 0.35})`;
    g.lineWidth = 1 + rnd() * 3;
    const yy = y + rnd() * h;
    g.beginPath();
    g.moveTo(x, yy);
    g.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 12, x + w * 0.7, yy + (rnd() - 0.5) * 12, x + w, yy + (rnd() - 0.5) * 8);
    g.stroke();
  }
  // knots
  for (let i = 0; i < 4; i++) {
    const kx = x + 40 + rnd() * (w - 80), ky = y + 40 + rnd() * (h - 80);
    const r = 8 + rnd() * 18;
    const grd = g.createRadialGradient(kx, ky, 2, kx, ky, r);
    grd.addColorStop(0, '#5C3317');
    grd.addColorStop(0.6, '#8B5A2B');
    grd.addColorStop(1, 'rgba(196,165,116,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(kx, ky, r, 0, 6.28);
    g.fill();
  }
}

function bolts(g, pts) {
  for (const [bx, by] of pts) {
    g.fillStyle = '#4a4a4a';
    g.beginPath();
    g.arc(bx, by, 10, 0, 6.28);
    g.fill();
    g.fillStyle = '#c0c0c0';
    g.beginPath();
    g.arc(bx, by, 6, 0, 6.28);
    g.fill();
    g.strokeStyle = '#222';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bx - 4, by);
    g.lineTo(bx + 4, by);
    g.moveTo(bx, by - 4);
    g.lineTo(bx, by + 4);
    g.stroke();
  }
}

function confettiBorder(g, w, h) {
  // Busy patterned frame for tracking features
  for (let i = 0; i < 28; i++) {
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
  // Checker strip
  for (let x = 50; x < w - 50; x += 20) {
    for (let y of [55, h - 70]) {
      g.fillStyle = ((x / 20) | 0) % 2 ? '#023047' : '#ffb703';
      g.fillRect(x, y, 18, 12);
    }
  }
}

function badge(g, n, title, w) {
  g.fillStyle = 'rgba(2,48,71,0.92)';
  g.fillRect(70, 90, w - 140, 110);
  g.strokeStyle = '#ffb703';
  g.lineWidth = 6;
  g.strokeRect(70, 90, w - 140, 110);
  g.fillStyle = '#ffb703';
  g.font = 'bold 42px sans-serif';
  g.fillText('STEP ' + n, 95, 140);
  g.fillStyle = '#fff';
  g.font = 'bold 28px sans-serif';
  g.fillText(title, 95, 180);
  g.fillStyle = '#90e0ef';
  g.font = '16px sans-serif';
  g.fillText('SAMPLE PLACEHOLDER • Bellio Gulf Coast AR Instructions', 95, 205);
}

function footer(g, w, h, code) {
  g.fillStyle = '#023047';
  g.fillRect(60, h - 55, w - 120, 36);
  g.fillStyle = '#ffb703';
  g.font = 'bold 18px monospace';
  g.fillText(code, 80, h - 30);
}

// Step 1: Attach side panels
{
  const W = 1000, H = 1000;
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#E8F4E8';
  g.fillRect(0, 0, W, H);
  confettiBorder(g, W, H);
  badge(g, 1, 'Attach the side panels', W);

  // Back panel
  woodGrain(g, 280, 280, 440, 520);
  g.strokeStyle = '#5C3317';
  g.lineWidth = 4;
  g.strokeRect(280, 280, 440, 520);
  // Left panel angled
  g.save();
  g.translate(200, 320);
  g.rotate(-0.18);
  woodGrain(g, 0, 0, 120, 480);
  g.strokeStyle = '#5C3317';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 120, 480);
  bolts(g, [[30, 40], [90, 40], [30, 440], [90, 440], [60, 240]]);
  g.restore();
  // Right panel
  g.save();
  g.translate(680, 300);
  g.rotate(0.18);
  woodGrain(g, 0, 0, 120, 480);
  g.strokeStyle = '#5C3317';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 120, 480);
  bolts(g, [[30, 40], [90, 40], [30, 440], [90, 440], [60, 240]]);
  g.restore();
  // Entrance hole
  g.fillStyle = '#1a1a1a';
  g.beginPath();
  g.arc(500, 420, 55, 0, 6.28);
  g.fill();
  g.strokeStyle = '#8B4513';
  g.lineWidth = 8;
  g.stroke();
  // Tool icons
  g.fillStyle = '#ffb703';
  g.font = 'bold 48px sans-serif';
  g.fillText('🔧', 120, 700);
  g.fillText('🪛', 820, 700);
  // Dimension ticks
  g.strokeStyle = '#023047';
  g.lineWidth = 2;
  g.setLineDash([6, 4]);
  g.beginPath();
  g.moveTo(280, 820);
  g.lineTo(720, 820);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#023047';
  g.font = 'bold 22px sans-serif';
  g.fillText('14" wide', 450, 850);

  footer(g, W, H, 'BIRDHOUSE-S1');
  fs.writeFileSync(path.join(DIR, 'step1.jpg'), c.toBuffer('image/jpeg', { quality: 0.93 }));
}

// Step 2: Add the roof
{
  const W = 1000, H = 1000;
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#FFF5E6';
  g.fillRect(0, 0, W, H);
  confettiBorder(g, W, H);
  badge(g, 2, 'Add the pitched roof', W);

  // Body
  woodGrain(g, 300, 420, 400, 360);
  g.strokeStyle = '#5C3317';
  g.lineWidth = 4;
  g.strokeRect(300, 420, 400, 360);
  g.fillStyle = '#1a1a1a';
  g.beginPath();
  g.arc(500, 540, 48, 0, 6.28);
  g.fill();

  // Roof left
  g.save();
  g.translate(220, 300);
  g.rotate(-0.45);
  woodGrain(g, 0, 0, 380, 90);
  g.strokeStyle = '#3d2314';
  g.lineWidth = 4;
  g.strokeRect(0, 0, 380, 90);
  // shingle lines
  for (let i = 1; i < 5; i++) {
    g.strokeStyle = 'rgba(60,40,20,0.4)';
    g.beginPath();
    g.moveTo(0, i * 18);
    g.lineTo(380, i * 18);
    g.stroke();
  }
  bolts(g, [[40, 45], [190, 45], [340, 45]]);
  g.restore();
  // Roof right
  g.save();
  g.translate(500, 140);
  g.rotate(0.45);
  woodGrain(g, 0, 0, 380, 90);
  g.strokeStyle = '#3d2314';
  g.lineWidth = 4;
  g.strokeRect(0, 0, 380, 90);
  for (let i = 1; i < 5; i++) {
    g.strokeStyle = 'rgba(60,40,20,0.4)';
    g.beginPath();
    g.moveTo(0, i * 18);
    g.lineTo(380, i * 18);
    g.stroke();
  }
  bolts(g, [[40, 45], [190, 45], [340, 45]]);
  g.restore();

  // Arrow
  g.fillStyle = '#e63946';
  g.font = 'bold 36px sans-serif';
  g.fillText('▲ nail here', 380, 280);
  g.fillText('🏠', 120, 750);
  g.fillText('📏', 820, 750);

  // Unique barcode-like pattern for features
  for (let i = 0; i < 40; i++) {
    g.fillStyle = i % 2 ? '#023047' : '#ffb703';
    g.fillRect(100 + i * 20, 880, 12 + (i % 3) * 4, 30);
  }
  footer(g, W, H, 'BIRDHOUSE-S2');
  fs.writeFileSync(path.join(DIR, 'step2.jpg'), c.toBuffer('image/jpeg', { quality: 0.93 }));
}

// Step 3: Mount and finish
{
  const W = 1000, H = 1000;
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#E6F3FF';
  g.fillRect(0, 0, W, H);
  confettiBorder(g, W, H);
  badge(g, 3, 'Mount on the post', W);

  // Sky dots / leaves for features
  for (let i = 0; i < 60; i++) {
    g.fillStyle = pal[(i * 5) % pal.length];
    const lx = 80 + rnd() * 840, ly = 230 + rnd() * 200;
    g.beginPath();
    g.ellipse(lx, ly, 8 + rnd() * 18, 4 + rnd() * 10, rnd() * 3, 0, 6.28);
    g.fill();
  }

  // Post
  woodGrain(g, 460, 620, 80, 220);
  g.strokeStyle = '#5C3317';
  g.lineWidth = 3;
  g.strokeRect(460, 620, 80, 220);

  // Finished birdhouse
  woodGrain(g, 340, 380, 320, 260);
  g.strokeStyle = '#5C3317';
  g.lineWidth = 4;
  g.strokeRect(340, 380, 320, 260);
  g.fillStyle = '#1a1a1a';
  g.beginPath();
  g.arc(500, 480, 42, 0, 6.28);
  g.fill();
  // Roof
  g.fillStyle = '#8B4513';
  g.beginPath();
  g.moveTo(300, 400);
  g.lineTo(500, 260);
  g.lineTo(700, 400);
  g.closePath();
  g.fill();
  g.strokeStyle = '#3d2314';
  g.lineWidth = 4;
  g.stroke();
  // Perch
  g.fillStyle = '#654321';
  g.fillRect(470, 530, 60, 12);
  bolts(g, [[370, 400], [630, 400], [370, 620], [630, 620], [500, 640]]);

  // Bird
  g.fillStyle = '#e63946';
  g.beginPath();
  g.ellipse(580, 450, 22, 16, -0.3, 0, 6.28);
  g.fill();
  g.fillStyle = '#ffb703';
  g.beginPath();
  g.moveTo(600, 448);
  g.lineTo(618, 452);
  g.lineTo(600, 456);
  g.closePath();
  g.fill();

  g.fillStyle = '#023047';
  g.font = 'bold 26px sans-serif';
  g.fillText('Done! Watch birds move in 🐦', 280, 860);

  // Unique corner glyphs
  const glyphs = ['★', '◆', '●', '▲', '■', '✚'];
  g.font = '28px sans-serif';
  for (let i = 0; i < 12; i++) {
    g.fillStyle = pal[i % pal.length];
    g.fillText(glyphs[i % glyphs.length], 90 + i * 70, 920);
  }
  footer(g, W, H, 'BIRDHOUSE-S3');
  fs.writeFileSync(path.join(DIR, 'step3.jpg'), c.toBuffer('image/jpeg', { quality: 0.93 }));
}

// Placeholder videos: render frames with canvas, then ffmpeg (avoids drawtext colon issues)
const steps = [
  { n: 1, title: 'Step 1 - Attach the side panels', tip: 'Align edges | Drill pilot holes | Tighten bolts', bg: '#2a9d8f' },
  { n: 2, title: 'Step 2 - Add the pitched roof', tip: 'Overlap shingles | Nail both sides | Check level', bg: '#e76f51' },
  { n: 3, title: 'Step 3 - Mount on the post', tip: 'Secure bracket | Hang 5 to 6 ft high | Face away from wind', bg: '#457b9d' },
];
for (const s of steps) {
  const frameDir = path.join('/tmp', `birdhouse-step${s.n}-frames`);
  fs.mkdirSync(frameDir, { recursive: true });
  for (let f = 0; f < 80; f++) {
    const t = f / 10;
    const c = createCanvas(960, 720), g = c.getContext('2d');
    g.fillStyle = s.bg; g.fillRect(0, 0, 960, 720);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(((t * 80) % 1080) - 120, 0, 120, 720);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(60, 80, 840, 560);
    g.strokeStyle = '#ffb703'; g.lineWidth = 6; g.strokeRect(60, 80, 840, 560);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
    g.fillText('SAMPLE PLACEHOLDER', 480, 140);
    const bounce = Math.sin(t * Math.PI / 2) * 18;
    g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.fillText(s.title, 480, 300 + bounce);
    g.fillStyle = '#ffb703'; g.font = 'bold 24px sans-serif'; g.fillText(s.tip, 480, 380);
    g.fillStyle = '#fff'; g.font = '22px sans-serif';
    g.fillText('Bellio Gulf Coast  •  AR Instructions', 480, 480);
    g.fillText('Point your phone at the printed Step ' + s.n + ' picture', 480, 530);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(120, 600, 720, 12);
    g.fillStyle = '#ffb703'; g.fillRect(120, 600, 720 * (f / 79), 12);
    fs.writeFileSync(path.join(frameDir, `f${String(f).padStart(4, '0')}.jpg`), c.toBuffer('image/jpeg', { quality: 0.85 }));
  }
  const out = path.join(DIR, `step${s.n}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-framerate', '10', '-i', path.join(frameDir, 'f%04d.jpg'),
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '64k', '-t', '8', '-movflags', '+faststart', out,
  ], { stdio: 'inherit' });
  console.log('wrote', out);
}

fs.writeFileSync(path.join(DIR, 'client.json'), JSON.stringify({
  name: 'AR Instructions - Build a Birdhouse',
  type: 'instructions',
  hint: 'Point at any Step picture on the sheet',
  link: '',
  linkText: 'Get AR Instructions for your product',
  steps: [
    { label: 'Step 1', caption: 'Attach the side panels', image: 'step1.jpg', video: 'step1.mp4' },
    { label: 'Step 2', caption: 'Add the pitched roof', image: 'step2.jpg', video: 'step2.mp4' },
    { label: 'Step 3', caption: 'Mount on the post', image: 'step3.jpg', video: 'step3.mp4' },
  ],
}, null, 2));
console.log('assembly-demo assets ready in', DIR);

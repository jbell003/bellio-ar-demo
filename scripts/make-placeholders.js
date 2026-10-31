// Generates original placeholder assets: clients/demo-postcard (textured postcard) and clients/demo-border (A tile + textured frame).
import fs from 'fs'; import path from 'path'; import { createCanvas, loadImage } from 'canvas'; import { CLIENTS } from './lib.js';
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pal = ['#0077b6', '#00b4d8', '#ffb703', '#fb8500', '#e63946', '#2a9d8f', '#264653', '#f4a261', '#8338ec', '#06d6a0'];
function confetti(g, x0, y0, w, h, n) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = pal[(rnd() * pal.length) | 0]; g.strokeStyle = pal[(rnd() * pal.length) | 0]; g.lineWidth = 2 + rnd() * 5;
    const x = x0 + rnd() * w, y = y0 + rnd() * h, s = 6 + rnd() * 34, k = (rnd() * 4) | 0; g.save(); g.translate(x, y); g.rotate(rnd() * 6.28);
    if (k === 0) { g.beginPath(); g.arc(0, 0, s / 2, 0, 6.28); g.fill(); } else if (k === 1) g.fillRect(-s / 2, -s / 4, s, s / 2);
    else if (k === 2) { g.beginPath(); g.moveTo(0, -s / 2); g.lineTo(s / 2, s / 2); g.lineTo(-s / 2, s / 2); g.closePath(); g.fill(); }
    else { g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s, s, 0); g.stroke(); } g.restore();
  }
}
function save(slug, c, meta) { const d = path.join(CLIENTS, slug); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'target.jpg'), c.toBuffer('image/jpeg', { quality: 0.92 }));
  fs.writeFileSync(path.join(d, 'client.json'), JSON.stringify(meta, null, 2)); }
// 1) postcard 1200x800
{ const c = createCanvas(1200, 800), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 800); gr.addColorStop(0, '#90e0ef'); gr.addColorStop(.55, '#caf0f8'); gr.addColorStop(.56, '#0096c7'); gr.addColorStop(1, '#023e8a'); g.fillStyle = gr; g.fillRect(0, 0, 1200, 800);
  g.fillStyle = '#ffd166'; g.beginPath(); g.arc(950, 170, 90, 0, 6.28); g.fill();
  g.fillStyle = '#f1dca7'; g.beginPath(); g.moveTo(0, 640); g.bezierCurveTo(300, 560, 800, 720, 1200, 600); g.lineTo(1200, 800); g.lineTo(0, 800); g.fill();
  confetti(g, 0, 0, 1200, 800, 420);
  g.fillStyle = '#fff'; g.strokeStyle = '#023047'; g.lineWidth = 10; g.font = 'bold 120px sans-serif'; g.strokeText('BELLIO', 70, 230); g.fillText('BELLIO', 70, 230);
  g.font = 'bold 72px sans-serif'; g.strokeText('GULF COAST', 70, 330); g.fillText('GULF COAST', 70, 330);
  g.font = 'bold 44px serif'; g.fillStyle = '#e63946'; g.fillText('Panama City, FL  •  Scan me!', 70, 410);
  g.strokeStyle = '#fff'; g.lineWidth = 14; g.strokeRect(14, 14, 1172, 772);
  save('demo-postcard', c, { name: 'Bellio Gulf Coast – Postcard demo', link: '', hint: 'Point your camera at the Bellio postcard' }); }
// 2) A tile with textured frame
{ const tile = await loadImage(path.join(CLIENTS, 'demo', 'target.jpg'));
  const c = createCanvas(1200, 1200), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1200, 1200);
  for (let y = 0; y < 1200; y += 60) for (let x = 0; x < 1200; x += 60) { g.fillStyle = pal[((x / 60 * 7 + y / 60 * 3) ^ (x * y / 3600)) % pal.length]; if (rnd() < .5) g.fillRect(x, y, 60, 60); }
  confetti(g, 0, 0, 1200, 1200, 700);
  g.fillStyle = '#fff'; g.fillRect(190, 190, 820, 820); g.drawImage(tile, 200, 200, 800, 800);
  g.fillStyle = '#023047'; g.font = 'bold 54px sans-serif'; g.fillRect(260, 1080, 680, 80); g.fillStyle = '#ffb703'; g.textAlign = 'center'; g.fillText('BELLIO GULF COAST', 600, 1140);
  save('demo-border', c, { name: 'Bellio Gulf Coast – A tile (bordered)', link: '', hint: 'Point your camera at the A card' }); }
console.log('placeholders written');

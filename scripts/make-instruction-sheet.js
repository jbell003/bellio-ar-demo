// Builds a printable one-page instruction sheet (PNG + PDF) for the assembly-demo.
import fs from 'fs'; import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { execFileSync } from 'child_process';
import { ROOT, OUT, config } from './lib.js';

const slug = 'assembly-demo';
const src = path.join(ROOT, 'clients', slug);
const outDir = path.join(OUT, slug);
fs.mkdirSync(outDir, { recursive: true });
const qrPath = path.join(OUT, 'qr', `${slug}.png`);
const { baseUrl } = config();
const url = `${baseUrl}/${slug}/`;

const meta = JSON.parse(fs.readFileSync(path.join(src, 'client.json'), 'utf8'));
const steps = meta.steps;
// US Letter @ 150 dpi
const W = 1275, H = 1650;
const c = createCanvas(W, H), g = c.getContext('2d');
g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);

// Header
g.fillStyle = '#023047'; g.fillRect(0, 0, W, 160);
g.fillStyle = '#ffb703'; g.font = 'bold 48px sans-serif';
g.fillText('Build a Birdhouse', 40, 70);
g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif';
g.fillText('AR Instructions  •  Bellio Gulf Coast', 40, 115);
g.fillStyle = '#90e0ef'; g.font = '18px sans-serif';
g.fillText('SAMPLE PLACEHOLDER  -  replace with your product steps', 40, 145);

// How to use box
g.fillStyle = '#e8f4f8'; g.fillRect(40, 180, W - 80, 110);
g.strokeStyle = '#023047'; g.lineWidth = 2; g.strokeRect(40, 180, W - 80, 110);
g.fillStyle = '#023047'; g.font = 'bold 22px sans-serif';
g.fillText('How to use (no app needed)', 60, 215);
g.font = '18px sans-serif';
g.fillText('1. Scan the QR code with your phone camera', 60, 245);
g.fillText('2. Tap Start and allow the camera', 60, 270);
g.fillText('3. Point at any Step picture below  -  a how-to video plays on top of it', 60, 295);

// QR
const qr = await loadImage(qrPath);
g.drawImage(qr, W - 220, 185, 100, 100);
g.fillStyle = '#023047'; g.font = '12px sans-serif'; g.textAlign = 'center';
g.fillText('Scan me', W - 170, 300);
g.textAlign = 'left';

// Three step cards
const cardW = 370, cardH = 520, gap = 30, startX = 40, startY = 320;
for (let i = 0; i < 3; i++) {
  const x = startX + i * (cardW + gap);
  const y = startY;
  g.fillStyle = '#f7f7f7';
  g.fillRect(x, y, cardW, cardH);
  g.strokeStyle = '#023047'; g.lineWidth = 3;
  g.strokeRect(x, y, cardW, cardH);

  const img = await loadImage(path.join(src, steps[i].image));
  // Fit image in card
  const pad = 16;
  const maxW = cardW - pad * 2, maxH = 340;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const iw = img.width * scale, ih = img.height * scale;
  const ix = x + (cardW - iw) / 2, iy = y + 50;
  g.drawImage(img, ix, iy, iw, ih);

  g.fillStyle = '#ffb703'; g.fillRect(x, y, cardW, 40);
  g.fillStyle = '#023047'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
  g.fillText(steps[i].label, x + cardW / 2, y + 28);
  g.fillStyle = '#023047'; g.font = 'bold 18px sans-serif';
  g.fillText(steps[i].caption, x + cardW / 2, y + cardH - 60);
  g.fillStyle = '#555'; g.font = '14px sans-serif';
  g.fillText('Point phone here for video', x + cardW / 2, y + cardH - 30);
  g.textAlign = 'left';
}

// Footer
g.fillStyle = '#023047'; g.fillRect(0, H - 140, W, 140);
g.fillStyle = '#ffb703'; g.font = 'bold 22px sans-serif';
g.fillText('Bellio Gulf Coast  •  Panama City, FL', 40, H - 95);
g.fillStyle = '#fff'; g.font = '16px sans-serif';
g.fillText('Web AR with MindAR (free). Live demo: ' + url, 40, H - 65);
g.fillText('This sheet is a SAMPLE. Swap in your own step photos and short how-to videos.', 40, H - 35);

const pngPath = path.join(outDir, 'instruction-sheet.png');
fs.writeFileSync(pngPath, c.toBuffer('image/png'));
console.log('wrote', pngPath);

// PDF via Chrome headless print
const htmlPath = '/tmp/instruction-sheet.html';
const pngData = fs.readFileSync(pngPath).toString('base64');
fs.writeFileSync(htmlPath, `<!doctype html><html><body style="margin:0"><img src="data:image/png;base64,${pngData}" style="width:8.5in;height:11in"/></body></html>`);
const pdfPath = path.join(outDir, 'instruction-sheet.pdf');
execFileSync('google-chrome', [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  '--print-to-pdf-no-header',
  `file://${htmlPath}`,
], { stdio: 'inherit' });
console.log('wrote', pdfPath, (fs.statSync(pdfPath).size / 1024).toFixed(0) + 'KB');

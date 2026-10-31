// Usage: node scripts/build.js [slug ...]   (no args = all clients)
// Env: AR_BASE_URL overrides config.json baseUrl. --force recompiles .mind even if up to date.
import fs from 'fs'; import path from 'path';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { loadImage } from 'canvas'; import QRCode from 'qrcode';
import { ROOT, CLIENTS, OUT, config } from './lib.js';
const args = process.argv.slice(2), force = args.includes('--force');
const all = fs.readdirSync(CLIENTS).filter(d => fs.statSync(path.join(CLIENTS, d)).isDirectory());
const slugs = args.filter(a => !a.startsWith('--')); const list = slugs.length ? slugs : all;
const { baseUrl } = config(); const tpl = fs.readFileSync(path.join(ROOT, 'templates/viewer.html'), 'utf8');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
fs.mkdirSync(path.join(OUT, 'qr'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'templates/game.js'), path.join(OUT, 'game.js')); fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const report = {};
for (const slug of list) {
  const src = path.join(CLIENTS, slug), dst = path.join(OUT, slug);
  const meta = fs.existsSync(path.join(src, 'client.json')) ? JSON.parse(fs.readFileSync(path.join(src, 'client.json'), 'utf8')) : {};
  if (meta.publish === false) { console.log(`[${slug}] publish:false — skipped`); continue; }
  const tdir = meta.targetFrom ? path.join(CLIENTS, meta.targetFrom) : src; // reuse another client's target image/.mind
  const img = ['target.jpg', 'target.png'].map(f => path.join(tdir, f)).find(fs.existsSync);
  const vid = path.join(src, 'video.mp4'), hasVid = fs.existsSync(vid);
  if (!img || (!hasVid && meta.type !== 'game')) { console.error(`[${slug}] missing target image or video.mp4 — skipped`); process.exitCode = 1; continue; }
  fs.mkdirSync(dst, { recursive: true });
  const mind = path.join(dst, 'target.mind'); const image = await loadImage(img);
  let stats = meta._stats;
  if (force || !fs.existsSync(mind) || fs.statSync(mind).mtimeMs < fs.statSync(img).mtimeMs) {
    process.stdout.write(`[${slug}] compiling ${path.basename(img)} (${image.width}x${image.height})... `);
    const c = new OfflineCompiler(); const data = await c.compileImageTargets([image], () => {});
    fs.writeFileSync(mind, Buffer.from(c.exportData()));
    const d = data[0];
    stats = { matchingPoints: d.matchingData.reduce((n, m) => n + m.maximaPoints.length + m.minimaPoints.length, 0),
              trackingPoints: d.trackingData.reduce((n, t) => n + t.points.length, 0) };
    fs.writeFileSync(path.join(dst, 'stats.json'), JSON.stringify(stats, null, 2)); console.log('done', stats);
  } else stats = JSON.parse(fs.readFileSync(path.join(dst, 'stats.json'), 'utf8'));
  if (hasVid) fs.copyFileSync(vid, path.join(dst, 'video.mp4'));
  const aspect = image.height / image.width; const url = `${baseUrl}/${slug}/`;
  const html = tpl.replaceAll('{{NAME}}', esc(meta.name || 'Bellio Gulf Coast AR')).replaceAll('{{ASPECT}}', aspect.toFixed(4))
    .replaceAll('{{LINK}}', esc(meta.link || '')).replaceAll('{{LINKTEXT}}', esc(meta.linkText || 'Learn more'))
    .replaceAll('{{VIDEO_ASSET}}', hasVid ? '<video id="vid" src="video.mp4" preload="auto" loop muted playsinline webkit-playsinline crossorigin="anonymous"></video>' : '')
    .replaceAll('{{VIDEO_PLANE}}', hasVid ? `  <a-video src="#vid" width="1" height="${aspect.toFixed(4)}" position="0 0 0.01"></a-video>` : '')
    .replace('{{GAME}}', () => meta.type === 'game' ? JSON.stringify({ ...meta.game, aspect }).replace(/</g, '\\u003c') : 'null')
    .replaceAll('{{HINT}}', esc(meta.hint || 'Point your camera at the printed photo'));
  fs.writeFileSync(path.join(dst, 'index.html'), html);
  const qr = path.join(OUT, 'qr', `${slug}.png`);
  await QRCode.toFile(qr, url, { width: 1024, margin: 4, errorCorrectionLevel: 'M' });
  report[slug] = { url, qr: path.relative(ROOT, qr), ...stats };
}
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Bellio Gulf Coast AR</title><p>Bellio Gulf Coast AR demos.</p>`);
console.log(JSON.stringify(report, null, 2));

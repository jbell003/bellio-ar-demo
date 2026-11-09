// Usage: node scripts/build.js [slug ...]   (no args = all clients)
// Env: AR_BASE_URL overrides config.json baseUrl. --force recompiles .mind even if up to date.
import fs from 'fs'; import path from 'path';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { loadImage } from 'canvas'; import QRCode from 'qrcode';
import { ROOT, CLIENTS, OUT, config } from './lib.js';
const args = process.argv.slice(2), force = args.includes('--force');
const all = fs.readdirSync(CLIENTS).filter(d => fs.statSync(path.join(CLIENTS, d)).isDirectory());
const slugs = args.filter(a => !a.startsWith('--')); const list = slugs.length ? slugs : all;
const { baseUrl } = config();
const tplVideo = fs.readFileSync(path.join(ROOT, 'templates/viewer.html'), 'utf8');
const tplInstr = fs.readFileSync(path.join(ROOT, 'templates/instructions.html'), 'utf8');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
fs.mkdirSync(path.join(OUT, 'qr'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'templates/game.js'), path.join(OUT, 'game.js'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const report = {};

function resolveSteps(src, meta) {
  if (Array.isArray(meta.steps) && meta.steps.length) {
    return meta.steps.map((s, i) => {
      const image = path.join(src, s.image || `step${i + 1}.jpg`);
      const video = path.join(src, s.video || `step${i + 1}.mp4`);
      return { ...s, image, video, index: i };
    });
  }
  // Fallback: step1.jpg/mp4, step2.jpg/mp4, ...
  const steps = [];
  for (let i = 1; i <= 20; i++) {
    const image = ['step' + i + '.jpg', 'step' + i + '.png'].map(f => path.join(src, f)).find(fs.existsSync);
    const video = path.join(src, 'step' + i + '.mp4');
    if (!image || !fs.existsSync(video)) break;
    steps.push({ label: 'Step ' + i, caption: '', image, video, index: i - 1 });
  }
  return steps;
}

for (const slug of list) {
  const src = path.join(CLIENTS, slug), dst = path.join(OUT, slug);
  const meta = fs.existsSync(path.join(src, 'client.json')) ? JSON.parse(fs.readFileSync(path.join(src, 'client.json'), 'utf8')) : {};
  if (meta.publish === false) { console.log(`[${slug}] publish:false  -  skipped`); continue; }
  const isInstr = meta.type === 'instructions';
  const tdir = meta.targetFrom ? path.join(CLIENTS, meta.targetFrom) : src;

  if (isInstr) {
    const steps = resolveSteps(src, meta);
    if (steps.length < 1) { console.error(`[${slug}] instructions client needs step images+videos  -  skipped`); process.exitCode = 1; continue; }
    for (const s of steps) {
      if (!fs.existsSync(s.image) || !fs.existsSync(s.video)) {
        console.error(`[${slug}] missing ${s.image} or ${s.video}`); process.exitCode = 1; continue;
      }
    }
    fs.mkdirSync(dst, { recursive: true });
    const mind = path.join(dst, 'target.mind');
    const images = [];
    for (const s of steps) images.push(await loadImage(s.image));
    // Rebuild mind if any step image is newer than the .mind, or force
    const newestImg = Math.max(...steps.map(s => fs.statSync(s.image).mtimeMs));
    let stats = meta._stats;
    if (force || !fs.existsSync(mind) || fs.statSync(mind).mtimeMs < newestImg) {
      process.stdout.write(`[${slug}] compiling ${steps.length} targets... `);
      const c = new OfflineCompiler();
      const data = await c.compileImageTargets(images, () => {});
      fs.writeFileSync(mind, Buffer.from(c.exportData()));
      stats = {
        targets: data.map((d, i) => ({
          index: i,
          matchingPoints: d.matchingData.reduce((n, m) => n + m.maximaPoints.length + m.minimaPoints.length, 0),
          trackingPoints: d.trackingData.reduce((n, t) => n + t.points.length, 0),
          size: `${images[i].width}x${images[i].height}`,
        })),
      };
      fs.writeFileSync(path.join(dst, 'stats.json'), JSON.stringify(stats, null, 2));
      console.log('done');
      for (const t of stats.targets) console.log(`  target ${t.index}: matching=${t.matchingPoints} tracking=${t.trackingPoints} (${t.size})`);
    } else {
      stats = JSON.parse(fs.readFileSync(path.join(dst, 'stats.json'), 'utf8'));
      console.log(`[${slug}] mind up to date (${steps.length} targets)`);
    }
    // Copy step videos (and optional preview thumbs)
    for (let i = 0; i < steps.length; i++) {
      fs.copyFileSync(steps[i].video, path.join(dst, `step${i + 1}.mp4`));
      fs.copyFileSync(steps[i].image, path.join(dst, `step${i + 1}.jpg`));
    }
    const videoAssets = steps.map((s, i) =>
      `<video id="vid${i}" src="step${i + 1}.mp4" preload="auto" loop muted playsinline webkit-playsinline crossorigin="anonymous"></video>`
    ).join('\n');
    const targetsHtml = steps.map((s, i) => {
      const aspect = (images[i].height / images[i].width).toFixed(4);
      return ` <a-entity id="target${i}" mindar-image-target="targetIndex: ${i}">
  <a-video src="#vid${i}" width="1" height="${aspect}" position="0 0 0.01"></a-video>
 </a-entity>`;
    }).join('\n');
    const stepsJson = JSON.stringify(steps.map(s => ({ label: s.label || '', caption: s.caption || '' }))).replace(/</g, '\\u003c');
    const url = `${baseUrl}/${slug}/`;
    const html = tplInstr
      .replaceAll('{{NAME}}', esc(meta.name || 'AR Instructions'))
      .replaceAll('{{LINK}}', esc(meta.link || ''))
      .replaceAll('{{LINKTEXT}}', esc(meta.linkText || 'Learn more'))
      .replaceAll('{{HINT}}', esc(meta.hint || 'Point at a Step picture on the sheet'))
      .replaceAll('{{VIDEO_ASSETS}}', videoAssets)
      .replaceAll('{{TARGETS}}', targetsHtml)
      .replace('{{STEPS_JSON}}', stepsJson);
    fs.writeFileSync(path.join(dst, 'index.html'), html);
    const qr = path.join(OUT, 'qr', `${slug}.png`);
    await QRCode.toFile(qr, url, { width: 1024, margin: 4, errorCorrectionLevel: 'M' });
    report[slug] = { url, qr: path.relative(ROOT, qr), type: 'instructions', steps: steps.length, ...stats };
    continue;
  }

  // --- existing single-target video / game path ---
  const img = ['target.jpg', 'target.png'].map(f => path.join(tdir, f)).find(fs.existsSync);
  const vid = path.join(src, 'video.mp4'), hasVid = fs.existsSync(vid);
  if (!img || (!hasVid && meta.type !== 'game')) { console.error(`[${slug}] missing target image or video.mp4  -  skipped`); process.exitCode = 1; continue; }
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
  const html = tplVideo.replaceAll('{{NAME}}', esc(meta.name || 'Bellio Gulf Coast AR')).replaceAll('{{ASPECT}}', aspect.toFixed(4))
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

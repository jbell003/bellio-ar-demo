// Video client:  node scripts/add-client.js <slug> <image> <video> [--name N] [--link URL] [--no-build]
// Game client:   node scripts/add-client.js <slug> <image|-> [video|-] --type game [--target-from <slug>] [--title T] [--item-name "coins"]
//                  [--emoji 🪙] [--shape coin|shell|bolt|star|gem|sphere] [--color "#ffd166,#f4a261"] [--duration 20] [--points 10]
//                  [--accent "#ffb703"] [--cta-label "Call us"] [--cta-link tel:+1...] [--name N]
// Images/videos are normalized with ffmpeg (JPEG ≤1200px; H.264/AAC MP4 ≤1280px, faststart), then the client is built.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { CLIENTS, slugOk } from './lib.js';
const a = process.argv.slice(2); const opt = k => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : undefined; };
const o = Object.fromEntries(['--name','--link','--type','--target-from','--title','--item-name','--emoji','--shape','--color','--duration','--points','--accent','--cta-label','--cta-link'].map(k => [k.slice(2), opt(k)]));
const noBuild = a.includes('--no-build'); const [slug, img, vid] = a.filter(x => x !== '--no-build'); const game = o.type === 'game';
const has = f => f && f !== '-';
if (!slug || (!game && (!has(img) || !has(vid))) || (game && !has(img) && !o['target-from'])) {
  console.error('usage: see header of scripts/add-client.js'); process.exit(2); }
if (!slugOk(slug)) { console.error('slug must be lowercase letters/digits/hyphens'); process.exit(2); }
for (const f of [img, vid]) if (has(f) && !fs.existsSync(f)) { console.error('not found: ' + f); process.exit(2); }
const dir = path.join(CLIENTS, slug); fs.mkdirSync(dir, { recursive: true });
const ff = (...x) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...x], { stdio: 'inherit' });
if (has(img)) ff('-i', img, '-vf', "scale='min(1200,iw)':-2", '-frames:v', '1', '-q:v', '2', path.join(dir, 'target.jpg'));
if (has(vid)) ff('-i', vid, '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
   '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join(dir, 'video.mp4'));
const cj = path.join(dir, 'client.json'); const meta = fs.existsSync(cj) ? JSON.parse(fs.readFileSync(cj, 'utf8')) : {};
if (o.name) meta.name = o.name; if (o.link) meta.link = o.link;
if (game) {
  meta.type = 'game'; if (o['target-from']) meta.targetFrom = o['target-from']; const g = meta.game ||= {};
  g.title = o.title || g.title || 'Tap to collect!'; g.itemName = o['item-name'] || g.itemName || 'points'; g.emoji = o.emoji || g.emoji || '⭐';
  if (o.shape || o.color || !g.items) { const cols = (o.color || '#ffd166').split(','); g.items = cols.map(c => ({ shape: o.shape || 'coin', color: c.trim() })); }
  g.count ||= 6; g.duration = +(o.duration || g.duration || 20); g.pointsPerTap = +(o.points || g.pointsPerTap || 10);
  g.colors ||= {}; if (o.accent) g.colors.accent = o.accent;
  if (o['cta-label']) g.ctaLabel = o['cta-label']; if (o['cta-link']) g.ctaLink = o['cta-link'];
}
fs.writeFileSync(cj, JSON.stringify(meta, null, 2)); console.log(`added clients/${slug}`);
if (!noBuild) execFileSync('node', [path.join(path.dirname(new URL(import.meta.url).pathname), 'build.js'), slug], { stdio: 'inherit' });

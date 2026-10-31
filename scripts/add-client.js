// Usage: node scripts/add-client.js <slug> <image.jpg|png> <video> [--name "Client Name"] [--link https://...] [--no-build]
// Normalizes the image (max 1200px JPEG) and video (H.264/AAC MP4, max 1280px, faststart) via ffmpeg, then builds that client.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { CLIENTS, slugOk } from './lib.js';
const a = process.argv.slice(2); const opt = k => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : undefined; };
const name = opt('--name'), link = opt('--link'); const noBuild = a.includes('--no-build');
const [slug, img, vid] = a.filter(x => x !== '--no-build');
if (!slug || !img || !vid) { console.error('usage: add-client.js <slug> <image> <video> [--name N] [--link URL] [--no-build]'); process.exit(2); }
if (!slugOk(slug)) { console.error('slug must be lowercase letters/digits/hyphens'); process.exit(2); }
for (const f of [img, vid]) if (!fs.existsSync(f)) { console.error('not found: ' + f); process.exit(2); }
const dir = path.join(CLIENTS, slug); fs.mkdirSync(dir, { recursive: true });
const ff = (...x) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...x], { stdio: 'inherit' });
ff('-i', img, '-vf', "scale='min(1200,iw)':-2", '-frames:v', '1', '-q:v', '2', path.join(dir, 'target.jpg'));
ff('-i', vid, '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
   '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join(dir, 'video.mp4'));
const cj = path.join(dir, 'client.json'); const meta = fs.existsSync(cj) ? JSON.parse(fs.readFileSync(cj, 'utf8')) : {};
if (name) meta.name = name; if (link) meta.link = link; fs.writeFileSync(cj, JSON.stringify(meta, null, 2));
console.log(`added clients/${slug}`);
if (!noBuild) execFileSync('node', [path.join(path.dirname(new URL(import.meta.url).pathname), 'build.js'), slug], { stdio: 'inherit' });

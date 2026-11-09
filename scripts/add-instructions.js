// Multi-step AR Instructions client:
//   node scripts/add-instructions.js <slug> --name "Product Name" step1.jpg step1.mp4 step2.jpg step2.mp4 [step3.jpg step3.mp4 ...]
// Optional: --link URL  --hint "..."  --no-build
// Images/videos are normalized with ffmpeg, then the client is built (one .mind with all targets).
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { CLIENTS, slugOk } from './lib.js';

const a = process.argv.slice(2);
const opt = k => { const i = a.indexOf(k); return i >= 0 ? a.splice(i, 2)[1] : undefined; };
const name = opt('--name');
const link = opt('--link');
const hint = opt('--hint');
const noBuild = a.includes('--no-build');
const args = a.filter(x => x !== '--no-build');
const slug = args.shift();
const files = args;

if (!slug || files.length < 2 || files.length % 2 !== 0) {
  console.error('usage: node scripts/add-instructions.js <slug> --name "Name" step1.jpg step1.mp4 step2.jpg step2.mp4 [...]');
  process.exit(2);
}
if (!slugOk(slug)) { console.error('slug must be lowercase letters/digits/hyphens'); process.exit(2); }
for (const f of files) if (!fs.existsSync(f)) { console.error('not found: ' + f); process.exit(2); }

const dir = path.join(CLIENTS, slug);
fs.mkdirSync(dir, { recursive: true });
const ff = (...x) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...x], { stdio: 'inherit' });

const steps = [];
for (let i = 0; i < files.length; i += 2) {
  const n = (i / 2) + 1;
  const imgIn = files[i], vidIn = files[i + 1];
  const imgOut = path.join(dir, `step${n}.jpg`);
  const vidOut = path.join(dir, `step${n}.mp4`);
  ff('-i', imgIn, '-vf', "scale='min(1200,iw)':-2", '-frames:v', '1', '-q:v', '2', imgOut);
  ff('-i', vidIn, '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
     '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', vidOut);
  steps.push({ label: `Step ${n}`, caption: '', image: `step${n}.jpg`, video: `step${n}.mp4` });
  console.log(`  step ${n}: ${path.basename(imgIn)} + ${path.basename(vidIn)}`);
}

const cj = path.join(dir, 'client.json');
const meta = fs.existsSync(cj) ? JSON.parse(fs.readFileSync(cj, 'utf8')) : {};
meta.type = 'instructions';
meta.name = name || meta.name || slug;
if (link) meta.link = link;
meta.hint = hint || meta.hint || 'Point at any Step picture on the sheet';
meta.steps = steps;
fs.writeFileSync(cj, JSON.stringify(meta, null, 2));
console.log(`added instructions client clients/${slug} (${steps.length} steps)`);

if (!noBuild) {
  execFileSync('node', [path.join(path.dirname(new URL(import.meta.url).pathname), 'build.js'), slug], { stdio: 'inherit' });
}

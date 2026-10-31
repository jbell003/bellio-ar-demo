import fs from 'fs'; import path from 'path';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const CLIENTS = path.join(ROOT, 'clients');
export const OUT = path.join(ROOT, 'docs');
export function config() {
  const f = path.join(ROOT, 'config.json');
  const c = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  return { baseUrl: (process.env.AR_BASE_URL || c.baseUrl || 'https://example.github.io/bellio-ar-demo').replace(/\/$/, '') };
}
export const slugOk = s => /^[a-z0-9][a-z0-9-]{0,40}$/.test(s);

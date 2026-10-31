# Bellio Gulf Coast – Web AR template (MindAR, free)

Scan a QR code → a web page opens (no app) → tap **Start** → point the phone at the printed photo → an MP4 plays locked on top of it.
Built with [MindAR](https://github.com/hiukim/mind-ar-js) (MIT, no watermark) + A-Frame, loaded from CDN. Static output in `docs/` for free GitHub Pages hosting.

## Layout
```
clients/<slug>/target.jpg   # the printed image (what the camera recognizes)
clients/<slug>/video.mp4    # video shown on top (sized to the target's aspect ratio)
clients/<slug>/client.json  # optional: {"name","link","linkText","hint"}
templates/viewer.html       # page template (noindex, playsinline, tap-to-start, muted fallback, pause on lost)
scripts/build.js            # compiles target.mind headlessly, writes docs/<slug>/index.html + docs/qr/<slug>.png
scripts/add-client.js       # normalize + add a client from any image/video, then build it
config.json                 # baseUrl for the live site (or env AR_BASE_URL)
docs/                       # publish this folder (GitHub Pages: branch main, folder /docs)
```
Live URL per client: `<baseUrl>/<slug>/`. QR: `docs/qr/<slug>.png`.

## Setup
Requires Node 18+ and ffmpeg. `npm install` (canvas is pinned to v3 via `overrides` so it installs prebuilt binaries).

## Add a client (exactly what's needed)
Files: **one image** of the printed piece (JPG/PNG, flat, ideally the same file you send to print, ≥800px) and **one video** (any format ffmpeg reads; ideally same aspect ratio as the image, ≤30 s).
```
node scripts/add-client.js <slug> <image> <video> --name "Client Name" [--link https://client.site]
git add -A && git commit -m "add <slug>" && git push      # Pages redeploys in ~1 min
```
Slug: lowercase letters/digits/hyphens (e.g. `haid-electric`). Then print `docs/qr/<slug>.png` on the piece (≥2 cm / 0.8 in).
Rebuild everything: `npm run build` (`-- --force` to recompile all .mind files). Change domain: edit `config.json` then `npm run build` (QRs regenerate).

## Deploy to GitHub Pages (free)
1. Create a public repo (e.g. `bellio-ar-demo`), push this folder.
2. Settings → Pages → Deploy from branch → `main` / `/docs`.
3. Set `config.json` baseUrl to `https://<user>.github.io/bellio-ar-demo`, `npm run build`, commit, push.
Camera access requires HTTPS — Pages provides it.

## Test locally
`npm run serve` → http://localhost:3000/<slug>/ (desktop webcam works on localhost; phones need HTTPS, i.e. the Pages URL).
Print/show `clients/<slug>/target.jpg` on paper or another screen and point the camera at it.

## Target image quality (most important)
MindAR tracks corners/texture. Good: busy, high-contrast detail spread across the whole image, non-repeating, matte print. Bad: big flat areas, a single letter/logo on plain background, repeating patterns, glossy finishes, fabric.
`build.js` prints `matchingPoints` / `trackingPoints` per client (also in `docs/<slug>/stats.json`). Rough guide from our tests: trackingPoints < ~25 = weak; 40+ = good. If weak, add a textured border/background to the printed design (see `clients/demo-border`) — the printed piece must match the target image.
`scripts/make-placeholders.js` regenerates the sample postcard and bordered tile.

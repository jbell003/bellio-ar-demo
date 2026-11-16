# Beach Runner, sponsored modern edition

A smooth, modern-look side-scroller with a local business built into the scenery. Plain HTML, CSS and JavaScript. No build step, no libraries, no paid services.
Live: https://jbell003.github.io/bellio-ar-demo/beach-runner-haid/
The retro version is untouched at `docs/beach-runner/`.

This sample uses Haid Electric. It is a Bellio Gulf Coast demo and **not an official Haid Electric game**. The start screen and the page footer both say so:
"Sample demo by Bellio Gulf Coast. Not an official Haid Electric game."

## What is different from the retro version

- Smooth vector art drawn in code (gradients, glow, soft shadows) instead of pixel sprites
- Four parallax layers: sunset skyline with a Ferris wheel, hills and sea, power lines and billboards, and a street of storefronts, vans and lamps
- Particle effects: sparkles on every bolt, dust on jumps and landings, water splashes
- Squash and stretch on the runner, a smooth lookahead camera, screen fades
- Glass-style HUD and menus, rounded buttons, clean system fonts
- Same level, same controls, same photo-head feature and the same sounds (generated in WebAudio, with a mute button)

## Swap in a different business (about 5 minutes)

The whole sponsor scene is generated from `config.js`. No image files are needed.

1. Copy the `beach-runner-haid` folder to a new folder, for example `docs/acme-runner/`.
2. Edit `config.js`:
   - `sponsor.name`, `signTop`, `signBar`, `city`, `phone`, `slogan`, `poweredBy`: the text on the storefront sign, billboards, van, banners and the "Powered by" signs
   - `sponsor.colors`: `board` (sign and building color), `text`, `accent` (lightning, awning, glow), `accent2` (rare pickup)
   - `sponsor.scene`: turn the storefront, van, billboards, banners and power lines on or off
   - `colors` and `skyColors`: runner outfit, menu colors and the sky
   - `collectibles`: names and points for the two pickups (the art is a lightning bolt in the sponsor accent color; change `accent` to recolor it)
   - `cta.heading`, `cta.buttonText`, `cta.link`: the end-screen button (`tel:+1...` opens the phone dialer)
   - `studio`: your own "get a game like this" line and link
   - `disclaimer`: shown on the start screen and in the footer. Keep it if the business has not endorsed the demo.
   - `storageKey`: use a new value per client so saved best scores and photos do not mix
3. Commit and push. It is live at `https://<user>.github.io/<repo>/acme-runner/`.
4. Make a QR code for that URL.

Every key is optional. Anything you leave out uses the default. Only use a business name and colors with the owner's permission, and keep the logo as clean text and colors (do not copy their artwork).

## Controls

- Phone: tap anywhere to jump (hold for a higher jump), or use the JUMP button. In Manual mode use the left and right buttons. Auto-run mode runs for you.
- Desktop: Left/Right or A/D to move, Space, Up or W to jump (hold for higher), M to mute, P or Esc to pause.

## Photo head

"Add your face" opens the camera (selfie) or the gallery, then crops the photo to a circle (drag and zoom, or Auto center).
The photo is read on the device only. A Content Security Policy in `index.html` blocks all network requests from the page (`connect-src 'none'`), so the game cannot upload it.
"Remember on this phone" saves a small 96x96 copy in localStorage. "Remove photo" deletes it.

## Files

- `index.html`, `style.css`: page and menus
- `config.js`: branding (edit this)
- `game.js`: the game (art, level, physics, particles, WebAudio sounds, photo crop)

All art, music and sound effects are original and generated in code. No third-party characters, sprites or audio.

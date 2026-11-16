# Beach Runner (white-label retro side-scroller)

An original 8-bit style beach runner. Plain HTML, CSS and JavaScript. No build step, no libraries, no paid services.
Live: https://jbell003.github.io/bellio-ar-demo/beach-runner/

## Rebrand it for a client (about 5 minutes)

1. Copy the whole `beach-runner` folder to a new folder, for example `docs/acme-runner/`.
2. Open `config.js` and change:
   - `businessName`, `gameTitle`, `tagline`
   - `signText` (text on the wooden sign near the start) and `flagLetter` (letter on the finish flag)
   - `logo` (optional): put a logo file in the folder and set `logo: "logo.png"`
   - `colors` (player shirt, shorts, hat, buttons, menu panel) and `skyColors` (8 sunset bands)
   - `collectibles` (names and points for the two pickups)
   - `cta.heading`, `cta.buttonText`, `cta.link` (the end screen call to action, shown on win and game over)
   - `storageKey` (use a new value per client so saved best scores and photos do not mix)
3. Commit and push. It is live at `https://<user>.github.io/<repo>/acme-runner/`.
4. Make a QR code for that URL (see `scripts/` in the AR template, or any QR generator).

Every key in `config.js` is optional. Anything you leave out uses the default.

## Controls

- Phone: tap anywhere to jump (hold for a higher jump), or use the JUMP button. In Manual mode use the left and right buttons. Auto-run mode runs for you.
- Desktop: Left/Right or A/D to move, Space, Up or W to jump (hold for higher), M to mute, P or Esc to pause.

## Photo head

"Add your face" opens the camera (selfie) or the gallery, then crops the photo to a circle (drag and zoom, or Auto center).
The face is stored at a high resolution (256 to 512 pixels, based on the screen) and drawn large and sharp, with a clean outline, so it is easy to recognize while you play. A small face badge also appears in the HUD.
The photo is read on the device only. A Content Security Policy in `index.html` blocks all network requests from the page (`connect-src 'none'`),
so the game cannot upload it. "Remember on this phone" saves a compressed copy in localStorage. "Remove photo" deletes it.

## Files

- `index.html`, `style.css`: page and menus
- `config.js`: branding (edit this)
- `game.js`: the game (sprites, level, physics, WebAudio sounds, photo crop)

All art, music and sound effects are original and generated in code. No third-party characters, sprites or audio.

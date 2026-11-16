/* ==========================================================================
   BEACH RUNNER (sponsored, modern edition) - config
   Swap in any local business by editing this file. Nothing else needs to change.
   Every key is optional: anything you leave out falls back to the default.
   ========================================================================== */
window.GAME_CONFIG = {
  gameTitle: "Beach Runner",
  tagline: "Run the Panama City boardwalk at golden hour.",

  // The sponsor business. It appears as a storefront, a van, billboards and banners
  // in the background, on the in-level signs, and on the start and end screens.
  sponsor: {
    name: "Haid Electric",
    signTop: "HAID",            // big word on the sign (keep it short)
    signBar: "ELECTRIC",        // word in the dark bar under it
    city: "PANAMA CITY - FL",   // small line on the sign
    phone: "(850) 832-8397",    // shown on the shop awning and the van
    slogan: "We give you the power",
    poweredBy: "Powered by Haid Electric",
    // Sign and scene colors. Any CSS hex color.
    colors: {
      board: "#23272e",   // sign board and building color
      text: "#ffffff",    // sign lettering
      accent: "#ffe600",  // lightning, awning, glow
      accent2: "#4cc9f0"  // electric blue for the rare pickup
    },
    // Switch scene pieces on or off.
    scene: { storefront: true, van: true, billboards: true, banners: true, powerLines: true }
  },

  // Player and menu colors.
  colors: {
    shirt: "#4a525e",
    shorts: "#2d3b5c",
    hat: "#ffe600",
    button: "#ffe600",
    buttonText: "#1b1f27",
    panel: "#12161d",
    panelText: "#f4f6fa",
    accent: "#ffe600"
  },

  // Golden-hour sky from top to horizon (any number of stops).
  skyColors: ["#1c2452", "#3b3a7c", "#7a4a8f", "#c8607f", "#f0836a", "#ffb067", "#ffd58a"],

  // The two pickups. "common" is everywhere, "rare" is harder to reach.
  collectibles: {
    common: { name: "Bolt", plural: "Bolts", points: 10 },
    rare: { name: "Mega Bolt", plural: "Mega Bolts", points: 50 }
  },

  // Main call to action on the win and game over screens. A tel: link opens the phone dialer.
  cta: {
    heading: "Need an electrician in Panama City?",
    buttonText: "Call Haid Electric",
    link: "tel:+18508328397"
  },

  // Small "made by" link, shown under the main call to action.
  studio: {
    name: "Bellio Gulf Coast",
    heading: "Want a game like this for your business?",
    buttonText: "Get a game like this",
    link: "https://jbell003.github.io/bellio-gulf-coast/#contact"
  },

  // Visible on the start screen and in the page footer.
  disclaimer: "Sample demo by Bellio Gulf Coast. Not an official Haid Electric game.",

  photoNote: "Your photo stays on your phone",

  // Saved settings are stored under this name. Change it per client.
  storageKey: "beachRunner.haid"
};

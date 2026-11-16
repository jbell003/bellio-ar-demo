/* ==========================================================================
   BEACH RUNNER (modern edition) - config
   Swap in any local business by editing this file. Nothing else needs to change.
   Every key is optional: anything you leave out falls back to the default.
   ========================================================================== */
window.GAME_CONFIG = {
  gameTitle: "Beach Runner",
  tagline: "Run the Panama City boardwalk at golden hour.",

  // The featured business. It appears as a storefront, a van, billboards and banners
  // in the background, on the in-level signs, and on the start screen.
  // For a client, put their name, colors and phone here.
  sponsor: {
    name: "Your Business Here",
    signTop: "YOUR BUSINESS",  // big word on the sign (keep it short)
    signBar: "HERE",           // word in the dark bar under it
    city: "GULF COAST - FL",   // small line on the sign
    phone: "",                 // shown on the shop awning and the van, if set
    slogan: "Your slogan here",
    poweredBy: "A demo by Bellio Gulf Coast",
    flagLetter: "B",
    // Sign and scene colors. Any CSS hex color.
    colors: {
      board: "#0B2545",   // sign board and building color
      text: "#ffffff",    // sign lettering
      accent: "#1BA3A3",  // awning, glow, highlights
      accent2: "#F4A261"  // warm accent for the rare pickup
    },
    // Switch scene pieces on or off.
    scene: { storefront: true, van: true, billboards: true, banners: true, powerLines: true }
  },

  // Player and menu colors.
  colors: {
    shirt: "#1BA3A3",
    shorts: "#0B2545",
    hat: "#F4A261",
    button: "#1BA3A3",
    buttonText: "#ffffff",
    panel: "#0B2545",
    panelText: "#F7F1E3",
    accent: "#1BA3A3"
  },

  // Golden-hour sky from top to horizon (any number of stops).
  skyColors: ["#1c2452", "#3b3a7c", "#7a4a8f", "#c8607f", "#f0836a", "#ffb067", "#ffd58a"],

  // The two pickups. "common" is everywhere, "rare" is harder to reach.
  collectibles: {
    common: { name: "Coin", plural: "Coins", points: 10 },
    rare: { name: "Seashell", plural: "Seashells", points: 50 }
  },

  // Main call to action on the win and game over screens.
  cta: {
    heading: "Want a game like this for your business?",
    buttonText: "Get a game like this",
    link: "https://belliogulfcoast.com/#contact"
  },

  // Small "made by" credit, shown under the main call to action.
  studio: {
    name: "Bellio Gulf Coast",
    heading: "",
    buttonText: "Bellio Gulf Coast",
    link: "https://belliogulfcoast.com/#contact"
  },

  // Visible on the start screen and in the page footer.
  disclaimer: "A sample demo by Bellio Gulf Coast. Your business could be in a game like this.",

  photoNote: "Your photo stays on your phone",

  // Saved settings are stored under this name. Change it per client.
  storageKey: "beachRunner.modern"
};

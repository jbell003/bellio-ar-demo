/* ==========================================================================
   BEACH RUNNER - branding config
   Edit this file to rebrand the game for a client. Nothing else needs to change.
   Every key is optional: anything you leave out falls back to the default.
   ========================================================================== */
window.GAME_CONFIG = {
  // Business name, shown on the start screen, on the in-level sign and on the end screens.
  businessName: "Bellio Gulf Coast",

  // Game title and tagline on the start screen.
  gameTitle: "Beach Runner",
  tagline: "Run the pier at sunset. Stomp crabs, grab shells, reach the flag.",

  // Optional logo shown on the start screen. A path or https URL to an image, or "" for none.
  // Example: "logo.png" (put the file in this folder).
  logo: "",

  // Text on the wooden sign near the start of the level, and the letter on the finish flag.
  signText: "BELLIO GULF COAST",
  flagLetter: "B",

  // Colors. Any CSS color works.
  colors: {
    shirt: "#ff6b4a",      // the player's shirt
    shorts: "#1fa3b5",     // the player's shorts
    hat: "#ffcf3a",        // the default character's hat
    button: "#ff8a3d",     // main button color
    buttonText: "#2b1a3a", // text on main buttons
    panel: "#2b1a3a",      // menu panel background
    panelText: "#fff4d6",  // menu text
    accent: "#ffcf3a"      // highlights
  },

  // Sunset sky, top to horizon (8 bands look best).
  skyColors: ["#1b1346", "#3a1b6b", "#6a2a86", "#a2368a", "#d94a7b", "#f2686b", "#fb8d5c", "#ffb55a"],

  // The two collectibles. "common" appears everywhere, "rare" is harder to reach.
  collectibles: {
    common: { name: "Coin", plural: "Coins", points: 10 },
    rare: { name: "Seashell", plural: "Seashells", points: 50 }
  },

  // End screen call to action (shown on both the win and game over screens).
  cta: {
    heading: "Want a game like this for your business?",
    buttonText: "Get a game like this",
    link: "https://jbell003.github.io/bellio-gulf-coast/#contact"
  },

  // Privacy note shown under the "Add your face" button.
  photoNote: "Your photo stays on your phone",

  // Saved settings are stored under this name. Change it per client so saves do not mix.
  storageKey: "beachRunner.bellio"
};

// frontend/src/data/mockupsRegistry.js
//
// Single source of truth for mockup image URLs.
// - Primary: Cloudinary
// - Fallback: /public/mockups/* (optional)
// Exports:
//   getMockupUrl({ slug, color, view }) -> Promise<string>  // HEAD-checks the URL
//   getPrimaryImage({ slug, color, view }) -> string        // fast, no network check
//   listColors(slug) -> string[]
//   resolveColor(slug, wantedColor) -> string | null
//   MOCKUPS_PLACEHOLDER
//
// Add more products by extending REGISTRY and COLOR_TO_FOLDER.
// ------------------------------------------------------------------

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

export const MOCKUPS_PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// helpers
const norm = (s) => String(s || "").trim().toLowerCase();
const keyify = (s) => norm(s).replace(/\s+/g, "-");

// supported display colors
const COLORS = [
  "black",
  "maroon",
  "red",
  "orange",
  "gold",
  "lime",
  "royal blue",
  "purple",
  "charcoal",
  "white",
  "military green",
  "forest green",
  "tropical blue",
  "azalea",
  "grey",
  "sport_grey",
  "ash",
  "brown savana",
  "brown savanna",
  "brown",
  "sand",
  "navy",
];

// mapping from display color -> folder name
const COLOR_TO_FOLDER = {
  black: "tee-black",
  maroon: "tee-maroon",
  red: "tee-red",
  orange: "tee-orange",
  gold: "tee-gold",
  lime: "tee-lime",
  "tropical blue": "tee-tropical-blue",
  royal: "tee-royal",
  "royal blue": "tee-royal",
  purple: "tee-purple",
  charcoal: "tee-charcoal",
  white: "tee-white",
  "military green": "tee-military-green",
  "forest green": "tee-forest-green",
  azalea: "tee-azalea",
  grey: "tee-grey",
  sport_grey: "tee-sport-grey",
  ash: "tee-ash",
  "brown savana": "tee-brown-savana",
  "brown savanna": "tee-brown-savana",
  brown: "tee-brown",
  sand: "tee-sand",
  navy: "tee-navy",
};

// product registry
const REGISTRY = {
  "classic-tee": {
    productType: "tshirt",
    colors: [
      "black",
      "maroon",
      "red",
      "orange",
      "gold",
      "lime",
      "tropical blue",
      "royal blue",
      "purple",
      "charcoal",
      "white",
    ],
  },
  // Add more products here as you upload mockups:
  // "premium-hoodie": { productType: "hoodie", colors: ["black","charcoal","white"] },
};

// ---------------- internal url builders ----------------

function buildCandidateUrls({ slug, color, view }) {
  const sKey = keyify(slug);
  const folderColor = COLOR_TO_FOLDER[norm(color)];
  if (!folderColor) return [MOCKUPS_PLACEHOLDER];

  const cloudinary = `${CLOUDINARY_BASE}/${sKey}/${folderColor}/${view}.png`;
  const fallback = `/mockups/${sKey}/${folderColor}/${view}.png`; // optional public fallback

  return [cloudinary, fallback];
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------- public API ----------------

export async function getMockupUrl({ slug, color, view = "front" }) {
  const candidates = buildCandidateUrls({ slug, color, view });
  for (const url of candidates) {
    if (await headOk(url)) return url;
  }
  return MOCKUPS_PLACEHOLDER;
}

// Fast, synchronous primary image (no HEAD check).
// Good for cards/thumbnails where a broken image is acceptable until Cloudinary finishes syncing.
export function getPrimaryImage({ slug, color, view = "front" }) {
  const candidates = buildCandidateUrls({ slug, color, view });
  return candidates[0] || MOCKUPS_PLACEHOLDER;
}

export function listColors(slug) {
  const key = norm(slug);
  return REGISTRY[key]?.colors || [];
}

export function resolveColor(slug, wantedColor) {
  const colors = listColors(slug).map(norm);
  if (!colors.length) return null;
  const w = norm(wantedColor);
  if (colors.includes(w)) return wantedColor;
  if (colors.includes("black")) return "black";
  return colors[0];
}

export function getProductType(slug) {
  const key = norm(slug);
  return REGISTRY[key]?.productType || "tshirt";
}

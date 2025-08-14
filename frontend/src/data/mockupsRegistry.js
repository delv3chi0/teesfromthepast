// frontend/src/data/mockupsRegistry.js
//
// Single source of truth for mockup image URLs and visual placements.
// Primary source: Cloudinary; Fallback: /public/mockups/* (optional).
//
// Exports:
//   getMockupUrl({ slug, color, view }) -> Promise<string>   // checks that a candidate exists
//   getPrimaryImage({ slug, color, view }) -> string         // fastest, no network check
//   listColors(slug) -> string[]
//   resolveColor(slug, wantedColor) -> string | null
//   getProductType(slug) -> "tshirt" | "hoodie" | ...
//   getPlacement({ slug, view, productType }) -> { x,y,w,h } // FRACTIONS of canvas (0–1)
//   MOCKUPS_PLACEHOLDER
//
// To add products: extend REGISTRY, COLOR_TO_FOLDER, and (if needed) PLACEMENTS.
// -----------------------------------------------------------------------------

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

export const MOCKUPS_PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

const norm = (s) => String(s || "").trim().toLowerCase();
const keyify = (s) => norm(s).replace(/\s+/g, "-");

// ---------- Color handling ----------

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

// ---------- Products registry ----------

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
    // Optional: if a product needs special placement different from generic tshirt
    // you can specify placements here; otherwise generic "tshirt" below is used.
  },

  // Example to add more:
  // "premium-hoodie": { productType: "hoodie", colors: ["black","charcoal","white"] },
};

// ---------- Visual placements (fractions of the canvas W/H) ----------
// Tuned to your current mockups so the chest box looks “right”.
// If a slug is provided (e.g., "classic-tee"), it wins; else use productType.

const PLACEMENTS = {
  // Generic tees (good default)
  tshirt: {
    front:  { x: 0.29, y: 0.23, w: 0.32, h: 0.42 },
    back:   { x: 0.29, y: 0.23, w: 0.32, h: 0.42 },
    left:   { x: 0.15, y: 0.40, w: 0.12, h: 0.14 },
    right:  { x: 0.73, y: 0.40, w: 0.12, h: 0.14 },
  },

  // You can specialize per product slug if the visuals differ
  "classic-tee": {
    front:  { x: 0.34, y: 0.24, w: 0.30, h: 0.40 }, // slightly tighter and a bit higher
    back:   { x: 0.34, y: 0.24, w: 0.30, h: 0.42 },
    left:   { x: 0.18, y: 0.41, w: 0.12, h: 0.14 },
    right:  { x: 0.70, y: 0.41, w: 0.12, h: 0.14 },
  },

  hoodie: {
    front:  { x: 0.34, y: 0.28, w: 0.28, h: 0.34 },
    back:   { x: 0.33, y: 0.25, w: 0.30, h: 0.40 },
  },

  tote: {
    front:  { x: 0.34, y: 0.26, w: 0.32, h: 0.38 },
    back:   { x: 0.34, y: 0.26, w: 0.32, h: 0.38 },
  },
};

// ---------- URL building ----------

function buildCandidateUrls({ slug, color, view }) {
  const sKey = keyify(slug);
  const folderColor = COLOR_TO_FOLDER[norm(color)];
  if (!folderColor) return [MOCKUPS_PLACEHOLDER];
  const cloudinary = `${CLOUDINARY_BASE}/${sKey}/${folderColor}/${view}.png`;
  const fallback = `/mockups/${sKey}/${folderColor}/${view}.png`;
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

// ---------- Public API ----------

export async function getMockupUrl({ slug, color, view = "front" }) {
  const candidates = buildCandidateUrls({ slug, color, view });
  for (const url of candidates) {
    if (await headOk(url)) return url;
  }
  return MOCKUPS_PLACEHOLDER;
}

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

export function getPlacement({ slug, view = "front", productType = "tshirt" }) {
  const sKey = keyify(slug);
  const v = view || "front";
  if (PLACEMENTS[sKey]?.[v]) return PLACEMENTS[sKey][v];
  if (PLACEMENTS[productType]?.[v]) return PLACEMENTS[productType][v];
  return { x: 0.34, y: 0.24, w: 0.30, h: 0.40 }; // safe default
}

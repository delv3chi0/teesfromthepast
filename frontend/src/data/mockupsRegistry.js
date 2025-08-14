// frontend/src/data/mockupsRegistry.js
//
// Single source of truth for mockup image URLs.
// - Primary: Cloudinary
// - Fallback: public/ folder
//
// API:
//   getMockupUrl({ slug, color, view }) -> Promise<string>
//   listColors(slug) -> string[]
//   resolveColor(slug, wantedColor) -> string | null
//   MOCKUPS_PLACEHOLDER: string
//
// Notes:
// - Add more products by copying the "classic-tee" shape.
// - Colors are normalized to simple lower-case keys (e.g. "royal blue" -> "royal blue").
//
// ------------------------------------------------------------------

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

export const MOCKUPS_PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Helpers
const norm = (s) => String(s || "").trim().toLowerCase();
const keyify = (s) => norm(s).replace(/\s+/g, "-");

// Friendly list of color names you show around the site
// (These keys are used by ProductStudio’s swatches.)
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

// Map a user-facing color name to folder color on disk
const COLOR_TO_FOLDER = {
  black: "tee-black",
  maroon: "tee-maroon",
  red: "tee-red",
  orange: "tee-orange",
  gold: "tee-gold",
  lime: "tee-lime",
  "tropical blue": "tee-tropical-blue",
  "royal": "tee-royal",
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

// ---------------------------
// Registry: product -> colors
// ---------------------------

const REGISTRY = {
  // Adjust or add products here.
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
  // Example you can add next:
  // "premium-hoodie": {
  //   productType: "hoodie",
  //   colors: ["black", "charcoal", "royal blue", "white"],
  // },
};

// -------------------------------------------
// URL builder (primary: Cloudinary, fallback)
// -------------------------------------------

function buildCandidateUrls({ slug, color, view }) {
  const folderColor = COLOR_TO_FOLDER[norm(color)];
  const sKey = keyify(slug);

  // Cloudinary first
  const cloudinary = folderColor
    ? `${CLOUDINARY_BASE}/${sKey}/${folderColor}/${view}.png`
    : null;

  // Public fallback
  const fallback = folderColor
    ? `/mockups/${sKey}/${folderColor}/${view}.png`
    : null;

  const arr = [];
  if (cloudinary) arr.push(cloudinary);
  if (fallback) arr.push(fallback);
  return arr.length ? arr : [MOCKUPS_PLACEHOLDER];
}

async function tryUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return url;
  } catch (_) {}
  return null;
}

export async function getMockupUrl({ slug, color, view = "front" }) {
  const candidates = buildCandidateUrls({ slug, color, view });
  for (const url of candidates) {
    // Fabric will also try loading, but this speeds up choosing a working one
    const good = await tryUrl(url);
    if (good) return good;
  }
  return MOCKUPS_PLACEHOLDER;
}

// Return all colors supported for a given slug (from this registry)
export function listColors(slug) {
  const key = norm(slug);
  return REGISTRY[key]?.colors || [];
}

// Pick a valid color for a product, falling back smartly
export function resolveColor(slug, wantedColor) {
  const colors = listColors(slug).map(norm);
  if (!colors.length) return null;
  const w = norm(wantedColor);
  if (colors.includes(w)) return wantedColor;
  // prefer black if present, else first
  if (colors.includes("black")) return "black";
  return colors[0];
}

// Give product type for placement rules if needed elsewhere
export function getProductType(slug) {
  const key = norm(slug);
  return REGISTRY[key]?.productType || "tshirt";
}

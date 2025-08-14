// frontend/src/data/mockupsRegistry.js
// Central source of truth for mockup URLs + print-area placements.

export const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

// ---------- Color folder mapping (Cloudinary folder names) ----------
const COLOR_TO_FOLDER = {
  black: "tee-black",
  maroon: "tee-maroon",
  red: "tee-red",
  royal: "tee-royal",
  "royal blue": "tee-royal",
  purple: "tee-purple",
  charcoal: "tee-charcoal",
  navy: "tee-navy",
  white: "tee-white",
  "tropical blue": "tee-tropical-blue",
  "military green": "tee-military-green",
  "forest green": "tee-forest-green",
  lime: "tee-lime",
  gold: "tee-gold",
  orange: "tee-orange",
  azalea: "tee-azalea",
  "brown savanna": "tee-brown-savanna",
  "brown savana": "tee-brown-savanna",
  sand: "tee-sand",
  ash: "tee-ash",
  sport_grey: "tee-sport-grey",
  grey: "tee-grey",
};

// Build a candidate list of URLs (Cloudinary png/webp → public png/webp)
function makeUrlCandidates(slug, folder, view) {
  const base = `${CLOUDINARY_BASE}/${slug}/${folder}/${view}`;
  const pub  = `/mockups/${slug}/${folder}/${view}`;
  return [
    `${base}.png`,
    `${base}.webp`,
    `${pub}.png`,
    `${pub}.webp`,
  ];
}

// Helper to build the images map for a product from its color list
function buildImages(slug, colors) {
  const out = {};
  colors.forEach((c) => {
    const key = normalize(c);
    const folder = COLOR_TO_FOLDER[key];
    if (!folder) return;
    out[key] = {
      front: makeUrlCandidates(slug, folder, "front"),
      back:  makeUrlCandidates(slug, folder, "back"),
      left:  makeUrlCandidates(slug, folder, "left"),
      right: makeUrlCandidates(slug, folder, "right"),
    };
  });
  return out;
}

const normalize = (s) =>
  String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// ---------------- Registry ----------------
const REGISTRY = {
  "classic-tee": {
    productType: "tshirt",
    colors: [
      "black","maroon","red","royal","purple","charcoal","navy","white",
      "tropical blue","military green","forest green","lime","gold","orange",
      "azalea","brown savanna","sand","ash","sport_grey","grey",
    ],
    images: {}, // filled below
  },

  // Add more products here as you upload their mockups:
  // "pullover-hoodie": { productType: "hoodie", colors: [...], images: {...} },
};

// build image maps from colors → folder names
Object.keys(REGISTRY).forEach((slug) => {
  const p = REGISTRY[slug];
  p.images = buildImages(slug, p.colors || []);
});

// --------------- Default placements by productType ----------------
// Fractional {x,y,w,h} in the mockup image *after* scaling.
// These are tuned to your mockups. Back mirrors Front for tees.
const PLACEMENTS = {
  tshirt: {
    front: { x: 0.305, y: 0.245, w: 0.390, h: 0.500 },
    back:  { x: 0.305, y: 0.245, w: 0.390, h: 0.500 },
    left:  { x: 0.260, y: 0.430, w: 0.140, h: 0.180 }, // viewer's left sleeve
    right: { x: 0.600, y: 0.430, w: 0.140, h: 0.180 }, // viewer's right sleeve
  },
  hoodie: {
    front: { x: 0.305, y: 0.270, w: 0.360, h: 0.440 },
    back:  { x: 0.305, y: 0.250, w: 0.380, h: 0.480 },
  },
  tote: {
    front: { x: 0.305, y: 0.220, w: 0.420, h: 0.520 },
    back:  { x: 0.305, y: 0.220, w: 0.420, h: 0.520 },
  },
  hat:   { front: { x: 0.400, y: 0.400, w: 0.200, h: 0.120 } },
  beanie:{ front: { x: 0.400, y: 0.430, w: 0.220, h: 0.120 } },
};

// Optional per-product overrides (leave empty unless a mockup’s framing is unique)
const OVERRIDES = {
  // "some-tee-slug": { front: {x:..}, back: {...}, left: {...}, right: {...} }
};

// ---------------- Public API ----------------

export const MOCKUPS_PLACEHOLDER = "/mockups/placeholder.png";

export function listColors(slug) {
  const key = normalize(slug);
  return REGISTRY[key]?.colors?.map(normalize) || [];
}

export function getProductType(slug) {
  const key = normalize(slug);
  return REGISTRY[key]?.productType || "tshirt";
}

// Return an ordered list of URL candidates (we'll try them in order)
export function getMockupCandidates({ slug, color, view = "front" }) {
  const s = normalize(slug);
  const c = normalize(color);
  const v = String(view || "front");
  const images = REGISTRY[s]?.images?.[c]?.[v];
  return Array.isArray(images) && images.length ? images : [MOCKUPS_PLACEHOLDER];
}

// A single "best" URL (first candidate). Kept for backward compatibility.
export function getMockupUrl(opts) {
  const list = getMockupCandidates(opts);
  return list[0];
}

// A best-effort front image for product cards (black or first color)
export function getPrimaryImage(slug) {
  const colors = listColors(slug);
  const color = colors.includes("black") ? "black" : colors[0];
  const list = getMockupCandidates({ slug, color, view: "front" });
  return list[0] || MOCKUPS_PLACEHOLDER;
}

export function getPlacement({ slug, view = "front", productType }) {
  const s = normalize(slug);
  const v = String(view || "front");
  // product-specific override beats type default
  if (OVERRIDES[s]?.[v]) return OVERRIDES[s][v];
  const type = productType || getProductType(slug);
  if (PLACEMENTS[type]?.[v]) return PLACEMENTS[type][v];
  // last-resort safe default
  return { x: 0.34, y: 0.24, w: 0.38, h: 0.49 };
}

export function resolveColor(slug, preferred) {
  const colors = listColors(slug);
  if (!colors.length) return "";
  const want = normalize(preferred);
  return colors.includes(want) ? want : colors[0];
}

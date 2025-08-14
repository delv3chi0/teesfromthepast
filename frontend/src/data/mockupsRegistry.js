// Central registry: mockup URLs, color folders, and print-area placements.
// Pure JS (no JSX). Safe for Vite build.

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

export const PUBLIC_BASE = "/mockups";
export const MOCKUPS_PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// UI color → Cloudinary folder
const COLOR_TO_FOLDER = {
  black: "tee-black",
  white: "tee-white",
  maroon: "tee-maroon",
  red: "tee-red",
  royal: "tee-royal",
  "royal blue": "tee-royal",
  purple: "tee-purple",
  charcoal: "tee-charcoal",
  navy: "tee-navy",
  "military green": "tee-military-green",
  "forest green": "tee-forest-green",
  lime: "tee-lime",
  "tropical blue": "tee-tropical-blue",
  gold: "tee-gold",
  orange: "tee-orange",
  azalea: "tee-azalea",
  grey: "tee-grey",
  gray: "tee-grey",
  sport_grey: "tee-grey",
  sand: "tee-sand",
  ash: "tee-ash",
  brown: "tee-brown",
  "brown savana": "tee-brown",
  "brown savanna": "tee-brown",
};

const SWATCH_ORDER = [
  "black","maroon","red","royal","royal blue","purple","charcoal","navy",
  "military green","forest green","lime","tropical blue","gold","orange",
  "azalea","brown","sand","ash","sport_grey","grey","white",
];

const norm = (s) => String(s || "").trim().toLowerCase();

// ---------- PRODUCT REGISTRY ----------
const REGISTRY = {
  "classic-tee": {
    productType: "tshirt",
    colors: SWATCH_ORDER,
    makeUrl(colorFolder, view, ext = "png") {
      return `${CLOUDINARY_BASE}/classic-tee/${colorFolder}/${view}.${ext}`;
    },
    makePublic(colorFolder, view, ext = "png") {
      return `${PUBLIC_BASE}/classic-tee/${colorFolder}/${view}.${ext}`;
    },
  },
};

// ---------- PLACEMENT TUNING ----------
const RATIO_TSHIRT_FULL = 16 / 12; // 12×16 chest
const RATIO_SLEEVE = 3.5 / 4;      // ~4" wide × 3.5" tall

// Tuned for your current classic-tee mockups
const PLACEMENTS = {
  "classic-tee": {
    front: { cx: 0.5, top: 0.295, w: 0.285, ratio: RATIO_TSHIRT_FULL },
    back:  { cx: 0.5, top: 0.295, w: 0.285, ratio: RATIO_TSHIRT_FULL },
    left:  { left: 0.31, top: 0.47, w: 0.15, ratio: RATIO_SLEEVE },
    right: { left: 0.54, top: 0.47, w: 0.15, ratio: RATIO_SLEEVE },
  },
};

// Fallbacks per product type (if a slug isn’t in PLACEMENTS)
const TYPE_DEFAULTS = {
  tshirt: {
    front: { cx: 0.5, top: 0.30, w: 0.29, ratio: RATIO_TSHIRT_FULL },
    back:  { cx: 0.5, top: 0.30, w: 0.29, ratio: RATIO_TSHIRT_FULL },
    left:  { left: 0.31, top: 0.47, w: 0.15, ratio: RATIO_SLEEVE },
    right: { left: 0.54, top: 0.47, w: 0.15, ratio: RATIO_SLEEVE },
  },
};

// ---------- EXPORTS ----------
export function getProductType(slug) {
  const key = norm(slug);
  return REGISTRY[key]?.productType || "tshirt";
}

export function listColors(slug) {
  const key = norm(slug);
  const arr = REGISTRY[key]?.colors || SWATCH_ORDER;
  return Array.from(new Set(arr.map(norm)));
}

export function resolveColor(slug, color) {
  const want = norm(color);
  const opts = listColors(slug);
  if (opts.includes(want)) return want;
  if (opts.includes("black")) return "black";
  return opts[0] || "black";
}

// Return ordered candidates: cloudinary (.webp, .png, .jpg), then public, color→black
export function getMockupCandidates({ slug, color, view = "front" }) {
  const key = norm(slug || "");
  const product = REGISTRY[key];
  const chosen = COLOR_TO_FOLDER[norm(color)] || COLOR_TO_FOLDER.black;
  const black = COLOR_TO_FOLDER.black;

  if (!product) return [MOCKUPS_PLACEHOLDER];

  const exts = ["webp", "png", "jpg"];
  const urls = [];

  // color first
  exts.forEach((ext) => urls.push(product.makeUrl(chosen, view, ext)));
  exts.forEach((ext) => urls.push(product.makePublic(chosen, view, ext)));

  // fallback to black
  exts.forEach((ext) => urls.push(product.makeUrl(black, view, ext)));
  exts.forEach((ext) => urls.push(product.makePublic(black, view, ext)));

  urls.push(MOCKUPS_PLACEHOLDER);
  return urls;
}

// For cards/details (first candidate; UI will still show image even if Cloudinary
// color is missing, because ProductCard <Image> will render whatever resolves)
export function getPrimaryImage(product) {
  if (!product) return MOCKUPS_PLACEHOLDER;
  const slug = norm(product.slug || product.name || "");
  const color = resolveColor(slug, "black");
  const candidates = getMockupCandidates({ slug, color, view: "front" });
  return candidates[0] || MOCKUPS_PLACEHOLDER;
}

// Compute final px rect from placement fractions
export function getPlacementRect({ slug, view = "front", productType = "tshirt", bgBox }) {
  const key = norm(slug);
  const type = productType || getProductType(slug);

  const entry =
    (PLACEMENTS[key] && PLACEMENTS[key][view]) ||
    (TYPE_DEFAULTS[type] && TYPE_DEFAULTS[type][view]) ||
    TYPE_DEFAULTS.tshirt.front;

  const wFrac = entry.w ?? 0.29;
  const ratio = entry.ratio ?? RATIO_TSHIRT_FULL;

  const pxW = bgBox.width * wFrac;
  const pxH = pxW * ratio;

  let leftFrac;
  if (typeof entry.left === "number") {
    leftFrac = entry.left;
  } else if (typeof entry.cx === "number") {
    leftFrac = entry.cx - wFrac / 2;
  } else {
    leftFrac = 0.5 - wFrac / 2;
  }

  let topFrac;
  if (typeof entry.top === "number") {
    topFrac = entry.top;
  } else if (typeof entry.cy === "number") {
    const hFrac = pxH / bgBox.height;
    topFrac = entry.cy - hFrac / 2;
  } else {
    topFrac = 0.30;
  }

  return {
    left: bgBox.left + bgBox.width * leftFrac,
    top:  bgBox.top  + bgBox.height * topFrac,
    width: pxW,
    height: pxH,
  };
}

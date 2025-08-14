// frontend/src/data/mockupsRegistry.js
//
// Central registry for mockup image locations + helpers.
// - Primary source: Cloudinary
// - Fallbacks: local public assets
//
// Exports used by the app:
//   getMockupUrl({ slug, color, view })
//   resolveColor(slug, desiredColor)
//   listColors(slug)
//   getPrimaryImage(product)   // for ProductCard compatibility
//   MOCKUPS_PLACEHOLDER
//
// Notes:
// - `slug` is the product slug used in your public/mockups/<slug>/... structure
// - `color` keys need to match folder names below (normalize via toKey)

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

// Normalize helpers
const toKey = (c) =>
  String(c || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const MOCKUPS_PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

/**
 * Registry structure:
 *  slug: {
 *    colors: ["black", ...],
 *    // folder names for each color (default to same as key if omitted)
 *    colorFolder: { "royal": "royal-blue", ... }
 *    views: ["front","back","left","right"],
 *    // build url(path) given colorKey + view
 *  }
 */
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
      "military green",
      "forest green",
      "tropical blue",
      "royal",
      "royal blue",
      "purple",
      "pink",
      "azalea",
      "charcoal",
      "grey",
      "white",
    ],
    colorFolder: {
      "royal": "royal",
      "royal blue": "royal-blue",
      "tropical blue": "tropical-blue",
      "military green": "military-green",
    },
    views: ["front", "back", "left", "right"],
  },
};

// If a slug isn’t explicitly registered, fall back to this shape
const DEFAULT_DEF = {
  productType: "tshirt",
  colors: ["black", "white"],
  colorFolder: {},
  views: ["front", "back"],
};

// Map a slug to its config
const cfg = (slug) => REGISTRY[slug] || DEFAULT_DEF;

// Folder name used on Cloudinary/public for a specific color
const folderForColor = (slug, color) => {
  const c = toKey(color);
  const map = cfg(slug).colorFolder || {};
  return (map[c] || c).replace(/\s+/g, "-");
};

// Build candidates list from cloudinary + local fallback
const buildCandidates = ({ slug, color, view }) => {
  const colorFolder = folderForColor(slug, color);
  return [
    `${CLOUDINARY_BASE}/${slug}/tee-${colorFolder}/${view}.png`,
    `/mockups/${slug}/tee-${colorFolder}/${view}.png`,
  ];
};

export async function getMockupUrl({ slug, color = "black", view = "front" }) {
  slug = String(slug || "").trim().toLowerCase();
  const cands = buildCandidates({ slug, color, view });

  // Try sequentially; return the first one that loads (HEAD-ish using Image)
  for (const url of cands) {
    const ok = await new Promise((resolve) => {
      const i = new Image();
      i.onload = () => resolve(true);
      i.onerror = () => resolve(false);
      i.src = url;
    });
    if (ok) return url;
  }
  return MOCKUPS_PLACEHOLDER;
}

export function listColors(slug) {
  slug = String(slug || "").trim().toLowerCase();
  return (cfg(slug).colors || []).map(toKey);
}

export function resolveColor(slug, desired = "black") {
  const colors = listColors(slug);
  const want = toKey(desired);
  if (colors.includes(want)) return want;
  if (colors.includes("black")) return "black";
  return colors[0] || "black";
}

/**
 * ProductCard compatibility:
 * Returns a best-effort "primary" image (front/black) from the registry,
 * falling back to product.images or variant media provided by the backend.
 */
export function getPrimaryImage(product) {
  const slug =
    (product?.slug || product?.name || "product").toString().toLowerCase().replace(/\s+/g, "-");
  const color = resolveColor(slug, "black");
  const fromRegistry = `${CLOUDINARY_BASE}/${slug}/tee-${folderForColor(slug, color)}/front.png`;

  const candidates = [
    fromRegistry,
    product?.images?.find?.((i) => i.isPrimary)?.url,
    Array.isArray(product?.images) && typeof product.images[0] === "string"
      ? product.images[0]
      : product?.images?.[0]?.url,
    product?.variants?.[0]?.image,
    product?.variants?.[0]?.imageSet?.[0]?.url,
    product?.image,
    MOCKUPS_PLACEHOLDER,
  ].filter(Boolean);

  return candidates[0];
}

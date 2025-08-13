// Single source of truth for mockup image locations.
// - Cloudinary is tried first
// - Then public /mockups fallback
// - Finally a placeholder
//
// How to add a product or color:
// 1) Add a slug key under REGISTRY (e.g., "classic-tee").
// 2) Add colors; for each color, list available views and an ARRAY of URLs (best first).
// 3) That's it. Anything not found falls back to PLACEHOLDER.

const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Optional base to avoid repeating long prefixes
const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

// ------------- PRODUCT REGISTRY -------------
// Keep keys lowercase; views are: front, back, left, right (or whatever you have)
const REGISTRY = {
  "classic-tee": {
    // color keys should be lowercase; you can alias later in COLOR_ALIASES
    black: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-black/front.png`,
        "/mockups/classic-tee/tee-black/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-black/back.png`,
        "/mockups/classic-tee/tee-black/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-black/left.png`,
        "/mockups/classic-tee/tee-black/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-black/right.png`,
        "/mockups/classic-tee/tee-black/right.png",
      ],
    },
    "brown savana": {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-brown-savana/front.png`,
        "/mockups/classic-tee/tee-brown-savana/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-brown-savana/back.png`,
        "/mockups/classic-tee/tee-brown-savana/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-brown-savana/left.png`,
        "/mockups/classic-tee/tee-brown-savana/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-brown-savana/right.png`,
        "/mockups/classic-tee/tee-brown-savana/right.png",
      ],
    },
    charcoal: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-charcoal/front.png`,
        "/mockups/classic-tee/tee-charcoal/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-charcoal/back.png`,
        "/mockups/classic-tee/tee-charcoal/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-charcoal/left.png`,
        "/mockups/classic-tee/tee-charcoal/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-charcoal/right.png`,
        "/mockups/classic-tee/tee-charcoal/right.png",
      ],
    },
    lime: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-lime/front.png`,
        "/mockups/classic-tee/tee-lime/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-lime/back.png`,
        "/mockups/classic-tee/tee-lime/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-lime/left.png`,
        "/mockups/classic-tee/tee-lime/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-lime/right.png`,
        "/mockups/classic-tee/tee-lime/right.png",
      ],
    },
    maroon: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-maroon/front.png`,
        "/mockups/classic-tee/tee-maroon/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-maroon/back.png`,
        "/mockups/classic-tee/tee-maroon/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-maroon/left.png`,
        "/mockups/classic-tee/tee-maroon/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-maroon/right.png`,
        "/mockups/classic-tee/tee-maroon/right.png",
      ],
    },
    "military green": {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-military-green/front.png`,
        "/mockups/classic-tee/tee-military-green/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-military-green/back.png`,
        "/mockups/classic-tee/tee-military-green/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-military-green/left.png`,
        "/mockups/classic-tee/tee-military-green/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-military-green/right.png`,
        "/mockups/classic-tee/tee-military-green/right.png",
      ],
    },
    orange: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-orange/front.png`,
        "/mockups/classic-tee/tee-orange/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-orange/back.png`,
        "/mockups/classic-tee/tee-orange/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-orange/left.png`,
        "/mockups/classic-tee/tee-orange/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-orange/right.png`,
        "/mockups/classic-tee/tee-orange/right.png",
      ],
    },
    purple: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-purple/front.png`,
        "/mockups/classic-tee/tee-purple/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-purple/back.png`,
        "/mockups/classic-tee/tee-purple/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-purple/left.png`,
        "/mockups/classic-tee/tee-purple/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-purple/right.png`,
        "/mockups/classic-tee/tee-purple/right.png",
      ],
    },
    red: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-red/front.png`,
        "/mockups/classic-tee/tee-red/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-red/back.png`,
        "/mockups/classic-tee/tee-red/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-red/left.png`,
        "/mockups/classic-tee/tee-red/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-red/right.png`,
        "/mockups/classic-tee/tee-red/right.png",
      ],
    },
    royal: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-royal/front.png`,
        "/mockups/classic-tee/tee-royal/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-royal/back.png`,
        "/mockups/classic-tee/tee-royal/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-royal/left.png`,
        "/mockups/classic-tee/tee-royal/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-royal/right.png`,
        "/mockups/classic-tee/tee-royal/right.png",
      ],
    },
    "tropical blue": {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-tropical-blue/front.png`,
        "/mockups/classic-tee/tee-tropical-blue/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-tropical-blue/back.png`,
        "/mockups/classic-tee/tee-tropical-blue/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-tropical-blue/left.png`,
        "/mockups/classic-tee/tee-tropical-blue/left.png",
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-tropical-blue/right.png`,
        "/mockups/classic-tee/tee-tropical-blue/right.png`,
      ],
    },
    white: {
      front: [
        `${CLOUDINARY_BASE}/classic-tee/tee-white/front.png`,
        "/mockups/classic-tee/tee-white/front.png",
      ],
      back: [
        `${CLOUDINARY_BASE}/classic-tee/tee-white/back.png`,
        "/mockups/classic-tee/tee-white/back.png",
      ],
      left: [
        `${CLOUDINARY_BASE}/classic-tee/tee-white/left.png`,
        "/mockups/classic-tee/tee-white/left.png`,
      ],
      right: [
        `${CLOUDINARY_BASE}/classic-tee/tee-white/right.png`,
        "/mockups/classic-tee/tee-white/right.png`,
      ],
    },
  },
};

// Optional aliases to normalize ui color names → registry color
const COLOR_ALIASES = {
  "royal blue": "royal",
  "brown savanna": "brown savana",
};

// ------------- HELPERS -------------

const toKey = (s) => String(s || "").trim().toLowerCase();

export function resolveColor(productSlug, color) {
  const slug = toKey(productSlug);
  const c = toKey(color);
  const map = REGISTRY[slug] || {};
  if (map[c]) return c;
  if (COLOR_ALIASES[c] && map[COLOR_ALIASES[c]]) return COLOR_ALIASES[c];
  // no match → pick first available color
  return Object.keys(map)[0];
}

export function listColors(productSlug) {
  const slug = toKey(productSlug);
  return Object.keys(REGISTRY[slug] || {});
}

function probe(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(url);
    im.onerror = () => reject(new Error("404"));
    im.src = url;
  });
}

async function firstOk(urls = []) {
  for (const u of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await probe(u);
    } catch {}
  }
  return null;
}

// Main API: ask for the best URL (Cloudinary-first, then fallbacks)
export async function getMockupUrl({ slug, color, view = "front" }) {
  const s = toKey(slug);
  const v = toKey(view);
  const c = resolveColor(s, color);

  const urls =
    REGISTRY[s]?.[c]?.[v] ||
    REGISTRY[s]?.[c]?.front ||
    [];

  const ok = await firstOk(urls);
  return ok || PLACEHOLDER;
}

// Convenience for product cards (e.g., always front of first color unless a color is provided)
export async function getPrimaryImage({ slug, color }) {
  const s = toKey(slug);
  const c = color ? resolveColor(s, color) : listColors(s)[0];
  return getMockupUrl({ slug: s, color: c, view: "front" });
}

// Export raw registry in case you want to inspect or generate UI from it
export const MOCKUPS_REGISTRY = REGISTRY;
export const MOCKUPS_PLACEHOLDER = PLACEHOLDER;

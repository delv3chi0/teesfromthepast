// Single source of truth for mockup image locations.
// Cloudinary first, /public/mockups fallback, then placeholder.

const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dqvsdvjis/image/upload/mockups";

// ---------------- Registry ----------------
// Keys are lowercase product slugs.
// Colors are lowercase UI names (use COLOR_ALIASES if your UI uses a synonym).
// Views: front, back, left, right.
const REGISTRY = {
  "classic-tee": {
    black: byColor("classic-tee/tee-black"),
    "brown savana": byColor("classic-tee/tee-brown-savana"),
    charcoal: byColor("classic-tee/tee-charcoal"),
    lime: byColor("classic-tee/tee-lime"),
    maroon: byColor("classic-tee/tee-maroon"),
    "military green": byColor("classic-tee/tee-military-green"),
    orange: byColor("classic-tee/tee-orange"),
    purple: byColor("classic-tee/tee-purple"),
    red: byColor("classic-tee/tee-red"),
    royal: byColor("classic-tee/tee-royal"),
    "tropical blue": byColor("classic-tee/tee-tropical-blue"),
    white: byColor("classic-tee/tee-white"),
  },
};

// If your UI uses a different label, map it here:
const COLOR_ALIASES = {
  "royal blue": "royal",
  "brown savanna": "brown savana",
};

function byColor(pathPrefix) {
  // returns {front: [urls...], back: [...], left: [...], right: [...]}
  return {
    front: [
      `${CLOUDINARY_BASE}/${pathPrefix}/front.png`,
      `/mockups/${pathPrefix}/front.png`,
    ],
    back: [
      `${CLOUDINARY_BASE}/${pathPrefix}/back.png`,
      `/mockups/${pathPrefix}/back.png`,
    ],
    left: [
      `${CLOUDINARY_BASE}/${pathPrefix}/left.png`,
      `/mockups/${pathPrefix}/left.png`,
    ],
    right: [
      `${CLOUDINARY_BASE}/${pathPrefix}/right.png`,
      `/mockups/${pathPrefix}/right.png`,
    ],
  };
}

const toKey = (s) => String(s || "").trim().toLowerCase();

// Pick the best color key that exists in the registry for this product.
export function resolveColor(productSlug, color) {
  const slug = toKey(productSlug);
  const want = toKey(color);
  const map = REGISTRY[slug] || {};
  if (map[want]) return want;
  if (COLOR_ALIASES[want] && map[COLOR_ALIASES[want]]) return COLOR_ALIASES[want];
  return Object.keys(map)[0] || null;
}

export function listColors(productSlug) {
  const slug = toKey(productSlug);
  return Object.keys(REGISTRY[slug] || {});
}

// Try each URL until one loads.
function probe(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("not-found"));
    img.src = url;
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

// Public API for components
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

export async function getPrimaryImage({ slug, color }) {
  const s = toKey(slug);
  const c = color ? resolveColor(s, color) : listColors(s)[0];
  return getMockupUrl({ slug: s, color: c, view: "front" });
}

export const MOCKUPS_REGISTRY = REGISTRY;
export const MOCKUPS_PLACEHOLDER = PLACEHOLDER;

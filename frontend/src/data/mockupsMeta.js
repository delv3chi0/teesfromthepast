// frontend/src/data/mockupsMeta.js
// Per-product (slug) and per-view visual calibration for ProductStudio.
// Values are percentages of the canvas height (for size) and pixels (for offsets).
//
// HOW IT WORKS
// - mockupHeightPct: how tall the garment mockup appears vs canvas height (0.60–0.98 typical)
// - areaHeightPct:   how tall the printable area appears vs canvas height (0.30–0.70 typical)
// - offsetX / offsetY: fine nudges (px) to align the print area over the mockup
// - mockupOpacity:   0.2–1, useful for tracing/alignment during calibration
//
// Add an entry per product slug (use the slug from /product/:slug).
// You can put shared defaults in `_all` and override per `front`/`back`/`sleeve`, etc.

export const CALIBRATION = {
  // Example for your classic tee product page at /product/classic-tee
  "classic-tee": {
    _all: {
      mockupHeightPct: 0.86,
      areaHeightPct: 0.46,
      offsetX: 0,
      offsetY: -6,
      mockupOpacity: 1,
    },
    front: { areaHeightPct: 0.46, offsetY: -4 },
    back:  { areaHeightPct: 0.46, offsetY: -6 },
    sleeve:{ areaHeightPct: 0.28, offsetY: 0 },
  },

  // Example hoodie (adjust or remove if you don’t use this slug)
  "hoodie": {
    _all: {
      mockupHeightPct: 0.88,
      areaHeightPct: 0.42,
      offsetX: 0,
      offsetY: -10,
      mockupOpacity: 1,
    },
    front: { areaHeightPct: 0.42, offsetY: -12 },
    back:  { areaHeightPct: 0.46, offsetY: -8 },
  },

  // Add more products below using their slugs:
  // "premium-tote": { _all: { mockupHeightPct: 0.88, areaHeightPct: 0.52, offsetX: 0, offsetY: -4, mockupOpacity: 1 } },
};

// If a slug/view isn’t listed here, ProductStudio falls back to sensible defaults.

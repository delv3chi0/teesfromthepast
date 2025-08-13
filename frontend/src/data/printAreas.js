// frontend/src/data/printAreas.js
//
// Print area configuration per product *type* and view.
// All values are RELATIVE (0..1) so they scale correctly with any mockup size.
// top/left are the position of the print-area rectangle's TOP-LEFT corner
// within the mockup image bounds, expressed as a fraction of mockup width/height.
// width/height are also fractions of mockup width/height.

const AREAS = {
  tshirt: {
    // Typical 12x16" on a 1:1 mockup box
    front:  { top: 0.22, left: 0.28, width: 0.44, height: 0.52 },
    back:   { top: 0.22, left: 0.28, width: 0.44, height: 0.52 },
    sleeve: { top: 0.37, left: 0.63, width: 0.18, height: 0.14 }, // right sleeve
  },
  hoodie: {
    // Square-ish chest for front, full rectangle for back
    front: { top: 0.26, left: 0.32, width: 0.36, height: 0.36 },
    back:  { top: 0.20, left: 0.27, width: 0.46, height: 0.54 },
  },
  tote: {
    front: { top: 0.30, left: 0.25, width: 0.50, height: 0.55 },
    back:  { top: 0.30, left: 0.25, width: 0.50, height: 0.55 },
  },
  hat: {
    front: { top: 0.40, left: 0.38, width: 0.24, height: 0.10 },
  },
  beanie: {
    front: { top: 0.48, left: 0.34, width: 0.32, height: 0.12 },
  },
};

// Physical print sizes (used for export DPI target)
export const PRINT_SIZE_IN = {
  tshirt: { front: { w: 12, h: 16 }, back: { w: 12, h: 16 }, sleeve: { w: 4, h: 3.5 } },
  hoodie: { front: { w: 13, h: 13 }, back: { w: 12, h: 16 } },
  tote:   { front: { w: 14, h: 16 }, back: { w: 14, h: 16 } },
  hat:    { front: { w: 4,  h: 1.75 } },
  beanie: { front: { w: 5,  h: 1.75 } },
};

export default AREAS;

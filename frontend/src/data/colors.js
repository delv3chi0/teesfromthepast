export const PRINTFUL_COLOR_HEX = {
  Black: "#111111",
  White: "#FFFFFF",
  Maroon: "#6B1E22",
  Purple: "#6B3FA0",
  Red: "#C81E1E",
  Royal: "#1E3AAE",
  Charcoal: "#4A4A4A",
  "Military Green": "#4A5A43",
  Orange: "#F97316",
  "Tropical Blue": "#1EA3D8",
  "Brown Savana": "#6A4B36",
  Azalea: "#FF6EA4",
  Gold: "#F0B500",
  Lime: "#B7E445",
  Navy: "#1F2A44",
  "Forest Green": "#254D28",
  Heather: "#777777",
};

export const colorToSlug = (name = "") =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

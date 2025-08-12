// frontend/src/data/colorPalette.js
export const COLOR_HEX = {
  black: "#111111",
  white: "#ffffff",
  maroon: "#6a1b1a",
  red: "#cc2b2b",
  royal: "#2b4bcc",
  charcoal: "#414141",
  "military green": "#4b5d3a",
  "forest green": "#224a25",
  orange: "#f28c28",
  purple: "#6a3ab2",
  "tropical blue": "#2b8ccc",
  "brown savana": "#6b4b2a",
  lime: "#8bc34a",
  navy: "#0e1f41",
  gold: "#d4af37",
  gray: "#777777",
};

export function nameToHex(name) {
  if (!name) return "#999";
  const key = String(name).toLowerCase().trim();
  return COLOR_HEX[key] || "#999";
}

// frontend/src/utils/mockupUrl.js
// Utility to generate Cloudinary mockup URLs with optimizations

const CLOUDINARY_BASE = "https://res.cloudinary.com/dqvsdvjis/image/upload";

/**
 * Generate optimized mockup URL for product/color/view combination
 * @param {string} productSlug - Product identifier (e.g. 'classic-tee')
 * @param {string} colorSlug - Color identifier (e.g. 'black', 'royal')  
 * @param {string} view - View identifier (e.g. 'front', 'back')
 * @returns {string} Cloudinary URL with f_auto,q_auto optimizations
 */
export function getMockupUrl(productSlug, colorSlug, view) {
  if (!productSlug || !colorSlug || !view) {
    return null;
  }

  // Normalize parameters
  const normalizedProduct = String(productSlug).toLowerCase().trim();
  const normalizedColor = String(colorSlug).toLowerCase().trim();
  const normalizedView = String(view).toLowerCase().trim();

  // Build path: mockups/{product}/{color}/{view}
  const path = `mockups/${normalizedProduct}/${normalizedColor}/${normalizedView}`;
  
  // Add Cloudinary optimizations: auto format and quality
  const transformations = "f_auto,q_auto";
  
  return `${CLOUDINARY_BASE}/${transformations}/${path}`;
}
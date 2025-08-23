// frontend/src/utils/cloudinary.js
export const isCloudinary = (url) => {
  if (!url || typeof url !== "string") return false;
  try {
    return new URL(url).hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
};

const transform = (url, t) => url.replace("/upload/", `/upload/${t}/`);

export const cld = {
  // small cards/grids
  thumb: (url, w = 400) =>
    !url ? "" : (isCloudinary(url) ? transform(url, `f_auto,q_auto:eco,w_${w}`) : url),
  // large preview modal
  preview: (url, w = 1200) =>
    !url ? "" : (isCloudinary(url) ? transform(url, `f_auto,q_auto:good,w_${w}`) : url),
  // just ensure auto format/quality without resizing
  auto: (url) =>
    !url ? "" : (isCloudinary(url) ? transform(url, "f_auto,q_auto") : url),
};

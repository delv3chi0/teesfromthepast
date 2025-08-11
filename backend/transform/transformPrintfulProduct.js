import { slugify } from "../utils/slugify.js";
import { pickPrintfulImage } from "../utils/pickPrintfulImage.js";

export function transformPrintfulProduct(sync_product = {}, sync_variants = []) {
  const slug = slugify(sync_product?.name || `product-${sync_product?.id || ""}`);
  const colors = new Set();
  const sizes  = new Set();
  let minPrice = Infinity;
  let maxPrice = 0;
  let primary  = null;

  const variants = (Array.isArray(sync_variants) ? sync_variants : []).map(v => {
    const files = Array.isArray(v?.files) ? v.files : [];
    const image = pickPrintfulImage(files);

    if (!primary && image) primary = image;
    if (v?.color) colors.add(v.color);
    if (v?.size)  sizes.add(v.size);

    const priceNum = Number(v?.retail_price ?? v?.price ?? 0);
    if (!Number.isNaN(priceNum) && priceNum > 0) {
      minPrice = Math.min(minPrice, priceNum);
      maxPrice = Math.max(maxPrice, priceNum);
    }

    return {
      variantId: v?.id,
      sku: v?.sku || null,
      color: v?.color || null,
      size:  v?.size  || null,
      price: priceNum || 0,
      image,
      files
    };
  });

  return {
    id: String(sync_product?.id ?? ""),
    externalId: sync_product?.external_id ?? null,
    slug,
    name: sync_product?.name ?? "Untitled Product",
    description: sync_product?.description ?? "",
    image: primary,
    priceMin: isFinite(minPrice) ? minPrice : 0,
    priceMax: isFinite(maxPrice) ? maxPrice : 0,
    colors: Array.from(colors),
    sizes:  Array.from(sizes),
    variants
  };
}

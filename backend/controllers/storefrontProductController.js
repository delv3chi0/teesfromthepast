import { getAllSyncProducts, getProductWithVariants } from "../services/printful.js";
import { transformPrintfulProduct } from "../transform/transformPrintfulProduct.js";
import { slugify } from "../utils/slugify.js";

/**
 * GET /storefront/shop-data
 * Returns { products: [...] } for Shop page
 */
export async function getShopData(_req, res, next) {
  try {
    const list = await getAllSyncProducts();
    const products = [];
    for (const item of list) {
      try {
        const full = await getProductWithVariants(item.id);
        const transformed = transformPrintfulProduct(full.sync_product, full.sync_variants);
        products.push(transformed);
      } catch (err) {
        console.error("[shop-data] Failed product", item?.id, err?.message);
      }
    }
    res.json({ products });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /storefront/product/:slug
 * Returns one transformed product for Product Detail page
 */
export async function getProductBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const list = await getAllSyncProducts();
    const match = list.find(p => slugify(p?.name) === slug);

    if (!match) return res.status(404).json({ error: "Not found" });

    const full = await getProductWithVariants(match.id);
    const transformed = transformPrintfulProduct(full.sync_product, full.sync_variants);
    res.json(transformed);
  } catch (e) {
    next(e);
  }
}

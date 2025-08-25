// ESM - uses Node 18+ global fetch
import crypto from "node:crypto";
import logger from "../utils/logger.js";

const TOKEN =
  process.env.PRINTFUL_TOKEN ||
  process.env.PRINTFUL_API_KEY || // supports your existing var name
  "";

const BASE = "https://api.printful.com";

if (!TOKEN) {
  logger.warn("printful.config_missing", { 
    hasToken: false,
    reason: "PRINTFUL_TOKEN or PRINTFUL_API_KEY missing from environment"
  });
}

const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCache(key) {
  const it = cache.get(key);
  if (!it) return null;
  if (Date.now() > it.expires) { cache.delete(key); return null; }
  return it.value;
}
function setCache(key, value) {
  cache.set(key, { value, expires: Date.now() + TTL_MS });
}

async function pf(path) {
  const key = crypto.createHash("sha1").update(path).digest("hex");
  const hit = getCache(key);
  if (hit) return hit;

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[printful] ${res.status} ${res.statusText} :: ${path} :: ${text}`);
  }
  const json = await res.json();
  setCache(key, json);
  return json;
}

export const getAllSyncProducts = async () => {
  const j = await pf("/store/products");
  const result = j?.result;
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  return [];
};

export const getProductWithVariants = async (id) => {
  const j = await pf(`/store/products/${id}`);
  return j?.result || {};
};

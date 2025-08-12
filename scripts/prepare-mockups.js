#!/usr/bin/env node
/**
 * Prepare mockups from a flat folder of files like:
 *   unisex-classic-tee-<color>-<view>-<anything>.png
 *
 * It will:
 *  1) Parse color + view
 *  2) Copy best candidate into: <outputRoot>/mockups/<productSlug>/<color>/<view>.png
 *  3) (optional --upload) Upload to Cloudinary into "mockups/<productSlug>/<color>/<view>"
 *  4) Generate a frontend mapping file (mockups.js) with URLs
 *
 * Usage:
 *   node scripts/prepare-mockups.js /path/to/shirts \
 *     --product classic-tee \
 *     --output ./frontend/public \
 *     --generate ./frontend/src/data/mockups.js \
 *     --upload
 *
 * Env (for --upload):
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 *   // OR:
 *   CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
 */

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith("--")) {
  console.error("ERROR: Please pass the input folder as the first argument.");
  process.exit(1);
}

const INPUT_DIR = path.resolve(args[0]);

// defaults
let PRODUCT_SLUG = "classic-tee";
let OUTPUT_ROOT = path.resolve("./frontend/public");
let GENERATE_FILE = path.resolve("./frontend/src/data/mockups.js");
let DO_UPLOAD = false;

for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === "--product") PRODUCT_SLUG = args[++i];
  else if (a === "--output") OUTPUT_ROOT = path.resolve(args[++i]);
  else if (a === "--generate") GENERATE_FILE = path.resolve(args[++i]);
  else if (a === "--upload") DO_UPLOAD = true;
}

const OUT_BASE = path.join(OUTPUT_ROOT, "mockups", PRODUCT_SLUG);

const cloudinaryConfigFromEnv = () => {
  // Prefer CLOUDINARY_URL if present
  if (process.env.CLOUDINARY_URL) return true;
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

let cloudinary = null;
if (DO_UPLOAD) {
  if (!cloudinaryConfigFromEnv()) {
    console.error(
      "ERROR: --upload used but Cloudinary env vars are missing.\n" +
      "Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET."
    );
    process.exit(1);
  }
  cloudinary = require("cloudinary").v2;
  if (process.env.CLOUDINARY_URL) cloudinary.config(true);
  else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const isPng = (f) => /\.png$/i.test(f);

// canonical views we want
const VIEWS = ["front", "back", "left", "right"];

// Pick "best" file for a given view from a candidate list
function pickBest(candidates, view) {
  if (!candidates || !candidates.length) return null;

  // Prefer exact view (e.g., "-left-"), avoid "-left-front-" if possible.
  const exact = candidates.filter((p) => {
    const base = path.basename(p).toLowerCase();
    const hasView = base.includes(`-${view}-`);
    if (view === "left") return hasView && !base.includes("-left-front-");
    if (view === "right") return hasView && !base.includes("-right-front-");
    // front/back: avoid "-left-" or "-right-" contaminations
    if (view === "front" || view === "back") {
      return hasView && !base.includes("-left-") && !base.includes("-right-");
    }
    return hasView;
  });

  const pool = exact.length ? exact : candidates;

  // Heuristic: prefer without "-2-" in name
  pool.sort((a, b) => {
    const an = path.basename(a).toLowerCase();
    const bn = path.basename(b).toLowerCase();
    const aHas2 = an.includes("-2-") ? 1 : 0;
    const bHas2 = bn.includes("-2-") ? 1 : 0;
    if (aHas2 !== bHas2) return aHas2 - bHas2; // prefer no "-2-"
    // fallback to lexicographic
    return an.localeCompare(bn);
  });

  return pool[0];
}

(async () => {
  // read all files
  const files = (await fsp.readdir(INPUT_DIR))
    .filter(isPng)
    .map((f) => path.join(INPUT_DIR, f));

  // Build map: colorSlug -> view -> [paths]
  const byColor = {};

  // Regex: unisex-<product>-<color>-<view>-<rest>.png
  const re = /^unisex-(?<product>.+?)-(?<color>.+?)-(?<view>front|back|left|right|left-front|right-front).*\.png$/i;

  for (const full of files) {
    const name = path.basename(full);
    const m = name.match(re);
    if (!m) continue;

    const rawColor = m.groups.color; // e.g., "brown-savana"
    let view = m.groups.view.toLowerCase(); // may be left-front/right-front
    if (view === "left-front") view = "left";
    if (view === "right-front") view = "right";

    const colorSlug = slugify(rawColor);
    byColor[colorSlug] = byColor[colorSlug] || {};
    byColor[colorSlug][view] = byColor[colorSlug][view] || [];
    byColor[colorSlug][view].push(full);
  }

  // Ensure output dirs exist
  await fsp.mkdir(OUT_BASE, { recursive: true });

  const resultMap = {}; // color -> view -> {localPath?, url?}
  for (const colorSlug of Object.keys(byColor)) {
    const colorDir = path.join(OUT_BASE, colorSlug);
    await fsp.mkdir(colorDir, { recursive: true });
    resultMap[colorSlug] = {};

    for (const view of VIEWS) {
      const chosen = pickBest(byColor[colorSlug][view] || [], view);
      if (!chosen) continue;

      const dest = path.join(colorDir, `${view}.png`);
      await fsp.copyFile(chosen, dest);

      let urlOrPath = `/mockups/${PRODUCT_SLUG}/${colorSlug}/${view}.png`; // default local path (served from /public)
      if (DO_UPLOAD) {
        const publicId = `mockups/${PRODUCT_SLUG}/${colorSlug}/${view}`;
        try {
          const res = await cloudinary.uploader.upload(dest, {
            public_id: publicId,
            overwrite: true,
            resource_type: "image",
            folder: `mockups/${PRODUCT_SLUG}/${colorSlug}`,
            use_filename: false,
            unique_filename: false,
          });
          urlOrPath = res.secure_url;
          // eslint-disable-next-line no-console
          console.log(`Uploaded: ${publicId} -> ${res.secure_url}`);
        } catch (err) {
          console.error("Cloudinary upload failed:", publicId, err?.message);
        }
      }

      resultMap[colorSlug][view] = urlOrPath;
    }
  }

  // Generate mockups.js
  const lines = [];
  lines.push("// AUTO-GENERATED by scripts/prepare-mockups.js");
  lines.push("// Edit by hand if needed.");
  lines.push("");
  lines.push("export const MOCKUPS = {");
  lines.push(`  "${PRODUCT_SLUG}": {`);

  for (const colorSlug of Object.keys(resultMap).sort()) {
    lines.push(`    "${colorSlug}": {`);
    for (const view of VIEWS) {
      if (resultMap[colorSlug][view]) {
        lines.push(
          `      ${view}: "${resultMap[colorSlug][view]}",`
        );
      }
    }
    lines.push("    },");
  }

  lines.push("  },");
  lines.push("};");
  lines.push("");

  await fsp.mkdir(path.dirname(GENERATE_FILE), { recursive: true });
  await fsp.writeFile(GENERATE_FILE, lines.join("\n"), "utf8");

  console.log("\nGenerated mapping:", GENERATE_FILE);
  console.log("Done.");
})();

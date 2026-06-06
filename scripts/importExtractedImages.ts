/**
 * Import per-machine reference photos from manually-extracted catalog images
 * (dev-only). The PDFs were exploded into `gym pics/Matrix/*.png` (named
 * `Strength-Brochure-2021_Page_<P>_Image_<N>.png`). On a 2-machine page,
 * Image_0001 = left, Image_0002 = right; 3-up pages are left→right.
 *
 * These are PRIVATE / LOCAL reference assets (see public/catalog/matrix/LICENSE.txt);
 * a real gym photo always takes priority in the app. The `gym pics/` source folder is
 * gitignored — only the optimized webp in public/catalog/matrix/ are committed.
 *
 * Usage:
 *   npm i -D sharp
 *   node --experimental-strip-types scripts/importExtractedImages.ts
 */
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error dev-only dep, not in package.json
import sharp from "sharp";

const MATRIX = path.resolve("gym pics/Matrix");
const BG = path.resolve("gym pics/background people");
const OUT_CAT = path.resolve("public/catalog/matrix");
const OUT_IMG = path.resolve("public/img");

// machineId -> extracted basename (matches lib/catalog.ts CATALOG_PAGES)
const MACHINES: [string, string][] = [
  ["matrix-versa-chest-press", "Page_024_Image_0001"],
  ["matrix-versa-pec-fly", "Page_025_Image_0001"],
  ["matrix-magnum-shoulder-press", "Page_025_Image_0002"],
  ["matrix-versa-lat-row", "Page_026_Image_0001"],
  ["matrix-versa-diverging-row", "Page_026_Image_0002"],
  ["matrix-versa-bicep-curl", "Page_042_Image_0001"],
  ["matrix-versa-triceps-press", "Page_042_Image_0002"],
  ["matrix-versa-leg-press", "Page_044_Image_0001"],
  ["matrix-versa-leg-extension", "Page_044_Image_0002"],
  ["matrix-versa-seated-leg-curl", "Page_045_Image_0001"],
  ["matrix-magnum-glute-trainer", "Page_045_Image_0002"],
  ["matrix-versa-ft", "Page_055_Image_0001"],
  ["matrix-aura-ft-300", "Page_055_Image_0001"],
  ["matrix-aura-ft-400", "Page_055_Image_0001"],
  ["matrix-magnum-preacher-curl", "Page_102_Image_0002"],
  ["matrix-magnum-vkr-chin", "Page_102_Image_0003"],
  ["matrix-back-extension", "Page_104_Image_0001"],
  ["matrix-reverse-back-extension", "Page_104_Image_0002"],
];

async function main() {
  fs.mkdirSync(OUT_CAT, { recursive: true });
  fs.mkdirSync(OUT_IMG, { recursive: true });
  for (const [id, base] of MACHINES) {
    const src = path.join(MATRIX, `Strength-Brochure-2021_${base}.png`);
    if (!fs.existsSync(src)) { console.log("MISSING", id); continue; }
    await sharp(src).flatten({ background: "#ffffff" }).trim({ threshold: 12 }).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(OUT_CAT, `${id}.webp`));
    console.log(id);
  }
  const bg = path.join(BG, "Strength-Brochure-2021_Page_057_Image_0001.png");
  if (fs.existsSync(bg)) await sharp(bg).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(OUT_IMG, "bg-stretch.webp"));
  console.log("Done");
}
main();

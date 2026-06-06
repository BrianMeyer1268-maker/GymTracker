/**
 * Import per-machine reference photos from manually-extracted catalog images
 * (dev-only). PDFs were exploded into `gym pics/<brand>/*.png` (named
 * `<Catalog>_Page_<P>_Image_<N>.png`). Image order within a page is NOT reliable
 * (indices may skip and aren't reading-order) — each mapping below was verified by
 * eye against a montage of the page's images, so treat these basenames as exact.
 *
 * PRIVATE / LOCAL reference assets (see public/catalog/*/LICENSE.txt); a real gym
 * photo always wins in the app. Cardio isn't in the Matrix Strength brochure, so it
 * borrows the Life Fitness catalog as a visual stand-in. The `gym pics/` source
 * folder is gitignored — only the optimized webp under public/ are committed.
 *
 * Usage:  npm i -D sharp && node --experimental-strip-types scripts/importExtractedImages.ts
 */
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error dev-only dep, not in package.json
import sharp from "sharp";

const MATRIX = path.resolve("gym pics/Matrix");
const LF = path.resolve("gym pics/Life Ftiness");
const BG = path.resolve("gym pics/background people");
const OUT_M = path.resolve("public/catalog/matrix");
const OUT_L = path.resolve("public/catalog/lifefitness");
const OUT_IMG = path.resolve("public/img");

// machineId -> Matrix Strength Brochure 2021 extracted basename
const MATRIX_MAP: [string, string][] = [
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
  ["matrix-magnum-multi-bench", "Page_100_Image_0003"],
  ["matrix-magnum-preacher-curl", "Page_102_Image_0002"],
  ["matrix-magnum-vkr-chin", "Page_102_Image_0003"],
  ["matrix-back-extension", "Page_104_Image_0001"],
  ["matrix-magnum-incline-bench", "Page_110_Image_0002"],
  ["matrix-magnum-supine-bench", "Page_110_Image_0003"],
  ["matrix-magnum-seated-row", "Page_111_Image_0002"],
  ["matrix-magnum-leg-press", "Page_113_Image_0002"],
  ["matrix-magnum-hack-squat", "Page_113_Image_0003"],
  ["matrix-magnum-squat-lunge", "Page_113_Image_0005"],
  ["matrix-reverse-back-extension", "Page_114_Image_0005"],
  ["matrix-magnum-smith", "Page_132_Image_0001"],
  ["matrix-varsity-smith", "Page_132_Image_0001"],
  ["matrix-varsity-perfect-squat", "Page_132_Image_0002"],
];
// machineId -> Life Fitness Product Catalog 2021 (p11: 0001 elliptical, 0002 treadmill, 0003 upright, 0004 recumbent)
const LF_MAP: [string, string][] = [
  ["matrix-treadmill", "Page_11_Image_0002"],
  ["matrix-s-drive", "Page_11_Image_0002"],
  ["matrix-s-force", "Page_11_Image_0002"],
  ["matrix-elliptical", "Page_11_Image_0001"],
  ["matrix-upright-cycle", "Page_11_Image_0003"],
  ["matrix-cxc-cycle", "Page_11_Image_0003"],
  ["matrix-total-body-cycle", "Page_11_Image_0004"],
];

async function gen(dir: string, prefix: string, map: [string, string][], out: string) {
  fs.mkdirSync(out, { recursive: true });
  for (const [id, base] of map) {
    const src = path.join(dir, `${prefix}_${base}.png`);
    if (!fs.existsSync(src)) { console.log("MISSING", id); continue; }
    await sharp(src).flatten({ background: "#ffffff" }).trim({ threshold: 12 }).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(out, `${id}.webp`));
    console.log(id);
  }
}

async function main() {
  await gen(MATRIX, "Strength-Brochure-2021", MATRIX_MAP, OUT_M);
  await gen(LF, "Life-Fitness-Product-Catalog-2021", LF_MAP, OUT_L);
  const bg = path.join(BG, "Strength-Brochure-2021_Page_057_Image_0001.png");
  if (fs.existsSync(bg)) { fs.mkdirSync(OUT_IMG, { recursive: true }); await sharp(bg).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(OUT_IMG, "bg-stretch.webp")); }
  console.log("Done");
}
main();

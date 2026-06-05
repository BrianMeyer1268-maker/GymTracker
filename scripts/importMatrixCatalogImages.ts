/**
 * Matrix catalog image importer (dev-only).
 *
 * Crops per-machine reference images from the Matrix Strength Brochure 2021 PDF and
 * writes compact webp assets into public/catalog/matrix/<machineId>.webp. These are
 * PRIVATE / LOCAL reference assets — see public/catalog/matrix/LICENSE.txt. Real gym
 * photos always take priority over them in the app.
 *
 * Usage (deps are NOT in package.json — install them only to run this):
 *   npm i -D mupdf sharp
 *   put the PDF at docs/Strength-Brochure-2021.pdf  (gitignored — never committed)
 *   node --experimental-strip-types scripts/importMatrixCatalogImages.ts
 *
 * The pages here are the *physical* PDF pages (this brochure's page numbers happen to
 * match its printed page numbers, no offset). Each strength page is a 2-machine spread
 * (crop left/right); cable/bench pages are single/grid (use full). To add machines,
 * extend MAP after eyeballing the page.
 */
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error dev-only deps, not in package.json
import * as mupdf from "mupdf";
// @ts-expect-error dev-only deps, not in package.json
import sharp from "sharp";

const PDF = path.resolve("docs/Strength-Brochure-2021.pdf");
const OUT = path.resolve("public/catalog/matrix");
const SCALE = 2.0; // renders each page at ~1684x1191
const SOURCE = "matrix-strength-brochure-2021";

type Crop = "left" | "right" | "full";
// [seed machine id, page (1-indexed), crop]
const MAP: [string, number, Crop][] = [
  ["matrix-versa-chest-press", 24, "left"],
  ["matrix-versa-pec-fly", 25, "left"],
  ["matrix-magnum-shoulder-press", 25, "right"],
  ["matrix-versa-lat-row", 26, "left"],
  ["matrix-versa-diverging-row", 26, "right"],
  ["matrix-versa-bicep-curl", 42, "left"],
  ["matrix-versa-triceps-press", 42, "right"],
  ["matrix-versa-leg-press", 44, "left"],
  ["matrix-versa-leg-extension", 44, "right"],
  ["matrix-versa-seated-leg-curl", 45, "left"],
  ["matrix-magnum-glute-trainer", 45, "right"],
  ["matrix-versa-ft", 55, "full"],
  ["matrix-aura-ft-300", 55, "full"],
  ["matrix-aura-ft-400", 55, "full"],
  ["matrix-magnum-crossover", 77, "full"],
  ["matrix-magnum-flat-bench", 97, "full"],
  ["matrix-aura-incline-bench", 97, "full"],
];

const REGION = {
  left: { left: 20, top: 20, width: 800, height: 770 },
  right: { left: 864, top: 20, width: 800, height: 770 },
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const doc = mupdf.Document.openDocument(new Uint8Array(fs.readFileSync(PDF)), "application/pdf");
  const cache = new Map<number, Buffer>();
  const renderPage = (p: number): Buffer => {
    if (!cache.has(p)) {
      const pix = doc.loadPage(p - 1).toPixmap(mupdf.Matrix.scale(SCALE, SCALE), mupdf.ColorSpace.DeviceRGB, false);
      cache.set(p, Buffer.from(pix.asPNG()));
    }
    return cache.get(p)!;
  };

  for (const [id, page, crop] of MAP) {
    let img = sharp(renderPage(page));
    if (crop !== "full") img = img.extract(REGION[crop]);
    await img.resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, `${id}.webp`));
    console.log(`${id}  p${page}/${crop}`);
  }
  // The catalogPage mapping is mirrored in lib/catalog.ts (CATALOG_PAGES + catalogSource = "${SOURCE}").
  console.log(`Done: ${MAP.length} images -> ${OUT}`);
}
main();

import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(
  resolve(__dirname, "../src/assets/icon.svg"),
);
const projectRoot = resolve(__dirname, "..");

const targets = [
  { path: `${projectRoot}/public/icon-192.png`, size: 192 },
  { path: `${projectRoot}/public/icon-512.png`, size: 512 },
  { path: `${projectRoot}/app/apple-icon.png`, size: 180 },
  { path: `${projectRoot}/app/icon.png`, size: 32 },
];

for (const { path, size } of targets) {
  await sharp(svg, { density: Math.ceil((size / 512) * 72 * 4) })
    .resize(size, size)
    .png()
    .toFile(path);
  console.log(`Generated ${path} (${size}x${size})`);
}

console.log("Done!");

import sharp from "sharp";
import { createHash } from "crypto";

const MAGIC = 0xa5;
const PAYLOAD_BITS = 40; // 8-bit magic + 32-bit ID
const REDUNDANCY = 3;
const PIXELS_NEEDED = PAYLOAD_BITS * REDUNDANCY; // 120
const DELTA = 8;

const BLOCK_SIZE = 8;
const DCT_DELTA = 36;
const COEFF_U = 3;
const COEFF_V = 2;
const BLOCKS_NEEDED = PAYLOAD_BITS * REDUNDANCY; // 120

// Precomputed cosines for 8-point DCT: cosTable[k][n] = cos(π(2n+1)k / 16)
const cosTable: number[][] = Array.from({ length: BLOCK_SIZE }, (_, k) =>
  Array.from(
    { length: BLOCK_SIZE },
    (_, n) => Math.cos((Math.PI * (2 * n + 1) * k) / (2 * BLOCK_SIZE)),
  ),
);

const SUPPORTED_FORMATS = new Set(["jpeg", "png", "webp"]);

// --- Pure calculations ---

function buildPayload(downloadId: number): number[] {
  const bits: number[] = [];
  for (let i = 7; i >= 0; i--) bits.push((MAGIC >> i) & 1);
  for (let i = 31; i >= 0; i--) bits.push((downloadId >>> i) & 1);
  return bits;
}

function parsePayload(bits: number[]): { magic: number; downloadId: number } {
  let magic = 0;
  for (let i = 0; i < 8; i++) magic = (magic << 1) | bits[i];
  let downloadId = 0;
  for (let i = 8; i < 40; i++) downloadId = (downloadId << 1) | bits[i];
  return { magic, downloadId: downloadId >>> 0 };
}

function encodeQIM(value: number, bit: number): number {
  const base = Math.round(value / DELTA) * DELTA;
  const target = bit === 1 ? base + DELTA / 2 : base;
  return Math.max(0, Math.min(255, target));
}

function decodeQIM(value: number): number {
  const remainder = ((value % DELTA) + DELTA) % DELTA;
  // 0,1,6,7 → bit 0; 2,3,4,5 → bit 1
  return remainder >= 2 && remainder <= 5 ? 1 : 0;
}

// count must be << max for efficient sampling; callers verify min image size
function prngSequence(seed: string, count: number, max: number): number[] {
  if (max < count) throw new Error(`Image too small: need ${count} pixels, have ${max}`);
  const indices: number[] = [];
  const used = new Set<number>();
  let hash = seed;
  while (indices.length < count) {
    hash = createHash("sha256").update(hash).digest("hex");
    const value = parseInt(hash.slice(0, 8), 16) % max;
    if (!used.has(value)) {
      used.add(value);
      indices.push(value);
    }
  }
  return indices;
}

function embedPixelWatermark(
  pixels: Buffer,
  width: number,
  height: number,
  channels: number,
  downloadId: number,
  seed: string,
): void {
  const totalPixels = width * height;
  const indices = prngSequence(seed, PIXELS_NEEDED, totalPixels);
  const payload = buildPayload(downloadId);

  for (let copy = 0; copy < REDUNDANCY; copy++) {
    for (let bit = 0; bit < PAYLOAD_BITS; bit++) {
      const pixelIdx = indices[copy * PAYLOAD_BITS + bit];
      const byteOffset = pixelIdx * channels + 2; // blue channel
      pixels[byteOffset] = encodeQIM(pixels[byteOffset], payload[bit]);
    }
  }
}

function extractPixelWatermark(
  pixels: Buffer,
  width: number,
  height: number,
  channels: number,
  seed: string,
): number | null {
  const totalPixels = width * height;
  if (totalPixels < PIXELS_NEEDED) return null;

  const indices = prngSequence(seed, PIXELS_NEEDED, totalPixels);
  const votes = new Array(PAYLOAD_BITS).fill(0);

  for (let copy = 0; copy < REDUNDANCY; copy++) {
    for (let bit = 0; bit < PAYLOAD_BITS; bit++) {
      const pixelIdx = indices[copy * PAYLOAD_BITS + bit];
      const byteOffset = pixelIdx * channels + 2;
      votes[bit] += decodeQIM(pixels[byteOffset]);
    }
  }

  const bits = votes.map((v) => (v >= 2 ? 1 : 0));
  const { magic, downloadId } = parsePayload(bits);
  if (magic !== MAGIC) return null;
  return downloadId;
}

// --- DCT watermark calculations ---

function dct1d(input: number[]): number[] {
  const out = new Array(BLOCK_SIZE);
  for (let k = 0; k < BLOCK_SIZE; k++) {
    let sum = 0;
    for (let n = 0; n < BLOCK_SIZE; n++) {
      sum += input[n] * cosTable[k][n];
    }
    out[k] = sum * (k === 0 ? Math.SQRT1_2 : 1) * 0.5;
  }
  return out;
}

function idct1d(input: number[]): number[] {
  const out = new Array(BLOCK_SIZE);
  for (let n = 0; n < BLOCK_SIZE; n++) {
    let sum = 0;
    for (let k = 0; k < BLOCK_SIZE; k++) {
      sum += (k === 0 ? Math.SQRT1_2 : 1) * input[k] * cosTable[k][n];
    }
    out[n] = sum * 0.5;
  }
  return out;
}

function dct2d(block: number[][]): number[][] {
  // Rows
  const rowTransformed = block.map((row) => dct1d(row));
  // Columns
  const result = Array.from({ length: BLOCK_SIZE }, () =>
    new Array(BLOCK_SIZE),
  );
  for (let col = 0; col < BLOCK_SIZE; col++) {
    const column = rowTransformed.map((row) => row[col]);
    const transformed = dct1d(column);
    for (let row = 0; row < BLOCK_SIZE; row++) {
      result[row][col] = transformed[row];
    }
  }
  return result;
}

function idct2d(block: number[][]): number[][] {
  // Columns first
  const colTransformed = Array.from({ length: BLOCK_SIZE }, () =>
    new Array(BLOCK_SIZE),
  );
  for (let col = 0; col < BLOCK_SIZE; col++) {
    const column = block.map((row) => row[col]);
    const transformed = idct1d(column);
    for (let row = 0; row < BLOCK_SIZE; row++) {
      colTransformed[row][col] = transformed[row];
    }
  }
  // Then rows
  return colTransformed.map((row) => idct1d(row));
}

function encodeDCTCoeff(value: number, bit: number): number {
  const base = Math.round(value / DCT_DELTA) * DCT_DELTA;
  return bit === 1 ? base + DCT_DELTA / 2 : base;
}

function decodeDCTCoeff(value: number): number {
  const remainder = ((value % DCT_DELTA) + DCT_DELTA) % DCT_DELTA;
  return remainder >= DCT_DELTA / 4 && remainder < (3 * DCT_DELTA) / 4 ? 1 : 0;
}

function extractLuminanceBlock(
  pixels: Buffer,
  width: number,
  channels: number,
  blockX: number,
  blockY: number,
): number[][] {
  const block: number[][] = [];
  for (let row = 0; row < BLOCK_SIZE; row++) {
    block[row] = [];
    for (let col = 0; col < BLOCK_SIZE; col++) {
      const px = (blockY * BLOCK_SIZE + row) * width + blockX * BLOCK_SIZE + col;
      const off = px * channels;
      block[row][col] =
        0.299 * pixels[off] + 0.587 * pixels[off + 1] + 0.114 * pixels[off + 2];
    }
  }
  return block;
}

function applyBlockDelta(
  pixels: Buffer,
  width: number,
  channels: number,
  blockX: number,
  blockY: number,
  oldY: number[][],
  newY: number[][],
): void {
  for (let row = 0; row < BLOCK_SIZE; row++) {
    for (let col = 0; col < BLOCK_SIZE; col++) {
      const delta = newY[row][col] - oldY[row][col];
      const px = (blockY * BLOCK_SIZE + row) * width + blockX * BLOCK_SIZE + col;
      const off = px * channels;
      pixels[off] = Math.max(0, Math.min(255, Math.round(pixels[off] + delta)));
      pixels[off + 1] = Math.max(0, Math.min(255, Math.round(pixels[off + 1] + delta)));
      pixels[off + 2] = Math.max(0, Math.min(255, Math.round(pixels[off + 2] + delta)));
    }
  }
}

function embedDCTWatermark(
  pixels: Buffer,
  width: number,
  height: number,
  channels: number,
  downloadId: number,
  seed: string,
): void {
  const blocksX = Math.floor(width / BLOCK_SIZE);
  const blocksY = Math.floor(height / BLOCK_SIZE);
  const totalBlocks = blocksX * blocksY;
  if (totalBlocks < BLOCKS_NEEDED) {
    throw new Error(
      `Image too small for DCT watermark: need ${BLOCKS_NEEDED} blocks, have ${totalBlocks}`,
    );
  }
  const blockIndices = prngSequence(seed, BLOCKS_NEEDED, totalBlocks);
  const payload = buildPayload(downloadId);

  for (let copy = 0; copy < REDUNDANCY; copy++) {
    for (let bit = 0; bit < PAYLOAD_BITS; bit++) {
      const blockIdx = blockIndices[copy * PAYLOAD_BITS + bit];
      const blockX = blockIdx % blocksX;
      const blockY = Math.floor(blockIdx / blocksX);

      const lumBlock = extractLuminanceBlock(pixels, width, channels, blockX, blockY);
      const dctBlock = dct2d(lumBlock);
      dctBlock[COEFF_U][COEFF_V] = encodeDCTCoeff(dctBlock[COEFF_U][COEFF_V], payload[bit]);
      const newLum = idct2d(dctBlock);
      applyBlockDelta(pixels, width, channels, blockX, blockY, lumBlock, newLum);
    }
  }
}

function extractDCTWatermark(
  pixels: Buffer,
  width: number,
  height: number,
  channels: number,
  seed: string,
): number | null {
  const blocksX = Math.floor(width / BLOCK_SIZE);
  const blocksY = Math.floor(height / BLOCK_SIZE);
  const totalBlocks = blocksX * blocksY;
  if (totalBlocks < BLOCKS_NEEDED) return null;

  const blockIndices = prngSequence(seed, BLOCKS_NEEDED, totalBlocks);
  const votes = new Array(PAYLOAD_BITS).fill(0);

  for (let copy = 0; copy < REDUNDANCY; copy++) {
    for (let bit = 0; bit < PAYLOAD_BITS; bit++) {
      const blockIdx = blockIndices[copy * PAYLOAD_BITS + bit];
      const blockX = blockIdx % blocksX;
      const blockY = Math.floor(blockIdx / blocksX);

      const lumBlock = extractLuminanceBlock(pixels, width, channels, blockX, blockY);
      const dctBlock = dct2d(lumBlock);
      votes[bit] += decodeDCTCoeff(dctBlock[COEFF_U][COEFF_V]);
    }
  }

  const bits = votes.map((v) => (v >= 2 ? 1 : 0));
  const { magic, downloadId } = parsePayload(bits);
  if (magic !== MAGIC) return null;
  return downloadId;
}

// --- Public API (Sharp I/O) ---

function getSeed(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for watermarking");
  return createHash("sha256").update(`watermark:${secret}`).digest("hex");
}

function getDCTSeed(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for watermarking");
  return createHash("sha256").update(`watermark-dct:${secret}`).digest("hex");
}

export async function embedWatermark(
  imageBuffer: Buffer,
  downloadId: number,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (downloadId < 0 || downloadId > 0xffffffff) {
    throw new Error(`Download ID ${downloadId} exceeds 32-bit unsigned range`);
  }

  const seed = getSeed();
  const dctSeed = getDCTSeed();
  const inputMeta = await sharp(imageBuffer).metadata();
  const format = inputMeta.format ?? "jpeg";

  if (!SUPPORTED_FORMATS.has(format)) {
    throw new Error(`Unsupported format for watermarking: ${format}`);
  }

  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const blocksAvailable =
    Math.floor(width / BLOCK_SIZE) * Math.floor(height / BLOCK_SIZE);
  if (blocksAvailable < BLOCKS_NEEDED) {
    throw new Error(`Image too small for watermark: ${width}x${height}`);
  }

  // DCT first, then QIM pixel — order matters (see plan)
  embedDCTWatermark(data, width, height, channels, downloadId, dctSeed);
  embedPixelWatermark(data, width, height, channels, downloadId, seed);

  const tag = `glimpse:dl:${downloadId}`;
  const pipeline = sharp(data, {
    raw: { width, height, channels },
  }).withExifMerge({ IFD0: { ImageDescription: tag } });

  let result: Buffer;
  let contentType: string;
  switch (format) {
    case "png":
      result = await pipeline.png().toBuffer();
      contentType = "image/png";
      break;
    case "webp":
      result = await pipeline.webp({ quality: 98 }).toBuffer();
      contentType = "image/webp";
      break;
    default:
      result = await pipeline.jpeg({ quality: 98 }).toBuffer();
      contentType = "image/jpeg";
      break;
  }

  // Verify both watermarks survived encoding
  const verifyRaw = await sharp(result)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const extractedPixel = extractPixelWatermark(
    verifyRaw.data,
    verifyRaw.info.width,
    verifyRaw.info.height,
    verifyRaw.info.channels,
    seed,
  );
  if (extractedPixel !== downloadId) {
    throw new Error(
      `Pixel watermark verification failed: expected ${downloadId}, got ${extractedPixel}`,
    );
  }
  const extractedDCT = extractDCTWatermark(
    verifyRaw.data,
    verifyRaw.info.width,
    verifyRaw.info.height,
    verifyRaw.info.channels,
    dctSeed,
  );
  if (extractedDCT !== downloadId) {
    throw new Error(
      `DCT watermark verification failed: expected ${downloadId}, got ${extractedDCT}`,
    );
  }

  return { buffer: result, contentType };
}

export async function extractWatermark(
  imageBuffer: Buffer,
): Promise<{ downloadId: number; source: "exif" | "pixel" | "dct" } | null> {
  // Try EXIF first
  const metadata = await sharp(imageBuffer).metadata();
  if (metadata.exif) {
    const exifStr = metadata.exif.toString("binary");
    const match = exifStr.match(/glimpse:dl:(\d{1,10})/);
    if (match) {
      return { downloadId: parseInt(match[1], 10), source: "exif" };
    }
  }

  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Try QIM pixel extraction
  const seed = getSeed();
  const pixelId = extractPixelWatermark(
    data,
    info.width,
    info.height,
    info.channels,
    seed,
  );
  if (pixelId !== null) {
    return { downloadId: pixelId, source: "pixel" };
  }

  // Fall back to DCT extraction
  const dctSeed = getDCTSeed();
  const dctId = extractDCTWatermark(
    data,
    info.width,
    info.height,
    info.channels,
    dctSeed,
  );
  if (dctId !== null) {
    return { downloadId: dctId, source: "dct" };
  }

  return null;
}

import sharp from "sharp";
import { createHash } from "crypto";

const MAGIC = 0xa5;
const PAYLOAD_BITS = 40; // 8-bit magic + 32-bit ID
const REDUNDANCY = 3;
const PIXELS_NEEDED = PAYLOAD_BITS * REDUNDANCY; // 120
const DELTA = 8;

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

// --- Public API (Sharp I/O) ---

function getSeed(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for watermarking");
  return createHash("sha256").update(`watermark:${secret}`).digest("hex");
}

export async function embedWatermark(
  imageBuffer: Buffer,
  downloadId: number,
): Promise<Buffer> {
  const seed = getSeed();
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (width * height < PIXELS_NEEDED) {
    throw new Error(`Image too small for watermark: ${width}x${height}`);
  }

  embedPixelWatermark(data, width, height, channels, downloadId, seed);

  const tag = `glimpse:dl:${downloadId}`;

  const result = await sharp(data, { raw: { width, height, channels } })
    .withExifMerge({ IFD0: { ImageDescription: tag } })
    .jpeg({ quality: 98 })
    .toBuffer();

  // Verify watermark survived JPEG encode
  const verifyRaw = await sharp(result)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const extracted = extractPixelWatermark(
    verifyRaw.data,
    verifyRaw.info.width,
    verifyRaw.info.height,
    verifyRaw.info.channels,
    seed,
  );
  if (extracted !== downloadId) {
    throw new Error(
      `Watermark verification failed: expected ${downloadId}, got ${extracted}`,
    );
  }

  return result;
}

export async function extractWatermark(
  imageBuffer: Buffer,
): Promise<{ downloadId: number; source: "exif" | "pixel" } | null> {
  // Try EXIF first
  const metadata = await sharp(imageBuffer).metadata();
  if (metadata.exif) {
    const exifStr = metadata.exif.toString("binary");
    const match = exifStr.match(/glimpse:dl:(\d+)/);
    if (match) {
      return { downloadId: parseInt(match[1], 10), source: "exif" };
    }
  }

  // Fall back to pixel extraction
  const seed = getSeed();
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const downloadId = extractPixelWatermark(
    data,
    info.width,
    info.height,
    info.channels,
    seed,
  );
  if (downloadId !== null) {
    return { downloadId, source: "pixel" };
  }

  return null;
}

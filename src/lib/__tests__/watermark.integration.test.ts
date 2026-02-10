import { describe, it, expect, beforeAll, afterAll } from "vitest";
import sharp from "sharp";
import { embedWatermark, extractWatermark } from "../watermark";

// These tests need SESSION_SECRET for seed generation
let originalSecret: string | undefined;

beforeAll(() => {
  originalSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-secret-for-watermark-integration-tests";
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
});

async function createImage(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp",
  color = { r: 128, g: 100, b: 80 },
): Promise<Buffer> {
  const pipeline = sharp({
    create: { width, height, channels: 3, background: color },
  });
  switch (format) {
    case "png":
      return pipeline.png().toBuffer();
    case "webp":
      return pipeline.webp().toBuffer();
    default:
      return pipeline.jpeg({ quality: 95 }).toBuffer();
  }
}

describe("embedWatermark / extractWatermark integration", () => {
  it("roundtrips JPEG", async () => {
    const buf = await createImage(200, 200, "jpeg");
    const { buffer } = await embedWatermark(buf, 42);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(42);
    expect(result!.source).toBe("exif");
  });

  it("roundtrips PNG", async () => {
    const buf = await createImage(200, 200, "png");
    const { buffer } = await embedWatermark(buf, 42);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(42);
    expect(result!.source).toBe("exif");
  });

  it("roundtrips WebP", async () => {
    const buf = await createImage(200, 200, "webp");
    const { buffer } = await embedWatermark(buf, 42);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(42);
    expect(result!.source).toBe("exif");
  });

  it("falls back to pixel/dct when EXIF is stripped", async () => {
    const buf = await createImage(200, 200, "png");
    const { buffer } = await embedWatermark(buf, 99);
    // Strip EXIF by re-encoding raw pixels
    const raw = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const stripped = await sharp(raw.data, {
      raw: { width: raw.info.width, height: raw.info.height, channels: raw.info.channels },
    }).png().toBuffer();
    const result = await extractWatermark(stripped);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(99);
    expect(["pixel", "dct"]).toContain(result!.source);
  });

  it("extracts via DCT after lossy re-encode destroys QIM", async () => {
    // Quality 50 is aggressive enough to destroy QIM (DELTA=8) but
    // DCT_DELTA=36 is strong enough to survive this level of compression.
    // Use a noisy image — solid colors compress too aggressively
    const pixels = Buffer.alloc(200 * 200 * 3);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 37 + 73) & 0xff;
    const buf = await sharp(pixels, { raw: { width: 200, height: 200, channels: 3 } })
      .jpeg({ quality: 95 })
      .toBuffer();
    const { buffer } = await embedWatermark(buf, 77);
    // Strip EXIF and re-encode at moderate quality to destroy QIM but keep DCT
    const raw = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const degraded = await sharp(raw.data, {
      raw: { width: raw.info.width, height: raw.info.height, channels: raw.info.channels },
    }).jpeg({ quality: 50 }).toBuffer();
    const result = await extractWatermark(degraded);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(77);
    expect(result!.source).toBe("dct");
  });

  it("handles minimum-size image (88x88)", async () => {
    const buf = await createImage(88, 88, "png");
    const { buffer } = await embedWatermark(buf, 1);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(1);
  });

  it("rejects below-minimum image (87x87)", async () => {
    const buf = await createImage(87, 87, "png");
    await expect(embedWatermark(buf, 1)).rejects.toThrow("too small");
  });

  it("handles boundary image (96x80 = 120 blocks exact)", async () => {
    const buf = await createImage(96, 80, "png");
    const { buffer } = await embedWatermark(buf, 500);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(500);
  });

  it("handles thin image (960x8 = 120 blocks)", async () => {
    const buf = await createImage(960, 8, "png");
    const { buffer } = await embedWatermark(buf, 123);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(123);
  });

  it("handles max download ID (2^32 - 1)", async () => {
    const buf = await createImage(200, 200, "png");
    const { buffer } = await embedWatermark(buf, 4294967295);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(4294967295);
  });

  it("handles download ID = 1", async () => {
    const buf = await createImage(200, 200, "png");
    const { buffer } = await embedWatermark(buf, 1);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(1);
  });

  it("handles download ID = 0", async () => {
    const buf = await createImage(200, 200, "png");
    const { buffer } = await embedWatermark(buf, 0);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(0);
  });

  it("rejects out-of-range ID (2^32)", async () => {
    const buf = await createImage(200, 200, "png");
    await expect(embedWatermark(buf, 4294967296)).rejects.toThrow("exceeds 32-bit");
  });

  it("rejects negative ID", async () => {
    const buf = await createImage(200, 200, "png");
    await expect(embedWatermark(buf, -1)).rejects.toThrow("exceeds 32-bit");
  });

  it("handles all-white image", async () => {
    const buf = await createImage(200, 200, "png", { r: 255, g: 255, b: 255 });
    const { buffer } = await embedWatermark(buf, 10);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(10);
  });

  it("handles all-black image", async () => {
    const buf = await createImage(200, 200, "png", { r: 0, g: 0, b: 0 });
    const { buffer } = await embedWatermark(buf, 10);
    const result = await extractWatermark(buffer);
    expect(result).not.toBeNull();
    expect(result!.downloadId).toBe(10);
  });

  it("rejects unsupported format (GIF)", async () => {
    const buf = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 128, g: 128, b: 128 } },
    }).gif().toBuffer();
    await expect(embedWatermark(buf, 1)).rejects.toThrow("Unsupported format");
  });

  it("returns null for unwatermarked image", async () => {
    const buf = await createImage(200, 200, "jpeg");
    const result = await extractWatermark(buf);
    expect(result).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { _test } from "../watermark";

const {
  buildPayload,
  parsePayload,
  encodeQIM,
  decodeQIM,
  encodeDCTCoeff,
  decodeDCTCoeff,
  dct1d,
  idct1d,
  dct2d,
  idct2d,
  prngSequence,
  MAGIC,
  PAYLOAD_BITS,
  DELTA,
  DCT_DELTA,
} = _test;

// --- buildPayload / parsePayload ---

describe("buildPayload / parsePayload", () => {
  it("roundtrips zero ID", () => {
    const bits = buildPayload(0);
    expect(bits).toHaveLength(PAYLOAD_BITS);
    const { magic, downloadId } = parsePayload(bits);
    expect(magic).toBe(MAGIC);
    expect(downloadId).toBe(0);
  });

  it("roundtrips ID = 1", () => {
    const { magic, downloadId } = parsePayload(buildPayload(1));
    expect(magic).toBe(MAGIC);
    expect(downloadId).toBe(1);
  });

  it("roundtrips max signed 32-bit", () => {
    const { downloadId } = parsePayload(buildPayload(2147483647));
    expect(downloadId).toBe(2147483647);
  });

  it("roundtrips max unsigned 32-bit", () => {
    const { downloadId } = parsePayload(buildPayload(4294967295));
    expect(downloadId).toBe(4294967295);
  });

  it("roundtrips 2^31 (signed/unsigned boundary)", () => {
    const { downloadId } = parsePayload(buildPayload(2147483648));
    expect(downloadId).toBe(2147483648);
  });

  it("encodes magic prefix correctly", () => {
    const bits = buildPayload(0);
    const magicBits = bits.slice(0, 8);
    // 0xa5 = 10100101
    expect(magicBits).toEqual([1, 0, 1, 0, 0, 1, 0, 1]);
  });

  it("detects invalid magic", () => {
    const zeroBits = new Array(PAYLOAD_BITS).fill(0);
    const { magic } = parsePayload(zeroBits);
    expect(magic).not.toBe(MAGIC);
  });
});

// --- encodeQIM / decodeQIM ---

describe("encodeQIM / decodeQIM", () => {
  it("roundtrips typical value with bit 0", () => {
    expect(decodeQIM(encodeQIM(100, 0))).toBe(0);
  });

  it("roundtrips typical value with bit 1", () => {
    expect(decodeQIM(encodeQIM(100, 1))).toBe(1);
  });

  it("roundtrips all values for bit 0", () => {
    for (let v = 0; v <= 255; v++) {
      expect(decodeQIM(encodeQIM(v, 0))).toBe(0);
    }
  });

  it("roundtrips all values for bit 1 (including fixed 252-255)", () => {
    for (let v = 0; v <= 255; v++) {
      expect(decodeQIM(encodeQIM(v, 1))).toBe(1);
    }
  });

  it("decodes at decision boundaries", () => {
    expect(decodeQIM(1)).toBe(0);
    expect(decodeQIM(2)).toBe(1);
    expect(decodeQIM(5)).toBe(1);
    expect(decodeQIM(6)).toBe(0);
  });

  it("decodes wraparound correctly", () => {
    expect(decodeQIM(0)).toBe(0);
    expect(decodeQIM(7)).toBe(0);
  });

  it("tolerates ±1 perturbation from encoded value", () => {
    const encoded = encodeQIM(100, 0); // 104
    expect(decodeQIM(encoded + 1)).toBe(0);
    expect(decodeQIM(encoded - 1)).toBe(0);

    const encoded1 = encodeQIM(100, 1); // 108
    expect(decodeQIM(encoded1 + 1)).toBe(1);
    expect(decodeQIM(encoded1 - 1)).toBe(1);
  });

  it("clamps output to [0, 255]", () => {
    expect(encodeQIM(0, 0)).toBeGreaterThanOrEqual(0);
    expect(encodeQIM(255, 1)).toBeLessThanOrEqual(255);
  });
});

// --- encodeDCTCoeff / decodeDCTCoeff ---

describe("encodeDCTCoeff / decodeDCTCoeff", () => {
  it("roundtrips positive value with bit 0", () => {
    expect(decodeDCTCoeff(encodeDCTCoeff(100, 0))).toBe(0);
  });

  it("roundtrips positive value with bit 1", () => {
    expect(decodeDCTCoeff(encodeDCTCoeff(100, 1))).toBe(1);
  });

  it("roundtrips negative value with bit 0", () => {
    expect(decodeDCTCoeff(encodeDCTCoeff(-50, 0))).toBe(0);
  });

  it("roundtrips negative value with bit 1", () => {
    expect(decodeDCTCoeff(encodeDCTCoeff(-50, 1))).toBe(1);
  });

  it("roundtrips zero", () => {
    expect(decodeDCTCoeff(encodeDCTCoeff(0, 0))).toBe(0);
    expect(decodeDCTCoeff(encodeDCTCoeff(0, 1))).toBe(1);
  });

  it("roundtrips large value", () => {
    expect(decodeDCTCoeff(encodeDCTCoeff(1000, 1))).toBe(1);
  });

  it("tolerates ±8 perturbation", () => {
    const encoded0 = encodeDCTCoeff(100, 0);
    for (let d = -8; d <= 8; d++) {
      expect(decodeDCTCoeff(encoded0 + d)).toBe(0);
    }

    const encoded1 = encodeDCTCoeff(100, 1);
    for (let d = -8; d <= 8; d++) {
      expect(decodeDCTCoeff(encoded1 + d)).toBe(1);
    }
  });
});

// --- dct1d / idct1d ---

describe("dct1d / idct1d", () => {
  const TOLERANCE = 1e-10;

  it("roundtrips arbitrary signal", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = idct1d(dct1d(input));
    for (let i = 0; i < 8; i++) {
      expect(result[i]).toBeCloseTo(input[i], 8);
    }
  });

  it("produces DC-only output for constant signal", () => {
    const input = [5, 5, 5, 5, 5, 5, 5, 5];
    const dct = dct1d(input);
    expect(Math.abs(dct[0])).toBeGreaterThan(TOLERANCE);
    for (let k = 1; k < 8; k++) {
      expect(Math.abs(dct[k])).toBeLessThan(TOLERANCE);
    }
  });

  it("returns all zeros for zero input", () => {
    const dct = dct1d([0, 0, 0, 0, 0, 0, 0, 0]);
    for (let k = 0; k < 8; k++) {
      expect(Math.abs(dct[k])).toBeLessThan(TOLERANCE);
    }
  });

  it("preserves energy (Parseval)", () => {
    const input = [3, 1, 4, 1, 5, 9, 2, 6];
    const dct = dct1d(input);
    const inputEnergy = input.reduce((s, x) => s + x * x, 0);
    const dctEnergy = dct.reduce((s, x) => s + x * x, 0);
    expect(dctEnergy).toBeCloseTo(inputEnergy, 6);
  });
});

// --- dct2d / idct2d ---

describe("dct2d / idct2d", () => {
  it("roundtrips arbitrary 8x8 block", () => {
    const block = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => (r * 8 + c) * 3 + 10),
    );
    const result = idct2d(dct2d(block));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        expect(result[r][c]).toBeCloseTo(block[r][c], 6);
      }
    }
  });

  it("produces DC-only output for flat block", () => {
    const block = Array.from({ length: 8 }, () => new Array(8).fill(128));
    const dct = dct2d(block);
    expect(Math.abs(dct[0][0])).toBeGreaterThan(1);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (r === 0 && c === 0) continue;
        expect(Math.abs(dct[r][c])).toBeLessThan(1e-10);
      }
    }
  });

  it("preserves energy (2D Parseval)", () => {
    const block = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => Math.sin(r + c) * 100),
    );
    const dct = dct2d(block);
    const blockEnergy = block.flat().reduce((s, x) => s + x * x, 0);
    const dctEnergy = dct.flat().reduce((s, x) => s + x * x, 0);
    expect(dctEnergy).toBeCloseTo(blockEnergy, 4);
  });

  it("single coefficient change affects all pixels", () => {
    const block = Array.from({ length: 8 }, () => new Array(8).fill(128));
    const dct = dct2d(block);
    dct[3][2] += DCT_DELTA;
    const modified = idct2d(dct);
    let changed = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (Math.abs(modified[r][c] - 128) > 0.01) changed++;
      }
    }
    expect(changed).toBe(64);
  });
});

// --- prngSequence ---

describe("prngSequence", () => {
  it("returns correct count", () => {
    const result = prngSequence("seed", 120, 10000);
    expect(result).toHaveLength(120);
  });

  it("returns all unique values", () => {
    const result = prngSequence("seed", 120, 10000);
    expect(new Set(result).size).toBe(120);
  });

  it("is deterministic", () => {
    const a = prngSequence("test-seed", 120, 10000);
    const b = prngSequence("test-seed", 120, 10000);
    expect(a).toEqual(b);
  });

  it("differs with different seeds", () => {
    const a = prngSequence("seed-a", 120, 10000);
    const b = prngSequence("seed-b", 120, 10000);
    expect(a).not.toEqual(b);
  });

  it("keeps all values in range [0, max)", () => {
    const result = prngSequence("seed", 120, 200);
    for (const v of result) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(200);
    }
  });

  it("handles exact boundary (count === max)", () => {
    const result = prngSequence("seed", 120, 120);
    expect(result).toHaveLength(120);
    expect(new Set(result).size).toBe(120);
    // Must be a permutation of 0..119
    expect(result.sort((a, b) => a - b)).toEqual(
      Array.from({ length: 120 }, (_, i) => i),
    );
  });

  it("throws when max < count", () => {
    expect(() => prngSequence("seed", 120, 119)).toThrow("Image too small");
  });
});

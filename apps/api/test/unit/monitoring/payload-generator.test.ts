import { describe, expect, it } from 'vitest';
import {
  createSeededRng,
  generatePayload,
  randomPayloadSchema,
} from '../../../src/monitoring/payload-generator';

const NOW = new Date('2026-09-24T10:05:00.000Z');

describe('createSeededRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 1_000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic per seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });
});

describe('generatePayload', () => {
  it('always matches the payload schema', () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 500; i++) {
      const result = randomPayloadSchema.safeParse(generatePayload(rng, NOW));
      expect(result.success).toBe(true);
    }
  });

  it('is reproducible for the same seed and clock', () => {
    expect(generatePayload(createSeededRng(99), NOW)).toEqual(
      generatePayload(createSeededRng(99), NOW),
    );
  });

  it('varies between calls', () => {
    const rng = createSeededRng(5);
    const ids = new Set(Array.from({ length: 50 }, () => generatePayload(rng, NOW).requestId));
    expect(ids.size).toBe(50);
  });

  it('stamps the payload with the provided clock', () => {
    expect(generatePayload(createSeededRng(3), NOW).emittedAt).toBe(NOW.toISOString());
  });

  it('never repeats a tag within one payload', () => {
    const rng = createSeededRng(21);
    for (let i = 0; i < 200; i++) {
      const { tags } = generatePayload(rng, NOW);
      expect(new Set(tags).size).toBe(tags.length);
    }
  });

  it('includes optional sections only some of the time', () => {
    const rng = createSeededRng(11);
    const samples = Array.from({ length: 1_000 }, () => generatePayload(rng, NOW));
    const withNotes = samples.filter((payload) => payload.notes !== undefined).length;
    const withAttributes = samples.filter((payload) => payload.attributes !== undefined).length;
    expect(withNotes).toBeGreaterThan(200);
    expect(withNotes).toBeLessThan(400);
    expect(withAttributes).toBeGreaterThan(120);
    expect(withAttributes).toBeLessThan(280);
  });

  it('survives a JSON round trip unchanged', () => {
    const payload = generatePayload(createSeededRng(8), NOW);
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });

  it('works with the default Math.random source', () => {
    expect(randomPayloadSchema.safeParse(generatePayload()).success).toBe(true);
  });
});

import { z } from 'zod';

/** Uniform random number in [0, 1). Injected so tests are deterministic. */
export type Rng = () => number;

/** mulberry32: tiny, fast, good-enough PRNG for test fixtures (not for security). */
export function createSeededRng(seed: number): Rng {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// BizScout-flavoured vocabulary: small-business marketplace events.
const EVENTS = [
  'listing.viewed',
  'listing.saved',
  'offer.submitted',
  'message.sent',
  'valuation.requested',
] as const;
const ROLES = ['buyer', 'seller', 'broker'] as const;
const CATEGORIES = [
  'cafe',
  'laundromat',
  'bakery',
  'auto repair',
  'fitness studio',
  'food truck',
  'salon',
  'bookstore',
] as const;
const CITIES = [
  'Austin',
  'Denver',
  'Portland',
  'Nashville',
  'Raleigh',
  'Tampa',
  'Boise',
  'Columbus',
] as const;
const TAGS = [
  'seller-financing',
  'turnkey',
  'real-estate-included',
  'absentee-owner',
  'growing',
  'recession-resistant',
  'franchise',
  'high-margin',
] as const;
const NOTES = [
  'Owner retiring after 20 years',
  'Lease transferable',
  'Staff willing to stay',
  'Equipment recently upgraded',
  'Strong online reviews',
] as const;

const hexId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[0-9a-f]{8}$`));

export const randomPayloadSchema = z
  .object({
    requestId: hexId('req'),
    event: z.enum(EVENTS),
    emittedAt: z.string().datetime(),
    actor: z.object({ id: hexId('usr'), role: z.enum(ROLES) }),
    listing: z.object({
      id: hexId('lst'),
      category: z.enum(CATEGORIES),
      city: z.enum(CITIES),
      askingPrice: z.number().int().min(50_000).max(2_500_000),
      annualRevenue: z.number().int().min(100_000).max(5_000_000),
    }),
    metrics: z.object({
      views: z.number().int().min(0).max(5_000),
      saves: z.number().int().min(0).max(300),
      score: z.number().min(0).max(100),
    }),
    tags: z.array(z.enum(TAGS)).max(4),
    notes: z.enum(NOTES).optional(),
    attributes: z
      .object({
        employees: z.number().int().min(1).max(40),
        yearsInBusiness: z.number().int().min(1).max(50),
        hasLease: z.boolean(),
      })
      .optional(),
  })
  .strict();

export type RandomPayload = z.infer<typeof randomPayloadSchema>;

/**
 * Builds a random but realistic JSON body. Optional sections (notes ~30%, attributes ~20%) and a
 * variable tag count make payload size and shape vary, like real client traffic.
 */
export function generatePayload(rng: Rng = Math.random, now: Date = new Date()): RandomPayload {
  const int = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T;
  const id = (prefix: string): string =>
    `${prefix}_${int(0, 0xffffffff).toString(16).padStart(8, '0')}`;

  const payload: RandomPayload = {
    requestId: id('req'),
    event: pick(EVENTS),
    emittedAt: now.toISOString(),
    actor: { id: id('usr'), role: pick(ROLES) },
    listing: {
      id: id('lst'),
      category: pick(CATEGORIES),
      city: pick(CITIES),
      askingPrice: int(50, 2_500) * 1_000,
      annualRevenue: int(100, 5_000) * 1_000,
    },
    metrics: {
      views: int(0, 5_000),
      saves: int(0, 300),
      score: Math.round(rng() * 1_000) / 10,
    },
    tags: [...new Set(Array.from({ length: int(0, 4) }, () => pick(TAGS)))],
  };

  if (rng() < 0.3) payload.notes = pick(NOTES);
  if (rng() < 0.2) {
    payload.attributes = {
      employees: int(1, 40),
      yearsInBusiness: int(1, 50),
      hasLease: rng() < 0.5,
    };
  }
  return payload;
}

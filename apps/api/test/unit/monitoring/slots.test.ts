import { describe, expect, it } from 'vitest';
import { nextSlotAfter, slotStartFor } from '../../../src/monitoring/slots';

const FIVE_MIN = 300_000;

describe('slot math', () => {
  it('floors a time to the start of its slot', () => {
    expect(slotStartFor(new Date('2026-09-24T10:07:59.999Z'), FIVE_MIN)).toEqual(
      new Date('2026-09-24T10:05:00.000Z'),
    );
  });

  it('treats an exact boundary as the start of that slot', () => {
    expect(slotStartFor(new Date('2026-09-24T10:05:00.000Z'), FIVE_MIN)).toEqual(
      new Date('2026-09-24T10:05:00.000Z'),
    );
  });

  it('finds the next boundary strictly after a time', () => {
    expect(nextSlotAfter(new Date('2026-09-24T10:05:00.000Z'), FIVE_MIN)).toEqual(
      new Date('2026-09-24T10:10:00.000Z'),
    );
    expect(nextSlotAfter(new Date('2026-09-24T10:02:30.000Z'), FIVE_MIN)).toEqual(
      new Date('2026-09-24T10:05:00.000Z'),
    );
  });
});

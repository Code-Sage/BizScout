/** Start of the slot containing `at` (e.g. 10:07:59 -> 10:05:00 for 5-minute slots). */
export function slotStartFor(at: Date, intervalMs: number): Date {
  return new Date(Math.floor(at.getTime() / intervalMs) * intervalMs);
}

/** First slot boundary strictly after `at`. */
export function nextSlotAfter(at: Date, intervalMs: number): Date {
  return new Date((Math.floor(at.getTime() / intervalMs) + 1) * intervalMs);
}

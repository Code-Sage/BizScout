import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../src/events/event-bus';
import { createCapturingLogger, LOG_LEVEL } from '../../support/logger';

interface TestEvents {
  greeted: { name: string };
  other: number;
}

describe('EventBus', () => {
  it('delivers a payload to every subscriber of that event only', async () => {
    const { logger } = createCapturingLogger();
    const bus = new EventBus<TestEvents>(logger);
    const seen: string[] = [];
    bus.subscribe('greeted', ({ name }) => void seen.push(`a:${name}`));
    bus.subscribe('greeted', ({ name }) => void seen.push(`b:${name}`));
    bus.subscribe('other', () => void seen.push('other'));

    await bus.publish('greeted', { name: 'Ada' });

    expect(seen).toEqual(['a:Ada', 'b:Ada']);
  });

  it('stops delivering after unsubscribe', async () => {
    const { logger } = createCapturingLogger();
    const bus = new EventBus<TestEvents>(logger);
    let calls = 0;
    const unsubscribe = bus.subscribe('other', () => void calls++);

    await bus.publish('other', 1);
    unsubscribe();
    await bus.publish('other', 2);

    expect(calls).toBe(1);
  });

  it('isolates failing subscribers and logs the failure', async () => {
    const { logger, entries } = createCapturingLogger();
    const bus = new EventBus<TestEvents>(logger);
    const seen: number[] = [];
    bus.subscribe('other', () => {
      throw new Error('sync boom');
    });
    bus.subscribe('other', async () => {
      throw new Error('async boom');
    });
    bus.subscribe('other', (n) => void seen.push(n));

    await expect(bus.publish('other', 7)).resolves.toBeUndefined();

    expect(seen).toEqual([7]);
    const failures = entries.filter((entry) => entry.msg === 'event handler failed');
    expect(failures).toHaveLength(2);
    expect(failures.every((entry) => entry.level === LOG_LEVEL.error)).toBe(true);
    expect(failures[0]).toMatchObject({ event: 'other' });
  });

  it('waits for async subscribers before resolving', async () => {
    const { logger } = createCapturingLogger();
    const bus = new EventBus<TestEvents>(logger);
    let done = false;
    bus.subscribe('other', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      done = true;
    });

    await bus.publish('other', 1);

    expect(done).toBe(true);
  });

  it('resolves when nobody is listening', async () => {
    const { logger } = createCapturingLogger();
    await expect(new EventBus<TestEvents>(logger).publish('other', 1)).resolves.toBeUndefined();
  });
});

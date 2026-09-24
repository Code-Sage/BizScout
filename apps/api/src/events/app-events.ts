import type { PingResult } from '@bizscout/shared';
import type { EventBus } from './event-bus';

/** Every domain event in the app and its payload. */
export interface AppEvents {
  'ping.created': PingResult;
}

export type AppEventBus = EventBus<AppEvents>;

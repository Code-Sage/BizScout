import type { Server } from 'node:http';

/**
 * Graceful HTTP shutdown: stop accepting connections, stop the app (drain scheduled runs, end the
 * SSE streams, release the DB pool), then drop every connection that is still open.
 *
 * The last step matters because ending an SSE response leaves its socket open as an idle
 * keep-alive connection. `server.close()` would wait out the keep-alive timeout for it, and a
 * request sent on it meanwhile (e.g. an EventSource reconnect) would open a new stream that
 * nothing ends, holding shutdown open until the forced exit. Once the pool is released no request
 * can be served anyway, so cutting the remaining connections loses nothing.
 */
export async function closeGracefully(server: Server, stopApp: () => Promise<void>): Promise<void> {
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    await stopApp();
  } finally {
    server.closeAllConnections();
  }
  await closed;
}

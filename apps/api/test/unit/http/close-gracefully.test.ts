import http, { type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { closeGracefully } from '../../../src/http/close-gracefully';

/**
 * A real HTTP server whose `/stream` responses stay open like SSE streams. `endStreams` plays the
 * part of `SseHub.stop()`; `/late` is a stream nothing ever ends (e.g. one opened after the hub
 * stopped).
 */
async function startServer() {
  const streams = new Set<ServerResponse>();
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write('retry: 5000\n\n');
    if (req.url === '/stream') streams.add(res);
  });
  // Explicit so the test doesn't depend on Node's default (5 s).
  server.keepAliveTimeout = 3_000;
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const endStreams = async (): Promise<void> => {
    for (const res of streams) res.end();
    streams.clear();
  };
  return { server, port, endStreams };
}

/** Opens a stream over a keep-alive agent (as browsers and proxies do) and waits for its first bytes. */
function openStream(port: number, path: string, agent: http.Agent): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path, agent }, (res) => {
      res.once('data', () => resolve(res));
      res.on('error', () => {}); // the server may cut the connection; that's the point
    });
    req.on('error', reject);
  });
}

describe('closeGracefully', () => {
  const agents: http.Agent[] = [];
  const servers: http.Server[] = [];

  afterEach(() => {
    for (const agent of agents.splice(0)) agent.destroy();
    for (const server of servers.splice(0)) server.closeAllConnections();
  });

  function keepAliveAgent(): http.Agent {
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    agents.push(agent);
    return agent;
  }

  it('does not wait out the keep-alive timeout of a client whose stream the app ended', async () => {
    const { server, port, endStreams } = await startServer();
    servers.push(server);
    await openStream(port, '/stream', keepAliveAgent());

    const startedAt = Date.now();
    await closeGracefully(server, endStreams);

    expect(Date.now() - startedAt).toBeLessThan(1_000);
    expect(server.listening).toBe(false);
  });

  it('drops a stream the app did not end instead of hanging until the forced exit', async () => {
    const { server, port, endStreams } = await startServer();
    servers.push(server);
    const late = await openStream(port, '/late', keepAliveAgent());
    const lateClosed = new Promise<void>((resolve) => late.once('close', () => resolve()));

    await closeGracefully(server, endStreams);

    await lateClosed;
    expect(server.listening).toBe(false);
  });

  it('stops accepting connections before stopping the app', async () => {
    const { server, endStreams } = await startServer();
    servers.push(server);
    let listeningWhenAppStopped: boolean | undefined;

    await closeGracefully(server, async () => {
      listeningWhenAppStopped = server.listening;
      await endStreams();
    });

    expect(listeningWhenAppStopped).toBe(false);
  });

  it('still closes open connections when stopping the app fails, and rethrows', async () => {
    const { server, port } = await startServer();
    servers.push(server);
    const stream = await openStream(port, '/stream', keepAliveAgent());
    const streamClosed = new Promise<void>((resolve) => stream.once('close', () => resolve()));

    await expect(
      closeGracefully(server, () => Promise.reject(new Error('pool end failed'))),
    ).rejects.toThrow('pool end failed');

    await streamClosed;
    expect(server.listening).toBe(false);
  });
});

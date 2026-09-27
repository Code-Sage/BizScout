import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/db/migrate-cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // The shared contract package ships TypeScript source: bundle it. npm deps stay external
  // and are installed by `pnpm deploy --prod` in the image.
  noExternal: ['@bizscout/shared'],
});

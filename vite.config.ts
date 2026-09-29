/// <reference types="vitest" />
import fs from 'node:fs';
import path from 'node:path';
import react, {reactCompilerPreset} from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import {defineConfig} from 'vitest/config';

// Public app paths the bridged loader, images and fonts request same-origin
// (docs/PLAN.md, D5). Production forwards them with vercel.json rewrites;
// scripts/forwarded-paths.test.mjs keeps the two in sync. Read with fs, not an
// import, so the config also loads under Vite's native (plain ESM) loader.
const forwarded = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, 'forwarded-paths.json'), 'utf8'),
) as {origin: string; paths: string[]};

export default defineConfig({
  // Same compiler setup as the app (upstream/inkweave/apps/web/vite.config.ts),
  // so bridged components compile identically. babel() must follow react().
  plugins: [react(), babel({presets: [reactCompilerPreset()]})],
  resolve: {
    // Bridged files resolve packages from this root; dedupe guards against a
    // stray second copy (e.g. if someone installs inside upstream/).
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    // Scan admin's own entry only. By default Vite crawls every HTML file under
    // the root, upstream/ included, and the app's index.html imports dev-only
    // packages admin doesn't install; the failed scan then skips pre-bundling,
    // so the first page load reloads itself once per newly found dependency.
    entries: ['index.html'],
  },
  server: {
    // Outside the app's 5173-5175 range, so neither repo's tooling attaches to the other's server.
    port: 5180,
    strictPort: true,
    // Trailing slashes are load-bearing: '/card-images/' must not also match '/card-images-preview/'.
    proxy: Object.fromEntries(
      forwarded.paths.map((prefix) => [prefix, {target: forwarded.origin, changeOrigin: true}]),
    ),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // upstream/ holds the app's own test suite; it must never run here.
    exclude: ['**/node_modules/**', 'upstream/**', 'app-master/**', 'dist/**'],
    // A rehearsal sets VITE_ADMIN_TARGET_BRANCH in .env.local, which Vitest also
    // loads. Pin it empty (master) here; tests that need a branch stub it.
    env: {VITE_ADMIN_TARGET_BRANCH: ''},
  },
});

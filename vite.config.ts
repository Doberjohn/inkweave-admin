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
    // Claude Code keeps session worktrees in .claude/worktrees/; their test files
    // belong to those sessions.
    exclude: ['**/node_modules/**', 'upstream/**', 'app-master/**', 'dist/**', '.claude/worktrees/**'],
    // A rehearsal sets VITE_ADMIN_TARGET_BRANCH in .env.local, which Vitest also
    // loads. Pin it empty (master) here; tests that need a branch stub it.
    env: {VITE_ADMIN_TARGET_BRANCH: ''},
    // The app project's vm workers are recycled once their heap passes this.
    // Vitest reads it from the root config only: set in a project, it is ignored.
    vmMemoryLimit: '1GB',
    // vm workers hold far more memory than forks. Half the cores keeps the speed
    // and leaves room for a second run, such as the commit hook beside another
    // session's tests. Two full-width runs drained a 16 GB machine.
    maxWorkers: '50%',
    // Both projects inherit the options above (#35). 'scripts' takes the test
    // files under scripts/ and 'app' every other one, so each file runs once.
    projects: [
      {
        // The Node tests stay on forks: in a vm pool, vite's runnerImport hands
        // rolldown a RegExp from another realm and scripts/reveal-sync/web.test.mjs fails.
        extends: true,
        test: {
          name: 'scripts',
          include: ['scripts/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
          pool: 'forks',
        },
      },
      {
        // The jsdom tests under src/. vmForks reuses each worker across files, so
        // jsdom's modules load once per worker; each file still gets a fresh DOM.
        // The workers are child processes and tests see the real process, so a
        // stubbed TZ still takes effect, and a stub left unrestored leaks into the
        // worker's next file. fetch and the JSON it parses come from Node's realm:
        // compare fetched data with toEqual, not toStrictEqual.
        extends: true,
        test: {
          name: 'app',
          exclude: ['scripts/**'],
          pool: 'vmForks',
        },
      },
    ],
  },
});

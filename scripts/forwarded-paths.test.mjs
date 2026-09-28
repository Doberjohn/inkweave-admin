// @vitest-environment node
import fs from 'node:fs';
import {describe, expect, it} from 'vitest';

const readJson = (file) => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
const forwarded = readJson('../forwarded-paths.json');
const vercel = readJson('../vercel.json');

describe('forwarded app paths', () => {
  it('rewrites every forwarded path to the public app', () => {
    for (const prefix of forwarded.paths) {
      expect(vercel.rewrites).toContainEqual({
        source: `${prefix}:path*`,
        destination: `${forwarded.origin}${prefix}:path*`,
      });
    }
  });

  it('forwards nothing else to an external origin', () => {
    const external = vercel.rewrites.filter((rewrite) => rewrite.destination.startsWith('http'));
    expect(external).toHaveLength(forwarded.paths.length);
  });
});

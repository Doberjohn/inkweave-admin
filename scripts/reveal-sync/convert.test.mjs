// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {afterEach, describe, expect, it} from 'vitest';
import {convertScans, removeScratch, scratchFor} from './convert.mjs';

const RUN = `convert-test-${process.pid}`;

/** A plain PNG standing in for an official scan. */
async function scan(width, height) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-scan-')), 'official.png');
  await sharp({create: {width, height, channels: 3, background: '#557799'}}).png().toFile(file);
  return file;
}

afterEach(() => removeScratch(RUN));

describe('convertScans', () => {
  it("makes both AVIFs at the app's sizes, with the app's own converter", async () => {
    const {exitCode, made} = convertScans(RUN, [{id: 14040, source: await scan(734, 1024)}]);
    expect(exitCode).toBe(0);
    expect(made.map(({files}) => files.map((file) => file.name))).toEqual([['14040.avif', '14040-sm.avif']]);
    const sizes = await Promise.all(
      made[0].files.map(async (file) => {
        const {width, height} = await sharp(file.path).metadata();
        return [width, height];
      }),
    );
    expect(sizes).toEqual([
      [337, 470],
      [191, 266],
    ]);
  }, 30_000);

  it('runs nothing for no scans, and leaves no scratch folder', () => {
    expect(convertScans(RUN, [])).toEqual({exitCode: 0, made: []});
    expect(fs.existsSync(scratchFor(RUN).root)).toBe(false);
  });
});

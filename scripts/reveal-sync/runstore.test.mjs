// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {UsageError} from './cli.mjs';
import {readPreviewText, readState, stateFile, writeBase, writeState} from './runstore.mjs';

beforeEach(() => vi.stubEnv('REVEAL_SYNC_RUNS', fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-runs-'))));
afterEach(() => vi.unstubAllEnvs());

describe("a run's base", () => {
  it('keeps the preview data and the state exactly as start read them', () => {
    writeBase('r1', {previewText: '{"cards":[]}\n', stateText: '{\n  "sets": {}\n}\n'});
    expect(readPreviewText('r1')).toBe('{"cards":[]}\n');
    expect(readState('r1')).toEqual({sets: {}});
  });

  it("writes the run's state the way serializeState does", () => {
    writeBase('r1', {previewText: '{}', stateText: '{"sets":{}}'});
    writeState('r1', {sets: {14: {cards: {b: {status: 'written'}, a: {status: 'skipped'}}}}});
    expect(Object.keys(JSON.parse(fs.readFileSync(stateFile('r1'), 'utf8')).sets[14].cards)).toEqual(['a', 'b']);
  });

  it('stops a run whose base is missing, telling the owner to start again', () => {
    expect(() => readPreviewText('r2')).toThrow(UsageError);
    expect(() => readState('r2')).toThrow(/Start a new run/);
  });
});

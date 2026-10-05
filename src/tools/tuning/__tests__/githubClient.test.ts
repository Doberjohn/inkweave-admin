import {afterEach, describe, it, expect, vi} from 'vitest';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {base64ToUtf8} from '../../../test/base64';
import {applyTuningEdits, commitTuning, readTuning} from '../githubClient';

afterEach(() => vi.restoreAllMocks());

describe('applyTuningEdits', () => {
  it('applies a nested score edit without touching sibling fields', () => {
    const before = JSON.stringify(
      {ruleTexts: {'shift-targets': {'curve.gap3': {score: 5, text: 'Wide'}, 'curve.gap0': {score: 5, text: 'Same'}}}},
      null,
      2,
    );
    const after = applyTuningEdits(before, [
      {path: ['ruleTexts', 'shift-targets', 'curve.gap3', 'score'], value: 6, expected: 5},
    ]);
    const parsed = JSON.parse(after);
    expect(parsed.ruleTexts['shift-targets']['curve.gap3']).toEqual({score: 6, text: 'Wide'});
    expect(parsed.ruleTexts['shift-targets']['curve.gap0']).toEqual({score: 5, text: 'Same'});
  });

  it('applies multiple edits and ends with a trailing newline', () => {
    const before = JSON.stringify({playstyles: {ramp: {name: 'Ramp', tagline: 'x'}}}, null, 2);
    const after = applyTuningEdits(before, [
      {path: ['playstyles', 'ramp', 'name'], value: 'Ramp!', expected: 'Ramp'},
      {path: ['playstyles', 'ramp', 'tagline'], value: 'faster', expected: 'x'},
    ]);
    expect(after.endsWith('\n')).toBe(true);
    expect(JSON.parse(after).playstyles.ramp).toEqual({name: 'Ramp!', tagline: 'faster'});
  });

  // Another operator (or tab) published 7 after this editor loaded 5.
  it('refuses an edit whose value changed since the editor loaded it', () => {
    const before = JSON.stringify({ruleTexts: {ramp: {scores: {density: 7}}}}, null, 2);
    expect(() =>
      applyTuningEdits(before, [{path: ['ruleTexts', 'ramp', 'scores', 'density'], value: 6, expected: 5}]),
    ).toThrow('ruleTexts.ramp.scores.density changed since the editor loaded it (now 7). Reload tuning.json and make the edit again.');
  });
});

const TUNING: TuningConfig = {
  playstyles: {ramp: {name: 'Ramp', tagline: 't'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

// Table-driven GitHub stub: [url matcher, JSON body]. Branch-free, for the complexity gate.
const ROUTES: [(url: string) => boolean, unknown][] = [
  [(u) => u.includes('/contents/'), TUNING],
  [(u) => u.endsWith('/git/ref/heads/master'), {object: {sha: 'base1'}}],
  [(u) => u.includes('/git/commits/base1'), {tree: {sha: 'tree1'}}],
  [(u) => u.endsWith('/git/blobs'), {sha: 'blob1'}],
  [(u) => u.endsWith('/git/trees'), {sha: 'tree2'}],
  [(u) => u.endsWith('/git/commits'), {sha: 'commit2', html_url: 'https://github.com/x/y/commit/commit2'}],
  [(u) => u.endsWith('/git/refs/heads/master'), {}],
];

function github(url: string): Response {
  const route = ROUTES.find(([match]) => match(url));
  if (!route) throw new Error(`unexpected url ${url}`);
  return new Response(JSON.stringify(route[1]));
}

describe('commitTuning', () => {
  it('edits tuning.json as it is at the commit it builds on', async () => {
    const calls: {url: string; body?: {content?: string}}[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      calls.push({url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined});
      return github(String(url));
    });

    await commitTuning({token: 'tok', edits: [{path: ['playstyles', 'ramp', 'name'], value: 'Ramp!', expected: 'Ramp'}]});

    expect(calls.find((c) => c.url.includes('/contents/'))?.url).toContain('?ref=base1');
    const blob = calls.find((c) => c.url.endsWith('/git/blobs'));
    expect(JSON.parse(base64ToUtf8(blob?.body?.content ?? '')).playstyles.ramp.name).toBe('Ramp!');
  });
});

describe('readTuning', () => {
  it('returns the live tuning.json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(TUNING)));
    expect(await readTuning('tok')).toEqual(TUNING);
  });

  it('names what is missing instead of handing the editor a broken file', async () => {
    const broken = {playstyles: {}, ruleTexts: {'shift-targets': {}, ramp: {templates: {}}}};
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(broken)));
    await expect(readTuning('tok')).rejects.toThrow('tuning.json is missing directRules, ruleTexts.ramp.scores');
  });
});

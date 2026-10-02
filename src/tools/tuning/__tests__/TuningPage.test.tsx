import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {TuningPage} from '../TuningPage';

// A tuning.json that differs from the copy bundled into the build, so a pass
// proves the editor shows the live file.
const LIVE: TuningConfig = {
  playstyles: {ramp: {name: 'Live Ramp', tagline: 'From the branch'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

beforeEach(() => localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok'));

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('TuningPage', () => {
  it('edits the live tuning.json from the target branch, not the bundled copy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(LIVE)));
    render(<TuningPage />, {wrapper: MemoryRouter});

    expect(await screen.findByRole('button', {name: 'Live Ramp'})).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.github.com/repos/Doberjohn/inkweave/contents/packages/synergy-engine/src/data/tuning.json?ref=master',
    );
  });

  it('says why when tuning.json cannot be read', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', {status: 404}));
    render(<TuningPage />, {wrapper: MemoryRouter});

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read tuning.json: GitHub 404');
  });
});

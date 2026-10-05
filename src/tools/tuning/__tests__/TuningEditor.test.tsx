import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {TuningEditor} from '../components/TuningEditor';

// Publishes go through commitTuning; each test decides how it settles.
const commitTuning = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({commitTuning}));

const CONFIG: TuningConfig = {
  playstyles: {ramp: {name: 'Ramp', tagline: 'Ink fast'}, dwarfs: {name: 'Dwarfs', tagline: 'Go wide'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

const title = () => screen.getByRole('textbox', {name: 'Title text'});

async function renameRamp(to: string) {
  await userEvent.click(screen.getByRole('button', {name: 'Ramp'}));
  await userEvent.clear(title());
  await userEvent.type(title(), to);
}

describe('TuningEditor', () => {
  it('shows each rule its own values, and keeps a pending edit with its rule', async () => {
    render(<TuningEditor token="tok" config={CONFIG} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Dwarfs'}));
    expect(title()).toHaveValue('Dwarfs');

    await userEvent.click(screen.getByRole('button', {name: 'Ramp'}));
    expect(title()).toHaveValue('Ramp!');
  });

  it('shows the saved value again once an edit is reverted', async () => {
    render(<TuningEditor token="tok" config={CONFIG} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'revert'}));
    expect(title()).toHaveValue('Ramp');
  });

  it('asks for the new live values after a successful publish', async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/1'});
    const onPublished = vi.fn();
    render(<TuningEditor token="tok" config={CONFIG} onPublished={onPublished} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    await vi.waitFor(() => expect(onPublished).toHaveBeenCalledOnce());
  });

  it('keeps the values it has when a publish fails, and says why', async () => {
    commitTuning.mockRejectedValue(new Error('GitHub 422 on /refs: not a fast forward'));
    const onPublished = vi.fn();
    render(<TuningEditor token="tok" config={CONFIG} onPublished={onPublished} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByText('GitHub 422 on /refs: not a fast forward')).toBeInTheDocument();
    expect(onPublished).not.toHaveBeenCalled();
  });
});

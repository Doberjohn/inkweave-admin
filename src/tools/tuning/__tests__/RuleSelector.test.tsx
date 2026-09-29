import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {RuleSelector} from '../components/RuleSelector';

const CONFIG: TuningConfig = {
  playstyles: {ramp: {name: 'Ramp', tagline: 't'}},
  directRules: {'singer-songs': {name: 'Singer + Songs', description: 'd'}},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

describe('RuleSelector', () => {
  it('lists the playstyles and direct rules of the config it is given', () => {
    render(<RuleSelector config={CONFIG} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', {name: 'Ramp'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Singer + Songs'})).toBeInTheDocument();
  });

  it('selects a rule by id and marks the selected one pressed', async () => {
    const onSelect = vi.fn();
    render(<RuleSelector config={CONFIG} selectedId="ramp" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', {name: 'Singer + Songs'}));
    expect(onSelect).toHaveBeenCalledWith('singer-songs');
    expect(screen.getByRole('button', {name: 'Ramp'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'Singer + Songs'})).toHaveAttribute('aria-pressed', 'false');
  });
});

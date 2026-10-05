import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {RuleStat} from '../../voteAnalyticsTypes';
import {RulesToReviewCard} from '../RulesToReviewCard';

/**
 * A rule the card lists: 50 score votes and a gap. Give the gaps widest first
 * and the card keeps their order. No playstyleId unless `over` gives one: the
 * shape of an artifact written before R2, so the mapping asks the pinned engine
 * for a playstyle rule's key.
 */
function rule(ruleId: string, ruleName: string, meanGap: number, over: Partial<RuleStat> = {}): RuleStat {
  return {
    ruleId,
    ruleName,
    category: 'playstyle',
    scoreVotes: 50,
    pairsVoted: 25,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0.4,
    ...over,
  };
}

// The links are router Links, so the card needs a router.
function renderCard(rules: RuleStat[]) {
  render(
    <MemoryRouter>
      <RulesToReviewCard rules={rules} />
    </MemoryRouter>,
  );
  return within(screen.getByRole('list', {name: 'Rules to review'}));
}

/** Each link as [visible text, accessible name]. */
function links(list: ReturnType<typeof renderCard>): Array<[string | null, string | null]> {
  return list.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('aria-label')]);
}

describe('RulesToReviewCard', () => {
  it('says Tune for a rule with a tuning.json copy and Inspect for one without (R-22)', () => {
    const list = renderCard([
      rule('ramp', 'Ramp', -0.9),
      rule('shift-targets', 'Shift Targets', 0.8, {category: 'direct'}),
      rule('singer-songs', 'Singer + Songs', 0.7, {category: 'direct'}),
    ]);
    expect(links(list)).toEqual([
      ['Tune', 'Tune Ramp'],
      ['Tune', 'Tune Shift Targets'],
      ['Inspect', 'Inspect Singer + Songs'],
    ]);
  });

  it('opens Calibration on the rule either way', () => {
    const list = renderCard([
      rule('ramp', 'Ramp', -0.9),
      rule('singer-songs', 'Singer + Songs', 0.7, {category: 'direct'}),
    ]);
    expect(list.getByRole('link', {name: 'Tune Ramp'})).toHaveAttribute('href', '/calibration?rule=ramp');
    expect(list.getByRole('link', {name: 'Inspect Singer + Songs'})).toHaveAttribute(
      'href',
      '/calibration?rule=singer-songs',
    );
  });

  it("finds a copy kept under another key through the pinned engine, and links the rule's own id", () => {
    // lore-loss keeps its copy under lore-denial, every location-* rule under location-control.
    const list = renderCard([rule('lore-loss', 'Lore Loss', 1.2), rule('location-boost', 'Location Boost', -1.1)]);
    expect(list.getByRole('link', {name: 'Tune Lore Loss'})).toHaveAttribute('href', '/calibration?rule=lore-loss');
    expect(list.getByRole('link', {name: 'Tune Location Boost'})).toHaveAttribute(
      'href',
      '/calibration?rule=location-boost',
    );
  });

  it("takes the artifact's playstyleId first (R-17), against the pinned tuning.json", () => {
    const list = renderCard([
      // On app master, not at the pin: the artifact still names its copy.
      rule('location-new-trigger', 'Location New Trigger', 1.5, {playstyleId: 'location-control'}),
      // A playstyle the pinned tuning.json lacks reads Inspect until the pin bump.
      rule('brand-new', 'Brand New', -1.4, {playstyleId: 'brand-new-playstyle'}),
      // A direct rule with no entry, under its own id.
      rule('brand-new-direct', 'Brand New Direct', 1.3, {category: 'direct', playstyleId: null}),
    ]);
    expect(links(list)).toEqual([
      ['Tune', 'Tune Location New Trigger'],
      ['Inspect', 'Inspect Brand New'],
      ['Inspect', 'Inspect Brand New Direct'],
    ]);
  });

  it('escapes the rule id in the link', () => {
    const list = renderCard([rule('odd id&more', 'Odd Id', 0.9, {category: 'direct'})]);
    expect(list.getByRole('link', {name: 'Inspect Odd Id'})).toHaveAttribute(
      'href',
      '/calibration?rule=odd%20id%26more',
    );
  });
});

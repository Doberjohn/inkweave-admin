import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {COLORS} from '../../../../app-bridge';
import type {FocusHandoff} from '../../../../shell/focusHandoff';
import {CardAnalyticsView, type CardAnalyticsViewProps} from '../CardAnalyticsView';
import {
  CARD_500,
  CARD_ID,
  EMPTY_LOG,
  LOADING,
  MAUI_CARD,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  VIEW_ANALYTICS,
  VIEW_LOG,
  loaded,
  lorcanaCard,
  pairStat,
  viewCard,
} from '../cardFixtures';

const BASE: CardAnalyticsViewProps = {
  card: MAUI_CARD,
  analytics: loaded(VIEW_ANALYTICS),
  voteLog: loaded(VIEW_LOG),
  getCardById: viewCard,
};

/** The view under a router (its links need one), with any props overridden. */
function renderView(overrides: Partial<CardAnalyticsViewProps> = {}) {
  return render(
    <MemoryRouter>
      <CardAnalyticsView {...BASE} {...overrides} />
    </MemoryRouter>,
  );
}

/** A KPI card's value: the group's second line. */
function kpi(label: string) {
  return within(screen.getByRole('group', {name: label}));
}

/** Analytics whose only pairs[] row for Maui is one pair with this gap and these score votes. */
function onePair({gap, scoreVotes}: {gap: number; scoreVotes: number}) {
  const pair = pairStat({a: '1012', b: CARD_ID, engineScore: 6, communityScore: 6 + gap, scoreVotes});
  return loaded({...VIEW_ANALYTICS, pairs: [pair]});
}

function handoffOf(pending: boolean): FocusHandoff {
  return {pending, request: vi.fn(), done: vi.fn()};
}

describe('CardAnalyticsView', () => {
  describe('the card header', () => {
    it("names the card in its h2 and shows its inks, base rarity, facts and collector number", () => {
      renderView();
      expect(screen.getByRole('heading', {level: 2, name: 'Maui Hero to All'})).toBeInTheDocument();
      expect(screen.getByRole('img', {name: 'Ruby'})).toBeInTheDocument();
      expect(screen.getByText('Character · cost 8 · inkable')).toBeInTheDocument();
      expect(screen.getByText('#113').tagName).toBe('CODE');
      // R-49: "Super Rare" finds its key (with a space) through rarityConfigOf, so the glyph draws beside the name.
      expect(screen.getByText('Super rare').querySelector('img')).not.toBeNull();
    });

    it('shows the thumbnail as decoration, 64 × 90', () => {
      const {container} = renderView();
      const thumb = container.querySelector('img[src^="https://placehold.co"]');
      expect(thumb).toHaveAttribute('alt', '');
      expect(thumb).toHaveAttribute('width', '64');
      expect(thumb).toHaveAttribute('height', '90');
    });

    it('leaves out what a card lacks: version, rarity, collector number and image; and names both inks', () => {
      const {container} = renderView({card: CARD_500});
      expect(screen.getByRole('heading', {level: 2, name: 'Card 500'})).toBeInTheDocument();
      expect(screen.getByRole('img', {name: 'Amber'})).toBeInTheDocument();
      expect(screen.getByRole('img', {name: 'Sapphire'})).toBeInTheDocument();
      expect(screen.getByText('Action · cost 3 · uninkable')).toBeInTheDocument();
      expect(container.querySelector('code')).toBeNull();
      // The only images left are the two named inks: no thumbnail, no rarity glyph.
      expect(container.querySelectorAll('img')).toHaveLength(2);
    });

    it('shows nothing for a rarity that is a printing, not a base rarity (R-49)', () => {
      const {container} = renderView({card: lorcanaCard({id: CARD_ID, name: 'Maui', rarity: 'Enchanted'})});
      expect(screen.queryByText(/Enchanted/)).not.toBeInTheDocument();
      // RaritySymbol draws Enchanted at the pin, so check the glyph too: the one image left is the Amber ink.
      expect(container.querySelectorAll('img')).toHaveLength(1);
    });

    it("puts the header's actions in the header (R4's Edit in Card studio)", () => {
      renderView({headerActions: <button type="button">Edit in Card studio</button>});
      expect(screen.getByRole('button', {name: 'Edit in Card studio'})).toBeInTheDocument();
    });

    it("gives a pending focus handoff to the card's h2 (R-48)", () => {
      const handoff = handoffOf(true);
      renderView({handoff});
      expect(screen.getByRole('heading', {level: 2, name: 'Maui Hero to All'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });

    it.each([
      ['while vote analytics loads', LOADING],
      ['after vote analytics failed', NOT_GENERATED],
    ])('still renders %s', (_, state) => {
      renderView({analytics: state, voteLog: state});
      expect(screen.getByRole('heading', {level: 2, name: 'Maui Hero to All'})).toBeInTheDocument();
    });
  });

  describe('the KPIs', () => {
    it('reads the calibration four from pairs[], the mean gap in the verdict colour with a true minus sign', () => {
      renderView();
      expect(kpi('Score votes').getByText('14')).toBeInTheDocument();
      expect(kpi('Pairs voted').getByText('5')).toBeInTheDocument();
      expect(kpi('Mean gap').getByText('−1.00')).toHaveStyle({color: COLORS.error});
      expect(kpi('Mean gap').getByText('vote-weighted')).toBeInTheDocument();
      expect(kpi('Engine → community').getByText('7.5 → 6.5')).toBeInTheDocument();
    });

    it('tags the raw two (R-32): distinct voters, and the accuracy sentiment from the raw answers', () => {
      renderView();
      expect(kpi('Distinct voters').getByText('10')).toBeInTheDocument();
      expect(kpi('Distinct voters').getByText('18 raw votes')).toBeInTheDocument();
      expect(kpi('Accuracy sentiment').getByText('−0.40')).toBeInTheDocument();
      expect(kpi('Accuracy sentiment').getByText('too-low vs too-high · 5 answers')).toBeInTheDocument();
      expect(kpi('Distinct voters').getByText('raw')).toBeInTheDocument();
      expect(kpi('Accuracy sentiment').getByText('raw')).toBeInTheDocument();
    });

    it('has no engine-silent KPI (R-31)', () => {
      renderView();
      expect(screen.queryByRole('group', {name: /engine-silent/i})).not.toBeInTheDocument();
    });

    it('leaves the mean gap uncoloured under 10 score votes, with the "low n" hint', () => {
      renderView({card: CARD_500});
      expect(kpi('Score votes').getByText('4')).toBeInTheDocument();
      expect(kpi('Mean gap').getByText('+0.25')).toHaveStyle({color: COLORS.text});
      expect(kpi('Mean gap').getByText('low n: under 10 score votes')).toBeInTheDocument();
    });

    it('drops the raw two without raw votes', () => {
      renderView({analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)});
      expect(screen.queryByRole('group', {name: 'Distinct voters'})).not.toBeInTheDocument();
      expect(screen.getByRole('group', {name: 'Mean gap'})).toBeInTheDocument();
    });

    it('drops the raw two for a card the log has no vote on', () => {
      renderView({voteLog: loaded({...VIEW_LOG, votes: VIEW_LOG.votes.filter((v) => v.a !== CARD_ID && v.b !== CARD_ID)})});
      expect(screen.queryByRole('group', {name: 'Distinct voters'})).not.toBeInTheDocument();
      expect(screen.getByRole('group', {name: 'Mean gap'})).toBeInTheDocument();
    });

    it('shows the raw two alone when vote analytics failed but the log loaded', () => {
      renderView({analytics: NOT_GENERATED});
      expect(screen.getByRole('group', {name: 'Distinct voters'})).toBeInTheDocument();
      expect(screen.queryByRole('group', {name: 'Mean gap'})).not.toBeInTheDocument();
    });
  });

  describe('Calibration for this card', () => {
    function panel() {
      return screen.getByRole('region', {name: 'Calibration for this card'});
    }

    it.each([
      ['runs generous', -0.8, 'The engine runs generous on this card'],
      ['is well-calibrated', -0.2, 'The engine is well-calibrated on this card'],
      ['runs harsh', 1.25, 'The engine runs harsh on this card'],
    ])('reads "%s" for a %s gap on 10 score votes', (_, gap, headline) => {
      renderView({analytics: onePair({gap, scoreVotes: 10})});
      expect(panel()).toHaveTextContent(headline);
    });

    it('says the card has too few score votes, and draws no dot, under 10 (R-50)', () => {
      renderView({analytics: onePair({gap: -0.8, scoreVotes: 4})});
      expect(panel()).toHaveTextContent('The engine has too few score votes to judge this card');
      expect(panel()).toHaveTextContent('Only 4 score votes on pairs the engine scores. The verdict needs 10.');
      // GapScale's track comes first: its centre tick, and no dot.
      expect(panel().querySelector('[aria-hidden="true"]')!.children).toHaveLength(1);
    });

    it('puts the dot on the scale, and the read line under the verdict, once the card has enough votes', () => {
      renderView();
      expect(panel()).toHaveTextContent("The engine rates this card's pairs about 1.00 points higher than the community.");
      expect(panel().querySelector('[aria-hidden="true"]')!.children).toHaveLength(2);
    });

    it('lists the rules on its pairs, low n last (R-35), each a link to the rule on /calibration (R-34)', () => {
      renderView();
      const table = within(panel()).getByRole('table', {name: "Rules on this card's pairs, low n last"});
      const names = within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent);
      expect(names).toEqual(['Ramp', 'Singer + Songslow n', 'Location Boostlow n', 'Shift Targetslow n', 'retired-rulelow n']);
      expect(within(table).getByRole('link', {name: 'Ramp'})).toHaveAttribute('href', '/calibration?rule=ramp');
      expect(within(table).getByRole('link', {name: 'retired-rule'})).toHaveAttribute('href', '/calibration?rule=retired-rule');
      expect(within(table).getAllByText('low n')[0]).toHaveAttribute('title', 'Fewer than 10 score votes');
    });

    it('prints each rule gap with a true minus sign in the gap colour', () => {
      renderView();
      const ramp = within(panel()).getByRole('link', {name: 'Ramp'}).closest('tr')!;
      expect(within(ramp).getByText('−1.17')).toHaveStyle({color: COLORS.error});
      expect(within(ramp).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Ramp', '', '−1.17', '3', '12']);
    });
  });

  describe('Voted pairs', () => {
    function panel() {
      return screen.getByRole('region', {name: 'Voted pairs'});
    }

    it('lists every pair, widest gap first, in a list that scrolls inside the panel (R-47)', () => {
      renderView();
      expect(within(panel()).getByText('5 pairs · widest gap first')).toBeInTheDocument();
      const rows = within(panel()).getAllByRole('row').slice(1);
      expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
        ['Moana - Of Motunui', '8 → 5.50', '−2.50', '6'],
        ['Pua - Potbellied Buddy', '5 → 7', '+2.00', '1'],
        ['Tamatoa - So Shiny!', '6 → 4', '−2.00', '1'],
        ['Heihei - Boat Snack', '7 → 7.25', '+0.25', '4'],
        ['Gramma Tala - Storyteller', '9 → 9', '0.00', '2'],
      ]);
      expect(within(panel()).getByRole('table').parentElement).toHaveStyle({maxHeight: '384px', overflowY: 'auto'});
      expect(within(panel()).getByRole('columnheader', {name: 'Paired with'})).toHaveStyle({position: 'sticky', top: '0px'});
      expect(within(panel()).queryByRole('button', {name: /show all/i})).not.toBeInTheDocument();
    });

    it('colours each gap, and heads the jump column in full', () => {
      renderView();
      expect(within(panel()).getByText('−2.50')).toHaveStyle({color: COLORS.error});
      expect(within(panel()).getByText('+2.00')).toHaveStyle({color: COLORS.success});
      expect(within(panel()).getByRole('columnheader', {name: 'Engine → community'})).toBeInTheDocument();
    });

    it('links a partner the card list holds to its card page, and leaves the others plain (R-33)', () => {
      renderView();
      expect(within(panel()).getByRole('link', {name: 'Moana - Of Motunui'})).toHaveAttribute('href', '/cards/1012');
      expect(within(panel()).queryByRole('link', {name: 'Gramma Tala - Storyteller'})).not.toBeInTheDocument();
      expect(within(panel()).getByText('Gramma Tala - Storyteller')).toBeInTheDocument();
    });

    it("leaves the focus handoff to the page: a partner link doesn't ask for it (R-48, R3-7's useCardHandoff)", async () => {
      const handoff = handoffOf(false);
      renderView({handoff});
      await userEvent.click(within(panel()).getByRole('link', {name: 'Moana - Of Motunui'}));
      expect(handoff.request).not.toHaveBeenCalled();
    });

    it('keeps a row Shift+Tab reaches clear of the sticky head (WCAG 2.4.11)', () => {
      renderView();
      expect(within(panel()).getByRole('table').parentElement).toHaveStyle({scrollPaddingTop: '40px'});
    });

    it("keeps the handoff's caveat, and splits the engine-silent pairs in a caption (R-31)", () => {
      renderView();
      expect(
        within(panel()).getByText('Most pairs have a single vote — trust the card-level trend over any one row.'),
      ).toBeInTheDocument();
      expect(
        within(panel()).getByText(
          'Not listed: 3 engine-silent pairs (voted, but the engine gives them no score): ' +
            '2 with a card outside the current card list, 1 with both cards in Core.',
        ),
      ).toBeInTheDocument();
    });

    it('says the engine-silent pairs need raw votes without them, and says nothing while the log loads', () => {
      const {unmount} = renderView({analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)});
      expect(within(panel()).getByText("Engine-silent pairs aren't listed, and counting them needs raw votes.")).toBeInTheDocument();
      unmount();
      renderView({voteLog: LOADING});
      expect(within(panel()).queryByText(/engine-silent/)).not.toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('says vote analytics is loading', () => {
      renderView({analytics: LOADING});
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
      expect(screen.queryByRole('region', {name: 'Calibration for this card'})).not.toBeInTheDocument();
    });

    it("says why vote analytics is missing, in today's words", () => {
      renderView({analytics: NOT_GENERATED});
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not load vote analytics. Has the artifact been generated? (HTTP 404)',
      );
    });

    it('has one notice for a card in no pairs[] row', () => {
      const elsa = lorcanaCard({id: '9999', name: 'Elsa', version: 'Snow Queen'});
      renderView({card: elsa});
      expect(screen.getByText('No score votes on pairs the engine scores yet.')).toBeInTheDocument();
      expect(screen.queryByRole('region', {name: 'Voted pairs'})).not.toBeInTheDocument();
      expect(screen.queryByRole('region', {name: 'Key figures'})).not.toBeInTheDocument();
    });

    it('adds the engine-silent count to that notice when every pair the card was voted on is engine-silent (R-31)', () => {
      renderView({card: viewCard('710')!});
      expect(screen.getByText(/^No score votes on pairs the engine scores yet\./)).toHaveTextContent(
        'No score votes on pairs the engine scores yet. Not listed: 1 engine-silent pair (voted, but the engine gives them no score): ' +
          '0 with a card outside the current card list, 1 with both cards in Core.',
      );
    });
  });
});

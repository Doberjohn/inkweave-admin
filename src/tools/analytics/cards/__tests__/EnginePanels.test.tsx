import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RouterProvider, createMemoryRouter} from 'react-router-dom';
import {CtaButton, FONTS, TIER_COLORS} from '../../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../../theme/adminTheme';
import {ANALYTICS} from '../../overview/overviewFixtures';
import type {UseVoteAnalyticsReturn} from '../../useVoteAnalytics';
import {
  ENGINE_CAPPED,
  ENGINE_CARD,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  partnerLookup,
  type EngineFixture,
} from '../cardFixtures';
import {EnginePanels} from '../EnginePanels';
import {useCardSynergies, type UseCardSynergiesReturn} from '../useCardSynergies';

// The retry tests run the real hook over a mocked fetch; the rest of the bridge is real.
const fetchCardSynergies = vi.hoisted(() => vi.fn());
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchCardSynergies,
}));

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls
  // a function a hook returns as its teardown.
  fetchCardSynergies.mockReset();
});

const NO_ANALYTICS: UseVoteAnalyticsReturn = {data: null, loading: true, error: null};

/** A settled read of the fixture's file, as useCardSynergies returns it. */
const settled = (fixture: EngineFixture): UseCardSynergiesReturn => ({
  data: fixture.data,
  loading: false,
  error: null,
  retry: vi.fn(),
});

interface Setup {
  fixture?: EngineFixture;
  synergies?: Partial<UseCardSynergiesReturn>;
  analytics?: UseVoteAnalyticsReturn;
}

/** The panels on the card's page, under a data router, so a test can follow a node link and read the URL. */
function renderPanels({fixture = ENGINE_FIFTEEN, synergies, analytics = NO_ANALYTICS}: Setup = {}) {
  const element = (
    <EnginePanels
      card={ENGINE_CARD}
      synergies={{...settled(fixture), ...synergies}}
      analytics={analytics}
      getCardById={partnerLookup(fixture)}
    />
  );
  const router = createMemoryRouter([{path: '/cards/:cardId', element}], {initialEntries: ['/cards/300']});
  render(<RouterProvider router={router} />);
  return router;
}

/** The panels over the real useCardSynergies, so Retry fetches again. */
function LivePanels() {
  const synergies = useCardSynergies(ENGINE_CARD.id);
  return (
    <EnginePanels
      card={ENGINE_CARD}
      synergies={synergies}
      analytics={NO_ANALYTICS}
      getCardById={partnerLookup(ENGINE_FIFTEEN)}
    />
  );
}

function renderLive() {
  render(<RouterProvider router={createMemoryRouter([{path: '/', element: <LivePanels />}])} />);
}

const engineView = () => screen.getByRole('region', {name: 'Engine view'});
const network = () => screen.getByRole('figure', {name: 'Strongest partners'});
const nodeList = () => screen.getByRole('list', {name: 'Strongest synergy partners of Marlowe Finch - Clockmaker'});
const nodeLinks = () => within(nodeList()).getAllByRole('link');

/** A colour as the DOM writes it back ("rgb(…)"), so a hex token compares with an element's style. */
function cssColor({color}: {color: string}): string {
  const probe = document.createElement('i');
  probe.style.color = color;
  return probe.style.color;
}

const tierLegend = () =>
  within(screen.getByRole('list', {name: 'Partners by strength tier'}))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('EnginePanels: the Engine view', () => {
  it('counts every partner, the number in Tinos at the KPI size beside muted words, and splits them by tier', () => {
    renderPanels();
    expect(engineView()).toHaveTextContent('15 synergy partners');
    expect(within(engineView()).getByText('15')).toHaveStyle({fontFamily: FONTS.hero, fontSize: `${ADMIN_TYPE.kpi}px`});
    expect(within(engineView()).getByText('synergy partners')).toHaveStyle({
      fontSize: `${ADMIN_TYPE.body}px`,
      color: ADMIN_COLORS.muted,
    });
    expect(within(engineView()).queryByText(/At least/)).not.toBeInTheDocument();
    // No cap, so no caption over the split: every partner is in it.
    expect(within(engineView()).queryByText(/top 100 partners/)).not.toBeInTheDocument();
    expect(within(engineView()).queryByText(/undercounts/)).not.toBeInTheDocument();
    expect(tierLegend()).toEqual([
      'Perfect ≥9.5 7% (1)',
      'Strong ≥7 80% (12)',
      'Moderate ≥4 7% (1)',
      'Weak <4 7% (1)',
    ]);
  });

  it('keeps a tier with no partners in the split (Q11), and reads "1 synergy partner"', () => {
    renderPanels({fixture: ENGINE_ONE_PARTNER});
    expect(engineView()).toHaveTextContent('1 synergy partner');
    expect(engineView()).not.toHaveTextContent('1 synergy partners');
    expect(tierLegend()).toEqual([
      'Perfect ≥9.5 0% (0)',
      'Strong ≥7 0% (0)',
      'Moderate ≥4 100% (1)',
      'Weak <4 0% (0)',
    ]);
  });

  it('reads "At least" when a group hit the engine’s cap, and says the split undercounts the weaker tiers', () => {
    renderPanels({fixture: ENGINE_CAPPED});
    expect(engineView()).toHaveTextContent('At least 142 synergy partners');
    expect(within(engineView()).getByText('At least')).toHaveStyle({color: ADMIN_COLORS.muted});
    expect(
      within(engineView()).getByText(
        'A synergy group lists only its top 100 partners, so the split counts only those and undercounts the weaker tiers.',
      ),
    ).toBeInTheDocument();
    // The split itself is as it was: the file's counts, every tier kept.
    expect(tierLegend()).toEqual([
      'Perfect ≥9.5 0% (0)',
      'Strong ≥7 21% (30)',
      'Moderate ≥4 49% (70)',
      'Weak <4 30% (42)',
    ]);
  });

  it.each<[string, Setup, string]>([
    ['loading', {synergies: {data: null, loading: true}}, 'Loading engine data...'],
    [
      'with no synergies',
      {fixture: ENGINE_EMPTY},
      'The engine finds no synergies for this card (or its synergy file could not be read). ' +
        "A card revealed after the app's last deploy has no synergy file yet.",
    ],
  ])('says so while %s, with no count, split or network', (_, setup, text) => {
    renderPanels(setup);
    expect(within(engineView()).getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Partners by strength tier'})).not.toBeInTheDocument();
    expect(screen.queryByRole('figure', {name: 'Strongest partners'})).not.toBeInTheDocument();
  });

  it('says why a read failed and offers a neutral Retry, which reads the file again (R-45)', async () => {
    const retry = vi.fn();
    renderPanels({synergies: {data: null, error: new Error('offline'), retry}});
    expect(screen.getByRole('alert')).toHaveTextContent("Could not load this card's synergies (offline)");
    expect(screen.queryByRole('figure', {name: 'Strongest partners'})).not.toBeInTheDocument();
    const button = within(engineView()).getByRole('button', {name: 'Retry'});
    // Neutral, not the filled primary: it looks as the kit's own neutral CtaButton does.
    render(
      <CtaButton type="button" variant="neutral">
        Neutral
      </CtaButton>,
    );
    const neutral = screen.getByRole('button', {name: 'Neutral'});
    expect([button.style.color, button.style.border]).toEqual([neutral.style.color, neutral.style.border]);
    await userEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each<[string, UseVoteAnalyticsReturn, string]>([
    [
      'loaded',
      {data: ANALYTICS, loading: false, error: null},
      'Live engine data from inkweave.ink; vote analytics use the engine as of Sep 30.',
    ],
    ['loading', NO_ANALYTICS, 'Live engine data from inkweave.ink.'],
    ['failed', {data: null, loading: false, error: new Error('404')}, 'Live engine data from inkweave.ink.'],
  ])('names its source last, and the vote analytics’ engine date once they have %s', (_, analytics, caption) => {
    renderPanels({analytics});
    expect(engineView().lastElementChild).toBe(within(engineView()).getByText(caption));
  });
});

describe('EnginePanels: focus after Retry (R-48)', () => {
  it('moves focus to the panel’s heading once the read lands with partners', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ENGINE_FIFTEEN.data);
    renderLive();
    await userEvent.click(await screen.findByRole('button', {name: 'Retry'}));
    expect(await screen.findByText('synergy partners')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Engine view'})).toHaveFocus();
    expect(fetchCardSynergies).toHaveBeenCalledTimes(2);
  });

  it('moves focus to the panel’s heading when the read lands with no synergies', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ENGINE_EMPTY.data);
    renderLive();
    await userEvent.click(await screen.findByRole('button', {name: 'Retry'}));
    expect(await screen.findByText(/^The engine finds no synergies/)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Engine view'})).toHaveFocus();
    expect(fetchCardSynergies).toHaveBeenCalledTimes(2);
  });

  it('hands focus back to Retry when the read fails again', async () => {
    fetchCardSynergies.mockRejectedValue(new Error('offline'));
    renderLive();
    await userEvent.click(await screen.findByRole('button', {name: 'Retry'}));
    await vi.waitFor(() => expect(fetchCardSynergies).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', {name: 'Retry'})).toHaveFocus();
  });
});

describe('EnginePanels: the network (R-39)', () => {
  it('sits in its own untitled panel under the Engine view, titled by its frame', () => {
    renderPanels();
    expect(engineView().compareDocumentPosition(network()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(engineView()).not.toContainElement(network());
    expect(network().closest('section')).not.toHaveAttribute('aria-labelledby');
  });

  it('draws the twelve strongest as links, strongest first, each named by its tooltip (R-41)', () => {
    renderPanels();
    const links = nodeLinks();
    expect(links).toHaveLength(12);
    expect(links[0]).toHaveAccessibleName(
      'Wren Ashdown - Keeper of Keys: 10 engine score, Perfect tier, Shift Targets and Ramp rules',
    );
    expect(links[0]).toHaveAttribute('href', '/cards/301');
    // By name within the eight at 7: Uma Lark makes the cut, Yara Stormwick doesn't.
    expect(links[11]).toHaveAccessibleName('Uma Lark - Songbird: 7 engine score, Strong tier, Singer rule');
  });

  it('says in its subtitle which tie the cut splits (R-37)', () => {
    renderPanels();
    expect(network()).toHaveTextContent('The 12 strongest of 15 partners');
    expect(network()).toHaveTextContent('7 of the 8 partners at score 7 make the cut, by name.');
  });

  it('reads "at least" for a capped card’s counts, as the Engine view does, and says all twelve share a score', () => {
    renderPanels({fixture: ENGINE_CAPPED});
    expect(network()).toHaveTextContent('12 of at least 30 partners at score 8, by name, of at least 142 in all');
    expect(network()).not.toHaveTextContent('Thicker spokes');
  });

  it('draws one partner on one ring, with nothing more to show', () => {
    renderPanels({fixture: ENGINE_ONE_PARTNER});
    expect(nodeLinks()).toHaveLength(1);
    expect(network()).toHaveTextContent("Every partner, ranked clockwise from 12 o'clock.");
    expect(network()).not.toHaveTextContent('Thicker spokes');
    expect(screen.queryByRole('button', {name: /more in the table/})).not.toBeInTheDocument();
  });

  it('keys the spokes with the tiers', () => {
    renderPanels();
    const legend = within(network()).getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Perfect ≥9.5',
      'Strong ≥7',
      'Moderate ≥4',
      'Weak <4',
    ]);
  });

  it('shows a node’s tooltip, rules included, when its link takes focus', () => {
    renderPanels();
    act(() => nodeLinks()[0].focus());
    const tip = screen.getByText('Wren Ashdown - Keeper of Keys').closest<HTMLElement>('[aria-hidden="true"]');
    expect(tip).not.toBeNull();
    expect(tip).toHaveTextContent('Shift Targets and Ramp');
  });

  it('opens the table from "and 3 more in the table", focused, listing every partner', async () => {
    renderPanels();
    await userEvent.click(screen.getByRole('button', {name: 'and 3 more in the table'}));
    const table = within(network()).getByRole('table');
    expect(table).toHaveFocus();
    const columns = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(columns).toEqual(['Partner', 'Score', 'Tier', 'Rules']);
    expect(within(table).getAllByRole('row')).toHaveLength(16);
    expect(within(table).getByRole('rowheader', {name: 'Yara Stormwick - Captain'})).toBeInTheDocument();
  });

  it('follows a node link to that partner’s card page', async () => {
    const router = renderPanels();
    await userEvent.click(nodeLinks()[2]);
    expect(router.state.location.pathname).toBe('/cards/302');
  });

  it('gives tier colours to marks only: no text wears one', async () => {
    renderPanels();
    const tierColors = Object.values(TIER_COLORS).map(cssColor);
    const texts = [...document.querySelectorAll<HTMLElement | SVGElement>('p, span, li, text, h2, h3, th, td')];
    for (const el of texts) {
      expect(tierColors).not.toContain(el.style.color);
      expect(tierColors).not.toContain(cssColor({color: el.getAttribute('fill') ?? ''}));
    }
    await userEvent.click(screen.getByRole('button', {name: 'and 3 more in the table'}));
    for (const cell of within(network()).getAllByRole('cell')) {
      expect(tierColors).not.toContain(cell.style.color);
    }
  });
});

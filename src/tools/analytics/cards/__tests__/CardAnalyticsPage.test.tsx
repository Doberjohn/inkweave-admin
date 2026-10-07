import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {COLORS, type useCardDataContext} from '../../../../app-bridge';
import type {PairStat, VoteAnalytics} from '../../voteAnalyticsTypes';
import type {CardAnalyticsViewProps} from '../CardAnalyticsView';
import {CardAnalyticsPage} from '../CardAnalyticsPage';
import {lorcanaCard} from '../cardFixtures';

/** What the page reads from the shell's card list. */
type CardList = Pick<
  ReturnType<typeof useCardDataContext>,
  'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'
>;

// The card list as a store a test moves on (loading, loaded, failed), so the
// page re-renders as it would under the shell's CardDataProvider.
const cardList = vi.hoisted(() => ({
  value: null as CardList | null,
  listeners: new Set<() => void>(),
  retryLoad: vi.fn(),
}));
const fetchCardSynergies = vi.hoisted(() => vi.fn());
vi.mock('../../../../app-bridge', async (importOriginal) => {
  const {useSyncExternalStore} = await import('react');
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    fetchCardSynergies,
    useCardDataContext: function useCardDataContext() {
      return useSyncExternalStore(
        (onChange) => {
          cardList.listeners.add(onChange);
          return () => cardList.listeners.delete(onChange);
        },
        () => cardList.value,
      );
    },
  };
});

// R3-6's view has its own tests. This stand-in keeps what the page relies on:
// the card header's h2 takes the page's handoff (R-48), a count that only a
// remount resets (R-46), and a partner link. It records the props it gets.
const viewProps = vi.hoisted(() => [] as CardAnalyticsViewProps[]);
vi.mock('../CardAnalyticsView', async () => {
  const {useRef, useState} = await import('react');
  const {Link} = await import('react-router-dom');
  const {useTakeHandoff} = await import('../../../../shell/focusHandoff');
  function CardAnalyticsView(props: CardAnalyticsViewProps) {
    viewProps.push(props);
    const ref = useRef<HTMLElement>(null);
    const [presses, setPresses] = useState(0);
    useTakeHandoff(props.handoff, ref, 'h2');
    return (
      <section ref={ref}>
        <h2 tabIndex={-1}>{props.card.fullName}</h2>
        <button type="button" onClick={() => setPresses((n) => n + 1)}>
          Pressed {presses}
        </button>
        <Link to="/cards/2984">Partner</Link>
      </section>
    );
  }
  return {CardAnalyticsView};
});

// Pinned here, not imported: renaming the key would silently forget everyone's last card.
const KEY = 'inkweave-admin.last-card';

const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', ink: 'Sapphire'});
const ANNA = lorcanaCard({id: '2984', name: 'Anna', version: 'Heir to Arendelle'});

// One pair with 12 score votes, 7 → 5.5: both cards make Cards to review at −1.50, Anna first by name.
const PAIR: PairStat = {
  a: ELSA.id,
  b: ANNA.id,
  aName: ELSA.fullName,
  bName: ANNA.fullName,
  engineScore: 7,
  communityScore: 5.5,
  gap: -1.5,
  scoreVotes: 12,
  rules: ['ramp'],
};

// With PAIR, three rows that differ: Olaf +2.00, Elsa −1.50, and Anna (−1.5 × 12 + 2 × 24) / 36 = +0.83.
const UNDER_PAIR: PairStat = {
  a: ANNA.id,
  b: '2985',
  aName: ANNA.fullName,
  bName: 'Olaf - Friendly Snowman',
  engineScore: 5,
  communityScore: 7,
  gap: 2,
  scoreVotes: 24,
  rules: ['ramp'],
};

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-10-05T04:12:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: 12,
    distinctPairs: 1,
    distinctVoters: 3,
    meanGap: -1.5,
    accuracySentiment: null,
    engineSilentPairs: 0,
    weekly: [],
    dimensionFill: null,
  },
  rules: [],
  pairs: [PAIR],
};

type Answer = () => Response | Promise<Response>;
const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});
/** What Vite and vercel.json serve for an artifact that was never generated. */
const spaFallback = () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}});
/** A request that never settles, so its hook stays on its loading state. */
const never = () => new Promise<Response>(() => {});

/** Answers vote-analytics.json with `analytics`; the vote log never settles. */
function stubFetch(analytics: Answer = never) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => (url === '/admin-data/vote-analytics.json' ? Promise.resolve(analytics()) : never())),
  );
}

/** Sets the card list the page reads, and re-renders the page. By default it has loaded, with Elsa and Anna. */
function setCardList({cards = [ELSA, ANNA], isLoading = false, error = null}: Partial<CardList> = {}) {
  const getCardById = (id: string) => cards.find((c) => c.id === id);
  cardList.value = {cards, isLoading, error, getCardById, retryLoad: cardList.retryLoad};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** The page at `path` in a data router, so a test can read where a redirect left it. */
function renderPage(path: string) {
  const router = createMemoryRouter([{path: '/cards/:cardId?', element: <CardAnalyticsPage />}], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

const cardHeading = (name: string) => screen.getByRole('heading', {level: 2, name});
const prompt = () => screen.getByText(/^Pick a card/);
const notFound = () => screen.getByText(/^No card has the id/);

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  fetchCardSynergies.mockReset();
  fetchCardSynergies.mockReturnValue(new Promise(() => {}));
  cardList.retryLoad.mockReset();
  viewProps.length = 0;
  localStorage.clear();
  setCardList();
  stubFetch();
});

afterEach(() => vi.unstubAllGlobals());

describe('CardAnalyticsPage: bare /cards', () => {
  it('opens the last card viewed in place of /cards, and leaves focus alone', async () => {
    localStorage.setItem(KEY, ELSA.id);
    const {router} = renderPage('/cards');
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/2983'));
    // Replaced, not pushed: Back doesn't land on the redirect again.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    // A redirect is no one's action, so nothing asks for the handoff.
    expect(document.body).toHaveFocus();
  });

  it('prompts on a first visit, lists Cards to review once vote analytics loads, and opens one (R-28)', async () => {
    stubFetch(() => json(ANALYTICS));
    const {router, user} = renderPage('/cards');
    expect(prompt()).toHaveTextContent('Pick a card: search for it by name in Switch card, above.');
    expect(screen.getByRole('heading', {level: 1, name: 'Card analytics'})).toBeInTheDocument();

    const list = within(await screen.findByRole('list', {name: 'Cards to review'}));
    expect(list.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Anna - Heir to Arendelle', '/cards/2984'],
      ['Elsa - Snow Queen', '/cards/2983'],
    ]);
    expect(router.state.location.pathname).toBe('/cards');

    // The link goes with the prompt, so the card's h2 takes focus (R-48).
    await user.click(list.getByRole('link', {name: 'Elsa - Snow Queen'}));
    expect(cardHeading('Elsa - Snow Queen')).toHaveFocus();
  });

  it('prints each card’s mean gap in its verdict colour, beside a bias bar leaning the same way', async () => {
    stubFetch(() => json({...ANALYTICS, pairs: [PAIR, UNDER_PAIR]}));
    renderPage('/cards');
    const list = within(await screen.findByRole('list', {name: 'Cards to review'}));
    const rows = list.getAllByRole('listitem');
    // Name, then gap: the bias bar between them is aria-hidden decoration with no text. Negatives take U+2212.
    expect(rows.map((row) => row.textContent)).toEqual([
      'Olaf - Friendly Snowman+2.00',
      'Elsa - Snow Queen−1.50',
      'Anna - Heir to Arendelle+0.83',
    ]);
    const [olaf, elsa, anna] = rows;
    // The engine over-rates Elsa: the error colour, and the fill runs left in the over-rates colour.
    expect(within(elsa).getByText('−1.50')).toHaveStyle({color: COLORS.error});
    expect(elsa.querySelector('[data-direction]')).toHaveAttribute('data-direction', 'over');
    // It under-rates Olaf and Anna: the success colour, and the fill runs right.
    for (const [row, gap] of [
      [olaf, '+2.00'],
      [anna, '+0.83'],
    ] as const) {
      expect(within(row).getByText(gap)).toHaveStyle({color: COLORS.success});
      expect(row.querySelector('[data-direction]')).toHaveAttribute('data-direction', 'under');
    }
  });

  it('lists no card under 10 score votes', async () => {
    stubFetch(() => json({...ANALYTICS, pairs: [{...PAIR, scoreVotes: 9}]}));
    renderPage('/cards');
    expect(await screen.findByText('No card has 10 or more score votes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Cards to review'})).not.toBeInTheDocument();
  });

  it('shows the prompt alone while vote analytics loads', () => {
    renderPage('/cards');
    expect(prompt()).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Cards to review'})).not.toBeInTheDocument();
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();
  });
});

describe('CardAnalyticsPage: a card', () => {
  it('shows the card, names the tab after it, dates the data and remembers it (R-51, R-28)', async () => {
    stubFetch(() => json(ANALYTICS));
    renderPage('/cards/2983');
    expect(screen.getByRole('heading', {level: 1, name: 'Card analytics'})).toBeInTheDocument();
    expect(screen.getByText('Votes, calibration and engine data for one card')).toBeInTheDocument();
    expect(screen.getByRole('combobox', {name: 'Switch card'})).toBeInTheDocument();
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    expect(document.title).toBe('Elsa - Snow Queen · Card analytics · Inkweave admin');
    expect(localStorage.getItem(KEY)).toBe('2983');
    // The date sits in a <code>, so the line is matched on the element that holds both.
    expect(await screen.findByText(/Data as of/)).toHaveTextContent('Data as of 2026-10-05');
  });

  it('fetches the synergy file while the card list loads, and hands the view the hooks as they are', () => {
    setCardList({cards: [], isLoading: true});
    renderPage('/cards/2983');
    expect(screen.getByText('Loading cards…')).toBeInTheDocument();
    expect(fetchCardSynergies).toHaveBeenCalledWith('2983');
    expect(document.title).toBe('Card analytics · Inkweave admin');

    setCardList();
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    // The card's arrival doesn't fetch it again.
    expect(fetchCardSynergies).toHaveBeenCalledOnce();
    expect(viewProps.at(-1)).toMatchObject({
      card: ELSA,
      analytics: {loading: true},
      voteLog: {loading: true},
      synergies: {loading: true},
      getCardById: cardList.value?.getCardById,
    });
  });

  it('still shows the card when vote analytics was never generated, with no date in the header', async () => {
    stubFetch(spaFallback);
    renderPage('/cards/2983');
    await waitFor(() =>
      expect(viewProps.at(-1)?.analytics.error?.message).toBe('vote-analytics.json has not been generated yet'),
    );
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();
  });

  it('says no card has an unknown id, and forgets it (R-29)', () => {
    localStorage.setItem(KEY, '999999');
    renderPage('/cards/999999');
    expect(notFound()).toHaveTextContent(
      'No card has the id 999999 in the current card list. ' +
        'Cards from sets before 9 rotated out of Core, and a preview id changes when its card is released.',
    );
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(document.title).toBe('Card analytics · Inkweave admin');
  });

  // A slow or failed list never costs a good id (R-28): the page neither forgets the remembered id
  // (its own URL) nor writes over it with a URL's id it can't check yet (another one, here a rotated id).
  it.each<[string, string, Partial<CardList>]>([
    ['loads', '/cards/2984', {cards: [], isLoading: true}],
    ['has failed', '/cards/2984', {cards: [], error: new Error('HTTP 503')}],
    ['loads', '/cards/999999', {cards: [], isLoading: true}],
    ['has failed', '/cards/999999', {cards: [], error: new Error('HTTP 503')}],
  ])('keeps the remembered id while the card list %s, on %s', (_case, path, list) => {
    localStorage.setItem(KEY, ANNA.id);
    setCardList(list);
    renderPage(path);
    expect(localStorage.getItem(KEY)).toBe('2984');
  });
});

describe('CardAnalyticsPage: moving between cards', () => {
  it('mounts a fresh view for the next card, and focuses its h2 after a partner link (R-46, R-48)', async () => {
    const {user} = renderPage('/cards/2983');
    await user.click(screen.getByRole('button', {name: 'Pressed 0'}));
    expect(screen.getByRole('button', {name: 'Pressed 1'})).toBeInTheDocument();

    await user.click(screen.getByRole('link', {name: 'Partner'}));
    expect(cardHeading('Anna - Heir to Arendelle')).toHaveFocus();
    // Keyed by card: nothing from Elsa's view carries over.
    expect(screen.getByRole('button', {name: 'Pressed 0'})).toBeInTheDocument();
    expect(document.title).toBe('Anna - Heir to Arendelle · Card analytics · Inkweave admin');
    expect(localStorage.getItem(KEY)).toBe('2984');
  });

  it('leaves focus in the switcher after a pick (R-48)', async () => {
    const {router, user} = renderPage('/cards/2983');
    const input = screen.getByRole('combobox', {name: 'Switch card'});
    await user.type(input, 'an');
    await user.click(await screen.findByRole('option', {name: /Anna/}));
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/2984'));
    expect(cardHeading('Anna - Heir to Arendelle')).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('opens a switcher pick at the top of the page, with focus still in the switcher (R-48)', async () => {
    const {router, user} = renderPage('/cards/2983');
    // PageLayout's scrolling body, read down to the lower panels.
    const body = screen.getByRole('main').lastElementChild as HTMLElement;
    body.scrollTop = 500;
    const input = screen.getByRole('combobox', {name: 'Switch card'});
    await user.type(input, 'an');
    await user.click(await screen.findByRole('option', {name: /Anna/}));
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/2984'));
    expect(cardHeading('Anna - Heir to Arendelle')).toBeInTheDocument();
    // The same scroller, back at the top: the header stays mounted, so the switcher keeps focus.
    expect(screen.getByRole('main').lastElementChild).toBe(body);
    expect(body.scrollTop).toBe(0);
    expect(input).toHaveFocus();
  });

  it('focuses the card h2 after Back and Forward between cards (R-48)', async () => {
    const {router, user} = renderPage('/cards/2983');
    await user.click(screen.getByRole('link', {name: 'Partner'}));
    expect(cardHeading('Anna - Heir to Arendelle')).toHaveFocus();
    // Back: Anna's view goes with its focused h2, and the switcher never had focus.
    await act(() => router.navigate(-1));
    expect(router.state.historyAction).toBe('POP');
    expect(router.state.location.pathname).toBe('/cards/2983');
    expect(cardHeading('Elsa - Snow Queen')).toHaveFocus();
    await act(() => router.navigate(1));
    expect(router.state.historyAction).toBe('POP');
    expect(cardHeading('Anna - Heir to Arendelle')).toHaveFocus();
  });
});

describe('CardAnalyticsPage: a failed card list', () => {
  it.each<[string, string, Partial<CardList>, () => HTMLElement]>([
    ['the card, once the list loads', '/cards/2983', {}, () => cardHeading('Elsa - Snow Queen')],
    [
      'Retry again, when the list fails again',
      '/cards/2983',
      {cards: [], error: new Error('HTTP 503')},
      () => screen.getByRole('button', {name: 'Retry'}),
    ],
    ['the not-found line, for an id the list lacks', '/cards/999999', {}, notFound],
  ])('retries, then focuses %s (R-48)', async (_case, path, settled, focused) => {
    setCardList({cards: [], error: new Error('HTTP 500')});
    const {user} = renderPage(path);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the card list (HTTP 500)');

    await user.click(screen.getByRole('button', {name: 'Retry'}));
    expect(cardList.retryLoad).toHaveBeenCalledOnce();
    // What useCardData does next: loading again, then the list or another error.
    setCardList({cards: [], isLoading: true});
    expect(screen.getByText('Loading cards…')).toBeInTheDocument();
    setCardList(settled);
    expect(focused()).toHaveFocus();
  });

  it('offers Retry on bare /cards too, and focuses the prompt, which waits for no list', async () => {
    setCardList({cards: [], error: new Error('HTTP 500')});
    const {user} = renderPage('/cards');
    expect(screen.queryByText(/^Pick a card/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Retry'}));
    setCardList({cards: [], isLoading: true});
    expect(prompt()).toHaveFocus();
  });
});

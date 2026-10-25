import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, screen, waitFor} from '@testing-library/react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {REVEAL_SET_CODE, SET_TOTAL} from '../../../app-bridge';
import {lorcanaCard} from '../../analytics/cards/cardFixtures';
import {STUDIO_WIDE_MIN} from '../studioLayout';
import {chooseRevealSet, renderStudio, revealSetButton, setCardList, stubFetch} from './studioHarness';
import {measured} from './studioStores';

// The card list and the measured width come from the harness's stores (studioStores.ts); the rest of the bridge is real.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('./studioStores')).STORE_HOOKS,
}));

/*
 * New card's two steps as the page runs them (#98): the set step over the card
 * list, the ways out of it, and Change set. The step on its own is
 * SetStep.test.tsx, the bar SetBar.test.tsx, and the sets newCardSets.test.ts.
 */

/** A released card (set 9): Edit card opens it from the card list alone. */
const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', setCode: '9', setNumber: 42});

/** Every number of the reveal set as a released card, as after the set's graduation. */
const GRADUATED: LorcanaCard[] = Array.from({length: SET_TOTAL}, (_, i) =>
  lorcanaCard({id: String(5000 + i), name: `Card ${i + 1}`, setCode: REVEAL_SET_CODE, setNumber: i + 1}),
);

const nameField = () => screen.getByRole('textbox', {name: 'Name'});
const editInstead = () => screen.findByRole('button', {name: 'Edit a card instead'});

beforeEach(() => {
  // Wide, so the form's first control is its first field.
  measured.width = STUDIO_WIDE_MIN;
  setCardList({cards: [ELSA]});
  stubFetch();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('StudioPage: New card’s set step (#98)', () => {
  it('waits for the card list before it offers a set', () => {
    setCardList({cards: [], isLoading: true});
    renderStudio();
    expect(screen.getByText('Checking which sets take new cards…')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Set /})).not.toBeInTheDocument();

    setCardList({cards: [ELSA]});
    expect(revealSetButton()).toBeInTheDocument();
  });

  it('offers no set once the reveal set has graduated, and Edit a card instead opens Edit card with focus on its search (R-48)', async () => {
    setCardList({cards: [ELSA, ...GRADUATED]});
    const {router, user} = renderStudio();
    expect(screen.getByText(/has graduated: released cards hold all/)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Set /})).not.toBeInTheDocument();

    await user.click(await editInstead());
    await waitFor(() => expect(router.state.location.search).toBe('?mode=edit'));
    await waitFor(() => expect(screen.getByRole('searchbox', {name: 'Search cards'})).toHaveFocus());

    // Pushed, so Back returns to the step.
    expect(router.state.historyAction).toBe('PUSH');
    act(() => void router.navigate(-1));
    expect(await editInstead()).toBeInTheDocument();
  });

  it('takes the card in the URL along to Edit card', async () => {
    setCardList({cards: [ELSA, ...GRADUATED]});
    const {router, user} = renderStudio({path: `/studio?card=${ELSA.id}`});
    await user.click(await editInstead());
    await waitFor(() => expect(router.state.location.search).toBe(`?mode=edit&card=${ELSA.id}`));
  });

  it('goes back to the set on Change set, keeping the draft, which the set brings back, and never asks (R-57, R-48)', async () => {
    const {router, user} = renderStudio();
    const {key} = router.state.location;
    await chooseRevealSet(user);
    await user.type(nameField(), 'Mei');

    await user.click(screen.getByRole('button', {name: 'Change set'}));
    await waitFor(() => expect(revealSetButton()).toHaveFocus());
    expect(screen.queryByRole('textbox', {name: 'Name'})).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The step is the page's state, not the URL's.
    expect(router.state.location.key).toBe(key);

    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus());
    expect(nameField()).toHaveValue('Mei');
  });

  it("loads a failed card list again from the step, keeping the draft, and gives the reveal set focus once it's in (R-48)", async () => {
    const {user} = renderStudio();
    await chooseRevealSet(user);
    await user.type(nameField(), 'Mei');
    await user.click(screen.getByRole('button', {name: 'Change set'}));
    const retryLoad = vi.fn();
    setCardList({cards: [], error: new Error('Failed to fetch local cards: 500'), retryLoad});
    expect(screen.getByText('Could not load the card list (Failed to fetch local cards: 500)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Retry'}));
    expect(retryLoad).toHaveBeenCalledOnce();

    // The list's retry clears its error as its read starts (the app's useCardData), and Retry goes with it.
    setCardList({cards: [], isLoading: true});
    expect(screen.getByText('Checking which sets take new cards…')).toBeInTheDocument();
    setCardList({cards: [ELSA]});
    await waitFor(() => expect(revealSetButton()).toHaveFocus());
    await chooseRevealSet(user);
    expect(nameField()).toHaveValue('Mei');
  });
});

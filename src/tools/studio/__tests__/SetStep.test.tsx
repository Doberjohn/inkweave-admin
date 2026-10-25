import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE, SET_TOTAL} from '../../../app-bridge';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {SetStep, type SetStepProps} from '../components/SetStep';
import {newCardSet, newCardSets, setLabel} from '../newCardSets';
import {studioCard} from '../studioFixtures';

const REVEAL = newCardSet(REVEAL_SET_CODE);
const REVEAL_LABEL = setLabel(REVEAL);
const STEP = 'Which set is the card in?';

/** A card of the reveal set at number `n`: released under an official id, or a preview under REVEAL_ID_BASE + n. */
function revealCard(n: number, kind: 'released' | 'preview' = 'released'): LorcanaCard {
  const id = kind === 'released' ? String(3000 + n) : String(REVEAL_ID_BASE + n);
  return studioCard({id, name: `Card ${n}`, setCode: REVEAL_SET_CODE, setNumber: n});
}

const NUMBERS = Array.from({length: SET_TOTAL}, (_, i) => i + 1);
/** Two released Core sets beside the reveal set. */
const RELEASED = [
  studioCard({id: '1', name: 'Card 1', setCode: '13', setNumber: 1}),
  studioCard({id: '2', name: 'Card 2', setCode: '9', setNumber: 1}),
];

/** Two numbers of the reveal set in, one of them a preview. */
const OPEN = newCardSets([revealCard(1), revealCard(2, 'preview'), ...RELEASED]);
/** Every number released, as after graduation. */
const GRADUATED = newCardSets([...NUMBERS.map((n) => revealCard(n)), ...RELEASED]);
/** Every number in, one of them still a preview. */
const FULL = newCardSets([...NUMBERS.map((n) => revealCard(n, n === 1 ? 'preview' : 'released')), ...RELEASED]);

function handoffOf(pending: boolean): FocusHandoff {
  return {pending, request: vi.fn(), done: vi.fn()};
}

function props(overrides: Partial<SetStepProps> = {}): SetStepProps {
  return {
    sets: OPEN,
    listError: null,
    onRetryList: vi.fn(),
    onChoose: vi.fn(),
    onEditInstead: vi.fn(),
    handoff: handoffOf(false),
    ...overrides,
  };
}

function renderStep(overrides: Partial<SetStepProps> = {}) {
  const all = props(overrides);
  const view = render(<SetStep {...all} />);
  return {...all, ...view};
}

const revealTile = () => screen.getByRole('button', {name: `Set ${REVEAL.code} ${REVEAL.name}`});
const releasedRows = () =>
  within(screen.getByRole('list', {name: 'Released sets'}))
    .getAllByRole('listitem')
    .map((row) => row.textContent);

describe('SetStep', () => {
  it('asks which set the card is in, as the first of two steps', () => {
    renderStep();
    const step = screen.getByRole('region', {name: STEP});
    const items = within(within(step).getByRole('list', {name: 'New card steps'})).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual(['step', null]);
    expect(items.map((item) => item.textContent)).toEqual(['1Set', '2Card details']);
  });

  it('offers the reveal set while one of its numbers is free, as its one choice, saying how many are taken and where its cards go', () => {
    renderStep();
    expect(screen.getAllByRole('button')).toEqual([revealTile()]);
    expect(revealTile()).toHaveAccessibleDescription(
      `reveal season 2 of ${SET_TOTAL} numbers taken. New cards go to previewCards.json as ${REVEAL_ID_BASE} + collector number.`,
    );
  });

  it('chooses the reveal set by its code when its tile is pressed', async () => {
    const {onChoose} = renderStep();
    await userEvent.click(revealTile());
    expect(onChoose).toHaveBeenCalledExactlyOnceWith(REVEAL_SET_CODE);
  });

  it("draws each set's logo with no words of its own, since its name is beside it", () => {
    const {container} = renderStep();
    const logos = [...container.querySelectorAll('img')];
    expect(logos.map((logo) => logo.getAttribute('src'))).toEqual(
      [REVEAL, newCardSet('13'), newCardSet('9')].map((set) => set.logo),
    );
    expect(logos.every((logo) => logo.getAttribute('alt') === '')).toBe(true);
  });

  it('lists the other Core sets as released, newest first, with no control: LorcanaJSON writes their cards', () => {
    renderStep();
    expect(releasedRows()).toEqual([setLabel(newCardSet('13')), setLabel(newCardSet('9'))]);
    expect(within(screen.getByRole('list', {name: 'Released sets'})).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Edit card changes their images and printings\.$/)).toBeInTheDocument();
  });

  it('says a graduated reveal set takes no card, lists it first among the released sets, and offers Edit card', async () => {
    const {onEditInstead} = renderStep({sets: GRADUATED});
    expect(screen.queryByRole('button', {name: new RegExp(`^Set ${REVEAL.code}`)})).not.toBeInTheDocument();
    expect(screen.getByText('No set takes new cards right now')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${REVEAL_LABEL} has graduated`))).toHaveTextContent(
      'The next set opens here once the app starts its reveal season and admin’s pin follows.',
    );
    expect(releasedRows()[0]).toBe(REVEAL_LABEL);

    await userEvent.click(screen.getByRole('button', {name: 'Edit a card instead'}));
    expect(onEditInstead).toHaveBeenCalledOnce();
  });

  it('says a full reveal set is full, and leaves it out of the released sets: its previews graduate with it', () => {
    renderStep({sets: FULL});
    expect(screen.getByText(new RegExp(`^${REVEAL_LABEL} is full`))).toBeInTheDocument();
    expect(releasedRows()).not.toContain(REVEAL_LABEL);
    expect(screen.getByRole('button', {name: 'Edit a card instead'})).toBeInTheDocument();
  });

  it('shows no set and no control while the card list loads', () => {
    renderStep({sets: null});
    expect(screen.getByText('Checking which sets take new cards…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Released sets'})).not.toBeInTheDocument();
  });

  it("puts the card list's failure and its Retry in the sets' place", async () => {
    const {onRetryList} = renderStep({sets: null, listError: new Error('Failed to fetch local cards: 500')});
    expect(screen.getByText('Could not load the card list (Failed to fetch local cards: 500)')).toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Released sets'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Retry'}));
    expect(onRetryList).toHaveBeenCalledOnce();
  });

  it.each([
    {state: 'the reveal set is open', overrides: {}, takes: () => revealTile()},
    {
      state: 'no set is open',
      overrides: {sets: GRADUATED},
      takes: () => screen.getByRole('button', {name: 'Edit a card instead'}),
    },
    {
      state: 'the card list failed',
      overrides: {sets: null, listError: new Error('offline')},
      takes: () => screen.getByRole('button', {name: 'Retry'}),
    },
  ])('gives a pending handoff to its first button when $state (R-48)', ({overrides, takes}) => {
    const {handoff} = renderStep({...overrides, handoff: handoffOf(true)});
    expect(takes()).toHaveFocus();
    expect(handoff.done).toHaveBeenCalled();
  });

  it('keeps a pending handoff while the card list loads, and gives it to the tile once the list is in', () => {
    const handoff = handoffOf(true);
    const {rerender} = renderStep({sets: null, handoff});
    expect(handoff.done).not.toHaveBeenCalled();

    rerender(<SetStep {...props({handoff})} />);
    expect(revealTile()).toHaveFocus();
    expect(handoff.done).toHaveBeenCalled();
  });
});

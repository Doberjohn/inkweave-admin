import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {filterCards} from '../../image/filterCards';
import {EditSearch, type EditSearchProps} from '../components/EditSearch';
import type {SearchRow} from '../editSearch';
import {DUAL_INK_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf, studioCard} from '../studioFixtures';

const MEI = cardOf(PREVIEW_ENTRY);
const PRIYA = cardOf(DUAL_INK_ENTRY);

/** As searchCards orders them: the branch file's cards first (R-76). Priya is only in the branch file (R-66). */
const ROWS: SearchRow[] = [
  {card: MEI, tag: 'Preview', deployed: true},
  {card: PRIYA, tag: 'Preview', deployed: false},
  {card: RELEASED_CARD, tag: 'Released', deployed: true},
];

function props(overrides: Partial<EditSearchProps> = {}): EditSearchProps {
  return {
    rows: ROWS,
    total: ROWS.length,
    query: '',
    onQuery: vi.fn(),
    list: {loading: false, error: null, onRetry: vi.fn()},
    file: {error: null, onRetry: vi.fn()},
    ...overrides,
  };
}

/** The rows are links, so the search renders in a router. */
function renderSearch(overrides: Partial<EditSearchProps> = {}) {
  const all = props(overrides);
  render(
    <MemoryRouter>
      <EditSearch {...all} />
    </MemoryRouter>,
  );
  return all;
}

function handoffOf(pending: boolean): FocusHandoff {
  return {pending, request: vi.fn(), done: vi.fn()};
}

const ELSA = studioCard({id: '5001', name: 'Elsa', version: 'Snow Queen'});
const ANNA = studioCard({id: '5002', name: 'Anna', version: 'Heir to Arendelle'});

/** EditSearch is controlled: the harness holds the query and filters the cards, as the page does through searchCards. */
function Harness() {
  const [query, setQuery] = useState('');
  const rows = filterCards([ELSA, ANNA], query).map((card): SearchRow => ({card, tag: 'Released', deployed: true}));
  return (
    <MemoryRouter>
      <EditSearch {...props({rows, total: rows.length, query, onQuery: setQuery})} />
    </MemoryRouter>
  );
}

describe('EditSearch', () => {
  describe('the rows', () => {
    it('links each row to its card in Edit card, tagged with where its data comes from', () => {
      renderSearch();
      const mei = screen.getByRole('link', {name: /^Mei /});
      expect(mei).toHaveAttribute('href', `/studio?mode=edit&card=${MEI.id}`);
      expect(within(mei).getByText('preview')).toHaveAttribute('title', 'Its data comes from previewCards.json');
      const released = screen.getByRole('link', {name: /^Lantern Keeper /});
      expect(released).toHaveAttribute('href', '/studio?mode=edit&card=1001');
      expect(within(released).getByText('released')).toBeInTheDocument();
    });

    it('names each row by its name, tags, version, inks and collector number', () => {
      renderSearch();
      expect(screen.getByRole('link', {name: `Mei preview Red Panda Ruby #${MEI.setNumber}`})).toBeInTheDocument();
      // Both inks of a dual-ink card, each named by its icon.
      const priya = screen.getByRole('link', {name: /^Priya /});
      expect(within(priya).getByRole('img', {name: 'Ruby'})).toBeInTheDocument();
      expect(within(priya).getByRole('img', {name: 'Sapphire'})).toBeInTheDocument();
    });

    it('marks a card only the branch file holds as not deployed yet (R-66)', () => {
      renderSearch();
      expect(within(screen.getByRole('link', {name: /^Priya /})).getByText('not deployed yet')).toBeInTheDocument();
      expect(screen.getAllByText('not deployed yet')).toHaveLength(1);
    });

    it('draws no tag for a card the branch file has yet to place (R-71)', () => {
      renderSearch({rows: [{card: MEI, tag: null, deployed: true}], total: 1});
      expect(screen.getByRole('link', {name: `Mei Red Panda Ruby #${MEI.setNumber}`})).toBeInTheDocument();
    });

    it('narrows the list as you search (ported from CardImagePicker)', async () => {
      render(<Harness />);
      await userEvent.type(screen.getByRole('searchbox', {name: 'Search cards'}), 'anna');
      expect(screen.queryByRole('link', {name: /^Elsa /})).not.toBeInTheDocument();
      expect(screen.getByRole('link', {name: /^Anna /})).toBeInTheDocument();
    });
  });

  describe('the status line', () => {
    it('stays mounted and counts the cards, then the matches, then names a query that finds none', async () => {
      render(<Harness />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('2 cards');
      const field = screen.getByRole('searchbox', {name: 'Search cards'});
      await userEvent.type(field, 'anna');
      expect(screen.getByRole('status')).toBe(status);
      expect(status).toHaveTextContent('1 card matches');
      await userEvent.type(field, 'zz');
      expect(status).toHaveTextContent('No cards match "annazz".');
      expect(screen.queryByRole('list', {name: 'Cards'})).not.toBeInTheDocument();
    });

    it('says how many it shows when the matches pass the cap', () => {
      renderSearch({total: 45});
      expect(screen.getByRole('status')).toHaveTextContent('45 cards · showing the first 3');
    });
  });

  describe('the card list', () => {
    it('says it is loading, with the field ready to type in and no rows until it lands', () => {
      // The page may already hold the branch file's entries (R-66); without the card list they'd all read "not deployed yet".
      renderSearch({list: {loading: true, error: null, onRetry: vi.fn()}});
      expect(screen.getByRole('status')).toHaveTextContent('Loading cards…');
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('puts a failure, with Retry, in place of the field and the rows', async () => {
      const onRetry = vi.fn();
      renderSearch({list: {loading: false, error: new Error('HTTP 503'), onRetry}});
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the card list (HTTP 503)');
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      await userEvent.click(screen.getByRole('button', {name: 'Retry'}));
      expect(onRetry).toHaveBeenCalledOnce();
    });
  });

  describe('previewCards.json (R-71)', () => {
    const REJECTED = 'GitHub 401 on GET contents/apps/web/public/data/previewCards.json';
    const FAILED = 'GitHub 500 on GET contents/apps/web/public/data/previewCards.json';

    it('shows a failed read beside the rows, which still open', () => {
      renderSearch({file: {error: FAILED, onRetry: vi.fn()}});
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(`Could not read previewCards.json: ${FAILED}.`);
      // True after a failed first read and a failed re-read alike: a re-read keeps the last read's cards (R4-4a).
      // Only a reveal-set card under a preview id waits for the file, so the reveal set's released cards open too (R-71).
      expect(alert).toHaveTextContent('Released cards still open for a new image.');
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(ROWS.length);
    });

    it.each([
      {why: 'GitHub rejected the token (R-26)', error: REJECTED, offered: true, way: 'Forget token', calls: 'onForgetToken'},
      {why: 'the page offers no Forget token', error: REJECTED, offered: false, way: 'Read previewCards.json again', calls: 'onRetry'},
      {why: 'the read failed some other way', error: FAILED, offered: true, way: 'Read previewCards.json again', calls: 'onRetry'},
    ] as const)('offers one way out, $way, when $why', async ({error, offered, way, calls}) => {
      const file = {error, onRetry: vi.fn(), onForgetToken: offered ? vi.fn() : undefined};
      renderSearch({file});
      expect(screen.getAllByRole('button')).toHaveLength(1);
      await userEvent.click(screen.getByRole('button', {name: way}));
      expect(file[calls]).toHaveBeenCalledOnce();
    });
  });

  describe('focus (R-59)', () => {
    it('gives a pending handoff to the field: after "Load a different card", or once the card list is back', () => {
      const handoff = handoffOf(true);
      renderSearch({handoff});
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });

    it('selects the query the field kept as it takes the handoff, so typing replaces it', () => {
      renderSearch({handoff: handoffOf(true), query: 'mei'});
      const field = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search cards'});
      expect(field).toHaveFocus();
      expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'mei'.length]);
    });

    it('gives it to Retry when the card list fails again', () => {
      const handoff = handoffOf(true);
      renderSearch({handoff, list: {loading: false, error: new Error('HTTP 503'), onRetry: vi.fn()}});
      expect(screen.getByRole('button', {name: 'Retry'})).toHaveFocus();
    });

    it('holds it while the card list loads, so Retry takes it if the list fails again', () => {
      const handoff = handoffOf(true);
      const search = (list: EditSearchProps['list']) => (
        <MemoryRouter>
          <EditSearch {...props({handoff, list})} />
        </MemoryRouter>
      );
      const {rerender} = render(search({loading: true, error: null, onRetry: vi.fn()}));
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).not.toHaveFocus();
      expect(handoff.done).not.toHaveBeenCalled();
      rerender(search({loading: false, error: new Error('HTTP 503'), onRetry: vi.fn()}));
      expect(screen.getByRole('button', {name: 'Retry'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalledOnce();
    });

    it('takes nothing when no handoff is pending', () => {
      const handoff = handoffOf(false);
      renderSearch({handoff});
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).not.toHaveFocus();
      expect(handoff.done).not.toHaveBeenCalled();
    });
  });

  it("shows the page's notice above the field", () => {
    renderSearch({notice: <p>No card has the id 99999.</p>});
    const notice = screen.getByText('No card has the id 99999.');
    const field = screen.getByRole('searchbox', {name: 'Search cards'});
    expect(notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

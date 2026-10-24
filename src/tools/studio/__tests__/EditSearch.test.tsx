import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {SEARCH_STACK_BELOW} from '../../../theme/AdminStyles';
import {ADMIN_LAYOUT, ADMIN_TYPE} from '../../../theme/adminTheme';
import {filterCards} from '../../image/filterCards';
import {EditSearch, type EditSearchProps} from '../components/EditSearch';
import {searchCards, twinIdsOf, type SearchRow} from '../editSearch';
import {DALMATIANS, URSULA_SET_3, URSULA_SET_9} from '../finishes/__tests__/finishFixtures';
import {pinnedChunk} from '../promos/__tests__/pinned';
import {DUAL_INK_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf, studioCard} from '../studioFixtures';
import {STUDIO_PADDING} from '../studioLayout';

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

/** An inline style's length on a viewport `width` px wide: px, or a clamp() of px and vw, as PAGE_GUTTER is; 0 for none. */
function pxAt(length: string, width: number): number {
  const clamp = /^clamp\((\d+)px, (\d+)vw, (\d+)px\)$/.exec(length);
  if (clamp === null) return parseFloat(length) || 0;
  const [min, vw, max] = clamp.slice(1).map(Number);
  return Math.min(max, Math.max(min, (vw * width) / 100));
}

/** The elements whose styles take a search row's width. */
interface SearchBoxes {
  /** The search screen: its own gutter, if it has one. */
  search: HTMLElement;
  /** The list: its border. */
  list: HTMLElement;
  /** A row: its padding, its columns and the gaps between them. */
  row: HTMLElement;
}

/** A row's fixed columns, in px and in order: the thumbnail's, the marks' and the number's. */
function fixedColumns(row: HTMLElement): number[] {
  return (row.style.gridTemplateColumns.replace(/minmax\([^)]*\)/, '').match(/\d+px/g) ?? []).map(parseFloat);
}

/**
 * A row's names column in a list whose content box is `listWidth` px wide, worked out from the row's
 * own styles as a browser would lay them out: the row's padding each side, its fixed columns, and the
 * three gaps between its four.
 */
function namesColumnIn(listWidth: number, row: HTMLElement): number {
  const columns = fixedColumns(row).reduce((sum, column) => sum + column, 0);
  return listWidth - 2 * parseFloat(row.style.paddingLeft) - columns - 3 * parseFloat(row.style.gap);
}

/**
 * The list's content box on a phone `width` px wide, since jsdom has no layout: the viewport less the
 * 64px rail and the studio root's padding each side, the search's own gutter each side, and the
 * list's border each side.
 */
function listWidthAt(width: number, {search, list}: Omit<SearchBoxes, 'row'>): number {
  const sides = (length: string) => 2 * pxAt(length, width);
  const frame = ADMIN_LAYOUT.sidebarCollapsed + 2 * STUDIO_PADDING;
  return width - frame - sides(search.style.paddingLeft) - sides(list.style.borderLeftWidth);
}

/** The names column on a phone `width` px wide. */
function namesColumnAt(width: number, boxes: SearchBoxes): number {
  return namesColumnIn(listWidthAt(width, boxes), boxes.row);
}

/** The widest tag a search row shows, "not deployed yet", as Chrome draws it at the tags' size (measured, #74). */
const WIDEST_TAG = 92;

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
  it('says under its title what each kind of card opens for', () => {
    renderSearch();
    const search = screen.getByRole('region', {name: 'Find a card to edit'});
    expect(search).toHaveTextContent(
      'Every card, by name, version or id, with the branch’s preview cards first. A preview card opens in the form ' +
        'with its current data; a card of Sets 1 to 8 opens for its printings’ versions only; any other card opens ' +
        'for a new image and its printings’ versions.',
    );
  });

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

  // 178 names are in a Core set and in Sets 1 to 8, and for several the two cards share name, version, ink, rarity and
  // number (Ursula - Deceiver is #90 in Set 9 and in Set 3). The rows open different things, so the set tells them apart (#68).
  describe('a card of Sets 1 to 8 beside its Set 9 reprint', () => {
    const rowOf = (card: LorcanaCard): SearchRow => ({card, tag: 'Released', deployed: true});
    const URSULA_ROWS = [rowOf(URSULA_SET_9), rowOf(URSULA_SET_3)];
    /** The width of a row's last grid column, the number's. */
    const numberColumn = (link: HTMLElement) => parseInt(link.style.gridTemplateColumns.split(' ').at(-1) ?? '', 10);

    it('names the set on the Set 3 row alone, so the two rows differ by name as well as by what they open', () => {
      renderSearch({rows: URSULA_ROWS, total: URSULA_ROWS.length});
      const [core, old] = screen.getAllByRole('link', {name: /^Ursula /});
      expect(core).toHaveAccessibleName('Ursula released Deceiver Emerald #90');
      expect(old).toHaveAccessibleName('Ursula released Deceiver Emerald Set 3 · #90');
      expect(core).toHaveAttribute('href', `/studio?mode=edit&card=${URSULA_SET_9.id}`);
      expect(old).toHaveAttribute('href', `/studio?mode=edit&card=${URSULA_SET_3.id}`);
      expect(within(core).getByText('#90')).toBeInTheDocument();
      expect(within(old).getByText('Set 3 · #90')).toBeInTheDocument();
    });

    it('leaves the Core rows as they were: no set anywhere in a list of Core cards', () => {
      renderSearch();
      expect(screen.getByRole('link', {name: `Mei preview Red Panda Ruby #${MEI.setNumber}`})).toBeInTheDocument();
      expect(screen.queryByText(/^Set \d/)).not.toBeInTheDocument();
    });

    // jsdom has no layout, so these pin the rule the geometry rests on. On a phone the names column is the viewport less the
    // 64px rail, 32px of gutter (the studio root's 16px padding each side: the search adds none of its own, #74), 26px of
    // border and padding and 138px of thumbnail, marks and gaps, less this column: 71px at 375px with the 44px column
    // "#204" had, and 63px with this one. The set wraps over the number rather than widening the column.
    it('lets the number cell wrap, so "Set 3 ·" sits over "#90" instead of widening the column', () => {
      renderSearch({rows: URSULA_ROWS, total: URSULA_ROWS.length});
      expect(screen.getByText('Set 3 · #90')).toHaveStyle({whiteSpace: 'normal'});
      expect(screen.getByText('#90')).toHaveStyle({whiteSpace: 'normal'});
    });

    it('leaves the names column 63px at 375px, as the studio root pads the search, which adds no gutter of its own (#74)', () => {
      renderSearch({rows: [...ROWS, ...URSULA_ROWS], total: ROWS.length + URSULA_ROWS.length});
      const search = screen.getByRole('region', {name: 'Find a card to edit'}).parentElement as HTMLElement;
      const boxes = {search, list: screen.getByRole('list', {name: 'Cards'}), row: screen.getAllByRole('link')[0]};
      // Room for the "released" chip, about 50px, beside a dual ink's marks: the 31px the search's own gutter left put
      // it under the first ink's icon.
      expect(namesColumnAt(375, boxes)).toBe(63);
    });

    // AdminStyles' rule moves a row's marks under its name, and lets the name take the marks' column too, in a list
    // under SEARCH_STACK_BELOW: there the names column can't hold "not deployed yet" beside the marks. jsdom has no
    // layout or container queries, so this pins the classes the rule reads and the arithmetic of its breakpoint.
    it('stacks the marks under the name where the names column can’t hold "not deployed yet", as on a 375px phone (#74)', () => {
      renderSearch();
      const list = screen.getByRole('list', {name: 'Cards'});
      const priya = screen.getByRole('link', {name: /^Priya /});
      expect(list).toHaveClass('adm-search-list');
      expect(within(priya).getByText('not deployed yet').closest('span.adm-search-names')).not.toBeNull();
      expect(within(priya).getByRole('img', {name: 'Ruby'}).closest('span.adm-search-marks')).not.toBeNull();
      // At the breakpoint the tag fits beside the marks, and a pixel under it, it doesn't.
      expect(namesColumnIn(SEARCH_STACK_BELOW, priya)).toBeGreaterThanOrEqual(WIDEST_TAG);
      expect(namesColumnIn(SEARCH_STACK_BELOW - 1, priya)).toBeLessThan(WIDEST_TAG);
      // A 375px phone's list is under it, so its rows stack, and the name and its tags take 143px.
      const search = screen.getByRole('region', {name: 'Find a card to edit'}).parentElement as HTMLElement;
      const phone = listWidthAt(375, {search, list});
      expect(phone).toBeLessThan(SEARCH_STACK_BELOW);
      const [, marks] = fixedColumns(priya);
      expect(namesColumnIn(phone, priya) + parseFloat(priya.style.gap) + marks).toBe(143);
    });

    it('gives every list one number column, mixed or Core-only, so the marks never jump while a query is typed', () => {
      renderSearch({rows: [...ROWS, ...URSULA_ROWS], total: ROWS.length + URSULA_ROWS.length});
      const mixed = screen.getAllByRole('link').map(numberColumn);
      cleanup();
      renderSearch();
      const coreOnly = screen.getAllByRole('link').map(numberColumn);

      expect(new Set([...mixed, ...coreOnly]).size).toBe(1);
      // Room for the set's line, "Set 8 ·": seven characters of the 12px monospace at 0.6em each...
      const [width] = mixed;
      expect(width).toBeGreaterThanOrEqual(Math.ceil(7 * 0.6 * ADMIN_TYPE.small));
      // ...and at most 8px more of the names column than the 44px the number alone had.
      expect(width).toBeLessThanOrEqual(44 + 8);
    });
  });

  // Set 3's five Dalmatian Puppy - Tail Wagger cards share name, version, ink, rarity and number, #4: only their ids
  // tell their rows apart (#74).
  describe('twins', () => {
    const twinRow = (card: LorcanaCard): SearchRow => ({card, tag: 'Released', deployed: true, twin: true});

    it('names each of the five by its id after its set and number, so the rows differ by name (the pinned data)', () => {
      const cards = pinnedChunk('3').filter((card) => card.baseId === undefined);
      renderSearch(searchCards({cards, query: 'Dalmatian Puppy - Tail Wagger', previewIds: new Set(), twinIds: twinIdsOf(cards)}));
      const ids = ['436', '437', '438', '439', '440'];
      const links = screen.getAllByRole('link');
      expect(links.map((link) => link.getAttribute('href'))).toEqual(ids.map((id) => `/studio?mode=edit&card=${id}`));
      links.forEach((link, i) => expect(link).toHaveAccessibleName(`Dalmatian Puppy released Tail Wagger Amber Set 3 · #4 · id ${ids[i]}`));
    });

    it('keeps the id whole, so the cell wraps "Set 3 ·" over "#4 ·" over "id 436", never parting "id" from its number', () => {
      renderSearch({rows: DALMATIANS.map(twinRow), total: DALMATIANS.length});
      const id = screen.getByText('id 436');
      expect(id).toHaveStyle({whiteSpace: 'nowrap'});
      expect(id.closest('code')).toHaveTextContent(/^Set 3 · #4 · id 436$/);
    });

    it('names the id alone where the card has no number', () => {
      renderSearch({rows: [twinRow({...DALMATIANS[0], setNumber: undefined})], total: 1});
      expect(screen.getByText('id 436').closest('code')).toHaveTextContent(/^id 436$/);
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

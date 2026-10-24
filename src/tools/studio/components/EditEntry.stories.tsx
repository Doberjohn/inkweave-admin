import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {expect, userEvent, waitFor, within} from 'storybook/test';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {LinkButton, REVEAL_SET_CODE, SPACING} from '../../../app-bridge';
import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_LAYOUT} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {filterCards} from '../../image/filterCards';
import {isPrintingsOnly} from '../branchCards';
import {IMAGE_ONLY_NOTES} from '../cardEdit';
import {twinIdsOf, type SearchRow} from '../editSearch';
import {DALMATIANS, URSULA_SET_3, URSULA_SET_9, YEN_SID, YEN_SID_ROWS} from '../finishes/__tests__/finishFixtures';
import {printingRowsFor, type PrintingRow} from '../finishes/printingRows';
import {FIXTURE_CATALOG, controllerOf} from '../promos/__tests__/promoFixtures';
import {baseCardOf} from '../promos/printingForm';
import {PRINTINGS_ONLY_NOTE, collectionFailedNote} from '../studioCopy';
import {STUDIO_PADDING} from '../studioLayout';
import {STUDIO_GAP} from '../studioStyles';
import {
  CURLY_APOSTROPHE_CARD,
  DUAL_INK_ENTRY,
  JA_SCAN_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  UNNUMBERED_ENTRY,
  VARIANTS_ENTRY,
  cardOf,
} from '../studioFixtures';
import {EditingBanner} from './EditingBanner';
import {EditSearch, type EditSearchFile, type EditSearchList} from './EditSearch';
import {PrintingsPanel} from './PrintingsPanel';
import {promosOf} from './PrintingsPanel.stories';
import {ReleasedCardFacts} from './ReleasedCardFacts';

const MEI = cardOf(PREVIEW_ENTRY);
/** Only the branch file holds Priya (R-66). */
const PRIYA = cardOf(DUAL_INK_ENTRY);
/**
 * The cards the search lists: the preview cards Mei, Priya (a dual-ink card only the branch file
 * holds), Ming (with an Epic printing) and Miriam (a Japanese scan), Peter Pan’s Shadow (a name
 * printed with ’, which "pan's" finds), the released Lantern Keeper, and Ursula - Deceiver of Set 9,
 * then of Set 3: the same name, version, ink, rarity and number, so the Set 3 row names its set,
 * "Set 3 ·" over "#90" (#68). Type "ursula" to see the two rows together. Last, two of Set 3's
 * Dalmatian Puppy - Tail Wagger cards, twins, which only their ids tell apart (#74): type "dalmatian".
 */
const CARDS: LorcanaCard[] = [
  MEI,
  PRIYA,
  cardOf(VARIANTS_ENTRY),
  cardOf(JA_SCAN_ENTRY),
  CURLY_APOSTROPHE_CARD,
  RELEASED_CARD,
  URSULA_SET_9,
  URSULA_SET_3,
  ...DALMATIANS,
];

/** The ids of the cards above that have a twin, as the page finds them (twinIdsOf). */
const TWINS = twinIdsOf(CARDS);

/** What the search holds when the read of Sets 1 to 8 failed: the cards above, less Ursula's Set 3 copy and the Dalmatian twins. */
const WITHOUT_SETS_ONE_TO_EIGHT = CARDS.filter((card) => !isPrintingsOnly(card));

const noop = () => {};
const READY: EditSearchList = {loading: false, error: null, onRetry: () => {}, setsLoading: false};
const READ: EditSearchFile = {error: null, onRetry: () => {}};

/**
 * As cardTag tags them: the reveal set's cards under a preview id wait for the
 * file (R-71), and every other card is Released. Every reveal-set card here
 * has a preview id.
 */
function rowOf({card, fileRead}: {card: LorcanaCard; fileRead: boolean}): SearchRow {
  if (card.setCode !== REVEAL_SET_CODE) return {card, tag: 'Released', deployed: true, twin: TWINS.has(card.id)};
  return {card, tag: fileRead ? 'Preview' : null, deployed: card !== PRIYA};
}

interface LiveSearchProps {
  list?: EditSearchList;
  file?: EditSearchFile;
  /** The cards it holds: all of them unless a story says the read of Sets 1 to 8 failed. */
  cards?: LorcanaCard[];
  /** Lines above the field, as the page puts the notice for Sets 1 to 8 there. */
  notice?: React.ReactNode;
}

/**
 * The search as the page runs it: it holds the query, and filters the cards on
 * each key (the page runs searchCards). Type to narrow it; "pan's" finds the
 * name printed with ’.
 */
function LiveSearch({list = READY, file = READ, cards = CARDS, notice}: LiveSearchProps) {
  const [query, setQuery] = useState('');
  const rows = filterCards(cards, query).map((card) => rowOf({card, fileRead: file.error === null}));
  return <EditSearch rows={rows} total={rows.length} query={query} onQuery={setQuery} list={list} file={file} notice={notice} />;
}

/** The studio's root round the pane, as StudioWorkspace pads it: the search's only gutter (#74). */
const STUDIO_ROOT: React.CSSProperties = {padding: STUDIO_PADDING};

/**
 * Card studio's page in Edit card, as R4-6b lays it out: the page's header,
 * then its flush body, and the studio's root in it. A MemoryRouter, since the
 * rows and the banner's links navigate; nothing here calls useBlocker.
 */
function StudioFrame({children}: {children: React.ReactNode}) {
  return (
    <MemoryRouter initialEntries={['/studio?mode=edit']}>
      {/* As in the shell's main column: the layout fills the height, and only its body scrolls. */}
      <div style={{height: '100vh'}}>
        <PageLayout title="Card studio" writes flush>
          <div style={STUDIO_ROOT}>{children}</div>
        </PageLayout>
      </div>
    </MemoryRouter>
  );
}

/** Where the form would sit, for the facts list in place of it. */
const FORM_SLOT: React.CSSProperties = {maxWidth: 640, padding: SPACING.lg};

/** The form slot of a released card, as EditPane lays out its facts over its printings (#68): a studio gap apart. */
const FORM_COLUMN: React.CSSProperties = {...FORM_SLOT, display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};

/** Lantern Keeper's one row in the Printings panel: a card of a Core set, with no promo and no versions in the data, so its rarity gives them. */
const RELEASED_ROWS = printingRowsFor({card: RELEASED_CARD, chunk: [], promos: [], valueOf: () => null});

interface ReleasedFormSlotProps {
  card: LorcanaCard;
  /** Why the card's fields can't change here (R-61, #68): the line under its facts. */
  note: string;
  /** The card's rows in the Printings panel. */
  rows: readonly PrintingRow[];
}

/**
 * A released card's form slot as EditPane's FormSlot lays it out (#68): its facts, and why its fields
 * can't change here, with the Printings panel under them. The panel is handed its rows and the branch's
 * catalog instead of reading the branch's files, and its printing form does nothing (the panel's
 * stories' promosOf, for this card).
 */
function ReleasedFormSlot({card, note, rows}: ReleasedFormSlotProps) {
  const promos = promosOf(controllerOf(null), baseCardOf(card));
  return (
    <div style={FORM_COLUMN}>
      <ReleasedCardFacts card={card} note={note} />
      <PrintingsPanel view={{status: 'ready', rows, catalog: FIXTURE_CATALOG}} changes={[]} onChoose={noop} promos={promos} />
    </div>
  );
}

/** What a 375px phone leaves the page: the viewport less the rail the sidebar keeps there. */
const PHONE_PAGE: React.CSSProperties = {width: 375 - ADMIN_LAYOUT.sidebarCollapsed};

/** Whether two boxes on the page share any of their area. */
function overlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** The tags of a search row that meet its marks, by their words: none, wherever the row lays its marks out. */
function tagsOverMarks(row: HTMLElement): string[] {
  const marks = row.querySelector('.adm-search-marks')?.getBoundingClientRect();
  if (!marks) return [];
  const tags = [...row.querySelectorAll('.adm-search-names span[title]')];
  return tags.filter((tag) => overlap(tag.getBoundingClientRect(), marks)).map((tag) => tag.textContent ?? '');
}

const meta: Meta = {title: 'Admin/Publish/Card studio/Edit entry'};
export default meta;
type Story = StoryObj;

/**
 * The search screen: the branch file's cards first (R-76), each tagged, and Priya only in the branch file (R-66).
 * A list of Core and Sets 1 to 8 cards in one column: Ursula's Set 3 row wraps its set over its number (#68).
 */
export const Search: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch />
    </StudioFrame>
  ),
};

/**
 * The search on a 375px phone (#74), in the studio's root as the phone lays it out: the viewport less
 * the rail, and no scrollbar beside it, as a phone's overlays the page (a desktop's would take its
 * width here). The root's padding is the search's only gutter, so the list is 277px, under
 * AdminStyles' SEARCH_STACK_BELOW: beside the marks the names column would be 63px, too narrow for
 * "not deployed yet", so each row moves its marks under its name, and the name and its tags take
 * 143px. No tag meets the marks, which the play checks. Type "dalmatian" for the twins, whose set,
 * number and id take three lines.
 */
export const PhoneWidth: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/studio?mode=edit']}>
      <div style={PHONE_PAGE}>
        <div style={STUDIO_ROOT}>
          <LiveSearch />
        </div>
      </div>
    </MemoryRouter>
  ),
  play: async ({canvasElement}) => {
    const rows = within(canvasElement).getAllByRole('link');
    await expect(rows.flatMap(tagsOverMarks)).toEqual([]);
  },
};

/** Text that finds no card: the status line names it, and the list goes. */
export const NoMatch: Story = {
  render: Search.render,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('list', {name: 'Cards'})).toBeInTheDocument();
    await userEvent.type(canvas.getByRole('searchbox', {name: 'Search cards'}), 'zzz');
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('No cards match "zzz".'));
    await expect(canvas.queryByRole('list', {name: 'Cards'})).not.toBeInTheDocument();
  },
};

/** The card list still loading: the field is ready, and the status says so. */
export const CardListLoading: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch list={{...READY, loading: true}} />
    </StudioFrame>
  ),
};

/** The card list failed: every row comes from it, so its error and Retry take the field's place. */
export const CardListFailed: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch list={{...READY, error: new Error('HTTP 503')}} />
    </StudioFrame>
  ),
};

/** previewCards.json failed: its error sits beside the rows, which still open, and set 14's wait untagged (R-71). */
export const FileReadFailed: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch file={{...READ, error: 'GitHub 500 on GET contents/apps/web/public/data/previewCards.json'}} />
    </StudioFrame>
  ),
};

/** GitHub rejected the token on the file's read: Forget token in place of reading again (R-26). */
export const TokenRejected: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch
        file={{
          error: 'GitHub 401 on GET contents/apps/web/public/data/previewCards.json',
          onRetry: () => {},
          onForgetToken: () => {},
        }}
      />
    </StudioFrame>
  ),
};

/**
 * What EditPane's CollectionNotice shows above the search when the chunks of Sets 1 to 8 failed to read
 * (#68): the read that failed (#74), and Try again. The page's reads don't run in a story, so this
 * builds the same notice with the page's words (collectionFailedNote), and a Try again that does nothing.
 */
const SETS_ONE_TO_EIGHT_FAILED = (
  <Notice tone="error">
    {collectionFailedNote('/data/collection/3.json: HTTP 500')}{' '}
    <LinkButton type="button" onClick={noop}>
      Try again
    </LinkButton>
  </Notice>
);

/**
 * Sets 1 to 8 failed to load (#68): the notice above the field says which read failed and offers Try
 * again, and the search holds the card list's cards only, so neither Ursula's Set 3 copy nor the
 * Dalmatian twins are in it. Type "ursula" for Set 9's copy alone.
 */
export const SetsOneToEightFailed: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch cards={WITHOUT_SETS_ONE_TO_EIGHT} notice={SETS_ONE_TO_EIGHT_FAILED} />
    </StudioFrame>
  ),
};

/** A preview card open: the banner over the form (R4-5b draws the form). */
export const EditingAPreviewCard: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={MEI} tag="Preview" deployed />
    </StudioFrame>
  ),
};

/** A card only the branch file holds: marked, and with no Card analytics link yet (R-33, R-66). */
export const NotDeployedYet: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={PRIYA} tag="Preview" deployed={false} />
    </StudioFrame>
  ),
};

/**
 * A released card: the banner, then its form slot as the page lays it out (#68): its facts in the
 * form's place, and why only its image can change (R-61), with its Printings panel under them.
 */
export const ReleasedCard: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={RELEASED_CARD} tag="Released" deployed />
      <ReleasedFormSlot card={RELEASED_CARD} note={IMAGE_ONLY_NOTES.released} rows={RELEASED_ROWS} />
    </StudioFrame>
  ),
};

/**
 * A card of Sets 1 to 8 (#68), Yen Sid - Powerful Sorcerer of Set 4. The banner names its set before its
 * number, "Set 4 · #59", and offers no "View card analytics": the card list doesn't hold it. Its facts say
 * that only its printings' versions change here, and the Printings panel sits under them. The page draws
 * no form, no aside and no image control for it (the Card panel's no-image-control story).
 */
export const PrintingsOnlyCard: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={YEN_SID} tag="Released" deployed />
      <ReleasedFormSlot card={YEN_SID} note={PRINTINGS_ONLY_NOTE} rows={YEN_SID_ROWS} />
    </StudioFrame>
  ),
};

/** A preview entry with no collector number yet opens image-only too, with its own reason (R-65). */
export const UnnumberedPreviewCard: Story = {
  render: () => {
    const card = cardOf(UNNUMBERED_ENTRY);
    return (
      <StudioFrame>
        <EditingBanner card={card} tag="Preview" deployed />
        <div style={FORM_SLOT}>
          <ReleasedCardFacts card={card} note={IMAGE_ONLY_NOTES.unnumbered} />
        </div>
      </StudioFrame>
    );
  },
};

import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {expect, userEvent, waitFor, within} from 'storybook/test';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {REVEAL_SET_CODE, SPACING} from '../../../app-bridge';
import {PageLayout} from '../../../shell/PageLayout';
import {filterCards} from '../../image/filterCards';
import {IMAGE_ONLY_NOTES} from '../cardEdit';
import type {SearchRow} from '../editSearch';
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
import {ReleasedCardFacts} from './ReleasedCardFacts';

const MEI = cardOf(PREVIEW_ENTRY);
/** Only the branch file holds Priya (R-66). */
const PRIYA = cardOf(DUAL_INK_ENTRY);
const CARDS: LorcanaCard[] = [
  MEI,
  PRIYA,
  cardOf(VARIANTS_ENTRY),
  cardOf(JA_SCAN_ENTRY),
  CURLY_APOSTROPHE_CARD,
  RELEASED_CARD,
];

const READY: EditSearchList = {loading: false, error: null, onRetry: () => {}};
const READ: EditSearchFile = {error: null, onRetry: () => {}};

/** As cardTag tags them: the reveal set's cards wait for the file (R-71), and every other card is Released. */
function rowOf({card, fileRead}: {card: LorcanaCard; fileRead: boolean}): SearchRow {
  if (card.setCode !== REVEAL_SET_CODE) return {card, tag: 'Released', deployed: true};
  return {card, tag: fileRead ? 'Preview' : null, deployed: card !== PRIYA};
}

/**
 * The search as the page runs it: it holds the query, and filters the cards on
 * each key (the page runs searchCards). Type to narrow it; "pan's" finds the
 * name printed with ’.
 */
function LiveSearch({list = READY, file = READ}: {list?: EditSearchList; file?: EditSearchFile}) {
  const [query, setQuery] = useState('');
  const rows = filterCards(CARDS, query).map((card) => rowOf({card, fileRead: file.error === null}));
  return <EditSearch rows={rows} total={rows.length} query={query} onQuery={setQuery} list={list} file={file} />;
}

/**
 * Card studio's page in Edit card, as R4-6b lays it out: the page's header,
 * then its flush body. A MemoryRouter, since the rows and the banner's links
 * navigate; nothing here calls useBlocker.
 */
function StudioFrame({children}: {children: React.ReactNode}) {
  return (
    <MemoryRouter initialEntries={['/studio?mode=edit']}>
      {/* As in the shell's main column: the layout fills the height, and only its body scrolls. */}
      <div style={{height: '100vh'}}>
        <PageLayout title="Card studio" writes flush>
          {children}
        </PageLayout>
      </div>
    </MemoryRouter>
  );
}

/** Where the form would sit, for the facts list in place of it. */
const FORM_SLOT: React.CSSProperties = {maxWidth: 640, padding: SPACING.lg};

const meta: Meta = {title: 'Admin/Publish/Card studio/Edit entry'};
export default meta;
type Story = StoryObj;

/** The search screen: the branch file's cards first (R-76), each tagged, and Priya only in the branch file (R-66). */
export const Search: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch />
    </StudioFrame>
  ),
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

/** A released card: the banner, then its facts in the form's place, and why only its image can change (R-61). */
export const ReleasedCard: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={RELEASED_CARD} tag="Released" deployed />
      <div style={FORM_SLOT}>
        <ReleasedCardFacts card={RELEASED_CARD} note={IMAGE_ONLY_NOTES.released} />
      </div>
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

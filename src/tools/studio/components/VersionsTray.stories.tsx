import type {Meta, StoryObj} from '@storybook/react-vite';
import {useRef, useState, type CSSProperties} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {expect, spyOn, within} from 'storybook/test';
import {SPACING} from '../../../app-bridge';
import {targetBranch} from '../../../github/githubCommit';
import {keepClearOfFoot} from '../../../shell/clearBand';
import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS} from '../../../theme/adminTheme';
import {
  NUMBER_209_TO_BOTH,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  NUMBER_59_TO_FOIL,
  NUMBER_59_TO_FOIL_GONE,
  YEN_SID,
  YEN_SID_ROWS,
  batchView,
} from '../finishes/__tests__/finishFixtures';
import {changeFor, keptClash, withChange, type VersionChange} from '../finishes/versionBatch';
import {PRINTINGS_ONLY_NOTE} from '../studioCopy';
import {STUDIO_PADDING, type StudioLayout} from '../studioLayout';
import {STUDIO_GAP, STUDIO_GRID, STUDIO_MAX_WIDTH, STUDIO_SLOT} from '../studioStyles';
import {PrintingsPanel} from './PrintingsPanel';
import {ReleasedCardFacts} from './ReleasedCardFacts';
import {VersionsTray} from './VersionsTray';

/**
 * The tray is two rows of their own across the studio's root, its panel and its foot, and the root is
 * 1600px at most. These stories set it in the root as a narrow window lays it out (STUDIO_GRID), whose
 * gap the foot takes back, on a 1200px stage: Wide on the widest root's line, and PhoneWidth on a phone's
 * (their `parameters.stage`).
 */
const STAGE = 1200;
/** The widest root's line, 1600px less its padding each side: Wide's stage. */
const WIDEST = STUDIO_MAX_WIDTH - 2 * STUDIO_PADDING;
/** A phone: the root's 320px less the 64px rail and 32px of padding, which the tray then fills. */
const PHONE = 224;

/** StudioWorkspace's root in its narrow layout, `stage` wide inside its padding. */
const rootOn = (stage: number): CSSProperties => ({...STUDIO_GRID.narrow, maxWidth: stage + 2 * STUDIO_PADDING, margin: 0});

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
const TWO_CHANGES = [NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH];

const meta: Meta<typeof VersionsTray> = {
  title: 'Admin/Publish/Card studio/Version changes tray',
  component: VersionsTray,
  tags: ['autodocs'],
  decorators: [
    (Story, {parameters}) => (
      <div style={rootOn((parameters.stage as number | undefined) ?? STAGE)}>
        <Story />
      </div>
    ),
  ],
  // The token is a stand-in: the story's Publish does nothing with it.
  args: {view: batchView(TWO_CHANGES), token: 'story', onForgetToken: () => {}},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Yen Sid's #59 made Foil only, which takes Normal away and says so, and his alt foil #223 made Both, which takes nothing away. */
export const TwoChanges: Story = {};

/** A publish found #223 changed on the branch: its row says what it shows there now and offers Keep mine or Drop, and Publish is held. */
export const Clash: Story = {args: {view: batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL])}};

/** The branch no longer has #59 where the app keeps it: there is nothing to keep, so its row offers Drop alone. */
export const Gone: Story = {args: {view: batchView([NUMBER_59_TO_FOIL_GONE, NUMBER_223_TO_BOTH])}};

/** A publish is under way: Publish reads Publishing 2 changes…, the count it sent, and no change can be taken back, as the publish has them. */
export const Publishing: Story = {args: {view: batchView(TWO_CHANGES, {publishing: true})}};

/** The publish landed: the batch is empty, and the line says how many changes went and links the commit. */
export const Published: Story = {args: {view: batchView([], {result: {commitUrl: COMMIT_URL, count: 2, published: TWO_CHANGES}})}};

/** The branch moved while publishing: the tray says why in the store's words, with the changes still staged. */
export const PublishFailed: Story = {
  args: {
    view: batchView(TWO_CHANGES, {error: 'master changed while publishing, so nothing was published. Publish again.'}),
  },
};

/** GitHub rejected the token: the way out is Forget token, which leaves the changes as they are. */
export const TokenRejected: Story = {
  args: {
    view: batchView(TWO_CHANGES, {
      error: 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}',
    }),
  },
};

/**
 * The tray across the widest studio, its rows about 1500px wide (#74): each row's Revert, or Keep mine
 * and Drop, follows the words it acts on, rather than sitting at the row's far end.
 */
export const Wide: Story = {
  args: {view: batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL, NUMBER_209_TO_BOTH])},
  parameters: {stage: WIDEST},
};

/** On a phone the tray fills the line, and each row's buttons wrap under its text. */
export const PhoneWidth: Story = {
  args: {view: batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL])},
  parameters: {stage: PHONE},
};

/** The tray over a batch of its own, as the studio's store keeps one: Revert, Keep mine, Drop and Discard all work on it. */
function SettlingTray() {
  const [changes, setChanges] = useState<readonly VersionChange[]>([
    NUMBER_223_TO_BOTH_CLASHED,
    NUMBER_59_TO_FOIL_GONE,
    NUMBER_209_TO_BOTH,
  ]);
  const view = batchView(changes, {
    revert: (id) => setChanges((held) => held.filter((change) => change.id !== id)),
    keep: (id) => setChanges((held) => keptClash({changes: held}, id).changes),
    discard: () => setChanges([]),
  });
  return <VersionsTray view={view} token="story" onForgetToken={() => {}} />;
}

/** The tray live: keep or drop each clash and the line, and the hold on Publish, go with the last one; focus moves on as a button goes. */
export const Settling: Story = {render: () => <SettlingTray />};

const noop = () => {};
/** A 375px phone's page, at a phone's height: the viewport less the rail the sidebar keeps there. */
const PHONE_PAGE: CSSProperties = {width: 375 - ADMIN_LAYOUT.sidebarCollapsed, height: 667};
/** A wide window's page, at a laptop's height, across the stage. */
const WIDE_PAGE: CSSProperties = {flex: '1 1 100%', height: 800};
/** A released card's form slot, as EditPane lays out its facts over its printings (#68). */
const FORM_COLUMN: CSSProperties = {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};
/** Stands in for the top of a tall Edit card, over the form slot: a row of its own, as the Editing banner is. */
const TALL_CARD_TOP: CSSProperties = {
  gridColumn: '1 / -1',
  height: 1400,
  border: `1px dashed ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
};
/** Two of the printings Yen Sid's panel shows, staged. */
const STAGED = [NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH];

/**
 * Card studio's page in `layout` (#74), as StudioWorkspace lays it out: its root keeps a control that
 * takes keyboard focus clear of the tray's pinned foot, which the tray hands it (keepClearOfFoot). The
 * card is Yen Sid's facts and Printings panel, with two of his printings' changes staged, and a choice
 * stages its change as the studio's does; in the wide grid a dashed box stands in for the top of a
 * card taller than the view.
 */
function PinnedStudio({layout, page}: {layout: StudioLayout; page: CSSProperties}) {
  const pinnedFootRef = useRef<HTMLDivElement>(null);
  const [changes, setChanges] = useState<readonly VersionChange[]>(STAGED);
  return (
    <MemoryRouter>
      <div style={page}>
        <PageLayout title="Card studio" writes flush>
          <div
            style={STUDIO_GRID[layout]}
            onFocus={(event) => keepClearOfFoot({field: event.target, foot: pinnedFootRef.current})}>
            {layout === 'wide' && <div style={TALL_CARD_TOP} />}
            <div style={STUDIO_SLOT[layout].form}>
              <div style={FORM_COLUMN}>
                <ReleasedCardFacts card={YEN_SID} note={PRINTINGS_ONLY_NOTE} />
                <PrintingsPanel
                  view={{status: 'ready', rows: YEN_SID_ROWS}}
                  changes={changes}
                  onChoose={(chosen) => setChanges((held) => withChange({changes: held}, changeFor(chosen)).changes)}
                />
              </div>
            </div>
            <VersionsTray view={batchView(changes)} token="story" onForgetToken={noop} pinnedFootRef={pinnedFootRef} />
          </div>
        </PageLayout>
      </div>
    </MemoryRouter>
  );
}

/**
 * Moves the focus to `control` and has the browser show it (`:focus-visible`), as it shows a focus
 * that came by keyboard and not one a press of the mouse gave: only a shown focus moves the page
 * (keepClearOfFoot). A browser whose window hasn't the focus (Storybook in a hidden pane) shows none
 * and fires no focus events, so there this stands in for a focused one: the control answers
 * `:focus-visible` while this fires focusin, for the page to hear.
 */
function focusByKeyboard(control: HTMLElement): void {
  control.focus({focusVisible: true});
  if (control.ownerDocument.hasFocus()) return;
  const matches = control.matches.bind(control);
  const shown = spyOn(control, 'matches').mockImplementation((selectors) => selectors === ':focus-visible' || matches(selectors));
  control.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
  shown.mockRestore();
}

/**
 * What the pinned stories check, at the top of the page and as the owner moves through it:
 * - the foot sits on the view's bottom, and the tray's panel waits below the view, so the foot covers
 *   the page by its own height only;
 * - a choice that takes keyboard focus under the foot scrolls clear of it (WCAG 2.4.11), and Publish,
 *   taking it, moves nothing, as it is the foot's own;
 * - scrolled to the end, the foot rests under the panel and closes it.
 */
async function playPinned({canvasElement}: {canvasElement: HTMLElement}) {
  const canvas = within(canvasElement);
  // The page's flush body, which scrolls under its header.
  const body = canvasElement.querySelector('main')?.lastElementChild as HTMLElement;
  // The branch is the one the stories run against: a rehearsal's, when .env.local names one.
  const publish = canvas.getByRole('button', {name: `Publish 2 changes to ${targetBranch()}`});
  const foot = publish.parentElement as HTMLElement;
  const panel = canvas.getByRole('region', {name: 'Version changes'}).firstElementChild as HTMLElement;
  body.scrollTop = 0;
  const view = body.getBoundingClientRect();
  await expect(Math.round(foot.getBoundingClientRect().bottom)).toBe(Math.round(view.bottom));
  await expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(view.bottom);

  // The last row's Normal only, scrolled to sit under the foot, takes keyboard focus and scrolls out from under it.
  const choice = canvas.getAllByRole('button', {name: 'Normal only'}).at(-1) as HTMLElement;
  body.scrollTop += choice.getBoundingClientRect().bottom - (view.bottom - SPACING.sm);
  await expect(choice.getBoundingClientRect().bottom).toBeGreaterThan(foot.getBoundingClientRect().top);
  focusByKeyboard(choice);
  await expect(choice.getBoundingClientRect().bottom).toBeLessThanOrEqual(foot.getBoundingClientRect().top);
  const scrolled = body.scrollTop;
  focusByKeyboard(publish);
  await expect(body.scrollTop).toBe(scrolled);

  body.scrollTop = body.scrollHeight;
  await expect(Math.round(foot.getBoundingClientRect().top)).toBe(Math.round(panel.getBoundingClientRect().bottom));
  publish.blur();
  body.scrollTop = 0;
}

/**
 * Card studio on a 375px phone (#74), at the top of a card taller than the view: the tray's foot sticks
 * to the bottom of the view, Publish counting the changes, and the play checks it as the owner moves
 * through the page (playPinned). A desktop's scrollbar takes some of the page's width here; a phone's
 * overlays it.
 */
export const PinnedOnAPhone: Story = {
  render: () => <PinnedStudio layout="narrow" page={PHONE_PAGE} />,
  play: playPinned,
};

/**
 * Card studio in its wide grid (#74), under the top of a tall card: the tray's foot, a row of the grid,
 * sticks across the whole root as it does in the narrow layout's wrapping row, and the play checks the
 * same (playPinned). Chrome lets a grid item stick across its whole grid; the spec's grid area would
 * hold it to its own row, which this story would catch.
 */
export const PinnedWide: Story = {
  render: () => <PinnedStudio layout="wide" page={WIDE_PAGE} />,
  parameters: {stage: WIDEST},
  play: playPinned,
};

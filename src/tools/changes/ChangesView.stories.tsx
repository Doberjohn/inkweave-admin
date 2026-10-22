import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import type {ChangeArea} from './changePaths';
import type {ChangeSource} from './changeSource';
import {ChangesView} from './ChangesView';
import type {CommitDetails} from './commitDetails';
import type {Change, PathStream} from './historyModel';
import type {ChangeHistory, HistoryState} from './useChangeHistory';

/** A change, as the history lists it. */
function change({sha, date, headline, areas, author = 'Doberjohn'}: Omit<Change, 'automatic' | 'author'> & {author?: string}): Change {
  return {sha, date, headline, areas, author, automatic: false};
}

const CHANGES: Change[] = [
  change({sha: '1df4ad3', date: '2026-10-22T14:13:00Z', headline: 'chore(collection): set the versions of 2 printings from Card studio', areas: ['data']}),
  change({sha: 'a019937', date: '2026-10-22T13:39:00Z', headline: 'fix(collection): set 220 promo printings to foil only', areas: ['data']}),
  change({sha: '9dfd089', date: '2026-10-19T08:35:00Z', headline: 'chore(engine): tune scoring copy + scores', areas: ['tuning'], author: 'claude'}),
  change({sha: 'c75d316', date: '2026-09-29T10:26:00Z', headline: "fix(reveals): mark Madam Mim 14046's German scan for translation", areas: ['cards']}),
  change({sha: '2187bfb', date: '2026-10-08T11:25:00Z', headline: 'fix(card-images): update image for Pepita - Watchful Alebrije [14040]', areas: ['scans']}),
];

const NO_DETAILS = {entries: [], tuning: [], scans: [], unread: [], otherFiles: 0};

const url = (sha: string) => `https://github.com/Doberjohn/inkweave/commit/${sha}`;

/** A promo set to Normal only from Foil only, as the Version changes tray publishes one. */
function toNormal({id, cardId, label}: {id: string; cardId: string; label: string}) {
  return {id, cardId, label, kind: 'changed' as const, values: [{key: 'finishes', label: 'Versions', from: 'Foil only', to: 'Normal only'}]};
}

/** What each change did, as commitDetails reads it. */
const DETAILS: Readonly<Record<string, CommitDetails>> = {
  '1df4ad3': {
    ...NO_DETAILS,
    url: url('1df4ad3'),
    entries: [
      toNormal({id: '3101', cardId: '2154', label: 'Mickey Mouse - True Friend 15/P2'}),
      toNormal({id: '3102', cardId: '2160', label: 'Pegasus - Gift for Hercules 5/C2'}),
    ],
  },
  a019937: {
    ...NO_DETAILS,
    url: url('a019937'),
    unread: [
      'apps/web/public/data/allCards.json',
      'scripts/data/promo-printings.json',
      'apps/web/public/data/collection/promos.json',
      'apps/web/public/data/collection/1.json',
      'apps/web/public/data/collection/2.json',
    ],
  },
  '9dfd089': {
    ...NO_DETAILS,
    url: url('9dfd089'),
    tuning: [
      {key: 'ruleTexts.shift-targets.curve.bothInkable.score', label: 'Shift Targets · curve.bothInkable · score', from: '9', to: '8'},
      {key: 'ruleTexts.ramp.scores.chain.mixed', label: 'Ramp · scores · chain.mixed', from: '8', to: '7'},
    ],
  },
  c75d316: {
    ...NO_DETAILS,
    url: url('c75d316'),
    entries: [
      {
        id: '14046',
        cardId: '14046',
        label: 'Madam Mim - Rhyming Rascal #46',
        kind: 'changed',
        values: [{key: 'scanLanguage', label: 'Scan language', from: 'English', to: 'German'}],
      },
    ],
    otherFiles: 2,
  },
  '2187bfb': {
    ...NO_DETAILS,
    url: url('2187bfb'),
    scans: [{path: 'apps/web/public/card-images-raw/14040.jpg', cardId: '14040', sha: '2187bfb'}],
  },
};

/** A card-shaped stand-in for a scan. */
const SCAN = new Blob(
  [
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="336"><rect width="240" height="336" rx="12" fill="${ADMIN_COLORS.accent}"/></svg>`,
  ],
  {type: 'image/svg+xml'},
);

const SOURCE: ChangeSource = {
  details: (sha) => (DETAILS[sha] ? Promise.resolve(DETAILS[sha]) : Promise.reject(new Error(`GitHub 404 on /repos/Doberjohn/inkweave/commits/${sha}`))),
  scan: () => Promise.resolve(SCAN),
};

/** The changes as each followed area's history, read to its start or with more to read. */
function streams(changes: readonly Change[], done: boolean): PathStream[] {
  const areas: ChangeArea[] = ['cards', 'scans', 'data', 'tuning'];
  return areas.map((area) => ({path: area, area, changes: changes.filter((c) => c.areas.includes(area)), pages: 1, done}));
}

/** The view's history: a state, and reads that do nothing in a story. */
const history = (state: HistoryState): ChangeHistory => ({state, loadOlder: () => {}, retry: () => {}});

const meta: Meta<typeof ChangesView> = {
  title: 'Admin/Publish/Change history',
  component: ChangesView,
  tags: ['autodocs'],
  args: {source: SOURCE, onForgetToken: () => {}, handoff: {pending: false, request: () => {}, done: () => {}}},
  // ChangesView renders inside ChangesPage's one-column grid, under PageLayout's body; its names link into Card studio.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            alignContent: 'start',
            gap: SPACING.xl,
            padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
            minHeight: '100vh',
            background: ADMIN_COLORS.page,
            color: ADMIN_COLORS.text,
            fontFamily: FONTS.body,
          }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Every path read to its start. Open a change to see what it did: versions, a card's field, tuning values, a scan, or files too many to itemize. */
export const Default: Story = {args: {history: history({status: 'ready', streams: streams(CHANGES, true), older: {status: 'idle'}})}};

/** A path has more to read: Show older changes, and the reach in the count. */
export const MoreToRead: Story = {
  args: {history: history({status: 'ready', streams: streams(CHANGES, false), older: {status: 'idle'}})},
};

/** Older pages are being read: the button holds, keeping its focus. */
export const ReadingOlder: Story = {
  args: {history: history({status: 'ready', streams: streams(CHANGES, false), older: {status: 'loading'}})},
};

export const OlderReadFailed: Story = {
  args: {
    history: history({status: 'ready', streams: streams(CHANGES, false), older: {status: 'error', error: 'GitHub 502 on /repos/Doberjohn/inkweave/commits'}}),
  },
};

export const Loading: Story = {args: {history: history({status: 'loading'})}};

/** GitHub rejected the saved token: Try again, and Forget token to enter a new one. */
export const RejectedToken: Story = {
  args: {
    history: history({status: 'error', error: 'GitHub 401 on /repos/Doberjohn/inkweave/commits?sha=master: {"message":"Bad credentials"}'}),
  },
};

export const NoChanges: Story = {args: {history: history({status: 'ready', streams: streams([], true), older: {status: 'idle'}})}};

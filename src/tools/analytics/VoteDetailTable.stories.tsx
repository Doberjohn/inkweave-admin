import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../app-bridge';
import {KnownCardsContext} from '../../shell/knownCards';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {VoteDetailTable} from './VoteDetailTable';
import type {VoteLogRow} from './voteLogTypes';

const meta: Meta<typeof VoteDetailTable> = {
  title: 'Admin/Insights/Calibration/Vote detail',
  component: VoteDetailTable,
  tags: ['autodocs'],
  // One column of the page's pairs-and-votes grid, on the admin canvas.
  decorators: [
    (Story) => (
      <div style={{maxWidth: 480, padding: SPACING.xxxl, color: ADMIN_COLORS.text, fontFamily: FONTS.body}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_VOTE: VoteLogRow = {
  a: 'crd_a',
  b: 'crd_b',
  aName: 'Sisu - Divine Water Dragon',
  bName: 'Raya - Leader of Heart',
  score: null,
  accuracy: null,
  isReal: true,
  wouldPlay: null,
  difficulty: null,
  whoCarries: null,
  ts: '',
  voter: 1,
};

/** Build a VoteLogRow fixture over the shared default pair. */
const vote = (v: Partial<VoteLogRow>): VoteLogRow => ({...DEFAULT_VOTE, ...v});

const VOTES: VoteLogRow[] = [
  vote({voter: 1, score: 8, accuracy: -1, wouldPlay: true, ts: '2026-06-28T14:02:00Z'}),
  vote({voter: 2, score: 5, accuracy: 0, wouldPlay: false, ts: '2026-06-29T09:41:00Z'}),
  vote({voter: 3, score: 3, accuracy: 1, wouldPlay: null, ts: '2026-06-30T22:15:00Z'}),
  // A quick vote: no score, so the pill is the neutral dash.
  vote({voter: 4, ts: '2026-07-01T08:30:00Z'}),
];

const PAIR = {
  a: 'crd_a',
  b: 'crd_b',
  aName: 'Sisu - Divine Water Dragon',
  bName: 'Raya - Leader of Heart',
  engineScore: 8,
};

export const WithVotes: Story = {args: {pair: PAIR, votes: VOTES}};

/** No pair selected yet. */
export const Empty: Story = {args: {pair: null, votes: []}};

/** A pair the vote log holds no votes for. */
export const NoVotes: Story = {args: {pair: PAIR, votes: []}};

/** The vote log is still loading: the notice stands in for the table. */
export const Loading: Story = {args: {pair: PAIR, votes: [], notice: 'Loading the vote log…'}};

/**
 * In the shell (R-33): Sisu is in the card list, so its name links to its card
 * page; Raya isn't (rotated out of Core, say), so its name stays text.
 */
export const CardLinks: Story = {
  args: {pair: PAIR, votes: VOTES},
  decorators: [
    (Story) => (
      <MemoryRouter>
        <KnownCardsContext value={(id) => id === 'crd_a'}>
          <Story />
        </KnownCardsContext>
      </MemoryRouter>
    ),
  ],
};

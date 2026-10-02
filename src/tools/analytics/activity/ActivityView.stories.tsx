import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {VoteLog, VoteLogRow} from '../voteLogTypes';
import {ActivityView} from './ActivityView';

const DAY_MS = 24 * 60 * 60 * 1000;

// Card ids in canonical order (a < b), as buildVoteLog writes them.
const PAIRS = [
  {a: '1012', b: '1388', aName: 'Elsa - Spirit of Winter', bName: 'Anna - Heir to Arendelle'},
  {a: '0441', b: '0902', aName: 'Maui - Hero to All', bName: 'Moana - Of Motunui'},
  {a: '0215', b: '0733', aName: 'Scar - Shameless Firebrand', bName: 'Simba - Returned King'},
  {a: '0118', b: '0264', aName: 'Belle - Strange but Special', bName: 'Beast - Hardheaded'},
  {a: '1530', b: '1702', aName: 'Ariel - Spectacular Singer', bName: 'Ursula - Power Hungry'},
  {a: '0377', b: '0391', aName: 'Stitch - Rock Star', bName: 'Lilo - Making a Wish'},
  {a: '0820', b: '1145', aName: 'Jafar - Wickedly Powerful', bName: 'Iago - Loud-Mouthed Parrot'},
  {a: '0602', b: '0658', aName: 'Mickey Mouse - Brave Little Tailor', bName: 'Goofy - Musketeer'},
];

/**
 * `days` days of sample votes ending Wed Sep 30 2026, newest first: quieter
 * weekends, a few empty days, about a third quick votes with no score, and most
 * carries left at the one-click default 'both'. A fixed-seed generator keeps
 * every render the same.
 */
function sampleLog(days: number): VoteLog {
  let seed = 20260930;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const start = Date.UTC(2026, 8, 30) - (days - 1) * DAY_MS;
  const votes: VoteLogRow[] = [];
  for (let d = 0; d < days; d++) {
    const weekday = new Date(start + d * DAY_MS).getUTCDay();
    const quiet = weekday === 0 || weekday === 6;
    const count = d % 17 === 5 ? 0 : 4 + Math.floor(next() * (quiet ? 12 : 40));
    for (let i = 0; i < count; i++) {
      const pair = PAIRS[Math.floor(next() * PAIRS.length)];
      const quick = next() < 0.35;
      votes.push({
        ...pair,
        score: quick ? null : 1 + Math.floor(next() * 10),
        accuracy: Math.floor(next() * 3) - 1,
        isReal: quick ? null : next() < 0.9,
        wouldPlay: quick ? null : next() < 0.6,
        difficulty: quick ? null : 1 + Math.floor(next() * 3),
        whoCarries: quick ? null : next() < 0.85 ? 'both' : (['a', 'b', 'neither'] as const)[Math.floor(next() * 3)],
        ts: new Date(start + d * DAY_MS + Math.floor(next() * DAY_MS)).toISOString(),
        voter: 1 + Math.floor(next() ** 2 * 40),
      });
    }
  }
  votes.sort((x, y) => (x.ts < y.ts ? 1 : x.ts > y.ts ? -1 : 0));
  return {generatedAt: '2026-10-01T04:00:00.000Z', votes, voterCount: 40};
}

/** Ten weeks, Jul 23 to Sep 30: every range charts per day. */
const LOG = sampleLog(70);
/** Six months, Apr 2 to Sep 30: All runs past 90 days, so it charts per week. */
const HALF_YEAR = sampleLog(182);

const meta: Meta<typeof ActivityView> = {
  title: 'Admin/Insights/Vote activity',
  component: ActivityView,
  tags: ['autodocs'],
  // ActivityView renders PageLayout's body: a one-column grid. .storybook/preview.tsx mounts AdminStyles.
  decorators: [
    (Story) => (
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
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on the last 30 days; 90 days and All still chart per day. */
export const Default: Story = {args: {voteLog: LOG}};

/** Pick All: the range runs past 90 days, so the chart switches to weeks ("Week of Mar 30" first). */
export const HalfYear: Story = {args: {voteLog: HALF_YEAR}};

/** Three days of votes: every range starts at the oldest vote, so the chart has three bars. */
export const FewDays: Story = {
  args: {voteLog: {...LOG, votes: LOG.votes.filter((v) => v.ts >= '2026-09-28')}},
};

export const Loading: Story = {args: {voteLog: null}};

export const LoadError: Story = {
  args: {voteLog: null, error: new Error('vote-log.json has not been generated yet')},
};

/** What a Deploy without SUPABASE_SERVICE_ROLE_KEY writes. */
export const NoRawVotes: Story = {
  args: {voteLog: {generatedAt: '2026-10-01T04:00:00.000Z', votes: [], voterCount: 0}},
};

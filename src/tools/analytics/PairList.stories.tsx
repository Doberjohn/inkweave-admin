import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {PairList} from './PairList';
import type {PairStat} from './voteAnalyticsTypes';

const meta: Meta<typeof PairList> = {
  title: 'Admin/Insights/Calibration/Pair list',
  component: PairList,
  tags: ['autodocs'],
  // One column of the page's pairs-and-votes grid. .storybook/preview.tsx
  // mounts AdminStyles (adm-row-btn) and the page background.
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

const DEFAULT_PAIR: PairStat = {
  a: 'a',
  b: 'b',
  aName: '',
  bName: '',
  engineScore: 0,
  communityScore: 0,
  gap: 0,
  scoreVotes: 1,
  rules: ['ramp'],
};

/**
 * Build a PairStat fixture. The gap defaults to communityScore - engineScore,
 * rounded to two places as the precompute rounds it.
 */
const pair = (p: Partial<PairStat>): PairStat => {
  const merged = {...DEFAULT_PAIR, ...p};
  return {...merged, gap: p.gap ?? Math.round((merged.communityScore - merged.engineScore) * 100) / 100};
};

const PAIRS: PairStat[] = [
  // Widest gap first, as the parent sorts them.
  pair({a: 'crd_c', b: 'crd_d', aName: 'Maui - Hero to All', bName: 'Moana - Of Motunui', engineScore: 7, communityScore: 4, scoreVotes: 1}),
  pair({a: 'crd_g', b: 'crd_h', aName: 'Mickey Mouse - Brave Little Tailor', bName: 'Donald Duck - Boisterous Fowl', engineScore: 3, communityScore: 6, scoreVotes: 2}),
  // An average of three votes: the precompute rounds it to two places.
  pair({a: 'crd_a', b: 'crd_b', aName: 'Sisu - Divine Water Dragon', bName: 'Raya - Leader of Heart', engineScore: 8, communityScore: 5.33, scoreVotes: 3}),
  pair({a: 'crd_e', b: 'crd_f', aName: 'Elsa - Snow Queen', bName: 'Anna - Heir to Arendelle', engineScore: 6, communityScore: 6, scoreVotes: 1}),
];

const noop = () => {};

export const Default: Story = {args: {pairs: PAIRS, selectedPair: null, onSelectPair: noop}};

export const WithSelection: Story = {
  args: {pairs: PAIRS, selectedPair: {a: 'crd_c', b: 'crd_d'}, onSelectPair: noop},
};

/** A rule with no voted pairs: the workspace passes the rule's empty copy. */
export const Empty: Story = {
  args: {pairs: [], selectedPair: null, onSelectPair: noop, emptyText: 'No voted pairs for this rule yet.'},
};

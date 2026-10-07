import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {CtaButton} from '../../../app-bridge';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {CardAnalyticsView} from './CardAnalyticsView';
import {
  CARD_500,
  CARD_ID,
  EMPTY_LOG,
  LOADING,
  MAUI_CARD,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  VIEW_ANALYTICS,
  VIEW_LOG,
  loaded,
  lorcanaCard,
  pairStat,
  viewCard,
} from './cardFixtures';

/** A phone-width column: every row stacks. */
const NARROW = 375;

const meta: Meta<typeof CardAnalyticsView> = {
  title: 'Admin/Insights/Card analytics/View',
  component: CardAnalyticsView,
  tags: ['autodocs'],
  // The partner and rule links need a router. The view sits in the page's own
  // header, as R3-7's page will put it, so the meta line shows DataAsOf once
  // vote analytics has loaded (R-54). .storybook/preview.tsx mounts AdminStyles.
  decorators: [
    (Story, {args}) => (
      <MemoryRouter>
        <PageLayout
          title="Card analytics"
          subtitle="Votes, calibration and engine data for one card"
          meta={args.analytics?.data ? <DataAsOf generatedAt={args.analytics.data.generatedAt} /> : undefined}>
          <Story />
        </PageLayout>
      </MemoryRouter>
    ),
  ],
  args: {card: MAUI_CARD, analytics: loaded(VIEW_ANALYTICS), voteLog: loaded(VIEW_LOG), getCardById: viewCard},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Maui: enough score votes to judge, raw votes, two engine-silent pairs, and a partner the card list lacks. */
export const Default: Story = {};

/** Card 500: four score votes, so no verdict and no dot; no version, rarity, number or image; two inks. */
export const LowN: Story = {args: {card: CARD_500}};

/** A deploy without the service-role key: no raw KPIs, and Voted pairs says why it can't count engine-silent pairs. */
export const NoRawVotes: Story = {args: {analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)}};

/** A card in no pairs[] row, that nobody has voted on: the header and one notice. */
export const NoVotes: Story = {args: {card: lorcanaCard({id: '9999', name: 'Elsa', version: 'Snow Queen', rarity: 'Legendary'})}};

/** Local dev: vote analytics was never generated. The header and the raw KPIs still show. */
export const AnalyticsNotGenerated: Story = {args: {analytics: NOT_GENERATED}};

export const AnalyticsLoading: Story = {args: {analytics: LOADING, voteLog: LOADING}};

/** R4's slot: "Edit in Card studio" at the right of the card header. */
export const HeaderActions: Story = {
  args: {
    headerActions: (
      <CtaButton type="button" variant="neutral">
        Edit in Card studio
      </CtaButton>
    ),
  },
};

/** Fourteen more partners for Maui, none of them in the card list, at gaps from 0 to −1.5. */
const MORE_PAIRS = Array.from({length: 14}, (_, i) =>
  pairStat({a: CARD_ID, b: String(1300 + i), bName: `Partner ${i + 1}`, engineScore: 7, communityScore: 7 - (i % 4) * 0.5}),
);

/** Nineteen voted pairs: the list scrolls inside its panel past about ten rows, under a head that stays put. */
export const ManyPairs: Story = {
  args: {analytics: loaded({...VIEW_ANALYTICS, pairs: [...VIEW_ANALYTICS.pairs, ...MORE_PAIRS]})},
};

/** At phone width: the KPIs wrap, and Voted pairs stacks under the calibration. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{maxWidth: NARROW}}>
        <Story />
      </div>
    ),
  ],
};

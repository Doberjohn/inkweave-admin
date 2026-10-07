import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {ANALYTICS} from '../overview/overviewFixtures';
import {
  ENGINE_CAPPED,
  ENGINE_CARD,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  partnerLookup,
  type EngineFixture,
} from './cardFixtures';
import {EnginePanels, type EnginePanelsProps} from './EnginePanels';

/** Retry in a story: a static read can't change, so it does nothing. */
const retry = () => {};

/** A settled read of the fixture's file, as useCardSynergies returns it, and the card list's lookup. */
function engineArgs(fixture: EngineFixture): Pick<EnginePanelsProps, 'synergies' | 'getCardById'> {
  return {synergies: {data: fixture.data, loading: false, error: null, retry}, getCardById: partnerLookup(fixture)};
}

const meta: Meta<typeof EnginePanels> = {
  title: 'Admin/Insights/Card analytics/Engine panels',
  component: EnginePanels,
  // The node links are react-router Links, so the story needs a router. The
  // frame stands in for the card view's body: the page colour, its padding and
  // its one-column grid, so the two panels sit apart as they will on the page.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: SPACING.xxl,
            background: ADMIN_COLORS.page,
            color: ADMIN_COLORS.text,
            fontFamily: FONTS.body,
            padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {card: ENGINE_CARD, analytics: {data: ANALYTICS, loading: false, error: null}, ...engineArgs(ENGINE_FIFTEEN)},
};
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 15 partners: the cut at twelve falls inside the eight at score 7, so the
 * subtitle names the tie, and "and 3 more in the table" opens the table.
 */
export const FifteenPartners: Story = {};

/**
 * A group at the engine's cap: "At least 142", all twelve drawn from the 30
 * tied at 8. Vote analytics are still loading, so the caption has no date.
 */
export const Capped: Story = {
  args: {...engineArgs(ENGINE_CAPPED), analytics: {data: null, loading: true, error: null}},
};

/** One partner: one ring, and every tier in the split, three of them at 0%. */
export const OnePartner: Story = {args: engineArgs(ENGINE_ONE_PARTNER)};

/** No synergy file, or an empty one: the hedged empty copy, and no network panel. */
export const NoSynergies: Story = {args: engineArgs(ENGINE_EMPTY)};

export const Loading: Story = {args: {synergies: {data: null, loading: true, error: null, retry}}};

/** A failed read, with Retry (R-45). */
export const Failed: Story = {
  args: {synergies: {data: null, loading: false, error: new Error('Failed to fetch'), retry}},
};

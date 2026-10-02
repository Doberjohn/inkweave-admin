import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {WebAnalyticsBody} from './WebAnalyticsBody';
import type {TrendPoint, VercelAnalytics} from '../vercelAnalyticsTypes';

const meta: Meta<typeof WebAnalyticsBody> = {
  title: 'Admin/Insights/Web analytics',
  component: WebAnalyticsBody,
  parameters: {layout: 'fullscreen'},
  tags: ['autodocs'],
  // The page body's frame (PageLayout's padding on the admin page colour). The
  // event cards' adm-card-btn states come from .storybook/preview.tsx, which
  // mounts AdminStyles for every story. The trend card is the chart kit's
  // ChartFrame and LineChart (R1-3b), so its crosshair, tooltip and table view
  // are the kit's own.
  decorators: [
    (Story) => (
      <div
        style={{
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
          padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          minHeight: '100vh',
        }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Deterministic sawtooth trend over June, so the charts look alive without random data. */
function trend(base: number): TrendPoint[] {
  return Array.from({length: 30}, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    count: base + ((i * 7) % 11),
  }));
}

const populated: VercelAnalytics = {
  generatedAt: '2026-07-03T12:00:00.000Z',
  hasVercelData: true,
  // The window the trend() points fill.
  reportingWindow: {since: '2026-06-01', until: '2026-06-30'},
  events: [
    {
      name: 'reveal_card_click',
      label: 'Reveal card clicks',
      total: 4820,
      visitors: 1310,
      trend: trend(30),
      breakdowns: [
        {
          prop: 'source',
          label: 'By source',
          rows: [
            {value: 'mosaic', count: 3120, visitors: 980},
            {value: 'franchise_modal', count: 1700, visitors: 610},
          ],
        },
        {
          prop: 'franchise',
          label: 'By franchise',
          rows: [
            {value: 'Frozen', count: 1400, visitors: 520},
            {value: 'The Little Mermaid', count: 1100, visitors: 430},
            {value: 'Mulan', count: 820, visitors: 300},
            {value: 'Peter Pan', count: 700, visitors: 260},
            // Events that sent no franchise: the row reads "(not set)".
            {value: '', count: 380, visitors: 150},
            {value: 'Others', count: 800, visitors: 300},
          ],
        },
        {
          prop: 'ink',
          label: 'By ink',
          rows: [
            {value: 'Amber', count: 990, visitors: 420},
            {value: 'Emerald', count: 880, visitors: 390},
            {value: 'Ruby', count: 760, visitors: 340},
            {value: 'Sapphire', count: 720, visitors: 300},
            {value: 'Amethyst', count: 700, visitors: 290},
            {value: 'Steel', count: 770, visitors: 310},
          ],
        },
        {
          prop: 'type',
          label: 'By card type',
          rows: [
            {value: 'Character', count: 3600, visitors: 1120},
            {value: 'Action', count: 700, visitors: 300},
            {value: 'Item', count: 320, visitors: 150},
            {value: 'Location', count: 200, visitors: 90},
          ],
        },
        {
          prop: 'rarity',
          label: 'By rarity',
          rows: [
            {value: 'Common', count: 1200, visitors: 500},
            {value: 'Uncommon', count: 980, visitors: 420},
            {value: 'Rare', count: 900, visitors: 380},
            {value: 'Super Rare', count: 820, visitors: 340},
            {value: 'Legendary', count: 620, visitors: 260},
            {value: 'Enchanted', count: 300, visitors: 140},
          ],
        },
        {
          prop: 'deviceType',
          label: 'By device',
          rows: [
            {value: 'desktop', count: 3100, visitors: 900},
            {value: 'mobile', count: 1500, visitors: 520},
            {value: 'tablet', count: 220, visitors: 90},
          ],
        },
      ],
    },
    {
      name: 'vote_submitted',
      label: 'Votes submitted',
      total: 1240,
      visitors: 410,
      trend: trend(8),
      breakdowns: [
        {
          prop: 'voteType',
          label: 'By vote type',
          rows: [
            {value: 'quick', count: 720, visitors: 260},
            {value: 'score', count: 360, visitors: 140},
            {value: 'in_depth', count: 160, visitors: 70},
          ],
        },
        {
          prop: 'engineScore',
          label: 'By engine score',
          rows: [
            {value: '3', count: 60, visitors: 40},
            {value: '4', count: 120, visitors: 70},
            {value: '5', count: 260, visitors: 120},
            {value: '6', count: 240, visitors: 110},
            {value: '7', count: 300, visitors: 130},
            {value: '8', count: 180, visitors: 90},
            {value: '9', count: 80, visitors: 50},
          ],
        },
        {
          prop: 'userScore',
          label: 'By user score',
          rows: [
            {value: '4', count: 90, visitors: 60},
            {value: '5', count: 150, visitors: 90},
            {value: '6', count: 210, visitors: 110},
            {value: '7', count: 300, visitors: 140},
            {value: '8', count: 260, visitors: 120},
            {value: '9', count: 150, visitors: 80},
            {value: '10', count: 80, visitors: 50},
          ],
        },
        {
          prop: 'deviceType',
          label: 'By device',
          rows: [
            {value: 'desktop', count: 820, visitors: 300},
            {value: 'mobile', count: 380, visitors: 150},
            {value: 'tablet', count: 40, visitors: 20},
          ],
        },
      ],
    },
    {
      name: 'search_submitted',
      label: 'Searches',
      total: 2010,
      visitors: 640,
      trend: trend(14),
      breakdowns: [
        {
          prop: 'source',
          label: 'By source',
          rows: [
            {value: 'home', count: 1200, visitors: 410},
            {value: 'gallery', count: 540, visitors: 190},
            {value: 'mobile_sheet', count: 270, visitors: 110},
          ],
        },
        {
          prop: 'query',
          label: 'Top queries',
          rows: [
            {value: 'elsa', count: 210, visitors: 120},
            {value: 'shift', count: 180, visitors: 90},
            {value: 'seven dwarfs', count: 150, visitors: 80},
            {value: 'Others', count: 1470, visitors: 520},
          ],
        },
      ],
    },
    {
      name: 'vote_skipped',
      label: 'Votes skipped',
      total: 330,
      visitors: 120,
      trend: trend(2),
      breakdowns: [
        {
          prop: 'engineScore',
          label: 'By engine score',
          rows: [
            {value: '2', count: 90, visitors: 50},
            {value: '3', count: 120, visitors: 60},
            {value: '4', count: 70, visitors: 40},
            {value: '5', count: 30, visitors: 20},
            {value: '6', count: 20, visitors: 12},
          ],
        },
      ],
    },
  ],
};

/**
 * Four events over June. Hover the trend, or tab to it and use the arrow keys,
 * Home and End: the crosshair snaps to a day and the tooltip reads it ("Jun 16")
 * with its count. Table swaps the chart for all 30 days.
 */
export const Populated: Story = {args: {analytics: populated}};

/**
 * The edges of real data: one event with a single day of data in a 61-day
 * window (the other 60 fill as zeros), one with no days and no breakdowns,
 * and an empty breakdown.
 */
export const SparseEvents: Story = {
  args: {
    analytics: {
      generatedAt: '2026-09-30T04:00:00.000Z',
      hasVercelData: true,
      reportingWindow: {since: '2026-08-01', until: '2026-09-30'},
      events: [
        {
          name: 'synergy_card_clicked',
          label: 'Synergy cards followed',
          total: 64,
          visitors: 21,
          trend: [{date: '2026-09-30', count: 5}],
          breakdowns: [
            {
              prop: 'clickedCardInk',
              label: 'By ink',
              rows: [
                {value: 'Sapphire', count: 3, visitors: 2},
                {value: 'Ruby', count: 2, visitors: 2},
              ],
            },
            {prop: 'groupKey', label: 'By synergy group', rows: []},
          ],
        },
        {name: 'sort_changed', label: 'Sort changes', total: 9, visitors: 4, trend: [], breakdowns: []},
      ],
    },
  },
};

/**
 * No reporting window and one day of data: the chart has one point and one
 * label, and the table one row.
 */
export const OneDayTrend: Story = {
  args: {
    analytics: {
      generatedAt: '2026-09-30T04:00:00.000Z',
      hasVercelData: true,
      reportingWindow: null,
      events: [
        {
          name: 'vote_skipped',
          label: 'Votes skipped',
          total: 230,
          visitors: 90,
          trend: [{date: '2026-09-30', count: 3}],
          breakdowns: [],
        },
      ],
    },
  },
};

export const Loading: Story = {args: {analytics: null}};

export const LoadError: Story = {
  args: {analytics: null, error: new Error('vercel-analytics.json has not been generated yet')},
};

export const NoToken: Story = {
  args: {
    analytics: {
      generatedAt: '2026-07-03T12:00:00.000Z',
      hasVercelData: false,
      reportingWindow: null,
      events: [],
    },
  },
};

export const NoEvents: Story = {
  args: {
    analytics: {
      generatedAt: '2026-07-03T12:00:00.000Z',
      hasVercelData: true,
      reportingWindow: {since: '2026-05-04', until: '2026-07-03'},
      events: [],
    },
  },
};

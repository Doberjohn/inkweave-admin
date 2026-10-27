import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {within} from 'storybook/test';
import {FONTS, LinkButton, SPACING, TABULAR, TIER_COLORS, Tag} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {ArtLink} from './ArtLink';
import {BiasBar} from './BiasBar';
import {CardId} from './CardId';
import {fmtGap, fmtInt} from './format';
import {KpiCard} from './KpiCard';
import {LowNTag} from './LowNTag';
import {MeterBar} from './MeterBar';
import {Panel} from './Panel';
import {RawTag} from './RawTag';
import {ScorePill} from './ScorePill';
import {SegmentedControl} from './SegmentedControl';
import {Sparkline} from './Sparkline';
import {SplitMeter, type SplitMeterPart} from './SplitMeter';

const meta: Meta = {
  title: 'Admin/UI/Primitives',
  parameters: {layout: 'fullscreen'},
  // The admin page: its background, text colour and body font. The adm-* classes
  // SegmentedControl relies on come from .storybook/preview.tsx, which mounts
  // AdminStyles for every story.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.xxxl,
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
type Story = StoryObj;

/** One column with the page body's rhythm. */
function Stack({children}: {children: React.ReactNode}) {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl, maxWidth: 960}}>{children}</div>
  );
}

export const KpiCards: Story = {
  render: () => (
    <div
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: SPACING.md, maxWidth: 960}}>
      <KpiCard label="Total votes" value={fmtInt(2054)} hint="all-time" />
      <KpiCard label="Pairs covered" value={fmtInt(1928)} hint="distinct card pairs" />
      <KpiCard label="Distinct voters" value={fmtInt(114)} hint="from raw vote log" tag={<RawTag />} />
      <KpiCard label="Engine-silent pairs" value={fmtInt(196)} hint="voted, no synergy" valueColor={ADMIN_COLORS.accent} />
    </div>
  ),
};

const RULES = [
  {name: 'Ramp', gap: -0.57},
  {name: 'Shift targets', gap: 0.83},
  {name: 'Location payoff', gap: -2.9},
  {name: 'Song support', gap: null},
];

const VOTES = [
  {pair: 'Maui × Fishhook', score: 5},
  {pair: 'Elsa - Spirit × Elsa - Snow Queen', score: 8},
  {pair: 'Cogsworth × Beast’s Castle', score: null},
];

const CELL: React.CSSProperties = {padding: `${SPACING.sm}px ${SPACING.lg}px`, textAlign: 'left'};

export const Panels: Story = {
  render: () => (
    <Stack>
      <Panel
        title="Rules to review"
        action={
          <LinkButton type="button" size="sm" onClick={() => {}}>
            Open calibration →
          </LinkButton>
        }>
        {RULES.map((rule) => (
          <div
            key={rule.name}
            style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px 56px', gap: SPACING.md, alignItems: 'center'}}>
            <span>{rule.name}</span>
            <BiasBar gap={rule.gap} />
            <span style={{...TABULAR, textAlign: 'right'}}>{fmtGap(rule.gap)}</span>
          </div>
        ))}
      </Panel>
      <Panel title="Vote log" action="3 votes · 3 voters" padded={false}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{color: ADMIN_COLORS.muted}}>
              <th scope="col" style={CELL}>
                Pair
              </th>
              <th scope="col" style={CELL}>
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {VOTES.map((vote) => (
              <tr key={vote.pair} style={{borderTop: `1px solid ${ADMIN_COLORS.divider}`}}>
                <td style={CELL}>{vote.pair}</td>
                <td style={CELL}>
                  <ScorePill score={vote.score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel>
        <span style={{color: ADMIN_COLORS.muted}}>A panel with no header.</span>
      </Panel>
    </Stack>
  ),
};

type Band = 'all' | 'high' | 'mid' | 'low' | 'unscored';
const BANDS: ReadonlyArray<{value: Band; label: string}> = [
  {value: 'all', label: 'All'},
  {value: 'high', label: '7+'},
  {value: 'mid', label: '5–6'},
  {value: 'low', label: '≤4'},
  {value: 'unscored', label: 'No score'},
];

function SegmentedDemo() {
  const [band, setBand] = useState<Band>('all');
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: SPACING.md}}>
      <SegmentedControl ariaLabel="Score band" options={BANDS} value={band} onChange={setBand} />
      <span style={{color: ADMIN_COLORS.muted}}>Selected: {band}</span>
    </div>
  );
}

export const Segmented: Story = {render: () => <SegmentedDemo />};

const SHARES = [1, 0.62, 0.3, 0.05];
const GAPS = [-4, -1.2, -0.3, 0, null, 0.3, 1.2, 4];

export const Bars: Story = {
  render: () => (
    <Stack>
      <Panel title="MeterBar">
        {SHARES.map((share) => (
          <MeterBar key={share} fraction={share} color={ADMIN_COLORS.accent} label={`${Math.round(share * 100)}%`} />
        ))}
      </Panel>
      <Panel title="BiasBar, full scale ±2.5">
        {GAPS.map((gap) => (
          <div
            key={String(gap)}
            style={{display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', gap: SPACING.md, alignItems: 'center'}}>
            <span style={{...TABULAR, textAlign: 'right'}}>{fmtGap(gap)}</span>
            <BiasBar gap={gap} />
          </div>
        ))}
      </Panel>
    </Stack>
  ),
};

const ANSWERS = [
  {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
  {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
  {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
] as const;

/** The three accuracy answers with these counts, too high to too low. */
function answers(counts: Record<(typeof ANSWERS)[number]['id'], number>): SplitMeterPart[] {
  return ANSWERS.map((part) => ({...part, value: counts[part.id]}));
}

/** A card's partners by strength tier: the app's tier colours, its getStrengthTier thresholds. */
const TIERS: SplitMeterPart[] = [
  {id: 'Perfect', label: 'Perfect ≥9.5', color: TIER_COLORS.perfect.color, value: 6},
  {id: 'Strong', label: 'Strong ≥7', color: TIER_COLORS.strong.color, value: 41},
  {id: 'Moderate', label: 'Moderate ≥4', color: TIER_COLORS.moderate.color, value: 77},
  {id: 'Weak', label: 'Weak <4', color: TIER_COLORS.weak.color, value: 18},
];

const ACCURACY_NAME = 'Is the engine’s score right?';

export const SplitMeters: Story = {
  render: () => (
    <Stack>
      <Panel title="SplitMeter: the accuracy answers">
        <SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 8})} ariaLabel={ACCURACY_NAME} />
      </Panel>
      <Panel title="A part with no answers keeps its legend row">
        <SplitMeter parts={answers({tooHigh: 0, right: 9, tooLow: 3})} ariaLabel={ACCURACY_NAME} />
      </Panel>
      <Panel title="One answer in 400: a 4px sliver that reads <1%">
        <SplitMeter parts={answers({tooHigh: 1, right: 399, tooLow: 0})} ariaLabel={ACCURACY_NAME} />
      </Panel>
      <Panel title="Partners by strength tier">
        <SplitMeter parts={TIERS} ariaLabel="Partners by strength tier" />
      </Panel>
      <div style={{maxWidth: 376}}>
        <Panel title="At R3’s two-up chart track, 376px: the legend wraps">
          <SplitMeter parts={TIERS} ariaLabel="Partners by strength tier" />
        </Panel>
      </div>
      <Panel title="No answers yet">
        <SplitMeter parts={answers({tooHigh: 0, right: 0, tooLow: 0})} ariaLabel={ACCURACY_NAME} />
      </Panel>
    </Stack>
  ),
};

const TAG_ROW: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm};

/**
 * The informative tags, all one chip (Tag): "low n" beside a name with few
 * score votes, "raw" beside a number from the vote log, and Card studio's
 * tags beside a card's name (R4-5f).
 */
export const Tags: Story = {
  render: () => (
    <Stack>
      <div style={TAG_ROW}>
        <span>Location Boost</span>
        <LowNTag minVotes={10} />
      </div>
      <div style={TAG_ROW}>
        <span>Distinct voters</span>
        <RawTag />
      </div>
      <div style={TAG_ROW}>
        <span>Mei</span>
        <Tag title="Its data comes from previewCards.json">preview</Tag>
        <Tag title="In previewCards.json, not on inkweave.ink yet">not deployed yet</Tag>
      </div>
    </Stack>
  ),
};

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 6.5, null];

export const ScorePills: Story = {
  render: () => (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.sm}}>
      {SCORES.map((score) => (
        <ScorePill key={String(score)} score={score} />
      ))}
    </div>
  ),
};

/** A deterministic sawtooth, so every Sparkline story draws the same sample trend. */
const TREND = Array.from({length: 30}, (_, i) => 30 + ((i * 7) % 11));

export const Sparklines: Story = {
  render: () => (
    <Stack>
      <Panel title="Default: accent, 56px">
        <Sparkline data={TREND} />
      </Panel>
      <Panel title="Unselected event card: neutral, 28px">
        <Sparkline data={TREND} color={ADMIN_COLORS.barNeutral} height={28} />
      </Panel>
      <Panel title="One point: renders nothing">
        <Sparkline data={[4]} />
      </Panel>
    </Stack>
  ),
};

/**
 * Cards from the card list with their thumbnails, at the paths admin's card
 * list gives them (behind the /card-images/ proxy), and a card it holds no art
 * for.
 */
const CARD_NAMES: readonly {id: string; name: string; art?: string}[] = [
  {id: '1989', name: 'Elsa - Snow Queen', art: '/card-images/en/set9/53_87e3a777fb5850d8a7d76d8426c984c755246cb0.jpg'},
  {id: '1956', name: 'Moana - Of Motunui', art: '/card-images/en/set9/20_543357372cf43045db35b608d931b96db1918432.jpg'},
  {id: '1939', name: 'Stitch - Rock Star', art: '/card-images/en/set9/3_8e23303ce8e562819b0df3e15ac4df1c614c629c.jpg'},
  {id: '301', name: 'Wren Ashdown - Keeper of Keys'},
  {id: '2983', name: 'Pocahontas - Guiding the Tribe', art: '/card-images/en/set13/12_25a881827d54e9214c236aa95d2475a3dfd8ebce.jpg'},
  {id: '2042', name: 'Maui - Whale', art: '/card-images/en/set9/106_dbde541ad67d9e466ee7dbb820d0dd5b7abfb547.jpg'},
  {id: '3328', name: 'Un Poco Loco', art: '/card-images/en/set14/63_5d1d176f2213bf280ad6de168f2c514861dc72b2.jpg'},
];

const NAME_LIST: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: SPACING.sm};

/** The card header's facts line (CardHeader's FACTS), which ends with the id. */
const FACTS_LINE: React.CSSProperties = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: SPACING.md,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.muted,
};

/**
 * The open card's id as the card header and Edit card's banner print it
 * (CardId), then card names as data links (ArtLink). Resting the pointer on a
 * name for 150 ms, or tabbing to it, shows the card's art above it, or below
 * it where the window's top leaves no room. The play focuses Un Poco Loco.
 * Wren Ashdown has no art in the card list, so hers is a plain link.
 */
export const CardLinks: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <Stack>
      <Panel title="Card id">
        <p style={FACTS_LINE}>
          <span>Action · cost 3 · inkable</span>
          <code>#63</code>
          <CardId id="3328" />
        </p>
      </Panel>
      <Panel title="Card names">
        <ul style={NAME_LIST}>
          {CARD_NAMES.map(({id, name, art}) => (
            <li key={id}>
              <ArtLink to={`/cards/${id}`} art={art}>
                {name}
              </ArtLink>
            </li>
          ))}
        </ul>
      </Panel>
    </Stack>
  ),
  play: async ({canvasElement}) => {
    within(canvasElement).getByRole('link', {name: 'Un Poco Loco'}).focus();
  },
};

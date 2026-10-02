import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, LinkButton, SPACING} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {BiasBar} from './BiasBar';
import {fmtGap, fmtInt} from './format';
import {KpiCard} from './KpiCard';
import {MeterBar} from './MeterBar';
import {Notice} from './Notice';
import {Panel} from './Panel';
import {RawTag} from './RawTag';
import {ScorePill} from './ScorePill';
import {SegmentedControl} from './SegmentedControl';
import {Sparkline} from './Sparkline';

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
            <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtGap(rule.gap)}</span>
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
            <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtGap(gap)}</span>
            <BiasBar gap={gap} />
          </div>
        ))}
      </Panel>
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

export const Notices: Story = {
  render: () => (
    <Stack>
      <Notice>Loading analytics...</Notice>
      <Notice>
        No raw votes yet. Set the <code style={{color: ADMIN_COLORS.accent}}>SUPABASE_SERVICE_ROLE_KEY</code> Actions
        secret, then re-run admin&apos;s Deploy workflow.
      </Notice>
      <Notice tone="error">Could not load vote analytics (vote-analytics.json has not been generated yet).</Notice>
    </Stack>
  ),
};

/** A deterministic sawtooth: the sample trend WebAnalyticsView's stories used. */
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

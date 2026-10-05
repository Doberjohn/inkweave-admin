import {useRef, useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {LinkButton, SPACING} from '../../../app-bridge';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {DimensionParticipation} from '../DimensionParticipation';
import {PairList} from '../PairList';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import {VoteDetailTable} from '../VoteDetailTable';
import type {PairStat, VoteAnalytics} from '../voteAnalyticsTypes';
import {CalibrationScatter} from './CalibrationScatter';
import {GapHistogram} from './GapHistogram';
import {RulesTable} from './RulesTable';
import {TuningAside, type TuningState} from './TuningAside';
import {WeeklyGapTrend} from './WeeklyGapTrend';
import {
  buildCalibrationRows,
  editedKeys,
  findPair,
  findRow,
  pairsFor,
  pairsHeading,
  pairsInScope,
  rowsSharingKey,
  votesForPair,
  withSelectedPair,
  type CalibrationRow,
} from './calibrationModel';
import {weeklyGaps} from './chartData';

type PairPick = {a: string; b: string};

export interface CalibrationWorkspaceProps {
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  /** Both tuning hooks, once a token is saved (CalibrationPage's TunedWorkspace). Null: the aside asks for a token. */
  tuning: TuningState | null;
  onSaveToken: (token: string) => void;
  /** Clears the shared token: the aside's way out when GitHub rejects it (R-26). */
  onForgetToken: () => void;
  /** ?rule=: a row id, or a tuning key that findRow resolves to its first rule. */
  selectedId: string | null;
  /** Writes ?rule=; null clears it. */
  onSelect: (id: string | null) => void;
}

// The two columns meet on a 1px rule: the row's border fill shows through the
// gap, down the seam side by side and across it once the aside wraps under.
const COLUMNS: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  minHeight: '100%',
  background: ADMIN_COLORS.border,
};

// The page body's grid (PageLayout's BODY) on the page colour, with the page's side gutter.
const LEFT: React.CSSProperties = {
  flex: '999 1 520px',
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignContent: 'start',
  gap: SPACING.xxl,
  padding: `${SPACING.xxl}px ${PAGE_GUTTER}`,
  background: ADMIN_COLORS.page,
};

// The aside's tint is translucent, so it goes over the page colour, or the seam's fill would show through it.
const ASIDE: React.CSSProperties = {
  flex: '1 1 340px',
  minWidth: 0,
  background: `linear-gradient(${ADMIN_COLORS.aside}, ${ADMIN_COLORS.aside}), ${ADMIN_COLORS.page}`,
};

/**
 * Two panels side by side once the column holds two tracks and the gap, stacked
 * below that. A chart's padded Panel takes 42px of its track, so the plot is the
 * track less 42px, and ChartTooltip needs 304px of it: no track under 346px.
 */
function twoUp(track: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${track}px), 1fr))`,
    gap: SPACING.xl,
    alignItems: 'start',
  };
}

// The charts row's track is 376px, two-up from 772px of column, not the 346px
// the tooltip needs. The histogram prints all eleven bin labels only from a
// 334px plot (376 − 42): below that it thins them to every other one, and in a
// 712 to 772px column, where a 346px track would already sit two-up, the centre
// "0" bin lost its label. At 376px the plot is 334px or more whenever the
// charts sit side by side, and above ChartTooltip's 304px floor.
const CHARTS_ROW = twoUp(376);

// The pairs row (Widest gaps beside Votes) has no bin labels to fit, so it keeps
// the narrowest track that clears that floor, two-up from 712px of column.
const PAIRS_ROW = twoUp(346);

const SCOPE_ROW: React.CSSProperties = {display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACING.md};
const SCOPE_LINE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text};

/** Dimension participation sits under the scope row, but reads every vote, so it says so. */
const ALL_VOTES = 'All votes, whatever the rule';

/** A failed analytics load. Once tuning.json has loaded, the rules come from it alone. */
function AnalyticsError({error, tuningLoaded}: {error: Error; tuningLoaded: boolean}) {
  return (
    <Notice tone="error">
      Could not load vote analytics. Has the artifact been generated? ({error.message})
      {tuningLoaded && ' The rules below come from tuning.json alone.'}
    </Notice>
  );
}

/** The analytics' loading, failed and empty states. */
function AnalyticsNotice({analytics, tuningLoaded}: {analytics: UseVoteAnalyticsReturn; tuningLoaded: boolean}) {
  if (analytics.loading) return <Notice>Loading analytics...</Notice>;
  if (analytics.error) return <AnalyticsError error={analytics.error} tuningLoaded={tuningLoaded} />;
  // The precompute lists every engine rule, voted or not, so an empty artifact still has its rules.
  if (analytics.data?.global.totalVotes === 0) return <Notice>Vote analytics are empty: no votes yet.</Notice>;
  return null;
}

/** What the rules table says with no rows. No token and no analytics leaves it empty, with no read-only fallback (R-20). */
function rulesEmptyText(analytics: UseVoteAnalyticsReturn, hasToken: boolean): string {
  if (analytics.loading) return 'Loading the rules…';
  return hasToken
    ? "No rules to show: vote analytics are missing and tuning.json hasn't loaded."
    : 'No rules to show: vote analytics are missing and tuning.json needs a GitHub token.';
}

/**
 * The one filter row above everything the rule scopes (dataviz: filters sit
 * above what they scope): what is in scope, and the way back to every pair.
 * "Show all pairs" unmounts as it clears the rule, so it hands focus to the
 * scope line first, not to <body>.
 */
function ScopeRow({selected, onShowAll}: {selected: CalibrationRow | null; onShowAll: () => void}) {
  const lineRef = useRef<HTMLParagraphElement>(null);
  return (
    <div style={SCOPE_ROW}>
      <p ref={lineRef} tabIndex={-1} style={SCOPE_LINE}>
        {pairsHeading(selected)}
      </p>
      {selected && (
        // A 24px target (2.5.8): size sm is about 15px tall, and base alone about 19px.
        <LinkButton
          type="button"
          size="base"
          style={{minHeight: SPACING.xxl}}
          onClick={() => {
            onShowAll();
            lineRef.current?.focus();
          }}>
          Show all pairs
        </LinkButton>
      )}
    </div>
  );
}

/** What the vote table says in place of votes it can't show. The page's own Notice gives a failure's reason. */
function voteNotice(data: VoteAnalytics, voteLog: UseVoteLogReturn): string | undefined {
  if (!data.hasRawVotes) return 'No raw votes to show.';
  if (voteLog.data) return undefined;
  return voteLog.error ? 'Could not load the vote log.' : 'Loading the vote log…';
}

/** What the selected rule scopes, what to call it, and what an empty scope says. */
interface Scope {
  /** Every voted pair in scope, widest gap first and uncapped (pairsInScope): what the charts plot. */
  pairs: PairStat[];
  label: string;
  emptyText: string;
  /** Voted pairs with no engine score: counted on all pairs only, since no rule fired on them. */
  engineSilentPairs: number;
}

/** The selected rule's scope, or every pair's. */
function scopeOf(data: VoteAnalytics, selected: CalibrationRow | null): Scope {
  const pairs = pairsInScope(data.pairs, selected);
  if (!selected) {
    return {pairs, label: 'All pairs', emptyText: 'No voted pairs yet.', engineSilentPairs: data.global.engineSilentPairs};
  }
  return {pairs, label: selected.name, emptyText: 'No voted pairs for this rule yet.', engineSilentPairs: 0};
}

/** The weekly gap once the vote log is in; until then, or if it failed, a notice in its place. */
function WeeklyGap({voteLog, scope}: {voteLog: UseVoteLogReturn; scope: Scope}) {
  if (voteLog.data) return <WeeklyGapTrend weeks={weeklyGaps(voteLog.data.votes, scope.pairs)} scopeLabel={scope.label} />;
  if (voteLog.error) return <Notice tone="error">Could not load the vote log: {voteLog.error.message}</Notice>;
  return <Notice>Loading the vote log…</Notice>;
}

/** The weekly gap and dimension participation, which need the raw votes; one notice stands in for both without them. */
function RawVoteSections({data, voteLog, scope}: {data: VoteAnalytics; voteLog: UseVoteLogReturn; scope: Scope}) {
  if (!data.hasRawVotes) {
    return (
      <Notice>
        The weekly gap trend and dimension participation need raw votes. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
        Actions secret, then re-run admin&apos;s Deploy workflow.
      </Notice>
    );
  }
  return (
    <>
      <WeeklyGap voteLog={voteLog} scope={scope} />
      <DimensionParticipation fill={data.global.dimensionFill} totalVotes={data.global.totalVotes} scope={ALL_VOTES} />
    </>
  );
}

interface ScopedAnalyticsProps {
  data: VoteAnalytics;
  voteLog: UseVoteLogReturn;
  selected: CalibrationRow | null;
  selectedPair: PairPick | null;
  onSelectPair: (pair: PairPick) => void;
  onShowAll: () => void;
}

/**
 * Everything the selected rule scopes, under the scope row that says what that
 * is: the scatter beside the histogram, the widest pairs beside the selected
 * pair's votes, then the weekly gap. The charts read the whole scope, the list
 * its widest 40. The scatter and the list pick the same pair, so a dot opens
 * its votes as a row does, and the list shows it even below the 40.
 */
function ScopedAnalytics({data, voteLog, selected, selectedPair, onSelectPair, onShowAll}: ScopedAnalyticsProps) {
  const scope = scopeOf(data, selected);
  return (
    <>
      <ScopeRow selected={selected} onShowAll={onShowAll} />
      <div style={CHARTS_ROW}>
        <CalibrationScatter
          pairs={scope.pairs}
          scopeLabel={scope.label}
          selectedPair={selectedPair}
          onSelectPair={onSelectPair}
          engineSilentPairs={scope.engineSilentPairs}
          emptyText={scope.emptyText}
        />
        <GapHistogram pairs={scope.pairs} scopeLabel={scope.label} emptyText={scope.emptyText} />
      </div>
      <div style={PAIRS_ROW}>
        <PairList
          pairs={withSelectedPair(pairsFor(data.pairs, selected), scope.pairs, selectedPair)}
          selectedPair={selectedPair}
          onSelectPair={onSelectPair}
          emptyText={scope.emptyText}
        />
        <VoteDetailTable
          pair={findPair(scope.pairs, selectedPair)}
          votes={votesForPair(voteLog.data?.votes ?? [], selectedPair)}
          notice={voteNotice(data, voteLog)}
        />
      </div>
      <RawVoteSections data={data} voteLog={voteLog} scope={scope} />
    </>
  );
}

/** What the workspace reads from the tuning hooks: tuning.json once it is read, and the keys with pending edits. */
function tuningView(tuning: TuningState | null): {config: TuningConfig | null; edited: Set<string>} {
  if (!tuning) return {config: null, edited: new Set()};
  return {
    config: tuning.live.status === 'ready' ? tuning.live.config : null,
    edited: editedKeys(tuning.admin.pending),
  };
}

/**
 * The rules table's rows. None until the analytics settle: tuning.json alone
 * would list every entry as a tuning-only row, then swap them for the
 * analytics rules when those land.
 */
function rulesFor(analytics: UseVoteAnalyticsReturn, config: TuningConfig | null): CalibrationRow[] {
  if (analytics.loading) return [];
  return buildCalibrationRows(analytics.data?.rules ?? null, config);
}

/**
 * The selected rule and pair. ?rule= may name a tuning key (location-control):
 * the row it resolves to is what the table marks, what a second click
 * deselects and what scopes the pairs. A pair belongs to the rule it was
 * picked under: a rule change from outside (the sidebar's link, the
 * Overview's) hides it with no effect, and the workspace's own rule controls
 * drop it.
 */
function useRuleSelection(rows: CalibrationRow[], selectedId: string | null, onSelect: (id: string | null) => void) {
  const selected = findRow(rows, selectedId);
  const selectedRowId = selected?.id ?? null;
  const [pick, setPick] = useState<{ruleId: string | null; pair: PairPick} | null>(null);
  const selectRule = (id: string | null) => {
    setPick(null);
    onSelect(id);
  };
  return {
    selected,
    selectedRowId,
    selectedPair: pick?.ruleId === selectedRowId ? pick.pair : null,
    pickPair: (pair: PairPick) => setPick({ruleId: selectedRowId, pair}),
    selectRule,
    /** A row's press: that rule, or all pairs again when it is the selected one. */
    toggleRule: (id: string) => selectRule(id === selectedRowId ? null : id),
  };
}

/** The rules sharing the selected rule's tuning.json entry: the aside names them (R-21). */
function sharedWith(rows: CalibrationRow[], selected: CalibrationRow | null): CalibrationRow[] {
  return selected?.tuningKey ? rowsSharingKey(rows, selected.tuningKey) : [];
}

/**
 * /calibration's body: the calibration analytics in the left column, the
 * tuning editor in the aside. It holds no route state: the rule comes in as
 * `selectedId` (?rule=), so the Overview's link, the sidebar's and a reload
 * all agree, and goes out through `onSelect`. It mounts no unsaved-edits
 * guard (CalibrationPage does), so a story renders it with no data router.
 */
export function CalibrationWorkspace({
  analytics,
  voteLog,
  tuning,
  onSaveToken,
  onForgetToken,
  selectedId,
  onSelect,
}: CalibrationWorkspaceProps) {
  const {config, edited} = tuningView(tuning);
  const rows = rulesFor(analytics, config);
  const selection = useRuleSelection(rows, selectedId, onSelect);
  return (
    <div style={COLUMNS}>
      <div style={LEFT}>
        <AnalyticsNotice analytics={analytics} tuningLoaded={config != null} />
        <RulesTable
          rows={rows}
          selectedId={selection.selectedRowId}
          edited={edited}
          onSelect={selection.toggleRule}
          emptyText={rulesEmptyText(analytics, tuning != null)}
        />
        {analytics.data && (
          <ScopedAnalytics
            data={analytics.data}
            voteLog={voteLog}
            selected={selection.selected}
            selectedPair={selection.selectedPair}
            onSelectPair={selection.pickPair}
            onShowAll={() => selection.selectRule(null)}
          />
        )}
      </div>
      <aside aria-label="Tuning editor" style={ASIDE}>
        <TuningAside
          tuning={tuning}
          onSaveToken={onSaveToken}
          onForgetToken={onForgetToken}
          selected={selection.selected}
          sharedWith={sharedWith(rows, selection.selected)}
        />
      </aside>
    </div>
  );
}

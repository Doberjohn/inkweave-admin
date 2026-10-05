import {SPACING, TRUNCATE} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {fmtGap, fmtInt} from '../../ui/format';
import {Panel} from '../../ui/Panel';
import {countOf} from './activity/activityModel';
import {scoreText} from './calibration/chartData';
import {gapColor} from './gapColor';
import type {PairStat} from './voteAnalyticsTypes';

interface PairListProps {
  pairs: PairStat[];
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (p: {a: string; b: string}) => void;
  /** Shown in place of the list when there are no pairs. Default "No voted pairs yet." */
  emptyText?: string;
}

/**
 * A row's three columns. Every row is its own grid, so the score jump and the
 * vote count take fixed widths ("10 → 4.33" fits 80px at 13px) and line up from
 * row to row. The side padding is the flush panel header's, so the names sit
 * under the title.
 */
const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 80px 40px',
  alignItems: 'baseline',
  gap: SPACING.md,
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  fontSize: ADMIN_TYPE.body,
};

/**
 * The rows scroll inside the panel past about ten and a half of them (a row is
 * about 36px tall), so the cut row shows there is more. The header and the
 * footnote stay put, and the panel stays level with the votes panel beside it.
 * The rows are buttons, so keyboard focus scrolls each one into view.
 */
const LIST: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0, maxHeight: 384, overflowY: 'auto'};

const NUMBER: React.CSSProperties = {textAlign: 'right', fontVariantNumeric: 'tabular-nums'};

const EMPTY: React.CSSProperties = {
  margin: 0,
  padding: `${SPACING.xxl}px ${SPACING.lg}px`,
  textAlign: 'center',
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};

const FOOTNOTE: React.CSSProperties = {
  margin: 0,
  padding: `${SPACING.sm}px ${SPACING.lg}px ${SPACING.section}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.muted,
};

/** A selection names its pair either way round, as R2-1's findPair matches it. */
function isSelected(pair: PairStat, selected: {a: string; b: string} | null): boolean {
  if (selected == null) return false;
  return (selected.a === pair.a && selected.b === pair.b) || (selected.a === pair.b && selected.b === pair.a);
}

/**
 * A row's accessible name: what it shows, in words, as the scatter names the
 * same pair's dot. Read from the content, the row would run the numbers into
 * the names ("Card 27 → 41") and leave the vote count without a noun.
 */
function pairLabel(pair: PairStat): string {
  return (
    `${pair.aName} × ${pair.bName}: engine ${scoreText(pair.engineScore)}, community ${scoreText(pair.communityScore)}, ` +
    `gap ${fmtGap(pair.gap)}, ${countOf(pair.scoreVotes, 'vote')}`
  );
}

/**
 * The voted pairs the parent picked (scoped, sorted and capped there), as the
 * "Widest gaps" panel: each row shows the two card names, the engine →
 * community score jump in the gap colour, and the vote count. Rows are
 * adm-row-btn buttons, so the selected one wears the gold bar and says
 * aria-pressed. A footnote reminds the reader that most pairs carry a single
 * vote, so the rule-level trend is what to trust.
 */
export function PairList({pairs, selectedPair, onSelectPair, emptyText = 'No voted pairs yet.'}: PairListProps) {
  return (
    <Panel title="Widest gaps" action="engine → community" padded={false}>
      {pairs.length === 0 ? (
        <p style={EMPTY}>{emptyText}</p>
      ) : (
        <>
          <ul style={LIST}>
            {pairs.map((pair, i) => {
              const selected = isSelected(pair, selectedPair);
              const names = `${pair.aName} × ${pair.bName}`;
              return (
                <li
                  key={`${pair.a}|${pair.b}`}
                  // The panel header already rules off the first row.
                  style={i === 0 ? undefined : {borderTop: `1px solid ${ADMIN_COLORS.divider}`}}>
                  <button
                    type="button"
                    className="adm-row-btn"
                    aria-pressed={selected}
                    aria-label={pairLabel(pair)}
                    onClick={() => onSelectPair({a: pair.a, b: pair.b})}>
                    {/* The grid lives on a span: a native button takes no style (no-adhoc-buttons). */}
                    <span style={ROW}>
                      <span style={TRUNCATE} title={names}>
                        {pair.aName}
                        <span style={{color: ADMIN_COLORS.muted}}> × </span>
                        {pair.bName}
                      </span>
                      <span style={{...NUMBER, color: gapColor(pair.gap)}}>
                        {scoreText(pair.engineScore)} → {scoreText(pair.communityScore)}
                      </span>
                      <span style={{...NUMBER, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
                        {fmtInt(pair.scoreVotes)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p style={FOOTNOTE}>Most pairs have a single vote — trust the rule-level trend over any one row.</p>
        </>
      )}
    </Panel>
  );
}

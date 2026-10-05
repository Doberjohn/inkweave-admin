import {useState} from 'react';
import {LETTER_SPACING, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {BiasBar} from '../../../ui/BiasBar';
import {fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {gapColor} from '../gapColor';
import type {RuleStat} from '../voteAnalyticsTypes';
import {LOW_N, sortCalibrationRows, type CalibrationRow, type RuleSortKey} from './calibrationModel';

interface RulesTableProps {
  /** buildCalibrationRows' rows: the analytics rules, then any tuning.json entry no rule reaches. */
  rows: CalibrationRow[];
  /** The selected row's id. The workspace passes the row ?rule= resolves to (findRow), never the raw value. */
  selectedId: string | null;
  /** Tuning keys with a pending edit (editedKeys). Every row that shares one shows the dot. */
  edited: ReadonlySet<string>;
  /** A row's id, on click, Enter or Space. The workspace decides that a second press means all pairs. */
  onSelect: (id: string) => void;
  /** Shown in place of the table when there are no rows. */
  emptyText?: string;
}

const SORT_OPTIONS: ReadonlyArray<{value: RuleSortKey; label: string}> = [
  {value: 'gap', label: '|Gap|'},
  {value: 'votes', label: 'Votes'},
];
/** The table's name says its order, so a screen reader hears the sort the control shows. */
const ORDER: Record<RuleSortKey, string> = {gap: 'widest gap first', votes: 'most votes first'};
const TYPE_LABEL: Record<CalibrationRow['category'], string> = {playstyle: 'Playstyle', direct: 'Direct'};

/** Every column fits from this width; a narrower column scrolls the table inside its own box. */
const TABLE_MIN_WIDTH = 560;
/** The fixed columns, padding included. Rule takes the rest. */
const COLUMN_WIDTH = {type: 96, bias: 136, gap: 76, votes: 84};
const PENDING_DOT = 6;
const NO_VALUE = '—';

const HEAD_CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px`,
  background: ADMIN_COLORS.panel,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};
const CELL: React.CSSProperties = {
  padding: `${SPACING.md}px ${SPACING.sm}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  verticalAlign: 'middle',
};
const NUMBER: React.CSSProperties = {textAlign: 'right', fontVariantNumeric: 'tabular-nums'};
// Cells sit 16px apart (8px each side); the outer two keep 16px from the panel's edge.
const START: React.CSSProperties = {paddingLeft: SPACING.lg};
const END: React.CSSProperties = {paddingRight: SPACING.lg};

/** Under LOW_N score votes a rule's gap is thin evidence. */
function LowNTag() {
  return (
    <span
      title={`Fewer than ${LOW_N} score votes`}
      style={{
        flex: 'none',
        fontSize: ADMIN_TYPE.micro,
        fontWeight: 500,
        lineHeight: 1.4,
        color: ADMIN_COLORS.muted,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.tag,
        padding: `0 ${SPACING.xs}px`,
      }}>
      low n
    </span>
  );
}

/** The gold dot of a rule whose tuning.json entry has a pending edit. The row's name says it too (rowLabel). */
function PendingDot() {
  return (
    <span
      role="img"
      aria-label="Pending tuning edit"
      title="Pending tuning edit"
      style={{
        flex: 'none',
        width: PENDING_DOT,
        height: PENDING_DOT,
        borderRadius: ADMIN_RADIUS.pill,
        background: ADMIN_COLORS.accent,
      }}
    />
  );
}

/**
 * The name, then its markers. A rule with no score votes draws in the muted
 * colour: half opacity, the handoff's cue, would drop its muted cells to about
 * 2.6:1, under 1.4.3 (R-6).
 */
function RuleName({row, edited}: {row: CalibrationRow; edited: boolean}) {
  const votes = row.stat?.scoreVotes;
  return (
    <span style={{display: 'flex', alignItems: 'center', gap: SPACING.sm, minWidth: 0}}>
      <span
        title={row.name}
        style={{
          ...TRUNCATE,
          minWidth: 0,
          fontSize: ADMIN_TYPE.emphasis,
          color: votes === 0 ? ADMIN_COLORS.muted : ADMIN_COLORS.text,
        }}>
        {row.name}
      </span>
      {votes !== undefined && votes < LOW_N && <LowNTag />}
      {edited && <PendingDot />}
    </span>
  );
}

/**
 * A rule's numbers in words: "gap −0.57", "557 score votes", then "low n" under
 * LOW_N. A rule nobody has scored says so, as pairsHeading does, rather than
 * "gap —, 0 score votes".
 */
function scoreWords(stat: RuleStat | null): string[] {
  if (!stat?.scoreVotes) return ['no score votes'];
  const votes = stat.scoreVotes;
  const words = [`gap ${fmtGap(stat.meanGap)}`, `${fmtInt(votes)} score ${votes === 1 ? 'vote' : 'votes'}`];
  return votes < LOW_N ? [...words, 'low n'] : words;
}

/**
 * The row's accessible name. A role="button" row's cells are presentational, so
 * a screen reader never reaches the column heads: each number carries its word
 * ("Ramp, Playstyle, gap −0.57, 557 score votes").
 */
function rowLabel(row: CalibrationRow, edited: boolean): string {
  const marks = edited ? ['pending tuning edit'] : [];
  return [row.name, TYPE_LABEL[row.category], ...scoreWords(row.stat), ...marks].join(', ');
}

/**
 * Enter or Space selects, once per press: a held key repeats, and the
 * workspace turns a second press into "all pairs".
 */
function onRowKey(e: React.KeyboardEvent<HTMLTableRowElement>, select: () => void) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  // Space would scroll the page.
  e.preventDefault();
  if (!e.repeat) select();
}

interface RuleRowProps {
  row: CalibrationRow;
  selected: boolean;
  edited: boolean;
  onSelect: (id: string) => void;
}

/**
 * One rule, as one button: the whole row is the target, and rowLabel names it
 * (the bias bar is decoration). AdminStyles' adm-row-btn draws hover, focus and
 * the pressed row (the gold inset bar, on its first cell too, over the accent
 * tint). A tuning-only row has no stat, so its gap and votes read "—" and its
 * bias bar is empty.
 */
function RuleRow({row, selected, edited, onSelect}: RuleRowProps) {
  const gap = row.stat?.meanGap ?? null;
  return (
    <tr
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={rowLabel(row, edited)}
      className="adm-row-btn"
      onClick={() => onSelect(row.id)}
      onKeyDown={(e) => onRowKey(e, () => onSelect(row.id))}>
      <td style={{...CELL, ...START}}>
        <RuleName row={row} edited={edited} />
      </td>
      <td style={{...CELL, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
        {TYPE_LABEL[row.category]}
      </td>
      <td style={CELL}>
        <BiasBar gap={gap} />
      </td>
      <td style={{...CELL, ...NUMBER, color: gapColor(gap)}}>{fmtGap(gap)}</td>
      <td style={{...CELL, ...NUMBER, ...END, color: ADMIN_COLORS.muted}}>
        {row.stat ? fmtInt(row.stat.scoreVotes) : NO_VALUE}
      </td>
    </tr>
  );
}

/**
 * The column heads. aria-sort marks the column the rows follow: Gap by size
 * ("other"), or Votes, most first. Null (nothing to sort by) marks neither.
 */
function RulesHead({sortKey}: {sortKey: RuleSortKey | null}) {
  return (
    <thead>
      <tr>
        <th scope="col" style={{...HEAD_CELL, ...START}}>
          Rule
        </th>
        <th scope="col" style={HEAD_CELL}>
          Type
        </th>
        <th scope="col" style={HEAD_CELL}>
          Bias
        </th>
        <th scope="col" aria-sort={sortKey === 'gap' ? 'other' : undefined} style={{...HEAD_CELL, ...NUMBER}}>
          Gap
        </th>
        <th
          scope="col"
          aria-sort={sortKey === 'votes' ? 'descending' : undefined}
          style={{...HEAD_CELL, ...NUMBER, ...END}}>
          Votes
        </th>
      </tr>
    </thead>
  );
}

/**
 * The rules table on /calibration: one row per selectable rule, sorted by
 * |gap| or by votes (sortCalibrationRows, so tuning-only rows stay last). It
 * replaced RuleCalibrationTable. Rows keep <table> semantics for the columns
 * and are buttons with aria-pressed; click, Enter or Space selects. A rule
 * under LOW_N score votes carries "low n", and a row whose tuning entry has a
 * pending edit carries the gold dot (every rule sharing that entry does).
 */
export function RulesTable({rows, selectedId, edited, onSelect, emptyText = 'No rules to show.'}: RulesTableProps) {
  const [sortKey, setSortKey] = useState<RuleSortKey>('gap');
  const sorted = sortCalibrationRows(rows, sortKey);
  // tuning.json alone (no analytics) has nothing to sort by: no control, no order in the name, no aria-sort.
  const sortable = rows.some((row) => row.stat !== null);
  const sort = (
    <SegmentedControl ariaLabel="Sort rules by" options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
  );
  return (
    <Panel title="Rules" action={sortable ? sort : undefined} padded={false}>
      {rows.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: `${SPACING.xxl}px ${SPACING.lg}px`,
            textAlign: 'center',
            fontSize: ADMIN_TYPE.body,
            color: ADMIN_COLORS.muted,
          }}>
          {emptyText}
        </p>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table
            aria-label={sortable ? `Rules, ${ORDER[sortKey]}` : 'Rules'}
            style={{
              width: '100%',
              minWidth: TABLE_MIN_WIDTH,
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: ADMIN_TYPE.body,
            }}>
            <colgroup>
              <col />
              <col style={{width: COLUMN_WIDTH.type}} />
              <col style={{width: COLUMN_WIDTH.bias}} />
              <col style={{width: COLUMN_WIDTH.gap}} />
              <col style={{width: COLUMN_WIDTH.votes}} />
            </colgroup>
            <RulesHead sortKey={sortable ? sortKey : null} />
            <tbody>
              {sorted.map((row) => (
                <RuleRow
                  key={row.id}
                  row={row}
                  selected={row.id === selectedId}
                  edited={row.tuningKey !== null && edited.has(row.tuningKey)}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

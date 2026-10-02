import {CtaButton, LETTER_SPACING, LinkButton, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtWeekday} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {ScorePill} from '../../../ui/ScorePill';
import type {VoteLogRow} from '../voteLogTypes';
import {carriesLabel, countOf, logPage} from './activityModel';

/** Rows on the log's first page, and rows each "Show more" adds. */
export const LOG_PAGE_SIZE = 25;

/** Hides the caption on screen; screen readers still name the table by it. */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

const CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  verticalAlign: 'middle',
};

const HEAD_CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  background: ADMIN_COLORS.panel,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};

const DAY_CELL: React.CSSProperties = {
  ...CELL,
  background: ADMIN_COLORS.aside,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  color: ADMIN_COLORS.text,
};

interface VoteLogTableProps {
  /** The votes in the range that pass every filter, the picked bar included. */
  votes: VoteLogRow[];
  limit: number;
  /** What the picked bar covers ("Wed Sep 30", "Week of Sep 28"), or null with no pick. */
  pickedLabel: string | null;
  voter: number | null;
  onShowMore: () => void;
  onPickVoter: (voter: number) => void;
  /** A control in the header, before the summary: ActivityView's "Pick a day" select. */
  picker?: React.ReactNode;
}

/**
 * The raw vote log, newest first, grouped by UTC day. Each day opens with a
 * row header that keeps the day's full counts even when the page cuts the day
 * short. `#N` filters the page to that voter. A row's key is the vote itself,
 * never its position, so the row (and the focus on its `#N`) survives a filter.
 */
export function VoteLogTable({votes, limit, pickedLabel, voter, onShowMore, onPickVoter, picker}: VoteLogTableProps) {
  const {days, hidden} = logPage(votes, limit);
  const summary = `${pickedLabel === null ? '' : `${pickedLabel} · `}${countOf(votes.length, 'vote')}`;

  return (
    <Panel
      title="Vote log"
      action={
        <span style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md}}>
          {picker}
          <span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{summary}</span>
        </span>
      }
      padded={false}>
      {days.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: `${SPACING.xxl}px ${SPACING.lg}px`,
            textAlign: 'center',
            fontSize: ADMIN_TYPE.body,
            color: ADMIN_COLORS.muted,
          }}>
          {voter === null ? 'No votes match these filters.' : `No votes from voter ${voter} match these filters.`}
        </p>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table
            style={{
              width: '100%',
              minWidth: 560,
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: ADMIN_TYPE.body,
            }}>
            <caption style={SR_ONLY}>Votes matching the filters, newest first</caption>
            <colgroup>
              <col style={{width: 96}} />
              <col />
              <col style={{width: 72}} />
              <col style={{width: 160}} />
              <col style={{width: 80}} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" style={HEAD_CELL}>
                  Time (UTC)
                </th>
                <th scope="col" style={HEAD_CELL}>
                  Pair
                </th>
                <th scope="col" style={{...HEAD_CELL, textAlign: 'center'}}>
                  Score
                </th>
                <th scope="col" style={HEAD_CELL}>
                  Carries
                </th>
                <th scope="col" style={{...HEAD_CELL, textAlign: 'right'}}>
                  Voter
                </th>
              </tr>
            </thead>
            {days.map((group) => (
              <tbody key={group.day}>
                <tr>
                  <th scope="rowgroup" colSpan={5} style={DAY_CELL}>
                    {fmtWeekday(group.day)}
                    {' · '}
                    <span style={{fontWeight: 500, color: ADMIN_COLORS.muted}}>
                      {`${countOf(group.count, 'vote')} · ${countOf(group.voters, 'voter')}`}
                    </span>
                  </th>
                </tr>
                {group.rows.map((vote) => {
                  const pair = `${vote.aName} × ${vote.bName}`;
                  return (
                    <tr key={`${vote.ts}:${vote.voter}:${vote.a}:${vote.b}`} className="adm-hover-row">
                      <td style={{...CELL, color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>
                        {vote.ts.slice(11, 16)}
                      </td>
                      <td style={{...CELL, ...TRUNCATE}} title={pair}>
                        {pair}
                      </td>
                      <td style={{...CELL, textAlign: 'center'}}>
                        <ScorePill score={vote.score} />
                      </td>
                      <td style={{...CELL, ...TRUNCATE, color: ADMIN_COLORS.muted}}>{carriesLabel(vote)}</td>
                      <td style={{...CELL, textAlign: 'right'}}>
                        <LinkButton
                          type="button"
                          tone="muted"
                          size="sm"
                          aria-label={`Filter by voter #${vote.voter}`}
                          onClick={() => onPickVoter(vote.voter)}>
                          #{vote.voter}
                        </LinkButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {hidden > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: SPACING.md,
            borderTop: `1px solid ${ADMIN_COLORS.divider}`,
          }}>
          <CtaButton type="button" variant="neutral" onClick={onShowMore}>
            Show {Math.min(LOG_PAGE_SIZE, hidden)} more
          </CtaButton>
        </div>
      )}
    </Panel>
  );
}

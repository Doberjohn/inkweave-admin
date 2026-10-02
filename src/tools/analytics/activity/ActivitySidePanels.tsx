import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {MeterBar} from '../../../ui/MeterBar';
import {Panel} from '../../../ui/Panel';
import {ScorePill} from '../../../ui/ScorePill';
import type {VoteLogRow} from '../voteLogTypes';
import {countOf, topPairs, topVoters} from './activityModel';

const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

const HEAD: React.CSSProperties = {
  padding: `0 0 ${SPACING.xs}px`,
  fontSize: ADMIN_TYPE.label,
  fontWeight: 600,
  color: ADMIN_COLORS.muted,
};

const CELL: React.CSSProperties = {padding: `${SPACING.xs}px 0`, borderTop: `1px solid ${ADMIN_COLORS.divider}`};

interface TopVotersPanelProps {
  /** The votes in the range that pass the filter row. */
  votes: VoteLogRow[];
  selectedVoter: number | null;
  onToggleVoter: (voter: number) => void;
}

/**
 * Most active voters: the top six in the range, under the filters. Picking
 * one filters the page to that voter; picking them again clears the voter
 * filter.
 */
export function TopVotersPanel({votes, selectedVoter, onToggleVoter}: TopVotersPanelProps) {
  const voters = topVoters(votes, 6);
  const most = voters.at(0)?.count ?? 1;
  return (
    <Panel title="Most active voters">
      {voters.length === 0 ? (
        <p style={NOTE}>No voters match these filters.</p>
      ) : (
        <ul style={{listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: SPACING.xxs}}>
          {voters.map(({voter, count}) => (
            <li key={voter}>
              <button
                type="button"
                className="adm-row-btn"
                aria-pressed={voter === selectedVoter}
                aria-label={`#${voter}, ${countOf(count, 'vote')}`}
                onClick={() => onToggleVoter(voter)}>
                <span
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px minmax(0, 1fr) 40px',
                    alignItems: 'center',
                    gap: SPACING.sm,
                    width: '100%',
                    fontSize: ADMIN_TYPE.small,
                  }}>
                  <span style={{color: ADMIN_COLORS.muted, textAlign: 'left'}}>#{voter}</span>
                  <MeterBar fraction={count / most} color={ADMIN_COLORS.accent} />
                  <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtInt(count)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Most voted pairs: the top five in the range, under the filters, each with its average over scored votes. */
export function TopPairsPanel({votes}: {votes: VoteLogRow[]}) {
  const pairs = topPairs(votes, 5);
  return (
    <Panel title="Most voted pairs">
      {pairs.length === 0 ? (
        <p style={NOTE}>No pairs match these filters.</p>
      ) : (
        <table
          aria-label="Most voted pairs"
          style={{width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: ADMIN_TYPE.small}}>
          <thead>
            <tr>
              <th scope="col" style={{...HEAD, textAlign: 'left'}}>
                Pair
              </th>
              <th scope="col" style={{...HEAD, width: 48, textAlign: 'right'}}>
                Votes
              </th>
              <th scope="col" style={{...HEAD, width: 72, textAlign: 'right'}}>
                Average
              </th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const name = `${pair.aName} × ${pair.bName}`;
              return (
                <tr key={`${pair.a}:${pair.b}`}>
                  <td style={{...CELL, ...TRUNCATE}} title={name}>
                    {name}
                  </td>
                  <td style={{...CELL, textAlign: 'right', color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>
                    {fmtInt(pair.count)}
                  </td>
                  <td style={{...CELL, textAlign: 'right'}}>
                    {/* One decimal, so the pill never prints a long fraction. */}
                    <ScorePill score={pair.avgScore === null ? null : Math.round(pair.avgScore * 10) / 10} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

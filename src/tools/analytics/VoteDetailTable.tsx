import {LETTER_SPACING, SPACING} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {Panel} from '../../ui/Panel';
import {ScorePill} from '../../ui/ScorePill';
import {PairNames} from './CardName';
import type {VoteLogRow} from './voteLogTypes';

interface VoteDetailTableProps {
  /** The selected pair: its cards' ids and names, and the engine's score. Null asks for one. */
  pair: {a: string; b: string; aName: string; bName: string; engineScore: number} | null;
  votes: VoteLogRow[];
  /**
   * Shown in place of the table while the votes can't be: the vote log is
   * loading, failed, or the artifact has no raw votes. The page's own Notice
   * announces a failure, so this one stays quiet (no role="alert").
   */
  notice?: string;
}

/** Map the accuracy thumb (-1 / 0 / 1 / null) to its label. */
function accuracyLabel(accuracy: number | null): string {
  if (accuracy === -1) return 'too high';
  if (accuracy === 0) return 'right';
  if (accuracy === 1) return 'too low';
  return '—';
}

function wouldPlayLabel(wouldPlay: boolean | null): string {
  if (wouldPlay == null) return '—';
  return wouldPlay ? 'yes' : 'no';
}

const MESSAGE: React.CSSProperties = {
  margin: 0,
  padding: `${SPACING.xxl}px ${SPACING.lg}px`,
  textAlign: 'center',
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
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

const CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  color: ADMIN_COLORS.muted,
  verticalAlign: 'middle',
};

/**
 * The votes themselves. Rows take no hover fill: nothing in them is
 * interactive, and the red score pill would dip under 4.5:1 on rowHover.
 */
function VoteRows({title, votes}: {title: string; votes: VoteLogRow[]}) {
  return (
    <div style={{overflowX: 'auto'}}>
      <table aria-label={`Votes on ${title}`} style={{width: '100%', borderCollapse: 'collapse', fontSize: ADMIN_TYPE.body}}>
        <thead>
          <tr>
            <th scope="col" style={HEAD_CELL}>
              Score
            </th>
            <th scope="col" style={HEAD_CELL}>
              Accuracy
            </th>
            <th scope="col" style={HEAD_CELL}>
              Would play
            </th>
            <th scope="col" style={HEAD_CELL}>
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {votes.map((vote, i) => (
            <tr key={`${vote.voter}-${vote.ts}-${i}`}>
              <td style={CELL}>
                <ScorePill score={vote.score} />
              </td>
              <td style={CELL}>{accuracyLabel(vote.accuracy)}</td>
              <td style={CELL}>{wouldPlayLabel(vote.wouldPlay)}</td>
              <td style={{...CELL, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>{vote.ts.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The selected pair's votes, as a panel. With no pair it is the "Votes" panel
 * and asks for one. With a pair, the panel is named by it, with the engine
 * score beside the title, over a table of each vote's score, accuracy thumb,
 * would-play flag and UTC day. In the title, a card the card list holds links
 * to its card page (R-33): the pair list's rows are buttons, which can't hold
 * a link. A notice, or a pair the vote log holds no votes for, replaces the
 * table with one line.
 */
export function VoteDetailTable({pair, votes, notice}: VoteDetailTableProps) {
  if (pair == null) {
    return (
      <Panel title="Votes" padded={false}>
        <p style={MESSAGE}>Select a pair to see its votes</p>
      </Panel>
    );
  }
  const title = `${pair.aName} × ${pair.bName}`;
  const message = notice ?? (votes.length === 0 ? 'No votes for this pair in the vote log.' : null);
  return (
    <Panel title={<PairNames pair={pair} />} action={`engine ${pair.engineScore}`} padded={false}>
      {message === null ? <VoteRows title={title} votes={votes} /> : <p style={MESSAGE}>{message}</p>}
    </Panel>
  );
}

import type {CSSProperties} from 'react';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {ScorePill} from '../../../ui/ScorePill';
import {PairLine} from '../CardName';
import {latestVotes} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {VoteLog} from '../voteLogTypes';

/** How many votes the card lists. */
const SHOWN = 4;

const MUTED: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

interface LatestVotesCardProps {
  voteLog: VoteLog | null;
  /** Why vote-log.json could not be fetched, if it could not. */
  error: Error | null;
}

/**
 * The card body: vote-log.json's own loading, error and no-raw-votes states,
 * or the newest votes. A card the card list holds links to its card page
 * (PairLine, R-33).
 */
function LatestVotesBody({voteLog, error}: LatestVotesCardProps) {
  if (error) return <p style={MUTED}>Could not load the vote log ({error.message}).</p>;
  if (!voteLog) return <p style={MUTED}>Loading votes...</p>;
  if (voteLog.votes.length === 0) {
    return (
      <p style={MUTED}>
        Needs raw votes (<code>SUPABASE_SERVICE_ROLE_KEY</code>).
      </p>
    );
  }
  return (
    <ul aria-label="Latest votes" style={{listStyle: 'none', margin: 0, padding: 0}}>
      {latestVotes(voteLog.votes, SHOWN).map((v) => (
        <li
          key={`${v.ts}|${v.voter}|${v.a}|${v.b}`}
          style={{display: 'flex', alignItems: 'center', gap: SPACING.md, padding: `${SPACING.xs}px 0`}}>
          {/* A quick vote has no score: the pill shows "—". */}
          <ScorePill score={v.score} />
          <div style={{minWidth: 0, flex: 1, fontSize: ADMIN_TYPE.body}}>
            <PairLine pair={v} />
            <div style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>
              voter {v.voter} · {fmtDay(v.ts.slice(0, 10))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The newest votes from the raw vote log, with a link to Vote activity. */
export function LatestVotesCard({voteLog, error}: LatestVotesCardProps) {
  return (
    <Panel title="Latest votes" action={<PanelLink to="/activity">Open activity →</PanelLink>}>
      <LatestVotesBody voteLog={voteLog} error={error} />
    </Panel>
  );
}

import {Link} from 'react-router-dom';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {cardsHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import {scoreText} from '../calibration/chartData';
import {gapColor} from '../gapColor';
import {VotesFilterControl} from '../VotesFilterControl';
import {filterNote, filtersPairs, pairsWithVotes, useVotesFilter, votesClause, type VotesFilter} from '../votesFilter';
import {CAPTION, CELL, CELL_LINK, HEAD_CELL, MUTED_NUMBER, NUMBER, OPAQUE_CARD} from './cardStyles';
import type {CardPair} from './cardStats';

/** The fixed columns, padding included; Paired with takes the rest. "10 → 4.33" fits 96px at 13px. */
const COLUMN_WIDTH = {scores: 96, scoreGap: 68, votes: 60};
/**
 * R2's PairList scroller (R-47): past about ten rows the list scrolls inside
 * the panel, so the panel stays level with the calibration beside it, with no
 * "Show all" button to vanish from under focus. Keyboard users reach the rows
 * through their partner links, and focus scrolls each into view. The scroll
 * padding keeps a row Shift+Tab reaches clear of the sticky head (WCAG
 * 2.4.11): the head is 32.5px (8px of padding twice, an 11px line at 1.5),
 * and the focus ring reaches 4px above the link.
 */
const SCROLLER: React.CSSProperties = {maxHeight: 384, overflowY: 'auto', scrollPaddingTop: SPACING.xxxl + SPACING.sm};
const TABLE: React.CSSProperties = {width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: ADMIN_TYPE.body};
/**
 * The head stays put while the rows scroll under it, so its fill is opaque: the
 * panel's card fill over the page (adminTheme.ts:39-40). Its own bottom rule
 * stays with it; a collapsed border wouldn't.
 */
const STICKY_HEAD: React.CSSProperties = {
  ...HEAD_CELL,
  position: 'sticky',
  top: 0,
  background: OPAQUE_CARD,
  boxShadow: `inset 0 -1px 0 ${ADMIN_COLORS.divider}`,
};
// The outer cells keep 16px from the panel's edge, as PairList's rows do.
const START: React.CSSProperties = {paddingLeft: SPACING.lg};
const END: React.CSSProperties = {paddingRight: SPACING.lg};
const FOOTER: React.CSSProperties = {
  display: 'grid',
  gap: SPACING.xs,
  padding: `${SPACING.sm}px ${SPACING.lg}px ${SPACING.section}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
};
// PairList's empty line, for a filter that leaves the card no pairs.
const EMPTY: React.CSSProperties = {
  margin: 0,
  padding: `${SPACING.xxl}px ${SPACING.lg}px`,
  textAlign: 'center',
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};
// The votes filter, then the count, as Vote log's header puts its picker before its summary. In a narrow
// panel the count wraps under the filter, at the right.
const ACTION: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: SPACING.md,
};

/** The line under the rows at Any, the handoff's caveat; the filter's note takes its place once it is on. */
const SINGLE_VOTE = 'Most pairs have a single vote — trust the card-level trend over any one row.';

interface PartnerProps {
  pair: CardPair;
  /** The current card list holds the partner: only then is there a page to link to (R-33). */
  listed: boolean;
}

/**
 * The partner's name: a link to its own card page, or plain text when the
 * card list can't open it. The link's underline, not its colour, tells the two
 * apart (adm-link, WCAG 1.4.1).
 */
function Partner({pair, listed}: PartnerProps) {
  if (!listed) {
    return (
      <span title={pair.partnerName} style={{...TRUNCATE, display: 'block'}}>
        {pair.partnerName}
      </span>
    );
  }
  return (
    <Link to={cardsHref(pair.partnerId)} title={pair.partnerName} className="adm-link" style={CELL_LINK}>
      {pair.partnerName}
    </Link>
  );
}

interface PairRowProps extends PartnerProps {
  /** The head's own rule sits over the first row, so it draws none. */
  first: boolean;
}

/** One voted pair: the partner, the engine → community jump, the gap in its colour and the score votes. */
function PairRow({first, ...partner}: PairRowProps) {
  const {pair} = partner;
  const cell = first ? {...CELL, borderTop: 'none'} : CELL;
  return (
    <tr>
      <td style={{...cell, ...START}}>
        <Partner {...partner} />
      </td>
      <td style={{...cell, ...MUTED_NUMBER}}>
        {scoreText(pair.engineScore)} → {scoreText(pair.communityScore)}
      </td>
      <td style={{...cell, ...NUMBER, color: gapColor(pair.gap)}}>{fmtGap(pair.gap)}</td>
      <td style={{...cell, ...MUTED_NUMBER, ...END}}>{fmtInt(pair.scoreVotes)}</td>
    </tr>
  );
}

function PairsHead() {
  return (
    <thead>
      <tr>
        <th scope="col" style={{...STICKY_HEAD, ...START}}>
          Paired with
        </th>
        {/* "Engine → community" doesn't fit a number column's head, so the head shows the handoff's short form and says it in full. */}
        <th scope="col" aria-label="Engine → community" title="Engine → community" style={{...STICKY_HEAD, ...NUMBER}}>
          Eng → com
        </th>
        <th scope="col" style={{...STICKY_HEAD, ...NUMBER}}>
          Gap
        </th>
        <th scope="col" style={{...STICKY_HEAD, ...NUMBER, ...END}}>
          Votes
        </th>
      </tr>
    </thead>
  );
}

interface PairsActionProps {
  /** The pairs the votes filter keeps, out of `all`, the card's voted pairs. */
  shown: readonly CardPair[];
  all: readonly CardPair[];
  filter: VotesFilter;
}

/**
 * The header's right end: the votes filter (#33), then how many pairs show
 * ("3 of 5 pairs" once it is on) and, when any do, their order.
 */
function PairsAction({shown, all, filter}: PairsActionProps) {
  const total = countOf(all.length, 'pair');
  return (
    <div style={ACTION}>
      <VotesFilterControl />
      <span>
        {filtersPairs(filter) ? `${fmtInt(shown.length)} of ${total}` : total}
        {shown.length > 0 && ' · widest gap first'}
      </span>
    </div>
  );
}

interface PairsTableProps {
  pairs: readonly CardPair[];
  isListed: (cardId: string) => boolean;
  filter: VotesFilter;
}

/** The pairs, in a table that scrolls inside the panel, named for what they are once the filter is on. */
function PairsTable({pairs, isListed, filter}: PairsTableProps) {
  const name = filtersPairs(filter) ? `Voted ${votesClause(filter)}` : 'Voted pairs';
  return (
    <div style={SCROLLER}>
      <table aria-label={`${name}, widest gap first`} style={TABLE}>
        <colgroup>
          <col />
          <col style={{width: COLUMN_WIDTH.scores}} />
          <col style={{width: COLUMN_WIDTH.scoreGap}} />
          <col style={{width: COLUMN_WIDTH.votes}} />
        </colgroup>
        <PairsHead />
        <tbody>
          {pairs.map((pair, i) => (
            <PairRow key={pair.partnerId} pair={pair} listed={isListed(pair.partnerId)} first={i === 0} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PairsFooterProps {
  /** The line about the rows: the single-vote caveat or the filter's note, null with no rows. */
  caveat: string | null;
  /** silentNote's caption (R-31), or null. */
  note: string | null;
}

/** The captions under the panel: the line about the rows, then the engine-silent one. Nothing for neither. */
function PairsFooter({caveat, note}: PairsFooterProps) {
  if (caveat == null && note == null) return null;
  return (
    <div style={FOOTER}>
      {caveat && <p style={CAPTION}>{caveat}</p>}
      {note && <p style={CAPTION}>{note}</p>}
    </div>
  );
}

interface VotedPairsPanelProps {
  /** pairsForCard's pairs, widest gap first: at least one (the view shows a notice for none). */
  cardPairs: readonly CardPair[];
  isListed: (cardId: string) => boolean;
  /** silentNote's caption (R-31), or null. */
  note: string | null;
}

/**
 * The card's voted pairs that the engine scores, widest gap first, every one
 * of them in a list that scrolls inside the panel (R-47). Each partner links
 * to its own card page when the card list holds it (R-33). The jump prints as
 * PairList prints it (scoreText), so a pair reads the same on /calibration.
 * The votes filter in the header (#33), the one /calibration shows, keeps only
 * pairs with more score votes; the header counts what it keeps, and the
 * footer's first line says it is on, in place of the handoff's caveat. The
 * footer also keeps the engine-silent caption, which counts every vote.
 */
export function VotedPairsPanel({cardPairs, isListed, note}: VotedPairsPanelProps) {
  const {filter} = useVotesFilter();
  const shown = pairsWithVotes(cardPairs, filter);
  const empty = shown.length === 0;
  return (
    <Panel title="Voted pairs" action={<PairsAction shown={shown} all={cardPairs} filter={filter} />} padded={false}>
      {empty ? (
        <p style={EMPTY}>No {votesClause(filter)} for this card yet.</p>
      ) : (
        <PairsTable pairs={shown} isListed={isListed} filter={filter} />
      )}
      <PairsFooter caveat={empty ? null : (filterNote(filter) ?? SINGLE_VOTE)} note={note} />
    </Panel>
  );
}

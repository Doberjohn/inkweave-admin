import {Link} from 'react-router-dom';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {cardsHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import {scoreText} from '../calibration/chartData';
import {gapColor} from '../gapColor';
import {CAPTION, CELL, CELL_LINK, HEAD_CELL, NUMBER} from './cardStyles';
import type {CardPair} from './cardStats';

/** The fixed columns, padding included; Paired with takes the rest. "10 → 4.33" fits 96px at 13px. */
const COLUMN_WIDTH = {scores: 96, gap: 68, votes: 60};
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
  background: `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`,
  boxShadow: `inset 0 -1px 0 ${ADMIN_COLORS.divider}`,
};
// The outer cells keep 16px from the panel's edge, as PairList's rows do.
const START: React.CSSProperties = {paddingLeft: SPACING.lg};
const END: React.CSSProperties = {paddingRight: SPACING.lg};
const MUTED_NUMBER: React.CSSProperties = {...NUMBER, color: ADMIN_COLORS.muted};
const FOOTER: React.CSSProperties = {
  display: 'grid',
  gap: SPACING.xs,
  padding: `${SPACING.sm}px ${SPACING.lg}px ${SPACING.section}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
};

interface PartnerProps {
  pair: CardPair;
  /** The current card list holds the partner: only then is there a page to link to (R-33). */
  listed: boolean;
}

/** The partner's name: a link to its own card page, or plain text when the card list can't open it. */
function Partner({pair, listed}: PartnerProps) {
  if (!listed) {
    return (
      <span title={pair.partnerName} style={{...TRUNCATE, display: 'block'}}>
        {pair.partnerName}
      </span>
    );
  }
  return (
    <Link to={cardsHref(pair.partnerId)} title={pair.partnerName} style={CELL_LINK}>
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
 * The footer keeps the handoff's caveat and the engine-silent caption.
 */
export function VotedPairsPanel({cardPairs, isListed, note}: VotedPairsPanelProps) {
  return (
    <Panel title="Voted pairs" action={`${countOf(cardPairs.length, 'pair')} · widest gap first`} padded={false}>
      <div style={SCROLLER}>
        <table aria-label="Voted pairs, widest gap first" style={TABLE}>
          <colgroup>
            <col />
            <col style={{width: COLUMN_WIDTH.scores}} />
            <col style={{width: COLUMN_WIDTH.gap}} />
            <col style={{width: COLUMN_WIDTH.votes}} />
          </colgroup>
          <PairsHead />
          <tbody>
            {cardPairs.map((pair, i) => (
              <PairRow
                key={pair.partnerId}
                pair={pair}
                listed={isListed(pair.partnerId)}
                first={i === 0}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div style={FOOTER}>
        <p style={CAPTION}>Most pairs have a single vote — trust the card-level trend over any one row.</p>
        {note && <p style={CAPTION}>{note}</p>}
      </div>
    </Panel>
  );
}

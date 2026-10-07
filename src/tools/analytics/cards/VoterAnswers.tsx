import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {MeterBar} from '../../../ui/MeterBar';
import {Panel} from '../../../ui/Panel';
import {SplitMeter} from '../../../ui/SplitMeter';
import {countOf} from '../activity/activityModel';
import {CAPTION, NUMBER} from './cardStyles';
import type {AccuracyAnswers, CardAnswers, Rate} from './cardVotes';
import {accuracyParts, carryDetail, difficultyText, rateDetail, shareText} from './voteCharts';

/** The accuracy question: the split meter's visible label and its legend's name. */
const ACCURACY_QUESTION = 'Is the engine’s score right?';

const STACK: React.CSSProperties = {display: 'grid', gap: SPACING.sm, minWidth: 0};
const QUESTION: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const BODY: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.text};
const RATES: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: SPACING.md};

/**
 * Label, bar and share on one line, the counts under the bar. The bar is
 * decoration (MeterBar with no label), because its share is printed beside it,
 * as Dimension participation's rows are.
 */
const RATE_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '112px minmax(0, 1fr) 48px',
  alignItems: 'center',
  columnGap: SPACING.md,
  rowGap: SPACING.xxs,
  fontSize: ADMIN_TYPE.body,
};
const SHARE: React.CSSProperties = {...NUMBER, color: ADMIN_COLORS.text};
const DETAIL: React.CSSProperties = {gridColumn: '2 / -1', fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/**
 * The accuracy answers, an ordered scale, as one split meter (R-42): too high,
 * right, too low, with each share and count in its legend (R-43).
 */
function AccuracySplit({accuracy}: {accuracy: AccuracyAnswers}) {
  return (
    <div style={STACK}>
      <p style={QUESTION}>{ACCURACY_QUESTION}</p>
      <SplitMeter parts={accuracyParts(accuracy)} ariaLabel={ACCURACY_QUESTION} emptyText="No accuracy answers yet." />
      {accuracy.answered > 0 && <p style={CAPTION}>{countOf(accuracy.answered, 'vote')} answered it.</p>}
    </div>
  );
}

interface RateRowProps {
  label: string;
  /** The share to fill and print: a 0-1 fraction, or null when nobody answered (an empty track and "—"). */
  rate: Pick<Rate, 'share'>;
  /** The counts behind it (rateDetail, carryDetail). */
  detail: string;
}

/** One single-ratio question: its label, an accent meter and the printed share, then its counts. */
function RateRow({label, rate, detail}: RateRowProps) {
  return (
    <li style={RATE_ROW}>
      <span style={{color: ADMIN_COLORS.muted}}>{label}</span>
      <MeterBar fraction={rate.share ?? 0} color={ADMIN_COLORS.accent} height={8} />
      <span style={SHARE}>{shareText(rate)}</span>
      <span style={DETAIL}>{detail}</span>
    </li>
  );
}

/**
 * How voters answered the in-depth questions on the card's pairs. Each counts
 * only the votes that answered it, quick votes included. The accuracy answers
 * are three parts of one whole, so they are a split meter; "Says it's real",
 * "Would play it" and "Named as carry" are single ratios against their own
 * answers, so each is a meter; difficulty is a mean, so it is text.
 */
export function VoterAnswers({answers}: {answers: CardAnswers}) {
  const {accuracy, isReal, wouldPlay, carry, difficulty} = answers;
  return (
    <Panel title="How voters answered">
      <AccuracySplit accuracy={accuracy} />
      <ul style={RATES}>
        <RateRow label="Says it’s real" rate={isReal} detail={rateDetail(isReal)} />
        <RateRow label="Would play it" rate={wouldPlay} detail={rateDetail(wouldPlay)} />
        <RateRow label="Named as carry" rate={carry} detail={carryDetail(carry)} />
      </ul>
      <p style={BODY}>{difficultyText(difficulty)}</p>
    </Panel>
  );
}

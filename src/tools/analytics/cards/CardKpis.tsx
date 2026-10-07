import {SPACING} from '../../../app-bridge';
import {fmtGap, fmtInt, fmtScore} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import {RawTag} from '../../../ui/RawTag';
import {countOf} from '../activity/activityModel';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import {verdictFor} from '../verdict';
import {verdictGap, type CardCalibration} from './cardStats';
import {calibrationOf, rawFigures, votesOnCard, type CardCalibrationData, type RawFigures, type RawVotes} from './cardView';

/** The Overview's KPI row (OverviewKpis.tsx:45-47): as many 170px cards as fit, wrapping. */
const ROW: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: SPACING.md};

const LOW_N_HINT = `low n: under ${MIN_RULE_VOTES} score votes`;

/**
 * The four numbers from pairs[], vote-weighted as the Overview's are. The mean
 * gap takes the verdict's colour once the card has enough score votes to
 * judge; under that it stays in the text colour, with the "low n" hint.
 */
function CalibrationKpis({cal}: {cal: CardCalibration}) {
  const gap = verdictGap(cal);
  return (
    <>
      <KpiCard label="Score votes" value={fmtInt(cal.scoreVotes)} hint="on pairs the engine scores" />
      <KpiCard label="Pairs voted" value={fmtInt(cal.pairsVoted)} hint="partners the engine scores" />
      <KpiCard
        label="Mean gap"
        value={fmtGap(cal.meanGap)}
        hint={cal.enoughVotes ? 'vote-weighted' : LOW_N_HINT}
        valueColor={gap == null ? undefined : verdictFor(gap).numberColor}
      />
      <KpiCard
        label="Engine → community"
        value={`${fmtScore(cal.engineAvg)} → ${fmtScore(cal.communityAvg)}`}
        hint="vote-weighted pair averages"
      />
    </>
  );
}

/**
 * The two numbers from the card's raw votes, tagged raw. Accuracy sentiment
 * comes from the card's own accuracy answers (R-32): pairs[] carries one on
 * too few pairs to say anything per card.
 */
function RawKpis({figures}: {figures: RawFigures}) {
  return (
    <>
      <KpiCard
        label="Distinct voters"
        value={fmtInt(figures.voters)}
        hint={countOf(figures.votes, 'raw vote')}
        tag={<RawTag />}
      />
      <KpiCard
        label="Accuracy sentiment"
        value={fmtGap(figures.sentiment)}
        hint={`too-low vs too-high · ${countOf(figures.answered, 'answer')}`}
        tag={<RawTag />}
      />
    </>
  );
}

interface CardKpisProps {
  /** The card's share of vote analytics; null until it loads. */
  calibration: CardCalibrationData | null;
  raw: RawVotes;
}

/**
 * The card's headline numbers: the calibration four once the card has a voted
 * pair, then the raw two once the log holds a vote on it. There is no
 * engine-silent KPI (R-31): Voted pairs captions that count. Nothing renders
 * when neither file has a number for the card.
 */
export function CardKpis({calibration, raw}: CardKpisProps) {
  const cal = calibrationOf(calibration);
  const figures = rawFigures(votesOnCard(raw));
  if (!cal && !figures) return null;
  return (
    <section aria-label="Key figures" style={ROW}>
      {cal && <CalibrationKpis cal={cal} />}
      {figures && <RawKpis figures={figures} />}
    </section>
  );
}

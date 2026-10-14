import {useRef} from 'react';
import {useContainerWidth} from '../../../app-bridge';
import {fmtGap, fmtInt, fmtScore} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import {kpiRow} from '../../../ui/layout';
import {RawTag} from '../../../ui/RawTag';
import {countOf} from '../activity/activityModel';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import {verdictFor} from '../verdict';
import {verdictGap, type CardCalibration} from './cardStats';
import {calibrationOf, rawFigures, votesOnCard, type CardCalibrationData, type RawFigures, type RawVotes} from './cardView';

const LOW_N_HINT = `low n: under ${MIN_RULE_VOTES} score votes`;

/**
 * The four numbers from pairs[], vote-weighted as the Overview's are. The mean
 * gap takes the verdict's colour once the card has enough score votes to
 * judge; under that it stays in the text colour, with the "low n" hint.
 */
function calibrationKpis(cal: CardCalibration): React.ReactElement[] {
  const gap = verdictGap(cal);
  return [
    <KpiCard key="score-votes" label="Score votes" value={fmtInt(cal.scoreVotes)} hint="on pairs the engine scores" />,
    <KpiCard key="pairs-voted" label="Pairs voted" value={fmtInt(cal.pairsVoted)} hint="partners the engine scores" />,
    <KpiCard
      key="mean-gap"
      label="Mean gap"
      value={fmtGap(cal.meanGap)}
      hint={cal.enoughVotes ? 'vote-weighted' : LOW_N_HINT}
      valueColor={gap == null ? undefined : verdictFor(gap).numberColor}
    />,
    <KpiCard
      key="engine-community"
      label="Engine → community"
      value={`${fmtScore(cal.engineAvg)} → ${fmtScore(cal.communityAvg)}`}
      hint="vote-weighted pair averages"
    />,
  ];
}

/**
 * The two numbers from the card's raw votes, tagged raw. Accuracy sentiment
 * comes from the card's own accuracy answers (R-32): pairs[] carries one on
 * too few pairs to say anything per card.
 */
function rawKpis(figures: RawFigures): React.ReactElement[] {
  return [
    <KpiCard
      key="voters"
      label="Distinct voters"
      value={fmtInt(figures.voters)}
      hint={countOf(figures.votes, 'raw vote')}
      tag={<RawTag />}
    />,
    <KpiCard
      key="sentiment"
      label="Accuracy sentiment"
      value={fmtGap(figures.sentiment)}
      hint={`too-low vs too-high · ${countOf(figures.answered, 'answer')}`}
      tag={<RawTag />}
    />,
  ];
}

/**
 * The row, in kpiRow's columns for its measured width. Its own component, so
 * the measured ref holds the section from mount: useContainerWidth observes
 * only what its ref held then, and CardKpis renders nothing until a file has
 * a number for the card.
 */
function KpiRow({cards}: {cards: React.ReactElement[]}) {
  const rowRef = useRef<HTMLElement>(null);
  const width = useContainerWidth(rowRef);
  return (
    <section ref={rowRef} aria-label="Key figures" style={kpiRow({count: cards.length, width})}>
      {cards}
    </section>
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
  const cards = [...(cal ? calibrationKpis(cal) : []), ...(figures ? rawKpis(figures) : [])];
  return cards.length > 0 ? <KpiRow cards={cards} /> : null;
}

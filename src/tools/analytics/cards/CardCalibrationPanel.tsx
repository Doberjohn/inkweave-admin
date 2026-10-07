import {Link} from 'react-router-dom';
import {FONTS, SPACING} from '../../../app-bridge';
import {calibrationHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {BiasBar} from '../../../ui/BiasBar';
import {fmtGap, fmtInt} from '../../../ui/format';
import {LowNTag} from '../../../ui/LowNTag';
import {Panel} from '../../../ui/Panel';
import {GapScale} from '../GapScale';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import {verdictFor} from '../verdict';
import type {RuleStat} from '../voteAnalyticsTypes';
import {CELL, CELL_LINK, HEAD_CELL, NUMBER} from './cardStyles';
import {cardCalibration, cardReadLine, rulesForCard, verdictGap, type CardPair, type CardRuleRow} from './cardStats';

const BODY: React.CSSProperties = {display: 'grid', gap: SPACING.lg};
const HEADLINE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  lineHeight: 1.2,
  color: ADMIN_COLORS.text,
};
const READ: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};

/** The fixed columns, padding included; Rule takes the rest. */
const COLUMN_WIDTH = {bias: 88, gap: 64, pairs: 52, votes: 56};
/** Under this the table scrolls inside its own box rather than squeezing the rule names to nothing. */
const TABLE_MIN_WIDTH = 360;
/**
 * The table's scroller reaches 4px into the panel's padding on each side, and
 * pads the same back, so the table lines up with the headline while a rule
 * link's focus ring (4px outside it, the app's global :focus-visible) stays
 * inside the box that clips.
 */
const SCROLLER: React.CSSProperties = {
  overflowX: 'auto',
  margin: `0 -${SPACING.xs}px`,
  padding: `0 ${SPACING.xs}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
};
const TABLE: React.CSSProperties = {
  width: '100%',
  minWidth: TABLE_MIN_WIDTH,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: ADMIN_TYPE.body,
};
// The outer cells sit flush with the panel's padding, under the headline.
const FIRST: React.CSSProperties = {paddingLeft: 0};
const LAST: React.CSSProperties = {paddingRight: 0};
const RULE_NAME: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm, minWidth: 0};
const MUTED_NUMBER: React.CSSProperties = {...NUMBER, color: ADMIN_COLORS.muted};

/**
 * One rule on the card's pairs. Its name links to the rule on /calibration
 * (R-34), where it can be tuned. The bias bar is decoration: the gap prints
 * beside it. A rule on fewer than MIN_RULE_VOTES of the card's score votes
 * carries "low n" (R-35).
 */
function RuleRow({row}: {row: CardRuleRow}) {
  return (
    <tr>
      <td style={{...CELL, ...FIRST}}>
        <span style={RULE_NAME}>
          <Link to={calibrationHref(row.ruleId)} title={row.ruleName} style={CELL_LINK}>
            {row.ruleName}
          </Link>
          {row.lowN && <LowNTag minVotes={MIN_RULE_VOTES} />}
        </span>
      </td>
      <td style={CELL}>
        <BiasBar gap={row.meanGap} />
      </td>
      <td style={{...CELL, ...NUMBER, color: gapColor(row.meanGap)}}>{fmtGap(row.meanGap)}</td>
      <td style={{...CELL, ...MUTED_NUMBER}}>{fmtInt(row.pairs)}</td>
      <td style={{...CELL, ...MUTED_NUMBER, ...LAST}}>{fmtInt(row.scoreVotes)}</td>
    </tr>
  );
}

/**
 * The rules that scored the card's voted pairs, as rulesForCard orders them:
 * rules with enough score votes first, each group by |gap|, then score votes,
 * then name (R-35). Nothing for a card whose pairs name no rule.
 */
function CardRulesTable({rows}: {rows: CardRuleRow[]}) {
  if (rows.length === 0) return null;
  return (
    <div style={SCROLLER}>
      <table aria-label="Rules on this card's pairs, low n last" style={TABLE}>
        <colgroup>
          <col />
          <col style={{width: COLUMN_WIDTH.bias}} />
          <col style={{width: COLUMN_WIDTH.gap}} />
          <col style={{width: COLUMN_WIDTH.pairs}} />
          <col style={{width: COLUMN_WIDTH.votes}} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" style={{...HEAD_CELL, ...FIRST}}>
              Rule on its pairs
            </th>
            <th scope="col" style={HEAD_CELL}>
              Bias
            </th>
            <th scope="col" style={{...HEAD_CELL, ...NUMBER}}>
              Gap
            </th>
            <th scope="col" style={{...HEAD_CELL, ...NUMBER}}>
              Pairs
            </th>
            <th scope="col" style={{...HEAD_CELL, ...NUMBER, ...LAST}}>
              Votes
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <RuleRow key={row.ruleId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CardCalibrationPanelProps {
  /** pairsForCard's pairs: at least one (the view shows a notice for none). */
  cardPairs: readonly CardPair[];
  rules: readonly RuleStat[];
}

/**
 * "Calibration for this card": the verdict on the card's pairs, its read line
 * and the over/under scale, then the rules behind it. The verdict reads the
 * mean gap to two places (verdictGap), as the Mean gap KPI prints it, and only
 * from MIN_RULE_VOTES score votes: under that the headline says so and the
 * scale draws no dot. The phrase takes the verdict's colour, as on the
 * Overview (R-50).
 */
export function CardCalibrationPanel({cardPairs, rules}: CardCalibrationPanelProps) {
  const cal = cardCalibration(cardPairs);
  const gap = verdictGap(cal);
  const verdict = verdictFor(gap);
  return (
    <Panel title="Calibration for this card" action="community minus engine">
      <div style={BODY}>
        <p style={HEADLINE}>
          The engine <span style={{color: verdict.wordColor}}>{verdict.phrase}</span>
          {gap == null ? ' this card' : ' on this card'}
        </p>
        <p style={READ}>{cardReadLine(cal)}</p>
        <GapScale meanGap={gap} color={verdict.numberColor} />
        <CardRulesTable rows={rulesForCard(cardPairs, rules)} />
      </div>
    </Panel>
  );
}

import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {BiasBar} from '../../../ui/BiasBar';
import {Panel} from '../../../ui/Panel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES, rulesToReview} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {RuleStat} from '../voteAnalyticsTypes';

/**
 * The rules most worth tuning next, widest gap first (rulesToReview leaves out
 * rules with too few votes to trust). "Tune" opens Calibration with the rule
 * picked: /calibration?rule=<ruleId>, the analytics rule id. R1-11's
 * Calibration page selects that rule; R2's maps it to its tuning.json entry.
 */
export function RulesToReviewCard({rules}: {rules: RuleStat[]}) {
  const top = rulesToReview(rules);
  return (
    <Panel
      title="Rules to review"
      action={<span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>widest gap first</span>}>
      {top.length === 0 ? (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
          No rule has {MIN_RULE_VOTES} or more score votes yet.
        </p>
      ) : (
        <ul aria-label="Rules to review" style={{listStyle: 'none', margin: 0, padding: 0}}>
          {top.map((r) => (
            <li
              key={r.ruleId}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 100px 52px 36px',
                alignItems: 'center',
                gap: SPACING.md,
                padding: `${SPACING.sm}px 0`,
                borderBottom: `1px solid ${ADMIN_COLORS.divider}`,
                fontSize: ADMIN_TYPE.body,
              }}>
              <span style={TRUNCATE} title={r.ruleName}>
                {r.ruleName}
              </span>
              <BiasBar gap={r.meanGap} />
              {/* A gap that rounds to "0.00" reads neutral, as the weekly chart's gapLine does. */}
              <span
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: fmtGap(r.meanGap) === '0.00' ? ADMIN_COLORS.muted : gapColor(r.meanGap),
                }}>
                {fmtGap(r.meanGap)}
              </span>
              <span style={{textAlign: 'right'}}>
                <PanelLink to={`/calibration?rule=${encodeURIComponent(r.ruleId)}`} label={`Tune ${r.ruleName}`}>
                  Tune
                </PanelLink>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

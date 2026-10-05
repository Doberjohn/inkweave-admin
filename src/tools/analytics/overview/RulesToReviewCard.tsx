import {TUNING} from 'inkweave-synergy-engine';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {calibrationHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {BiasBar} from '../../../ui/BiasBar';
import {Panel} from '../../../ui/Panel';
import {tuningKeyFor} from '../calibration/calibrationModel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES, rulesToReview} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {RuleStat} from '../voteAnalyticsTypes';

/**
 * "Tune" for a rule with a tuning.json copy, "Inspect" for one without (R-22):
 * some direct rules have none (six at the pin). The Overview holds no token, so
 * it looks the rule up (tuningKeyFor) in the pinned engine's bundled
 * tuning.json, TUNING. A key the app adds on master reads "Inspect" until the
 * next pin bump; the page it opens reads the live file. Both open Calibration
 * on the rule's own id, which the page resolves to the rule's row.
 */
function RuleLink({rule}: {rule: RuleStat}) {
  const verb = tuningKeyFor(rule, TUNING) == null ? 'Inspect' : 'Tune';
  return (
    <PanelLink to={calibrationHref(rule.ruleId)} label={`${verb} ${rule.ruleName}`}>
      {verb}
    </PanelLink>
  );
}

/**
 * The rules most worth tuning next, widest gap first (rulesToReview leaves out
 * rules with too few votes to trust). Each row links to Calibration with the
 * rule picked (RuleLink).
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
                // Names keep 80px on a narrow card and the bias bar's track gives first: 26px on the
                // narrowest (280px), its full 100px from 354px up. 48px fits a gap ("−0.57", 35px in
                // tabular figures at the body size) and "Inspect" (43px at the small size).
                gridTemplateColumns: 'minmax(80px, 1fr) minmax(0, 100px) 48px 48px',
                alignItems: 'center',
                gap: SPACING.md,
                padding: `${SPACING.sm}px 0`,
                borderBottom: `1px solid ${ADMIN_COLORS.divider}`,
                fontSize: ADMIN_TYPE.body,
              }}>
              <span style={TRUNCATE} title={r.ruleName}>
                {r.ruleName}
              </span>
              {/* minWidth 0: the bar shrinks with its track. At its default 64px it would run under the gap. */}
              <BiasBar gap={r.meanGap} minWidth={0} />
              <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: gapColor(r.meanGap)}}>
                {fmtGap(r.meanGap)}
              </span>
              <span style={{textAlign: 'right'}}>
                <RuleLink rule={r} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

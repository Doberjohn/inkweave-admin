import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {biasCopy} from '../biasCopy';
import {GapScale} from '../GapScale';
import {verdictFor} from '../verdict';
import {PanelLink} from './PanelLink';

interface CalibrationCardProps {
  meanGap: number | null;
  accuracySentiment: number | null;
}

/**
 * The Overview's engine-calibration card: the verdict sentence and read line
 * (verdictFor's phrase and biasCopy), the mean gap as the hero number, the
 * over/under scale (GapScale) and the accuracy sentiment. The verdict phrase is
 * marked by colour only: the app ships no italic Tinos face and sets
 * font-synthesis: none, so an italic would render upright anyway.
 */
export function CalibrationCard({meanGap, accuracySentiment}: CalibrationCardProps) {
  const verdict = verdictFor(meanGap);
  const {read} = biasCopy(meanGap);
  return (
    <Panel title="Engine calibration" action={<PanelLink to="/calibration">Open calibration →</PanelLink>}>
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.lg}}>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: SPACING.xxl}}>
          <div style={{flex: '1 1 220px'}}>
            <p
              style={{
                margin: 0,
                fontFamily: FONTS.hero,
                fontSize: ADMIN_TYPE.sectionTitle,
                lineHeight: 1.15,
                color: ADMIN_COLORS.text,
              }}>
              The engine <span style={{color: verdict.wordColor}}>{verdict.phrase}</span>
            </p>
            <p style={{margin: `${SPACING.sm}px 0 0`, maxWidth: 340, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
              {read}
            </p>
          </div>
          <div style={{textAlign: 'right'}}>
            <div style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.hero, lineHeight: 1, color: verdict.numberColor}}>
              {fmtGap(meanGap)}
            </div>
            <div style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>mean gap</div>
          </div>
        </div>
        <GapScale meanGap={meanGap} color={verdict.numberColor} />
        <p
          style={{
            margin: 0,
            paddingTop: SPACING.md,
            borderTop: `1px solid ${ADMIN_COLORS.divider}`,
            fontSize: ADMIN_TYPE.small,
            color: ADMIN_COLORS.muted,
          }}>
          Accuracy sentiment <strong style={{color: ADMIN_COLORS.text}}>{fmtGap(accuracySentiment)}</strong> (thumbs:
          too-low vs too-high)
        </p>
      </div>
    </Panel>
  );
}

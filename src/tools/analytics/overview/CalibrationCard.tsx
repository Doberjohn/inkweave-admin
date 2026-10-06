import type {CSSProperties} from 'react';
import {COLORS, FONTS, SPACING, hexRgba} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {biasCopy} from '../biasCopy';
import {scalePercent, verdictFor} from '../verdict';
import {PanelLink} from './PanelLink';

/**
 * The track tints toward the over-rates colour on the left and the under-rates
 * colour on the right: COLORS.error and COLORS.success, as verdictFor and
 * gapColor use them.
 */
const TRACK = `linear-gradient(90deg, ${hexRgba(COLORS.error, 0.35)}, ${ADMIN_COLORS.barTrack} 30%, ${ADMIN_COLORS.barTrack} 70%, ${hexRgba(COLORS.success, 0.35)})`;

const SCALE_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/**
 * The diverging over/under scale: a centre tick, and a dot at the mean gap
 * (clamped by scalePercent), left out when there is no gap. The number above
 * says the same thing, so the track is hidden from assistive tech.
 */
function GapScale({meanGap, color}: {meanGap: number | null; color: string}) {
  const dot = scalePercent(meanGap);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: SPACING.md}}>
      <span style={SCALE_LABEL}>over-rates</span>
      <div
        aria-hidden="true"
        style={{position: 'relative', flex: 1, height: 6, borderRadius: ADMIN_RADIUS.tag, background: TRACK}}>
        <div style={{position: 'absolute', left: '50%', top: -4, width: 1, height: 14, background: ADMIN_COLORS.muted}} />
        {dot != null && (
          <div
            style={{
              position: 'absolute',
              left: `${dot}%`,
              top: -3,
              width: 12,
              height: 12,
              boxSizing: 'border-box',
              borderRadius: '50%',
              background: color,
              border: `2px solid ${ADMIN_COLORS.page}`,
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
      <span style={SCALE_LABEL}>under-rates</span>
    </div>
  );
}

interface CalibrationCardProps {
  meanGap: number | null;
  accuracySentiment: number | null;
}

/**
 * The Overview's engine-calibration card: the verdict sentence and read line
 * (verdictFor and biasCopy), the mean gap as the hero number, the over/under
 * scale and the accuracy sentiment. The verdict word is marked by colour only:
 * the app ships no italic Tinos face and sets font-synthesis: none, so an
 * italic would render upright anyway.
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
              The engine <span style={{color: verdict.wordColor}}>{verdict.word}</span>
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

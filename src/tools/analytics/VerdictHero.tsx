import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, RADIUS, SPACING} from '../../app-bridge';
import {fmtGap} from '../../ui/format';
import {biasCopy} from './biasCopy';
import {scalePercent, verdictFor} from './verdict';

interface VerdictHeroProps {
  meanGap: number | null;
  accuracySentiment: number | null;
  /** Narrow container: the accuracy column moves under the verdict. */
  stacked?: boolean;
}

/**
 * The diverging over/under scale. The dot marks meanGap (positioned by
 * scalePercent) and is left out when there is no gap to mark.
 */
function GapScale({meanGap, color}: {meanGap: number | null; color: string}) {
  const dot = scalePercent(meanGap);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.section}}>
      <span style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim}}>over-rates</span>
      <div style={{position: 'relative', flex: 1, height: 4, background: COLORS.surface, borderRadius: RADIUS.xs}}>
        <div style={{position: 'absolute', left: '50%', top: -3, width: 1, height: 10, background: COLORS.textDim}} />
        {dot != null && (
          <div
            style={{
              position: 'absolute',
              left: `${dot}%`,
              top: -3,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
      <span style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim}}>under-rates</span>
    </div>
  );
}

/** Accuracy sentiment: a side column, or a row under the verdict when the hero is stacked. */
function AccuracyColumn({accuracySentiment, stacked}: {accuracySentiment: number | null; stacked: boolean}) {
  const divider = `1px solid ${COLORS.surfaceBorder}`;
  const frame = stacked
    ? {borderTop: divider, paddingTop: SPACING.lg}
    : {width: 150, borderLeft: divider, paddingLeft: SPACING.lg};
  return (
    <div style={frame}>
      <div style={{...CAP_LABEL_XS, fontWeight: 400}}>
        Accuracy sentiment
      </div>
      <div style={{fontSize: FONT_SIZES.xxxl, fontWeight: 700, margin: '4px 0 2px', fontFamily: FONTS.body}}>
        {fmtGap(accuracySentiment)}
      </div>
      <div style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim}}>thumbs: too-low vs too-high</div>
    </div>
  );
}

/**
 * Calibration-tab hero: a serif verdict headline, the big meanGap number, a
 * plain-English read, a diverging over/under scale, and an accuracy-sentiment
 * side column (stacked under the verdict in a narrow container). Admin-scale
 * display sizes (30px headline, 44px number) are deliberate exceptions to the
 * public type scale.
 */
export function VerdictHero({meanGap, accuracySentiment, stacked = false}: VerdictHeroProps) {
  const verdict = verdictFor(meanGap);
  const {read} = biasCopy(meanGap);

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        gap: SPACING.lg,
        background: COLORS.surfaceAlt,
        border: `1px solid ${COLORS.surfaceBorder}`,
        borderRadius: RADIUS.card,
        padding: SPACING.xl,
        marginBottom: SPACING.section,
      }}>
      <div style={{flex: 1}}>
        <div style={{...CAP_LABEL_XS, letterSpacing: LETTER_SPACING.eyebrow}}>
          Engine calibration
        </div>
        <h2
          style={{
            fontFamily: FONTS.hero,
            fontSize: FONT_SIZES.displaySm,
            fontWeight: 400,
            lineHeight: 1.15,
            margin: '6px 0 4px',
            color: COLORS.text,
          }}>
          The engine <span style={{color: verdict.wordColor, fontStyle: 'italic'}}>{verdict.word}</span>
        </h2>
        <div style={{fontSize: FONT_SIZES.displayMd, fontWeight: 800, lineHeight: 1.05, margin: '4px 0 6px', color: verdict.numberColor}}>
          {fmtGap(meanGap)}
        </div>
        <div style={{fontSize: FONT_SIZES.base, color: COLORS.gray700, maxWidth: 380}}>{read}</div>
        <GapScale meanGap={meanGap} color={verdict.numberColor} />
      </div>
      <AccuracyColumn accuracySentiment={accuracySentiment} stacked={stacked} />
    </section>
  );
}

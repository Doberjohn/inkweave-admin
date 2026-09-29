import {COLORS, CtaButton, FONTS, FONT_SIZES, RADIUS, SPACING, TRUNCATE} from '../../app-bridge';
import type {PairStat} from './voteAnalyticsTypes';

interface PairListProps {
  pairs: PairStat[];
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (p: {a: string; b: string}) => void;
}

/**
 * A clickable list of voted pairs (already filtered + sorted by the parent).
 * Each row shows the two card names, the engine→community score jump, and the
 * vote count; the selected row is the kit's ghost button, the rest neutral (#509). A caption reminds the reader
 * that most pairs carry a single vote, so the rule-level trend is what to trust.
 */
export function PairList({pairs, selectedPair, onSelectPair}: PairListProps) {
  return (
    <div style={{fontFamily: FONTS.body}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
        {pairs.map((pair) => {
          const selected = selectedPair?.a === pair.a && selectedPair?.b === pair.b;
          return (
            <CtaButton
              key={`${pair.a}|${pair.b}`}
              type="button"
              variant={selected ? 'ghost' : 'neutral'}
              aria-pressed={selected}
              onClick={() => onSelectPair({a: pair.a, b: pair.b})}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: SPACING.md,
                width: '100%',
                minHeight: 0,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: RADIUS.md,
                textAlign: 'left',
              }}>
              <span style={{...TRUNCATE, fontSize: FONT_SIZES.base, color: COLORS.text}}>
                {pair.aName}
                <span style={{color: COLORS.textDim}}> × </span>
                {pair.bName}
              </span>
              <span style={{fontSize: FONT_SIZES.md, color: COLORS.error, fontVariantNumeric: 'tabular-nums'}}>
                {pair.engineScore} → {pair.communityScore}
              </span>
              <span style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums'}}>
                {pair.scoreVotes}
              </span>
            </CtaButton>
          );
        })}
      </div>
      <div style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, marginTop: SPACING.sm}}>
        Most pairs have a single vote — trust the rule-level trend over any one row.
      </div>
    </div>
  );
}

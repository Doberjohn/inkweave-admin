import {RADIUS} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';

/** A |gap| this large fills a whole half-track, as the rules table has drawn it since the port. */
const DEFAULT_SCALE = 2.5;
const TRACK = 6;
const TICK = 12;

interface BiasBarProps {
  /** Community minus engine: negative = the engine over-rates. Null = no scored votes. */
  gap: number | null;
  /** The |gap| that fills a half-track (default 2.5 points). */
  scale?: number;
}

/** Which way the fill leans and how far (percent of the whole track), or null when there is nothing to draw. */
function fillFor(gap: number | null, scale: number): {direction: 'over' | 'under'; width: number} | null {
  if (gap == null || !Number.isFinite(gap) || gap === 0) return null;
  return {direction: gap < 0 ? 'over' : 'under', width: Math.min(Math.abs(gap) / scale, 1) * 50};
}

/**
 * The diverging gap bar: from a centre tick, the fill runs left in the
 * over-rates colour for a negative gap and right in the under-rates colour for
 * a positive one, |gap| / scale of a half-track wide and clamped at the end.
 * Decoration (aria-hidden): every use prints the gap beside it with fmtGap.
 */
export function BiasBar({gap, scale = DEFAULT_SCALE}: BiasBarProps) {
  const fill = fillFor(gap, scale);
  return (
    <div
      aria-hidden="true"
      style={{position: 'relative', height: TRACK, minWidth: 64, background: ADMIN_COLORS.barTrack, borderRadius: RADIUS.xs}}>
      {fill && (
        <div
          data-direction={fill.direction}
          style={{
            position: 'absolute',
            top: 0,
            height: TRACK,
            width: `${fill.width}%`,
            borderRadius: RADIUS.xs,
            background: fill.direction === 'over' ? ADMIN_COLORS.over : ADMIN_COLORS.under,
            ...(fill.direction === 'over' ? {right: '50%'} : {left: '50%'}),
          }}
        />
      )}
      {/* The tick goes last so it stays visible over the fill's inner end. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: (TRACK - TICK) / 2,
          width: 1,
          height: TICK,
          background: ADMIN_COLORS.dim,
        }}
      />
    </div>
  );
}

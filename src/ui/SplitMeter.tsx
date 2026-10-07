import {RADIUS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt, sharePercent} from './format';

/** One part of a split: a count, with the name and colour it is drawn in. */
export interface SplitMeterPart {
  /** Keys the part; unique within one meter. */
  id: string;
  /** The part's name in the legend. Text stays in text colours, never `color`. */
  label: string;
  /** Paints the part's segment and its legend swatch. */
  color: string;
  /** A count, 0 or more. */
  value: number;
}

interface SplitMeterProps {
  /** Left to right, in reading order. A zero part draws no segment but keeps its legend row. */
  parts: readonly SplitMeterPart[];
  /** Names the legend list, which carries every share and count. */
  ariaLabel: string;
  /** The line under the bare track when every part is zero (default "No answers yet."). */
  emptyText?: string;
}

/** The bar's thickness in px: the handoff prototype's 10, under the mark spec's 24px cap. */
const BAR = 10;
/** A part above zero never draws narrower than this, so a "<1%" part still shows. */
const MIN_SEGMENT = SPACING.xs;
/**
 * The legend swatch: ChartLegend's 10px rect swatch (SPACING.md − SPACING.xxs), which the
 * Community scores histogram's legend draws in the neighbouring panel, not the handoff's 8px.
 */
const SWATCH = SPACING.md - SPACING.xxs;

const STACK: React.CSSProperties = {display: 'grid', gap: SPACING.sm, minWidth: 0};

/** ChartLegend's list: wrapping rows of label-size muted text. */
const LEGEND: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${SPACING.xs}px ${SPACING.lg}px`,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.muted,
};

const ITEM: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: SPACING.xs};

/**
 * The parts as one bar, decoration only (aria-hidden): each part above zero is
 * a segment that grows by its count. The 2px surface gap separates touching
 * segments (the dataviz mark spec), and the clip rounds only the bar's outer
 * ends, so its inner joins stay square.
 */
function SplitSegments({parts}: {parts: readonly SplitMeterPart[]}) {
  return (
    <div
      aria-hidden="true"
      style={{display: 'flex', columnGap: SPACING.xxs, height: BAR, borderRadius: RADIUS.sm, overflow: 'hidden'}}>
      {parts
        .filter((part) => part.value > 0)
        .map((part) => (
          <div
            key={part.id}
            data-part={part.id}
            style={{flexGrow: part.value, flexShrink: 0, flexBasis: 0, minWidth: MIN_SEGMENT, backgroundColor: part.color}}
          />
        ))}
    </div>
  );
}

/** Every part's swatch, label, share of `total` and count, zero parts included: "Too high 24% (12)". */
function SplitLegend({parts, total, ariaLabel}: {parts: readonly SplitMeterPart[]; total: number; ariaLabel: string}) {
  return (
    <ul aria-label={ariaLabel} style={LEGEND}>
      {parts.map((part) => (
        <li key={part.id} style={ITEM}>
          <span
            aria-hidden="true"
            style={{flex: 'none', width: SWATCH, height: SWATCH, borderRadius: RADIUS.xs, backgroundColor: part.color}}
          />
          {/* The spaces keep the text one phrase for assistive tech; the flex gap does the visual spacing. */}
          {part.label}{' '}
          <span style={{color: ADMIN_COLORS.text, fontWeight: 600}}>{sharePercent(part.value / total)}</span>{' '}
          <span>({fmtInt(part.value)})</span>
        </li>
      ))}
    </ul>
  );
}

/** Nothing to split: the bare track, and a line that says why. */
function SplitEmpty({text}: {text: string}) {
  return (
    <div style={STACK}>
      <div aria-hidden="true" style={{height: BAR, borderRadius: RADIUS.sm, backgroundColor: ADMIN_COLORS.barTrack}} />
      <p style={{margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{text}</p>
    </div>
  );
}

/**
 * How a few counts divide one whole, as one full-width bar over the track
 * with a legend under it (R-42): the accuracy answers (too high, right, too
 * low) and a card's partners by strength tier. A MeterBar shows one ratio
 * against its limit; this shows the whole's parts side by side.
 *
 * The legend, a list named by `ariaLabel`, prints every part's share and
 * count, so the bar is decoration and the meter needs no tooltip and no
 * Chart/Table toggle. Each share rounds on its own (`sharePercent`, R-43): a
 * part with a count never reads 0%, one short of the whole never reads 100%,
 * and the shares may sum to 99% or 101%. With every part at zero, or no
 * parts, it shows the bare track and `emptyText`.
 */
export function SplitMeter({parts, ariaLabel, emptyText = 'No answers yet.'}: SplitMeterProps) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total > 0) {
    return (
      <div style={STACK}>
        <SplitSegments parts={parts} />
        <SplitLegend parts={parts} total={total} ariaLabel={ariaLabel} />
      </div>
    );
  }
  return <SplitEmpty text={emptyText} />;
}

import {Fragment} from 'react';
import {RADIUS, SPACING, blackRgba} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

/** One line of a tooltip. The value leads and the label follows it, so write labels that read after a number ("votes"). */
export interface TooltipRow {
  label: string;
  value: string;
  /** The series colour, drawn as a short line key before the value. Text never takes it. */
  color?: string;
}

export interface TooltipContent {
  title: string;
  rows: TooltipRow[];
}

/** Gap between the point and the tooltip, in px. */
const OFFSET = SPACING.md;
/** The narrowest the tooltip gets before it wraps, in px. */
const MIN_WIDTH = 140;
const KEY_WIDTH = SPACING.md;
const KEY_HEIGHT = SPACING.xxs;
/** The tooltip floats over marks, so its fill is laid over the page colour and hides what is under it (R1-2). */
const FILL = `linear-gradient(${ADMIN_COLORS.navHover}, ${ADMIN_COLORS.navHover}), ${ADMIN_COLORS.page}`;

interface ChartTooltipProps {
  content: TooltipContent | null;
  /** The point it describes, in px from the plot's top left corner. */
  x: number;
  y: number;
  /** The plot's size. The tooltip opens towards the roomier side, so it stays inside. */
  bounds: {width: number; height: number};
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * The one styled tooltip every chart shares. It sits beside its point, to the
 * right in the plot's left half and to the left in the right half, below the
 * point in the top half and above it in the bottom half, so it never leaves
 * the plot. It is visual only (aria-hidden) and ignores the pointer: every
 * mark or cursor position carries the same text as its accessible name
 * (tooltipText in series.ts). Values lead in the strong text colour and labels
 * follow in muted, each keyed by a short line in the series colour (dataviz).
 */
export function ChartTooltip({content, x, y, bounds}: ChartTooltipProps) {
  if (!content) return null;
  const px = clamp(x, 0, bounds.width);
  const py = clamp(y, 0, bounds.height);
  const toRight = px <= bounds.width / 2;
  const below = py < bounds.height / 2;
  const dx = toRight ? `${OFFSET}px` : `calc(-100% - ${OFFSET}px)`;
  const dy = below ? `${OFFSET}px` : `calc(-100% - ${OFFSET}px)`;
  const keyed = content.rows.some((row) => row.color);
  return (
    <div
      aria-hidden="true"
      className="adm-chart-tip"
      data-placement={`${below ? 'below' : 'above'}-${toRight ? 'right' : 'left'}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 1,
        transform: `translate(${px}px, ${py}px) translate(${dx}, ${dy})`,
        width: 'max-content',
        maxWidth: Math.max(bounds.width / 2 - OFFSET, MIN_WIDTH),
        boxSizing: 'border-box',
        padding: `${SPACING.sm}px ${SPACING.md}px`,
        background: FILL,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.box,
        boxShadow: `0 6px 18px ${blackRgba(0.4)}`,
        pointerEvents: 'none',
        fontSize: ADMIN_TYPE.small,
        lineHeight: 1.4,
        color: ADMIN_COLORS.text,
      }}>
      <div style={{fontWeight: 600}}>{content.title}</div>
      {content.rows.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: keyed ? 'auto auto minmax(0, 1fr)' : 'auto minmax(0, 1fr)',
            alignItems: 'center',
            columnGap: SPACING.sm,
            rowGap: SPACING.xxs,
            marginTop: SPACING.xs,
          }}>
          {content.rows.map((row, i) => (
            <Fragment key={`${row.label}-${i}`}>
              {keyed && (
                <span
                  style={{
                    width: KEY_WIDTH,
                    height: KEY_HEIGHT,
                    borderRadius: RADIUS.xs,
                    background: row.color ?? 'transparent',
                  }}
                />
              )}
              <span style={{fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{row.value}</span>
              <span style={{color: ADMIN_COLORS.muted}}>{row.label}</span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

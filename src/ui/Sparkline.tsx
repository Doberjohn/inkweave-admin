import {ADMIN_COLORS} from '../theme/adminTheme';

/** viewBox width; the svg stretches to its container (preserveAspectRatio none). */
const VIEW_WIDTH = 100;
/** Keeps the line's peaks and floor clear of the svg's edges. */
const PAD = 4;

interface SparklineProps {
  data: number[];
  /** The line and its faint area fill (default the accent gold). Any CSS colour. */
  color?: string;
  /** Height in px (default 56). */
  height?: number;
}

/**
 * A slim line sparkline with a faint area fill that stretches to its
 * container's width (moved from WebAnalyticsView). A line needs two points,
 * so it renders nothing for fewer. Decoration (aria-hidden): the totals it
 * illustrates are printed beside it.
 */
export function Sparkline({data, color = ADMIN_COLORS.accent, height = 56}: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const stepX = VIEW_WIDTH / (data.length - 1);
  const line = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - PAD - (v / max) * (height - 2 * PAD)).toFixed(2)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{display: 'block'}}>
      <polygon points={`0,${height} ${line} ${VIEW_WIDTH},${height}`} fill={color} fillOpacity={0.1} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

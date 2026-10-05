import {useId} from 'react';
import {RADIUS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {HatchPattern} from './HatchPattern';
import {chartDomId, hatchId, seriesPaint, type SeriesDef} from './series';

/** A bar or area swatch, in px. */
const SWATCH = SPACING.md - SPACING.xxs;
/** A line key's length, in px. */
const LINE_KEY = SPACING.lg;

interface ChartLegendProps {
  series: readonly SeriesDef[];
  /** 'rect' for bars and areas, 'line' for lines, 'dot' for scatter dots: the swatch mirrors the mark. */
  mark: 'rect' | 'line' | 'dot';
}

/** A filled swatch in the series' paint: a dot for scatter dots, else a rounded square. */
function Swatch({mark, fill}: {mark: 'rect' | 'dot'; fill: string}) {
  if (mark === 'dot') return <circle cx={SWATCH / 2} cy={SWATCH / 2} r={SWATCH / 2} fill={fill} />;
  return <rect width={SWATCH} height={SWATCH} rx={RADIUS.xs} fill={fill} />;
}

/**
 * The legend of a chart with two or more series: a swatch and a label per
 * series, in series order. The swatch carries the colour (or the hatch); the
 * label stays in the muted text colour, never the series colour. A chart of
 * one series needs no legend, since its title names it, so this renders
 * nothing then (dataviz, "Labels & legend").
 */
export function ChartLegend({series, mark}: ChartLegendProps) {
  const chartId = chartDomId(useId());
  if (series.length < 2) return null;
  return (
    <ul
      aria-label="Legend"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${SPACING.xs}px ${SPACING.lg}px`,
        margin: 0,
        padding: 0,
        listStyle: 'none',
        fontSize: ADMIN_TYPE.label,
        color: ADMIN_COLORS.muted,
      }}>
      {series.map((s) => (
        <li key={s.id} style={{display: 'inline-flex', alignItems: 'center', gap: SPACING.xs}}>
          {mark === 'line' ? (
            <svg aria-hidden="true" width={LINE_KEY} height={SWATCH} style={{display: 'block', flex: 'none'}}>
              <line
                x1={1}
                x2={LINE_KEY - 1}
                y1={SWATCH / 2}
                y2={SWATCH / 2}
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" width={SWATCH} height={SWATCH} style={{display: 'block', flex: 'none'}}>
              {s.pattern === 'hatch' && (
                <defs>
                  <HatchPattern id={hatchId(chartId, s)} color={s.color} />
                </defs>
              )}
              <Swatch mark={mark} fill={seriesPaint(s, chartId)} />
            </svg>
          )}
          {s.label}
        </li>
      ))}
    </ul>
  );
}

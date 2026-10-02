import type {BarDatum, BarLayout} from './barLayout';
import {useBarFocus} from './useBarFocus';
import type {ChartCursor} from './useChartCursor';

interface SelectableBarsProps {
  data: readonly BarDatum[];
  layout: BarLayout;
  ariaLabel: string;
  /** Each bar's accessible name: its tooltip text. */
  names: readonly string[];
  selectedIndex: number;
  cursor: ChartCursor;
  onSelect: (key: string | null) => void;
  /** The drawing, which sits over the hit columns. */
  children: React.ReactNode;
}

/**
 * The bars as toggle buttons (aria-pressed) with a roving Tab stop
 * (useBarFocus): ←/→, Home and End move between bars, Enter or Space toggles
 * one, and Escape hides the tooltip. A picked bar's toggle hands back null.
 */
export function SelectableBars({data, layout, ariaLabel, names, selectedIndex, cursor, onSelect, children}: SelectableBarsProps) {
  const buttonProps = useBarFocus(data.length, selectedIndex, cursor);
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      // A lifted finger fires pointerleave too, so a touch keeps its bar's tooltip (as useChartCursor does).
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') cursor.setIndex(null);
      }}
      style={{position: 'relative', height: layout.svgHeight}}>
      {/* The hit columns sit under the drawing, each spanning its whole slot and the
          full height, so the target is never just the painted bar. AdminStyles'
          adm-chart-hit draws their hover, pressed and focus states; the drawing
          dims the other bars itself, so a focused column keeps its full ring. */}
      <div style={{position: 'absolute', top: 0, left: layout.left, width: layout.plotWidth, height: layout.svgHeight, display: 'flex'}}>
        {data.map((d, i) => (
          <button
            key={d.key}
            {...buttonProps(i)}
            type="button"
            className="adm-chart-hit"
            aria-label={names[i]}
            aria-pressed={i === selectedIndex}
            onClick={() => onSelect(i === selectedIndex ? null : d.key)}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

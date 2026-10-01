import {RADIUS} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';

interface MeterBarProps {
  /** The filled share, 0 to 1; anything outside is clamped. */
  fraction: number;
  color: string;
  /** Track height in px (default 6). */
  height?: number;
  /**
   * Names the bar as a meter for assistive tech. Leave it out when the number
   * the bar shows is printed beside it: the bar is then decoration.
   */
  label?: string;
}

/** A horizontal share bar on the neutral track: voter activity, event share, dimension participation. */
export function MeterBar({fraction, color, height = 6, label}: MeterBarProps) {
  const percent = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) * 100 : 0;
  const track: React.CSSProperties = {height, background: ADMIN_COLORS.barTrack, borderRadius: RADIUS.xs, overflow: 'hidden'};
  const fill = <div style={{width: `${percent}%`, height: '100%', background: color, borderRadius: RADIUS.xs}} />;
  if (label == null) {
    return (
      <div aria-hidden="true" style={track}>
        {fill}
      </div>
    );
  }
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      style={track}>
      {fill}
    </div>
  );
}

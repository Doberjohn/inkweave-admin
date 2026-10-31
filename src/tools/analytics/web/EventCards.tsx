import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {Sparkline} from '../../../ui/Sparkline';
import type {VercelEvent} from '../vercelAnalyticsTypes';

interface EventCardsProps {
  /** Already sorted, busiest first, each trend filled to the window (fillTrendDays). */
  events: VercelEvent[];
  /** The group's name for the cards: its heading ("Sign-in"). */
  label: string;
  selectedName: string;
  onSelect: (name: string) => void;
}

/**
 * One card per tracked event in a group: label, event name, all-time total, visitors and
 * the window's sparkline. The cards pick the event that the trend and the
 * breakdowns below describe. Each is a native button styled by AdminStyles'
 * adm-card-btn (a <button> takes no inline style, #509); the picked one is
 * pressed (a gold edge and tint) and its line turns gold. Its total stays in
 * the text colour, as text never wears the series colour. The sparkline stays
 * a picture (aria-hidden, no cursor, no tooltip): a chart's slider inside the
 * button would nest one control in another, so the interactive chart is the
 * trend card below.
 */
export function EventCards({events, label, selectedName, onSelect}: EventCardsProps) {
  return (
    <div
      role="group"
      aria-label={`${label} events`}
      // auto-fill, not auto-fit: a group of one or two keeps the column width of a full row, so the
      // cards line up from group to group instead of stretching across the page.
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: SPACING.md}}>
      {events.map((event) => {
        const selected = event.name === selectedName;
        return (
          <button
            key={event.name}
            type="button"
            className="adm-card-btn"
            aria-pressed={selected}
            onClick={() => onSelect(event.name)}>
            <span style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs, textAlign: 'left'}}>
              <span
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: SPACING.sm,
                }}>
                <span style={{fontSize: ADMIN_TYPE.small, fontWeight: 500, color: ADMIN_COLORS.muted}}>{event.label}</span>{' '}
                <code style={{fontSize: ADMIN_TYPE.micro, color: ADMIN_COLORS.muted}}>{event.name}</code>
              </span>
              <span
                style={{
                  fontFamily: FONTS.hero,
                  fontSize: ADMIN_TYPE.kpi,
                  lineHeight: 1,
                  color: ADMIN_COLORS.text,
                }}>
                {fmtInt(event.total)}
              </span>
              <span style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{fmtInt(event.visitors)} visitors</span>
              <Sparkline
                data={event.trend.map((point) => point.count)}
                color={selected ? ADMIN_COLORS.accent : ADMIN_COLORS.barNeutral}
                height={28}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

import {
  ALL_INKS,
  INK_COLORS,
  InkIcon,
  RaritySymbol,
  SPACING,
  TRUNCATE,
  enchantedSymbol,
  epicSymbol,
  iconicSymbol,
  rarityConfigOf,
} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {MeterBar} from '../../../ui/MeterBar';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import type {Breakdown} from '../vercelAnalyticsTypes';
import {breakdownShares} from './webModel';

/** eventData props that carry an ink name: their rows get the ink's icon, and their bars the ink's colour. */
const INK_PROPS = new Set(['ink', 'clickedCardInk', 'cardAInk', 'cardBInk']);

/** The eventData prop that carries a card's rarity (reveal_card_click sends `card.rarity ?? null`). */
const RARITY_PROP = 'rarity';

/** Printings RaritySymbol doesn't draw; the app shows them from these webps (PrintingPills). */
const PRINTING_SYMBOLS: Record<string, string> = {enchanted: enchantedSymbol, epic: epicSymbol, iconic: iconicSymbol};

/** Row icon size in px. */
const ICON_SIZE = 18;

/** The row's ink, when its prop carries inks and its value is one. */
function inkOf(prop: string, value: string) {
  return INK_PROPS.has(prop) ? ALL_INKS.find((ink) => ink === value) : undefined;
}

/**
 * The icon in front of a row's value: the app's ink icon on ink props. On the
 * rarity prop, RaritySymbol draws Common to Legendary (the five keys
 * rarityConfigOf knows) and the printing webps cover Enchanted, Epic and
 * Iconic. "Others" and any other value show their text alone.
 */
function ValueIcon({prop, value}: {prop: string; value: string}) {
  const ink = inkOf(prop, value);
  if (ink) return <InkIcon ink={ink} size={ICON_SIZE} />;
  if (prop !== RARITY_PROP) return null;
  const rarity = rarityConfigOf(value);
  if (rarity) return <RaritySymbol rarity={rarity.key} size={ICON_SIZE} />;
  const printing = PRINTING_SYMBOLS[value.trim().toLowerCase()];
  if (!printing) return null;
  return (
    <img
      src={printing}
      alt=""
      aria-hidden
      width={ICON_SIZE}
      height={ICON_SIZE}
      style={{display: 'block', flexShrink: 0, objectFit: 'contain'}}
    />
  );
}

function BreakdownCard({breakdown}: {breakdown: Breakdown}) {
  const shares = breakdownShares(breakdown.rows);
  return (
    <Panel
      title={breakdown.label}
      action={<code style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{breakdown.prop}</code>}>
      {shares.length === 0 ? (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>No data in window.</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.sm,
          }}>
          {shares.map(({row, pct, fraction, others}) => {
            const ink = inkOf(breakdown.prop, row.value);
            const barColor = ink ? INK_COLORS[ink].border : others ? ADMIN_COLORS.barNeutral : ADMIN_COLORS.accent;
            return (
              <li
                key={row.value}
                title={`${row.value}: ${fmtInt(row.count)} (${pct}%)`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 110px) minmax(0, 1fr) 48px 36px',
                  gap: SPACING.sm,
                  alignItems: 'center',
                  fontSize: ADMIN_TYPE.small,
                }}>
                <span style={{display: 'flex', alignItems: 'center', gap: SPACING.sm, minWidth: 0}}>
                  <ValueIcon prop={breakdown.prop} value={row.value} />
                  <span style={{...TRUNCATE, color: others ? ADMIN_COLORS.muted : ADMIN_COLORS.text}}>{row.value}</span>
                </span>
                <MeterBar fraction={fraction} color={barColor} height={6} />
                <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtInt(row.count)}</span>
                <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ADMIN_COLORS.muted}}>
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/**
 * The selected event's eventData breakdowns over the reporting window, one
 * card each. Each bar is scaled to the breakdown's biggest row; the percent is
 * the row's share of the whole breakdown.
 */
export function BreakdownCards({breakdowns}: {breakdowns: Breakdown[]}) {
  if (breakdowns.length === 0) return <Notice>No property breakdowns configured for this event.</Notice>;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: SPACING.lg,
      }}>
      {breakdowns.map((breakdown) => (
        <BreakdownCard key={breakdown.prop} breakdown={breakdown} />
      ))}
    </div>
  );
}

import type {LorcanaCard} from 'inkweave-synergy-engine';
import {smallImageUrl} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS} from '../theme/adminTheme';
import {CARD_THUMB} from './layout';

// The empty box shows until the art loads, and stays for a card with none.
const BOX: React.CSSProperties = {
  display: 'block',
  width: CARD_THUMB.width,
  height: CARD_THUMB.height,
  overflow: 'hidden',
  borderRadius: ADMIN_RADIUS.tag,
  backgroundColor: ADMIN_COLORS.card,
};
const IMAGE: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};

/** A row's art, or its empty box. Decoration: the row's text names the card. */
export function CardThumb({card}: {card: LorcanaCard}) {
  const src = smallImageUrl(card);
  return (
    <span style={BOX}>
      {src && <img src={src} alt="" width={CARD_THUMB.width} height={CARD_THUMB.height} loading="lazy" style={IMAGE} />}
    </span>
  );
}

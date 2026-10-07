import {useRef} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {FONTS, InkIcon, RaritySymbol, SPACING, rarityConfigOf, smallImageUrl} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {cardFacts} from './cardView';

/** The thumbnail's box: the handoff's 64 × 90 (dc.html:578), a card's own proportions. */
const THUMB_WIDTH = 64;
const THUMB_HEIGHT = 90;
const ICON_SIZE = 18;

const HEADER: React.CSSProperties = {display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xl};
const THUMB: React.CSSProperties = {
  flex: 'none',
  objectFit: 'cover',
  borderRadius: ADMIN_RADIUS.box,
  border: `1px solid ${ADMIN_COLORS.inputBorder}`,
};
const IDENTITY: React.CSSProperties = {flex: '1 1 240px', minWidth: 0, display: 'grid', gap: SPACING.sm};
const NAME: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.pageTitle,
  fontWeight: 400,
  lineHeight: 1.1,
  color: ADMIN_COLORS.text,
};
const VERSION: React.CSSProperties = {fontFamily: FONTS.body, fontSize: ADMIN_TYPE.emphasis, color: ADMIN_COLORS.muted};
const FACTS: React.CSSProperties = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: SPACING.md,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.muted,
};
const ICONS: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.xs};

/**
 * The base rarity's glyph and name (R-49), through rarityConfigOf, the five
 * rarities RaritySymbol draws for a card. Nothing for a card without one: a
 * preview card can have none, and Enchanted, Epic and Iconic are printings,
 * not rarities (R-3).
 */
function CardRarity({rarity}: {rarity: string | undefined}) {
  const config = rarityConfigOf(rarity);
  if (!config) return null;
  return (
    <span style={ICONS}>
      <RaritySymbol rarity={config.key} size={ICON_SIZE} />
      {config.name}
    </span>
  );
}

/** The line under the name: inks (named for a screen reader), rarity, type, cost, inkwell and collector number. */
function CardFacts({card}: {card: LorcanaCard}) {
  return (
    <p style={FACTS}>
      <span style={ICONS}>
        <InkIcon ink={card.ink} size={ICON_SIZE} decorative={false} />
        {card.ink2 && <InkIcon ink={card.ink2} size={ICON_SIZE} decorative={false} />}
      </span>
      <CardRarity rarity={card.rarity} />
      <span>{cardFacts(card)}</span>
      {card.setNumber != null && <code>#{card.setNumber}</code>}
    </p>
  );
}

interface CardHeaderProps {
  card: LorcanaCard;
  /** At the right: R4's "Edit in Card studio". */
  actions?: React.ReactNode;
  /** The page's focus handoff (R-48): the page asks when the URL names another card (R3-7), and this h2 takes it. */
  handoff?: FocusHandoff;
}

/**
 * The card the page is about: its thumbnail, its name (the h2 the focus
 * handoff lands on), and what kind of card it is. The thumbnail is
 * decoration, so it has no alt text: the h2 names the card.
 */
export function CardHeader({card, actions, handoff}: CardHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'h2');
  const thumb = smallImageUrl(card);
  return (
    <div ref={ref} style={HEADER}>
      {thumb && <img src={thumb} alt="" width={THUMB_WIDTH} height={THUMB_HEIGHT} style={THUMB} />}
      <div style={IDENTITY}>
        <h2 tabIndex={-1} style={NAME}>
          {card.name}
          {/* The space is its own text node, so the h2's name reads "Maui Hero to All", not "MauiHero to All". */}
          {card.version && (
            <>
              {' '}
              <span style={VERSION}>{card.version}</span>
            </>
          )}
        </h2>
        <CardFacts card={card} />
      </div>
      {actions != null && <div style={{marginLeft: 'auto'}}>{actions}</div>}
    </div>
  );
}

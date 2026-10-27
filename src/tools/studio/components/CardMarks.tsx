import type {LorcanaCard} from 'inkweave-synergy-engine';
import {InkIcon, RaritySymbol, SPACING, Tag, rarityConfigOf} from '../../../app-bridge';
import type {CardTag} from '../editSearch';

/** The ink and rarity glyphs' box, in px: the handoff's search rows draw them at 20 to 22. */
export const MARK_SIZE = 20;

const MARKS: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.xs};

/**
 * Each tag's chip: lowercase, as admin's other tags read ("raw", "low n"), and where the card's data comes from.
 * The widest chip, CardTags' "not deployed yet" (92px), sets the list width under which a search row stacks its
 * marks under its name (EditSearch's SEARCH_STACK_BELOW, 306px, in AdminStyles.tsx): a wider tag word, here or
 * in CardTags, needs that breakpoint measured again.
 */
const TAGS: Readonly<Record<CardTag, {text: string; title: string}>> = {
  Preview: {text: 'preview', title: 'Its data comes from previewCards.json'},
  Released: {text: 'released', title: 'Its data comes from LorcanaJSON'},
};

/**
 * A card's tags, in Edit card's search rows and its Editing banner: Preview or
 * Released (cardTag), none while the branch file is unread (R-71), and "not
 * deployed yet" for a card only the branch file holds (R-66).
 */
export function CardTags({tag, deployed}: {tag: CardTag | null; deployed: boolean}) {
  return (
    <>
      {tag && <Tag title={TAGS[tag].title}>{TAGS[tag].text}</Tag>}
      {!deployed && <Tag title="In previewCards.json, not on inkweave.ink yet">not deployed yet</Tag>}
    </>
  );
}

/** The card's ink icons, both for a dual-ink card, each named for a screen reader (its alt), as R3's header names them. */
export function CardInks({card}: {card: Pick<LorcanaCard, 'ink' | 'ink2'>}) {
  return (
    <span style={MARKS}>
      <InkIcon ink={card.ink} size={MARK_SIZE} decorative={false} />
      {card.ink2 && <InkIcon ink={card.ink2} size={MARK_SIZE} decorative={false} />}
    </span>
  );
}

/**
 * The card's rarity glyph, titled with its name for a pointer, or nothing for
 * a card with none. rarityConfigOf knows the five base rarities, as R3's header
 * does (R-49): Enchanted, Epic and Iconic are printings, not cards (R-74).
 * Hidden from screen readers, title and all, so a search row's link name stays
 * "name, tags, version, inks, number" in every browser.
 */
export function RarityMark({rarity}: {rarity: string | undefined}) {
  const config = rarityConfigOf(rarity);
  if (!config) return null;
  return (
    <span title={config.name} aria-hidden style={MARKS}>
      <RaritySymbol rarity={config.key} size={MARK_SIZE} />
    </span>
  );
}

// The ONLY module allowed to import from upstream/ (the pinned app submodule).
// Everything admin uses from the app is re-exported here, so a pin bump that
// changes app internals breaks in exactly one place. Enforced by the
// no-restricted-imports rule in eslint.config.js (docs/PLAN.md, D3). The engine
// is admin's own workspace package, so admin imports it by name instead.

// The app's global stylesheet: @font-face on /fonts/* (forwarded to
// inkweave.ink), body colors, the .card-tile rules CardTile depends on, and the
// reduced-motion block.
import '../upstream/inkweave/apps/web/src/index.css';
// CardTile's loading placeholder is a react-loading-skeleton; the app loads
// this stylesheet once, in its main.tsx.
import 'react-loading-skeleton/dist/skeleton.css';

export {
  ALL_INKS,
  COLORS,
  EASING,
  EMPTY_BOX,
  FONTS,
  FONT_SIZES,
  GOLD_GLOW,
  INK_COLORS,
  LETTER_SPACING,
  RADIUS,
  REVEAL_ID_BASE,
  REVEAL_SET_CODE,
  REVEAL_SET_NUMBER,
  SET_NAMES,
  SET_TOTAL,
  SPACING,
  TIER_COLORS,
  TRUNCATE,
  Z_INDEX,
  blackRgba,
  hexRgba,
  inkBlock,
  whiteRgba,
} from '../upstream/inkweave/apps/web/src/shared/constants';
export {CardTranslationPanel} from '../upstream/inkweave/apps/web/src/shared/components/CardTranslationPanel';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
// The app's overlay contract (inkweave#510): portal, scrim, focus trap, Escape, focus
// restore and scroll lock. inkweave/no-unshelled-dialogs allows aria-modal only
// through it, so admin's dialogs render in it.
export {DialogShell} from '../upstream/inkweave/apps/web/src/shared/components/DialogShell';
export {InkIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkIcon';
export {LinkButton} from '../upstream/inkweave/apps/web/src/shared/components/LinkButton';
// useAutocomplete is the app's card search combobox (R3-5's switcher): by name,
// never by id, from two letters, newest set first, after a 150 ms debounce.
export {
  useAutocomplete,
  useContainerWidth,
  type UseAutocompleteReturn,
} from '../upstream/inkweave/apps/web/src/shared/hooks';
export {
  CardDataProvider,
  useCardDataContext,
} from '../upstream/inkweave/apps/web/src/shared/contexts/CardDataContext';
export {CardTile} from '../upstream/inkweave/apps/web/src/features/cards/components/CardTile';
// searchCardsByName is useAutocomplete's own match, run without its debounce
// (R3-5's "No cards match.").
export {searchCardsByName, smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
// A card's precomputed synergy file, /data/synergies/<id>.json (a forwarded
// path). Each id's result is kept for the session, and a non-OK or non-JSON
// response is kept as an empty result. A failed fetch or malformed JSON rejects
// and isn't kept, so the next call fetches again.
export {fetchCardSynergies} from '../upstream/inkweave/apps/web/src/features/synergies/hooks/usePrecomputedSynergies';
// The app's synergy tiers: 9.5 and up Perfect, 7 Strong, 4 Moderate, below 4
// Weak. A tier's color is its TIER_COLORS entry.
export {
  getStrengthTier,
  type StrengthTierLabel,
} from '../upstream/inkweave/apps/web/src/features/synergies/utils/scoreUtils';
// RaritySymbol draws Common to Legendary; rarityConfigOf maps a card's rarity
// ("Super Rare") to the same five keys and returns undefined for any other.
export {RaritySymbol} from '../upstream/inkweave/apps/web/src/features/reveals/RaritySymbol';
export {rarityConfigOf} from '../upstream/inkweave/apps/web/src/features/reveals/rarity';
// Enchanted, Epic and Iconic are printings RaritySymbol doesn't draw; the app's
// PrintingPills shows them from these files (?no-inline keeps them out of the JS).
export {default as enchantedSymbol} from '../upstream/inkweave/apps/web/src/assets/enchanted.webp?no-inline';
export {default as epicSymbol} from '../upstream/inkweave/apps/web/src/assets/epic.webp?no-inline';
export {default as iconicSymbol} from '../upstream/inkweave/apps/web/src/assets/iconic.webp?no-inline';
// The pinned app's previewCards.json as text. The reveal tool's insert test
// runs against it, so a pin bump that changes the file's layout fails here.
export {default as PINNED_PREVIEW_CARDS_JSON} from '../upstream/inkweave/apps/web/public/data/previewCards.json?raw';

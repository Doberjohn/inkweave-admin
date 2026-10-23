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
// The app's promo merge is plain JavaScript (scripts/lib/*.mjs): the typed exports below wrap these.
import {
  collectionPromos as appCollectionPromos,
  mergePromoPrintings as appMergePromoPrintings,
} from '../upstream/inkweave/scripts/lib/promo-printings.mjs';
import {byPrintingOrder as appByPrintingOrder} from '../upstream/inkweave/scripts/lib/fold-variants.mjs';
import {finishesById as appFinishesById} from '../upstream/inkweave/scripts/lib/finishes.mjs';

export {
  ALL_INKS,
  COLORS,
  // The kit's off look (dimmed, a not-allowed cursor), which CtaButton gives a held button itself.
  DISABLED_STYLE,
  DURATION,
  EASING,
  FONTS,
  FONT_SIZES,
  INK_COLORS,
  LETTER_SPACING,
  // The promo sets, oldest first, each by the code printed on its cards ("P1" in 25/P1) and its name.
  PROMO_SETS,
  RADIUS,
  REVEAL_ID_BASE,
  REVEAL_SET_CODE,
  REVEAL_SET_NUMBER,
  SET_NAMES,
  SET_TOTAL,
  SHADOWS,
  SPACING,
  TABULAR,
  TIER_COLORS,
  TRUNCATE,
  Z_INDEX,
  blackRgba,
  hexRgba,
  inkBlock,
  // A promo set's place in release order, by its code ("P1", "C3"); -1 for a code none has.
  promoSetRank,
  whiteRgba,
  // One of PROMO_SETS: its code and name, and any editions it gathers.
  type PromoSet,
} from '../upstream/inkweave/apps/web/src/shared/constants';
export {CardTranslationPanel} from '../upstream/inkweave/apps/web/src/shared/components/CardTranslationPanel';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
// The app's overlay contract (Doberjohn/inkweave#510): portal, scrim, focus
// trap, Escape, focus restore and scroll lock. inkweave/no-unshelled-dialogs
// allows aria-modal only through it, so admin's dialogs render in it.
export {DialogShell} from '../upstream/inkweave/apps/web/src/shared/components/DialogShell';
export {InkIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkIcon';
// Inkable or Uninkable, as the app draws them (Card studio's Inkable buttons).
export {InkwellIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkwellIcon';
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
// (R3-5's "No cards match."). transformRawCards is how the app's loader builds
// the card list: the engine's transform plus imageUrl, the image hashes,
// scanLanguage and the printings. Card studio builds with it the cards that
// only the target branch's previewCards.json holds (R-66), so each points at
// its art, which shows once inkweave.ink serves it. isChaseRarity tells Epic,
// Enchanted and Iconic from the rest (Edit card's Printings panel names a
// printing's row by it).
export {
  isChaseRarity,
  searchCardsByName,
  smallImageUrl,
  transformRawCards,
} from '../upstream/inkweave/apps/web/src/features/cards/loader';
// A printing's versions: its data's `finishes`, else its rarity's (Doberjohn/inkweave#880).
export {finishesOf} from '../upstream/inkweave/apps/web/src/features/collection/printingFinishes';
// One version a printing comes in: normal or foil.
export type {Finish} from '../upstream/inkweave/apps/web/src/features/collection/collectionParser';
// The promos of collection/promos.json, as the file stores them and as collection mode holds them.
export {
  transformPromos,
  type CollectionPromo,
  type RawCollectionPromo,
} from '../upstream/inkweave/apps/web/src/features/collection/collectionPromos';
/** A card of allCards.json as the promo merge reads it. */
export interface MergeCard {
  id: number;
  fullName: string;
  variants?: object[];
  finishes?: readonly string[];
}
/** The catalog as the merge reads it: the groups of both sections. */
export interface MergeCatalog {
  fold: ReadonlyArray<{baseId: number; fullName: string; variants: readonly object[]}>;
  noBaseCard?: ReadonlyArray<{lorcanaJsonBaseId: number | null; fullName: string; variants: readonly object[]}>;
}
/** What a merge changed, card by card. */
export interface MergeReport {
  changes: ReadonlyArray<{
    card: MergeCard;
    added: readonly object[];
    updated: readonly object[];
    removed: readonly object[];
  }>;
  skipped: {printings: number; cards: number};
}
// Makes each card's promo entries the catalog's, in place; throws, changing nothing, if the catalog can't merge.
export const mergePromoPrintings: (cards: MergeCard[], catalog: MergeCatalog) => MergeReport = appMergePromoPrintings;
// Every catalog promo as collection/promos.json lists it; `kept` holds the versions a file has already, by id.
// The cast: the .mjs only reads `kept`, but its `= new Map()` default types it as a mutable Map, which refuses a ReadonlyMap.
export const collectionPromos = appCollectionPromos as (
  catalog: MergeCatalog,
  kept?: ReadonlyMap<string, readonly string[]>,
) => object[];
// The `finishes` already in entries and their variants, by id: what collectionPromos carries over.
export const finishesById: (entries: readonly object[]) => Map<string, readonly string[]> = appFinishesById;
// A card's printings in the switcher's order: the others by number, then the promos by set and number.
export const byPrintingOrder: (a: object, b: object) => number = appByPrintingOrder;
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
// RaritySymbol draws Common to Legendary and the Enchanted, Epic and Iconic
// printings, by lowercased key ("super rare", "enchanted"), and nothing for any
// other key. rarityConfigOf maps a card's rarity ("Super Rare") to one of the
// five rarities' keys, and returns undefined for anything else, printings too.
export {RaritySymbol} from '../upstream/inkweave/apps/web/src/features/reveals/RaritySymbol';
export {rarityConfigOf} from '../upstream/inkweave/apps/web/src/features/reveals/rarity';
// The pinned app's previewCards.json as text. The write chain's tests and Card
// studio's Edit tests run against it, so a pin bump that changes the file's
// layout, or what its entries hold, fails here.
export {default as PINNED_PREVIEW_CARDS_JSON} from '../upstream/inkweave/apps/web/public/data/previewCards.json?raw';

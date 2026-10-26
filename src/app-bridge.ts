// The ONLY module allowed to import from upstream/ (the pinned app submodule)
// or from inkweave-ui, the app's shared component library. Everything admin uses
// from either is re-exported here, so a pin bump that changes them breaks in
// exactly one place. Enforced by the no-restricted-imports rule in
// eslint.config.js (docs/PLAN.md, D3). inkweave-ui is a workspace package built
// from the submodule (packages/ui), so the bridge imports it by name, as the
// app does; the engine is one too, and admin imports it by name anywhere.

// inkweave-ui's stylesheets, in the order the app's main.tsx loads them: the
// kit's focus rings and overlay transitions (DialogShell's), then the ink card
// placeholder that CardTile draws while a card has no art.
import 'inkweave-ui/styles/primitives.css';
import 'inkweave-ui/styles/lorcana.css';
// The app's global stylesheet: @font-face on /fonts/* (forwarded to
// inkweave.ink), body colors, the .card-tile rules CardTile depends on, and the
// reduced-motion block.
import '../upstream/inkweave/apps/web/src/index.css';
// react-loading-skeleton's stylesheet, which the app loads once, in its
// main.tsx. CardTile's placeholder is no skeleton: it is inkweave-ui's
// InkCardPlaceholder, which lorcana.css draws.
import 'react-loading-skeleton/dist/skeleton.css';
import type {Ink} from 'inkweave-synergy-engine';
// The app's promo merge is plain JavaScript (scripts/lib/*.mjs): the typed exports below wrap these.
import {
  collectionPromos as appCollectionPromos,
  mergePromoPrintings as appMergePromoPrintings,
  promoBaseProblems as appPromoBaseProblems,
} from '../upstream/inkweave/scripts/lib/promo-printings.mjs';
import {byPrintingOrder as appByPrintingOrder} from '../upstream/inkweave/scripts/lib/fold-variants.mjs';
import {finishesById as appFinishesById} from '../upstream/inkweave/scripts/lib/finishes.mjs';
import {
  FEATURED_COUNT as appFeaturedCount,
  FEATURED_INKS as appFeaturedInks,
  featuredEntry as appFeaturedEntry,
  featuredIdsJson as appFeaturedIdsJson,
  featuredListProblem as appFeaturedListProblem,
  missingFeaturedInks as appMissingFeaturedInks,
} from '../upstream/inkweave/scripts/lib/featured-ids.mjs';

export {
  COLORS,
  // The kit's dimmed recipe (opacity and cursor): New card fades the logos of the sets that take no new card to its opacity.
  DISABLED_STYLE,
  DURATION,
  EASING,
  FONTS,
  FONT_SIZES,
  LETTER_SPACING,
  RADIUS,
  SHADOWS,
  SPACING,
  TABULAR,
  TIER_COLORS,
  TRUNCATE,
  // Hidden on screen but still focusable: Card studio's file pickers (useHiddenFileInput).
  VISUALLY_HIDDEN,
  Z_INDEX,
  blackRgba,
  hexRgba,
  whiteRgba,
} from 'inkweave-ui/tokens/theme';
export {ALL_INKS, INK_COLORS} from 'inkweave-ui/tokens/lorcana';
// The app's data constants stay in the app.
export {
  // The promo sets, oldest first, each by the code printed on its cards ("P1" in 25/P1) and its name.
  PROMO_SETS,
  REVEAL_ID_BASE,
  REVEAL_SET_CODE,
  REVEAL_SET_NUMBER,
  // Each set's logo, a WebP under /art/sets/ (forwarded to inkweave.ink): Card studio's New card names its sets with them.
  SET_LOGOS,
  SET_NAMES,
  SET_TOTAL,
  inkBlock,
  // A promo set's place in release order, by its code ("P1", "C3"); -1 for a code none has.
  promoSetRank,
  // One of PROMO_SETS: its code and name, and any editions it gathers.
  type PromoSet,
} from '../upstream/inkweave/apps/web/src/shared/constants';
export {CardTranslationPanel} from 'inkweave-ui/lorcana/CardTranslationPanel';
export {CtaButton} from 'inkweave-ui/components/CtaButton';
// The app's overlay contract (Doberjohn/inkweave#510): portal, scrim, focus
// trap, Escape, focus restore and scroll lock. inkweave/no-unshelled-dialogs
// allows aria-modal only through it, so admin's dialogs render in it.
export {DialogShell} from 'inkweave-ui/components/DialogShell';
export {InkIcon} from 'inkweave-ui/lorcana/InkIcon';
// Inkable or Uninkable, as the app draws them (Card studio's Inkable buttons).
export {InkwellIcon} from 'inkweave-ui/lorcana/InkwellIcon';
export {LinkButton} from 'inkweave-ui/components/LinkButton';
export {useContainerWidth} from 'inkweave-ui/hooks/useContainerWidth';
// useAutocomplete is the app's card search combobox (R3-5's switcher): from two
// letters, after a 150 ms debounce, listing what its `search` finds, which the
// switcher gives as the loader's suggestCardsByName.
export {useAutocomplete, type UseAutocompleteReturn} from 'inkweave-ui/hooks/useAutocomplete';
export {
  CardDataProvider,
  useCardDataContext,
} from '../upstream/inkweave/apps/web/src/shared/contexts/CardDataContext';
// inkweave-ui's tile with neither seam: it draws card.imageUrl and warms
// nothing. Never the app's adapter, which warms the card modal's chunk, so
// admin would ship that chunk (pnpm check:size fails on it).
export {CardTile} from 'inkweave-ui/lorcana/CardTile';
// isChaseRarity tells Epic, Enchanted and Iconic from the rest (Edit card's
// Printings panel names a printing's row by it).
export {isChaseRarity} from 'inkweave-ui/lib/printings';
// suggestCardsByName is the switcher's `search`: the cards whose name has a
// word starting with each word of the query, never by id, newest set first. searchCardsByName is the
// same match unsorted, which the switcher runs without the debounce for R3-5's
// "No cards match.". transformRawCards is how the app's loader builds the card
// list: the engine's transform plus imageUrl, the image hashes, scanLanguage
// and the printings. Card studio builds with it the cards that only the target
// branch's previewCards.json holds (R-66), so each points at its art, which
// shows once inkweave.ink serves it.
export {
  searchCardsByName,
  smallImageUrl,
  suggestCardsByName,
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
// The .mjs exports are untyped (allowJs, no checkJs): this annotation is what admin relies on. `kept` is a Map,
// not a ReadonlyMap, because TypeScript reads the .mjs's `= new Map()` default as a mutable Map, which a
// ReadonlyMap can't stand in for. promoBridge.test.ts pins the output over the pinned files, and
// promoMerge.test.ts pins what `kept` carries over.
export const collectionPromos: (catalog: MergeCatalog, kept?: Map<string, readonly string[]>) => object[] = appCollectionPromos;
// The `finishes` already in entries and their variants, by id: what collectionPromos carries over.
export const finishesById: (entries: readonly object[]) => Map<string, readonly string[]> = appFinishesById;
// Why listed promos can't ship: one per promo whose card `cards` lacks or names otherwise, in the app's words.
export const promoBaseProblems: (promos: readonly object[], cards: ReadonlyArray<{id: number | string; fullName: string}>) => string[] =
  appPromoBaseProblems;
// A card's printings in the switcher's order: the others by number, then the promos by set and number.
export const byPrintingOrder: (a: object, b: object) => number = appByPrintingOrder;
// The homepage's featured cards, apps/web/src/features/cards/featuredCardIds.json (Doberjohn/inkweave#957):
// FEATURED_COUNT cards, the inks Amber to Steel in the file's order, and the rule graduation applies too.
/** A line of featuredCardIds.json: the card's id, and "<inks>: <full name>". */
export interface FeaturedEntry {
  id: string;
  card: string;
}
export const FEATURED_COUNT: number = appFeaturedCount;
export const FEATURED_INKS: readonly Ink[] = appFeaturedInks as Ink[];
// A card's line in the file, a dual-ink card's inks joined by "-".
export const featuredEntry: (card: {id: string | number; inks: readonly string[]; fullName: string}) => FeaturedEntry =
  appFeaturedEntry;
// The inks none of the cards carries, each card given as its inks.
export const missingFeaturedInks: (cardInks: readonly (readonly string[])[]) => Ink[] = appMissingFeaturedInks as (
  cardInks: readonly (readonly string[])[],
) => Ink[];
// Why a list can't be the homepage's, in the app's words, or null: six different cards that carry every ink.
export const featuredListProblem: (cards: ReadonlyArray<{id: string | number; inks: readonly string[]}>) => string | null =
  appFeaturedListProblem;
// The file's text: one entry per line, as the app keeps it.
export const featuredIdsJson: (entries: readonly FeaturedEntry[]) => string = appFeaturedIdsJson;
// A card's precomputed synergy file, /data/synergies/<id>.json (a forwarded
// path). Each id's result is kept for the session, and a 404 or a non-JSON 200
// is kept as an empty result. A failed fetch, any other error status (a 500) or
// malformed JSON rejects and isn't kept, so the next call fetches again.
export {fetchCardSynergies} from '../upstream/inkweave/apps/web/src/features/synergies/hooks/usePrecomputedSynergies';
// The app's synergy tiers: 9.5 and up Perfect, 7 Strong, 4 Moderate, below 4
// Weak. A tier's color is its TIER_COLORS entry.
export {getStrengthTier, type StrengthTierLabel} from 'inkweave-ui/lib/scoreUtils';
// RaritySymbol draws Common to Legendary and the Enchanted, Epic and Iconic
// printings, by lowercased key ("super rare", "enchanted"), and nothing for any
// other key. rarityConfigOf maps a card's rarity ("Super Rare") to one of the
// five rarities' keys, and returns undefined for anything else, printings too.
export {RaritySymbol} from 'inkweave-ui/lorcana/RaritySymbol';
export {rarityConfigOf} from 'inkweave-ui/lib/rarity';
// The pinned app's previewCards.json as text. The write chain's tests and Card
// studio's Edit tests run against it, so a pin bump that changes the file's
// layout, or what its entries hold, fails here.
export {default as PINNED_PREVIEW_CARDS_JSON} from '../upstream/inkweave/apps/web/public/data/previewCards.json?raw';

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
  CAP_LABEL,
  CAP_LABEL_XS,
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
  SET_TOTAL,
  SPACING,
  SURFACE_CARD,
  TRUNCATE,
  blackRgba,
  hexRgba,
  inkBlock,
  whiteRgba,
} from '../upstream/inkweave/apps/web/src/shared/constants';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
export {LinkButton} from '../upstream/inkweave/apps/web/src/shared/components/LinkButton';
export {TabList} from '../upstream/inkweave/apps/web/src/shared/components/TabList';
export {useContainerWidth} from '../upstream/inkweave/apps/web/src/shared/hooks';
export {
  CardDataProvider,
  useCardDataContext,
} from '../upstream/inkweave/apps/web/src/shared/contexts/CardDataContext';
export {CardTile} from '../upstream/inkweave/apps/web/src/features/cards/components/CardTile';
export {smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
export {usePrecomputedSynergies} from '../upstream/inkweave/apps/web/src/features/synergies/hooks/usePrecomputedSynergies';
// The pinned app's previewCards.json as text. The reveal tool's insert test
// runs against it, so a pin bump that changes the file's layout fails here.
export {default as PINNED_PREVIEW_CARDS_JSON} from '../upstream/inkweave/apps/web/public/data/previewCards.json?raw';

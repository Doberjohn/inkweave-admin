// The ONLY module allowed to import from upstream/ (the pinned app submodule).
// Everything admin uses from the app is re-exported here, so a pin bump that
// changes app internals breaks in exactly one place. Enforced by the
// no-restricted-imports rule in eslint.config.js (docs/PLAN.md, D3).

// The app's global stylesheet: @font-face on /fonts/* (forwarded to
// inkweave.ink), body colors, and the reduced-motion block.
import '../upstream/inkweave/apps/web/src/index.css';

export {
  CAP_LABEL,
  COLORS,
  FONTS,
  FONT_SIZES,
  SPACING,
  SURFACE_CARD,
} from '../upstream/inkweave/apps/web/src/shared/constants';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';

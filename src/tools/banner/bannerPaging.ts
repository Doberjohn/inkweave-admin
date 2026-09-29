// How the banner splits a card's synergies into carousel pages. BannerPage.tsx
// slices by these and scripts/export-banner.mjs counts pages by them; Node runs
// the script with this file imported directly, so keep it plain TypeScript
// (no JSX, no imports).

/** Synergy groups a banner shows at most, widest first. */
export const MAX_GROUPS = 6;
/** Synergy rows per carousel page. */
export const ROWS_PER_PAGE = 3;

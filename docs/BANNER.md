# Synergy Spotlight banner exporter

Generates the shareable "Synergy Spotlight" images for one card, the ones posted to Reddit and Facebook. It screenshots admin's `/banner/:cardId` route, which draws with the app's card data and precomputed synergies (forwarded from `inkweave.ink`), so the images match what production serves.

```bash
pnpm banner <cardId>        # e.g. pnpm banner 2983
```

Once per machine: `pnpm build:engine` (the dev server needs the engine) and `pnpm exec playwright install chromium`.

## What you get

Files land in `reports/banners/<cardId>/` (git-ignored), two per carousel page:

| File | Size | Use |
|------|------|-----|
| `<slug>-page-N.png` | 3600×3720, lossless | **Reddit** |
| `<slug>-page-N-fb2048.jpg` | 2048px wide, 4:4:4 JPEG | **Facebook** |

Facebook caps photos at 2048px on the longest side and re-compresses on upload, so the `-fb2048` variant is pre-sized to that width, with `4:4:4` chroma so colored text and gradients stay crisp. Reddit keeps the full-res PNG.

## How it works

`scripts/export-banner.mjs` is a thin camera pointed at the real UI:

1. Uses an admin dev server on `:5180`, or starts a throwaway one and stops it afterwards.
2. Reads `/data/synergies/<id>.json` through that server, counts the synergy groups, and derives the page count (`pageCountForGroups`) with the same `MAX_GROUPS = 6` / `ROWS_PER_PAGE = 3` rules as `BannerPage.tsx`. It stops if `inkweave.ink` has no precomputed synergies for the card.
3. Drives headless Chromium (Playwright) at `deviceScaleFactor: 3` through `/banner/<id>?page=<n>`, waits for the `.banner-stage` element plus fonts and images, and screenshots just that element: the PNG.
4. Derives the Facebook JPEG from that PNG with sharp.

The rendering is two files in `src/tools/banner/`:

- `BannerPage.tsx` loads the card and its precomputed synergies, and slices the groups into pages.
- `SynergyBanner.tsx` is the 1200×1240 stage: hero plus CTA and QR on the left, one synergy per row on the right, badge and set logo.

## Making a new card look as polished as Pocahontas

The layout works for any card. The bespoke touches are opt-in, through four maps in `SynergyBanner.tsx`, each keyed by card id:

| Map | Controls | Fallback when absent |
|-----|----------|----------------------|
| `HERO_OVERRIDES` | transparent "pop-out" hero art | the card's normal full-res art |
| `CARD_BLURBS` | the per-synergy sentence copy | generic `BANNER_BLURBS` line |
| `CARD_PICKS` | the exact 3 partner cards per row (by id) | top 3 by synergy score |
| `CARD_BLURB_HIGHLIGHTS` | which phrases are bolded in a blurb | nothing bolded |

For the next spotlight card:

1. `pnpm banner <newId>` to see the generic version.
2. Add the card's entries to the four maps. Pick partner card ids from `https://inkweave.ink/data/synergies/<newId>.json`, so they really are in the group and the "+N more" counts stay honest.
3. Run `pnpm banner <newId>` again.

The card back, the QR code and per-card pop-out art live in `public/art/banner/`. The set logo and the Inkweave logo come from the app through the `/art/sets/` and `/brand/` forwards (`forwarded-paths.json`).

## Notes

- `MAX_GROUPS` and `ROWS_PER_PAGE` are duplicated between the script and `BannerPage.tsx`, because a `.mjs` script can't import the `.tsx` constants. If you retune the page size in the route, update both.
- Synergies come from production, so a rule change shows up in banners once the app has deployed it.
- `SynergyBanner.tsx` is admin's one exception to the design-token lint: `no-raw-rgba`, `no-raw-font-size` and `no-raw-radius` are off for it in `eslint.config.js`, because its remaining literals have no token. When you touch the file, converge what you can and drop the rules it passes.

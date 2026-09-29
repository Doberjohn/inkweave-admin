# Synergy Spotlight banner exporter

Generates the shareable "Synergy Spotlight" images for one card, the ones posted to Reddit and Facebook. It screenshots admin's `/banner/:cardId` route, which draws with the app's card data and precomputed synergies (forwarded from `inkweave.ink`), so the images match what production serves.

```bash
pnpm banner <cardId>        # e.g. pnpm banner 2983
```

Once per machine: `pnpm build:engine` (the dev server needs the engine) and `pnpm exec playwright install chromium`.

## What you get

Files land in `reports/banners/<cardId>/` (git-ignored), two per carousel page. A successful run replaces the card's earlier exports, so a card that now has fewer pages, or a new name, leaves no stale files behind.

| File | Size | Use |
|------|------|-----|
| `<slug>-page-N.png` | 3600×3720, lossless | **Reddit** |
| `<slug>-page-N-fb2048.jpg` | 1982×2048 (2048px on the longest side), 4:4:4 JPEG | **Facebook** |

Facebook resizes photos longer than 2048px on either side and re-compresses them on upload. The `-fb2048` variant therefore fits inside 2048×2048 (the stage is taller than it is wide), with `4:4:4` chroma so colored text and gradients stay crisp. Reddit keeps the full-res PNG.

## How it works

`scripts/export-banner.mjs` is a thin camera pointed at the real UI:

1. Uses an admin dev server on `:5180`, or starts a throwaway one and stops it afterwards, on Ctrl+C too.
2. Reads `/data/synergies/<id>.json` through that server, counts the synergy groups, and derives the page count (`pageCountForGroups`) from `MAX_GROUPS` and `ROWS_PER_PAGE` in `src/tools/banner/bannerPaging.ts`, the constants `BannerPage.tsx` slices by. It stops if `inkweave.ink` has no precomputed synergies for the card.
3. Drives headless Chromium (Playwright) at `deviceScaleFactor: 3` through `/banner/<id>?page=<n>`, waits for the `.banner-stage` element plus fonts and images, and screenshots just that element: the PNG. It stops instead if the page reports an error (for example, the full-size card art could not load) or any art on the stage failed to load, the CSS card back included, so a banner with missing images is never written.
4. Derives the Facebook JPEG from that PNG with sharp.

The rendering is two files in `src/tools/banner/`:

- `BannerPage.tsx` loads the card and its precomputed synergies, and slices the groups into pages. An unknown card id or a failed load shows an alert, which stops the export.
- `SynergyBanner.tsx` is the 1200×1240 stage: hero plus CTA and QR on the left, one synergy per row on the right, badge and set logo.

## Making a new card look as polished as Pocahontas

The layout works for any card. The bespoke touches are opt-in, through four maps in `SynergyBanner.tsx`, each keyed by card id:

| Map | Controls | Fallback when absent |
|-----|----------|----------------------|
| `HERO_OVERRIDES` | transparent "pop-out" hero art | the card's normal full-res art |
| `CARD_BLURBS` | the per-synergy sentence copy | the generic `BANNER_BLURBS` line, else the synergy group's own tagline |
| `CARD_PICKS` | the exact 3 partner cards per row (by id) | top 3 by synergy score |
| `CARD_BLURB_HIGHLIGHTS` | which phrases are bolded in a blurb | nothing bolded |

For the next spotlight card:

1. `pnpm banner <newId>` to see the generic version.
2. Add the card's entries to the four maps. Pick partner card ids from `https://inkweave.ink/data/synergies/<newId>.json`, so they really are in the group and the "+N more" counts stay honest.
3. Run `pnpm banner <newId>` again.

The card back, the QR code and per-card pop-out art live in `public/art/banner/`. The set logo and the Inkweave logo come from the app through the `/art/sets/` and `/brand/` forwards (`forwarded-paths.json`).

## Notes

- `MAX_GROUPS` and `ROWS_PER_PAGE` live in `bannerPaging.ts`, which both the route and the script import (Node 24 runs its TypeScript directly), so retuning the page size there changes both.
- Synergies come from production, so a rule change shows up in banners once the app has deployed it.
- `SynergyBanner.tsx` is admin's one exception to the design-token lint: `no-raw-rgba`, `no-raw-font-size` and `no-raw-radius` are off for it in `eslint.config.js`, because its remaining literals have no token. When you touch the file, converge what you can and drop the rules it passes.

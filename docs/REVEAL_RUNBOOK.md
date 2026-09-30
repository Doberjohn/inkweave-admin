# Reveal runbook

How reveals reach Inkweave from admin. The season switch itself (the flag, the data block, per-season content, its production checks) is app work: `docs/reveals/START_REVEAL_SEASON.md` in Doberjohn/inkweave.

## After the app rotates the season

reveal-sync reads the season from the pinned app. Bump the pin (CLAUDE.md, "Updating the app pin") before the next `/fetch-reveals`, or the run targets the old set.

## New reveals in bulk: `/fetch-reveals`

Run `/fetch-reveals` from an admin session. The skill (`.claude/skills/fetch-reveals/SKILL.md`) drives the owner's Chrome for lorcanaplayer, and `node scripts/reveal-sync/run.mjs` does the rest. A run ends with one PR in the app repo and one commit of `state.json` on admin's `main`.

- Merge the reveal PR before the next run: `start` refuses while one is open.
- If `write` stops part-way (a network error, GitHub down), run `write RUN` again. It resumes, and never opens a second PR.
- `run.mjs report RUN` reprints a run's report.
- `git pull` in admin brings each run's committed `state.json` into your checkout. No run reads the local copy.

What a run will not write, by design, is in the skill: leaks, non-English cards, cards with no collector number, and anything the two sites or the readers cannot settle. Each lands in the report instead.

## Closing a reveal PR unmerged

The run's state commit on admin's `main` (`chore(reveals): record run <RUN>`) still marks its cards `written`, so no later run would retry them. Revert it on a `fix/` branch from `main` (`git revert <sha>`), and merge that as a PR. The next run fetches those cards again.

## One card at a time: the reveal publisher

Use it for a card the pipeline cannot write: a `validation-failed` card, or a promo in the reserved band.

1. Read the scan with the `scan-reveal-card` skill (user-level, `~/.claude/skills/scan-reveal-card/`; update its set number, id base and featured franchises each season).
2. Publish from https://inkweave-admin.vercel.app/reveal. Its GitHub token lives in that site's `localStorage`, so admin's local dev server (port 5180) has its own.
3. One atomic commit lands on the app's `master`: the record in `previewCards.json` plus the raw scan. `insertCardIntoPreviewJson` throws before committing if the result would not parse or the card did not land in `cards`.
4. The app's `.github/workflows/convert-reveal-images.yml` converts the raw, commits the AVIFs with `[skip ci]`, and prunes the raw.
5. The card commit triggers the app's deploy. **Allow 15 to 20 minutes** (the prerender crawl).

**Merge the season switch before publishing anything.** The publisher commits to `master`, and the convert workflow only fires there.

A card published while a `/fetch-reveals` run is open makes that run's `write` refuse, writing nothing: start a new run.

## Adding cards by hand

### Ids and filenames

- Numbered card: `id = REVEAL_ID_BASE + collector number` (Set 14 #50 is `14050`).
- Card revealed WITHOUT a collector number (common early on; 10 of 89 at Set 13's start): an id in the reserved `+900..+999` band and no `number` field, per [`PREVIEW_CARD_PARSER.md`](PREVIEW_CARD_PARSER.md). Renumber it once the collector number is known. These can only be added by PR in Doberjohn/inkweave: the reveal publisher requires a number.
- Raw scans go in the app's `apps/web/public/card-images-raw/`, and the filename stem MUST be the numeric card id (`14050.jpg`). One bad filename fails the whole convert run.

### Ink blocks

A set is numbered ink by ink in `ALL_INKS` order, so the collector number implies the ink. `inkBlock(ink)` gives each range. **A dual-ink card sits in the block of its FIRST ink.** The reveal publisher rejects an ink that does not own the number, because both wrong-ink publishes in Set 13 were the form's default ink (`Amber`) left unchanged. Numbers above `SET_TOTAL` (promos, enchanteds) are not checked. If the set turns out to split unevenly (Set 13 ran 37 down to 32), the app fixes `PER_INK` and the matching `ROWS`.

### Record conventions

`fullText` carries everything the engine reads, in house style: glyphs, not "1 Ink" (Doberjohn/inkweave#635; the reveal publisher rewrites what it can and refuses the rest). `abilities` needs only keyword entries for keywords the card HAS (Singer N, Shift N, Resist +N, Bodyguard, Evasive, ...); named abilities and keywords the card grants to others live in `fullText` only. No flavor text. Data fields are English even when the scan is not. `franchise` is the card's real franchise name; only a value matching a `FRANCHISES.match` groups it, everything else lands in "Returning". Keep the `&` in team names.

### Variant printings (Epic, Enchanted, Iconic)

A variant printing is alternate art for a card that is already in, not a card of its own: it goes in the base card's `variants` array, and the app shows it as a `Standard | <Rarity>` switcher (Doberjohn/inkweave#625). Never add one as its own entry. `/fetch-reveals` and the reveal publisher do not handle variants (the fetch pipeline's rarity gate rejects them), so use one of these two paths, both in Doberjohn/inkweave. Both give the variant the id `REVEAL_ID_BASE + collector number` (Iconic #241 is `14241`), so they converge on one id, and `reveal-set-integrity.test.ts` enforces it.

**Official art, once LorcanaJSON lists the variant** (preferred), from the app repo's root:

```bash
curl -sSL -o lorcanajson.zip https://lorcanajson.org/files/current/en/allCards.json.zip
unzip -o lorcanajson.zip -d <scratch dir outside the repo>
pnpm sync-variants <scratch dir>/allCards.json            # dry run: prints what it would fold
pnpm sync-variants <scratch dir>/allCards.json --write
pnpm precompute-synergies
```

It matches the preview card on set + full name, so the base card must already be in. Run it again any time: it only adds or updates.

**Manual scan, before LorcanaJSON lists it** (English scans only; the translation toggle does not apply to variants):

1. Save the scan as `apps/web/public/card-images-raw/{REVEAL_ID_BASE + number}.jpg` (e.g. `14221.jpg`) and run `pnpm convert-preview-images`.
2. Add `{"id": 14221, "rarity": "Enchanted", "number": 221}` to the base card's `variants` (create the array if needed; keep it in collector-number order).
3. `pnpm precompute-synergies`, then commit the entry plus both AVIFs.

When a later `pnpm sync-variants` prints `! 14221 now has official art, but card-images-preview/14221.avif shadows it`, delete `14221.avif` and `14221-sm.avif` from `card-images-preview/`: a committed preview AVIF always wins over the official URL.

## Gotchas

- **Two writers to the app's `master`.** During a reveal window the reveal publisher commits every few minutes, and reveal PRs merge into the same `previewCards.json`. `write` refuses when the file moved since `start`; a PR that falls behind merges cleanly as long as nobody edited the same cards.
- **A stale pin.** reveal-sync builds cards with the pinned app's season and admin's write chain. After the app changes either (a season rotation, a new house-style rule), bump the pin before the next run.
- **App-side gotchas** (the phase flip in E2E, worktrees and the app's hooks, a stale `.env.local`, `/reveals` indexing) are in the app's `START_REVEAL_SEASON.md`.

## Checklist, at a season's start

- [ ] The app's season switch is merged, and production verified (its own checklist).
- [ ] Admin's pin is bumped past the switch, so reveal-sync targets the new set.
- [ ] `https://illumineertales.com/cards.json` has a `set-<N>-<slug>` section for the new set (`/fetch-reveals` stops at `start` without it).
- [ ] The `scan-reveal-card` skill is updated (set number, id base, featured franchises).
- [ ] Only now: the first reveal publisher publish or `/fetch-reveals` run.

# Reveal runbook

How reveals reach Inkweave from admin. The season switch itself (the flag, the data block, per-season content, its production checks) is app work: `docs/reveals/START_REVEAL_SEASON.md` in Doberjohn/inkweave.

## After the app rotates the season

reveal-sync and Card studio's New card read the season from the pinned app. Bump the pin (CLAUDE.md, "Updating the app pin") before the next `/fetch-reveals`, or the run targets the old set. New card offers the new set once the bump deploys.

## New reveals in bulk: `/fetch-reveals`

Run `/fetch-reveals` from an admin session. The skill (`.claude/skills/fetch-reveals/SKILL.md`) drives the owner's Chrome for lorcanaplayer, and `node scripts/reveal-sync/run.mjs` does the rest. A run ends with one PR in the app repo and one commit of `state.json` on admin's `main`.

- Merge the reveal PR before the next run: `start` refuses while one is open.
- If `write` stops part-way (a network error, GitHub down), run `write RUN` again. It resumes, and never opens a second PR.
- `run.mjs report RUN` reprints a run's report.
- `git pull` in admin brings each run's committed `state.json` into your checkout. No run reads the local copy.

What a run will not write, by design, is in the skill: leaks, non-English cards, cards with no collector number, and anything the two sites or the readers cannot settle. Each lands in the report instead. Nor does it write a second copy of a card Inkweave holds, released cards included: `start` reads `allCards.json` for the numbers the reveal set's released cards hold, under their official ids, so a set that has graduated is safe to run (Doberjohn/inkweave-admin#51).

## Closing a reveal PR unmerged

This is about a `/fetch-reveals` PR. A variants PR (`reveals/set<N>-variants-…`) has no state commit, so closing it needs nothing more; delete its branch, or a later `stage` of the same numbers refuses.

The run's state commit on admin's `main` (`chore(reveals): record run <RUN>`) still marks its cards `written`, so no later run would retry them. Revert it on a `fix/` branch from `main` (`git revert <sha>`), and merge that as a PR. The next run fetches those cards again.

## One card at a time: Card studio's New card

Use it for a card the pipeline cannot write: a `validation-failed` card, or one whose only official scan is not in English (the fetch-reveals skill, "Cards shown with a non-English scan"). Its first step picks the set, which decides where the card is written: only the set in reveal season takes a new card, into `previewCards.json`, while one of its numbers is free. The step lists the other Core sets as LorcanaJSON's, and once released cards hold every number of the reveal set it says the set has graduated and offers Edit card instead. It takes collector numbers 1 to `SET_TOTAL` only: a promo or a card with no number goes in by PR ([Ids and filenames](#ids-and-filenames)), and a number past the set is a variant printing ([Variant printings from admin](#variant-printings-from-admin)). It also refuses a number that a released card of the reveal set already holds, naming that card ("#21 is already Miguel Rivera - Street Musician (3286)"), so nothing it publishes duplicates a card the set's graduation released. It checks the number against the card list, so it waits for that list: while the list is still loading, or if it failed to load, the checklist's Collector number line says so ("Checking the number needs the card list: it's still loading…", or "…, which failed to load: <error>"), and Publish stays off. If it failed, **Load the card list again**, under that line, loads it again and keeps your draft (reloading the page would drop it).

1. Read the scan with the `scan-reveal-card` skill (user-level, `~/.claude/skills/scan-reveal-card/`; update its set number, id base and featured franchises each season).
2. Open Card studio at https://inkweave-admin.vercel.app/studio (New card is its first mode), choose the set in reveal season, and fill the form from the skill's fields. The **Ready to publish** checklist names what is left, and **Publish to master** stays off until nothing is. Its GitHub token lives in that site's `localStorage`, so admin's local dev server (port 5180) has its own.
3. One atomic commit lands on the app's `master`: the record in `previewCards.json` plus the raw scan. `insertCardIntoPreviewJson` throws before committing if the result would not parse or the card did not land in `cards`.
4. The app's `.github/workflows/convert-reveal-images.yml` converts the raw, commits the AVIFs with `[skip ci]`, and prunes the raw.
5. The card commit triggers the app's deploy. **Allow 15 to 20 minutes** (the prerender crawl).

**Merge the season switch before publishing anything.** Card studio commits to `master`, and the convert workflow only fires there.

A New card publish, or an Edit card save that changes a field, while a `/fetch-reveals` run is open makes that run's `write` refuse, writing nothing: start a new run. A staged variants run's `publish` refuses the same way: stage it again. An image-only save leaves `previewCards.json` alone, so it stops neither.

## Editing a card, and refreshing it to its English scan

Card studio's Edit card (https://inkweave-admin.vercel.app/studio?mode=edit) fixes a card that is already in. Search by name or id; an empty search lists the branch's preview cards first. The list holds every card on inkweave.ink (the Core-legal sets), plus the cards only the branch's `previewCards.json` holds so far, tagged "not deployed yet": a card just published, or merged from a `/fetch-reveals` PR, can be fixed before the deploy lands.

- **A preview card** (tagged preview) takes field edits and a new image, in one commit to `master`: its entry in `previewCards.json`, plus the raw scan when there is one. The commit reads `fix(reveals): update <full name> (<set code><number>)`, with " and its image" when a scan goes with it.
- **A released card** (tagged released) takes a new image, and its printings' versions in the Printings panel: "Card data comes from LorcanaJSON: only the image and the printings' versions can be changed here." A card of Sets 1 to 8 opens for its printings' versions only. A preview entry with no collector number, one of a set other than the one admin's pin names, or one the form can't hold takes a new image only, and says why. One the form can't hold ("This entry holds data the form can't.") offers **Read previewCards.json again**, which opens its fields once a fix to the entry has landed.
- **Printings' versions** (Both, Foil only, Normal only) don't save per card: they collect in the studio-wide Version changes tray, and its Publish writes them all in one commit, `chore(collection): set the versions of <n> printing(s) from Card studio` (#68).
- **An image-only save**, on any card, commits the raw scan alone: `fix(card-images): update image for <full name> [<id>]`. For a preview card (any card under a preview id, another set's during a pin lag included) it first checks that the branch's `previewCards.json` still holds the card, and writes nothing if it doesn't (**A stale entry**, below).
- **What a save keeps.** The id and the collector number stay as loaded: a rename keeps the id, and renumbering is still a PR ([Ids and filenames](#ids-and-filenames)). Everything the form doesn't hold, `variants` above all, comes from `previewCards.json` as it stands when the save commits. `replaceCardInPreviewJson` checks the file and the result first: the file is laid out as `JSON.stringify(_, null, 2)` writes it (otherwise the edit would rewrite every line of it: fix its layout in the app repo first), only this card's own fields change, the file still parses, and any `scanLanguage` is a two-letter code other than `en`. Otherwise nothing is written.
- **Taking a change back.** The change list shows every edit before you save. **Discard** drops them all, the staged image included, and each row's **Revert** takes back that one change. One field can feed several rows: a stat's **Revert** puts the stat back, and reverts the type too only when the stat can't come back without it, as when the new type doesn't print that stat. That takes back every stat only the type changed (Doberjohn/inkweave-admin#52).
- **A new image** goes to `card-images-raw/<id>.<ext>`, and the convert workflow turns it into the card's preview AVIFs. A committed preview AVIF always wins over the official URL ([Variant printings](#variant-printings-epic-enchanted-iconic) below says the same of printings), so a released card keeps the new image from then on.
- **A stale entry.** A save that changes a field first reads the card's own entry on the branch. If a field Edit card can change, or the card's id, set or number, changed since you loaded the card (another save, a merged `/fetch-reveals` PR, a hand edit), nothing is written: "<full name> changed on master since you loaded it. Load it again." If it left the file, the message says "<full name> is no longer in previewCards.json on master. Load it again.", as it does for the image-only save above. **Load it again** reads the file again, keeps the edits that still apply and the staged image, and says how many edits it dropped. If the entry now holds data the form can't, the card opens image-only, and the line says "It can't be edited here now, so <N> edits were dropped." A read that fails shows "Could not read previewCards.json: <error>." under the outcome. A change to any other card, or a printing added to this one, never makes a save stale. But a save builds its commit on `master` as it stood when the save started: if any commit lands there before the save's own does (another save, a New card publish, a convert-reveal-images commit, a merged PR), whatever it changed, nothing is written, and the outcome says "master changed while saving, so nothing was saved. Save again." The edits and the staged image stay, so saving again builds on the new commit.
- **After graduation** the app empties `previewCards.json`, and each card takes its released id. Until inkweave.ink deploys the release and admin is reloaded, an old preview id reads "<full name> is no longer in previewCards.json on master, so it can't be saved here." From then on the set's cards are released, so Edit card replaces their image only. Set 14 graduated on 2026-10-14 (Doberjohn/inkweave#780): its cards' ids are now 3265 + number (#21 is 3286), and `master`'s `previewCards.json` holds none.

**Refreshing a card to its English scan** (Doberjohn/inkweave-admin#14). A preview card first shown with a non-English scan carries `scanLanguage` (the fetch-reveals skill, "Cards shown with a non-English scan"), and no later `/fetch-reveals` run refreshes it. Once its English scan is out:

1. Read the English scan with the `scan-reveal-card` skill.
2. Open the card in Edit card, and pick the English scan with **Replace card image**, or drop the file on it or on the preview.
3. Set **Scan language** to English, and fix the name, version and text wherever the English printing differs. A rename keeps the card's id.
4. **Save changes to master.** One commit carries the entry and the scan, and drops `scanLanguage`: `fix(reveals): refresh <full name> (<set code><number>) to its English scan`.

Edit card refreshes cards, never printings: it keeps a card's `variants` as they are, and its search lists no printing ids. A printing marked with its own `scanLanguage` is refreshed by hand in Doberjohn/inkweave, as [Variant printings](#variant-printings-epic-enchanted-iconic) below describes: convert the English scan over the printing's id and delete the entry's `scanLanguage`, or, once LorcanaJSON lists the printing, run `pnpm sync-variants` and delete the AVIFs that shadow it.

## Variant printings from admin

An Epic, Enchanted or Iconic printing goes in its base card's `variants`, never in as a card of its own ([Variant printings](#variant-printings-epic-enchanted-iconic) below). `/fetch-reveals` skips them, and Card studio's New card refuses their numbers (every number past the set), so admin publishes them with `scripts/reveal-sync/variants.mjs`, in two steps:

```bash
node scripts/reveal-sync/variants.mjs stage 215 239
node scripts/reveal-sync/variants.mjs publish <RUN>
```

Like `/fetch-reveals`, it needs `gh` logged in as the owner and the engine built (`pnpm build:engine`).

1. `stage` takes collector numbers. It reads illumineertales.com's list, and the app's `master` through `gh`. It stages nothing unless every printing passes:
   - no reveal PR is open;
   - the list shows the slot as revealed, past the main set, with the rarity EPIC, ENCHANTED or ICONIC and no translation link (an English scan);
   - exactly one card of the season's set has the printing's name and version, compared without accents (the list's #215 "Héctor Rivera" lands on 14117 "Hector Rivera");
   - nothing in `previewCards.json` or `allCards.json` uses its id (`REVEAL_ID_BASE + number`), `card-images-preview/` has no AVIF for that id, and the base card has no printing of that rarity.

   Those refusals name every printing that fails, at once. Three later checks also stage nothing when they fail:
   - the PR's branch must not exist yet (it is named for the numbers alone, so a PR for the same numbers closed unmerged can leave it behind: delete it);
   - `previewCards.json` must already be laid out as `JSON.stringify(_, null, 2)` writes it, so the new entries are the whole diff;
   - each official scan must download, then convert with the app's own `convert-preview-images`. The scan itself is used unchanged.

   `stage` then stages the new `previewCards.json` and the AVIFs. It prints the printings, the commit message, the PR and the AVIFs' paths.
2. The owner looks at the AVIFs and the text, and approves the publish. Then `publish RUN` refuses while another reveal PR is open, if the PR's branch now exists, or if `previewCards.json` moved on `master` since `stage` (stage again). Otherwise it commits on `master`'s tip, creates `reveals/set<N>-variants-<numbers>`, and opens the PR in Doberjohn/inkweave#689's format. If it stops part-way, run it again: it resumes, and never opens a second PR. If another commit took the branch in between, it says so: delete that branch, then run it again.

- It never touches `state.json`: a printing is not a card. So closing its PR unmerged needs no revert, only the branch deleted.
- Merge the PR before the next `/fetch-reveals` run or `stage`: both refuse while a reveal PR is open.
- A run lives beside `/fetch-reveals` runs, in `%TEMP%/inkweave-reveal-sync/variants-<stamp>/`: `run.json`, the official scans, and `out/` (what the PR commits).
- A printing whose only scan is not in English still goes by hand, as Doberjohn/inkweave#680 did with 213's Italian one.

## Adding cards by hand

### Ids and filenames

- Numbered card: `id = REVEAL_ID_BASE + collector number` (Set 14 #50 is `14050`).
- Card revealed WITHOUT a collector number (common early on; 10 of 89 at Set 13's start): an id in the reserved `+900..+999` band and no `number` field, per [`PREVIEW_CARD_PARSER.md`](PREVIEW_CARD_PARSER.md). Renumber it once the collector number is known. These can only be added, and renumbered, by PR in Doberjohn/inkweave: Card studio's New card requires a number, and Edit card keeps a card's id and number as they are.
- Raw scans go in the app's `apps/web/public/card-images-raw/`, and the filename stem MUST be the numeric card id (`14050.jpg`). One bad filename fails the whole convert run.

### Ink blocks

A set is numbered ink by ink in `ALL_INKS` order, so the collector number implies the ink. `inkBlock(ink)` gives each range. **A dual-ink card sits in the block of its FIRST ink.** Card studio rejects an ink that does not own the number, in New card and Edit card alike, because both wrong-ink publishes in Set 13 were the form's default ink (`Amber`) left unchanged. New card refuses every number above `SET_TOTAL` ("#<N> is past the <SET_TOTAL>-card set: special printings go in through variants.mjs stage"): each is an Epic, Enchanted or Iconic printing of a card in the set ([Variant printings from admin](#variant-printings-from-admin)). If the set turns out to split unevenly (Set 13 ran 37 down to 32), the app fixes `PER_INK` and the matching `ROWS`.

### Record conventions

`fullText` carries everything the engine reads, in house style: glyphs, not "1 Ink" (Doberjohn/inkweave#635; Card studio rewrites what it can and refuses the rest, in New card and Edit card alike). `abilities` needs only keyword entries for keywords the card HAS (Singer N, Shift N, Resist +N, Bodyguard, Evasive, ...); named abilities and keywords the card grants to others live in `fullText` only. No flavor text. Data fields are English even when the scan is not. `franchise` is the card's real franchise name; only a value matching a `FRANCHISES.match` groups it, everything else lands in "Returning". Keep the `&` in team names.

### Variant printings (Epic, Enchanted, Iconic)

A variant printing is alternate art for a card that is already in, not a card of its own: it goes in the base card's `variants` array, and the app shows it as a `Standard | <Rarity>` switcher (Doberjohn/inkweave#625). Never add one as its own entry. `/fetch-reveals` and Card studio do not handle variants (the fetch pipeline's rarity gate rejects them, New card refuses their numbers, and Edit card keeps a card's `variants` as they are). From admin, use `variants.mjs` ([Variant printings from admin](#variant-printings-from-admin)); in Doberjohn/inkweave, use one of these two paths. All three give the variant the id `REVEAL_ID_BASE + collector number` (Iconic #241 is `14241`), so they converge on one id, and `reveal-set-integrity.test.ts` enforces it.

**Official art, once LorcanaJSON lists the variant** (preferred), from the app repo's root:

```bash
curl -sSL -o lorcanajson.zip https://lorcanajson.org/files/current/en/allCards.json.zip
unzip -o lorcanajson.zip -d <scratch dir outside the repo>
pnpm sync-variants <scratch dir>/allCards.json            # dry run: prints what it would fold
pnpm sync-variants <scratch dir>/allCards.json --write
pnpm precompute-synergies
```

It matches the preview card on set + full name, so the base card must already be in. Run it again any time: it only adds or updates.

**Manual scan, before LorcanaJSON lists it**:

1. Save the scan as `apps/web/public/card-images-raw/{REVEAL_ID_BASE + number}.jpg` (e.g. `14221.jpg`) and run `pnpm convert-preview-images`.
2. Add `{"id": 14221, "rarity": "Enchanted", "number": 221}` to the base card's `variants` (create the array if needed; keep it in collector-number order). If the scan is not in English (the printing was revealed abroad first), add its two-letter code too, e.g. `"scanLanguage": "it"` (Doberjohn/inkweave#681): the app then offers the card's English text over that printing, and `reveal-set-integrity.test.ts` checks the code.
3. `pnpm precompute-synergies`, then commit the entry plus both AVIFs.

When a later `pnpm sync-variants` prints `! 14221 now has official art, but card-images-preview/14221.avif shadows it`, delete `14221.avif` and `14221-sm.avif` from `card-images-preview/`: a committed preview AVIF always wins over the official URL. The official entry has no `scanLanguage`, so until those files go, a foreign scan shows without its translation toggle.

## Gotchas

- **Two writers to the app's `master`.** During a reveal window Card studio commits every few minutes (New card publishes, Edit card saves), and reveal PRs merge into the same `previewCards.json`. `write` refuses when the file moved since `start`; a PR that falls behind merges cleanly as long as nobody edited the same cards. A change makes an Edit card save stale only when it changes that card's own fields, or takes the card out of the file ([Editing a card](#editing-a-card-and-refreshing-it-to-its-english-scan) says which fields count). Still, any commit that lands on `master` while a publish or a save runs, whatever it changed, makes that publish or save write nothing: publish or save again.
- **A stale pin.** reveal-sync builds cards with the pinned app's season and admin's write chain. After the app changes either (a season rotation, a new house-style rule), bump the pin before the next run.
- **App-side gotchas** (the phase flip in E2E, worktrees and the app's hooks, a stale `.env.local`, `/reveals` indexing) are in the app's `START_REVEAL_SEASON.md`.

## Checklist, at a season's start

- [ ] The app's season switch is merged, and production verified (its own checklist).
- [ ] Admin's pin is bumped past the switch, so reveal-sync targets the new set.
- [ ] `https://illumineertales.com/cards.json` has a `set-<N>-<slug>` section for the new set (`/fetch-reveals` stops at `start` without it).
- [ ] The `scan-reveal-card` skill is updated (set number, id base, featured franchises).
- [ ] Only now: the first Card studio publish or `/fetch-reveals` run.

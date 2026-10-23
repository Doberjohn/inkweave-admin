# Promo printings: adding and editing them from Card studio

Status: approved by the owner on 2026-10-22, the day it was brainstormed. Two pieces of work follow from it:
- the app part, Doberjohn/inkweave#904, opened from admin through the GitHub API, which adds Promo Set 5 to the app and documents admin's new path. It merged on 2026-10-22;
- the admin part, Doberjohn/inkweave-admin#77, built on the branch `feature/77-promo-printings`. Its pin bump, past #904's merge, is in. The plan is [docs/plans/77-promo-printings.md](plans/77-promo-printings.md).

## Why

New promo printings of cards Inkweave already holds keep arriving. Promo Set 5 has just started with 1/P5, a promo of Mickey Mouse - Brave Little Prince (Set 9 #111, id 2047), and the owner has its scan. Today each new promo is a hand edit, made by a session in the app repo:
- an entry in the promo catalog (`scripts/data/promo-printings.json`);
- `pnpm merge-promos --write`, which copies it into `allCards.json` and `collection/promos.json`;
- the scan, committed for conversion.

The owner wants Card studio to do this. The owner picks the base card, uploads the printing's scan, fills in what the printing needs and publishes. A printing published with a mistake gets fixed the same way.

"Add this card in the card pool as a new card" means a new printing of the base card in the app's data, not a card of its own. It shows on its base card as one more version in the card window's picker, where it can be selected (owner, 2026-10-22). The picker is being redesigned in the app. That doesn't matter here: the feature puts the printing in the card's data, and the picker shows every printing the data holds.

## What success looks like

- The owner opens Mickey Mouse - Brave Little Prince in Edit card, adds 1/P5 with its scan and publishes. After the app's next deploy:
  - the card's window on inkweave.ink offers 1/P5 in its picker, selectable, with the scan as its art;
  - collection mode files it in Promo Set 5's binder.
- A wrong promo set or number, or a better scan, is fixed from the same panel. Every copy players counted stays with the printing.
- Running `pnpm merge-promos` in the app afterwards changes nothing: admin's commit is exactly what the app's own merge would write.
- Nothing else in the files changes.

## Goals, non-goals and anti-goals

**Goals**

- Add a promo printing to any released card, Sets 1 to 14, from Edit card's Printings panel.
- Edit a promo printing's promo set, number, scan and scan language, and add a note to the catalog.
- One commit for each add or edit, on `VITE_ADMIN_TARGET_BRANCH`.
- Promo Set 5 exists in the app, defined like the other promo sets.

**Non-goals**

- Set printings: Enchanted, Epic, Iconic and alt foils. Reveal sync and graduation bring them, and the owner's catalog doesn't hold them.
- Preview cards. They have no Printings panel.
- Removing a printing. Players may have counted it, admin can't see their counts, and a removal could lose the copies. It stays a hand edit.
- Moving a printing to another card.
- Art variants (24A/P2), printed names (26/P2's Vaiana) and promo sources (28/C3's). Only a handful of promos have them, and they stay hand edits.
- Replacing Ravensburger's art on a promo that has it.
- Editing the catalog's existing notes, or its `about` text.
- Versions in the edit form. They stay on the row's choice and the Version changes tray (#68), so there is one way to change them.
- Adding a new promo set from the studio. Each new promo set is an app change, as P5 is here.
- A page or mode of its own. The owner chose the Printings panel over a New printing mode (2026-10-22).

**Anti-goals** (it fails if any of these happen, even if it otherwise works)

- A copy a player counted disappears, or moves to another printing.
- A publish changes any entry besides the printing it adds or edits, or leaves a file other than the app's scripts would write it.
- A publish overwrites a change made on the branch in the meantime.
- Two printings share a promo set and number.
- A printing lands in a promo set the app doesn't know. The binder would then file it as a standard set called "Set P5".
- A form the owner has started is lost without the owner being asked.

## How it works

### Where it lives

It lives in Edit card's Printings panel (#68), which every released card has, Sets 1 to 8 included (owner, 2026-10-22):

- **Add a printing.** A button under the rows unfolds the add form under them.
- **Edit.** Every promo row (`PrintingKind` `promo`) gets an Edit button. It unfolds the same form under that row, filled in from the branch.
- The card's own row and its set printings get no Edit.
- One form is open at a time.

**Cards Core reprints.** 178 Sets 1 to 8 cards share their full name with a Core card. For example, Stitch - Rock Star is both Set 1 #23 (id 23) and Set 9 #3 (id 1939), and Edit card's search lists both. The catalog files every promo of such a card under the Core card, in `fold`. Stitch's 3/DIS, 2/P1 and 30/P1 sit under 1939, and no `noBaseCard` group names a Core card. The app's card window follows the same rule (inkweave#891): the Set 1 copy's window shows no promos. So on the Sets 1 to 8 copy, the panel offers no Add a printing. It says the card's promos live on its Core printing and links to it (my call). Its panel holds no promo rows, so it has no Edit either.

The brainstorm's mockups put the form in a box under the rows. On the left is the scan, at about 130px wide, with a control to replace it. On the right are the fields, Publish, which names the printing ("Publish 1/P5", "Save as 2/P5"), and Cancel. Publish stays off until the form is complete, and a line says what is missing ("Choose its versions to publish").

### The add form

The owner fills in (owner, 2026-10-22):
- **Promo set:** one the app knows, shown as "P5 · Promo Set 5" (see "The promo sets" below).
- **Number:** as printed, so 1 for 1/P5. A whole number from 1 up.
- **Versions:** Both, Foil only or Normal only, the Printings panel's own choice. Nothing is preselected.
- **Scan:** a file, as Edit card's image control takes them (jpg, jpeg, png, webp), and its language through New reveal's Scan language select. English writes no language.
- **Note (optional):** one line for the catalog's notes.

The studio works out:
- **The base card:** the card open in Edit card.
- **The id:** the next provisional id, one above the highest key in the catalog's `provisionalIds` at the commit's base, and above any provisional id an entry holds without its line (see "Settled during the build"). That's 80056 today. An id is never issued twice (owner, 2026-10-22). A printing removed by hand keeps its line in `provisionalIds`, marked as removed (`"80056": "1/P5 Mickey Mouse - Brave Little Prince (removed)"`), so no later printing takes its id, along with any copies players counted on it. The P5 app PR documents this. The six printings the owner dropped on 18 Oct lost their lines before anyone could count them, so 80001, 80002, 80004 to 80006 and 80016 stay unused.
- **Placement:** where each entry goes (see "Publishing").

It refuses a promo set and number that another printing already has.

### The edit form

The edit form is filled in from the printing's entry in the branch's catalog:
- **Promo set and number:** checked against every other printing, the same way, when the edit changes them (see "Settled during the build").
- **Scan and its language:** a new scan replaces the art, but only for a printing without Ravensburger's art (no `images` in its catalog entry). A Ravensburger promo shows its art without the replace control. The language can change on its own, for example to mark a scan as Japanese.
- **Add a note:** a new note. The existing notes stay as written.

The id never changes, so the copies players counted stay with the printing: the app keys a player's counts by printing id (`CollectionEntries` in the app's `collectionParser.ts`).

### Publishing

An add or an edit publishes as one commit on `VITE_ADMIN_TARGET_BRANCH`, through the existing commit layer (`commitFiles`). The files are read at the commit's base, as the version batch's publish reads them (#68).

**What it writes**
1. **The catalog**, `scripts/data/promo-printings.json`:
   - **The entry.** It goes in its card's group: in `fold` for a Sets 9 to 14 card, by `baseId`; in `noBaseCard` for a Sets 1 to 8 card that Core doesn't reprint, by `lorcanaJsonBaseId`. A card with no group gets a new one in the section's order: `fold` by `baseId`, and `noBaseCard` by base set and then number. A new group takes the section's keys (`baseId, fullName, setCode, number, variants`, or `fullName, lorcanaJsonBaseId, baseSetCode, baseNumber, variants`). The entry's keys are `id, rarity, number, promoGrouping`, then `scanLanguage` when the scan isn't English, then `finishes`. `rarity` is `"Special"`. An edit keeps the entry's other keys where they are.
   - **`provisionalIds`.** It names a provisional id in id order, with its code and card: `"80056": "1/P5 Mickey Mouse - Brave Little Prince"`. An edit that changes the code renames it.
   - **`notes`.** A note is appended as `{"printing": "1/P5", "card": "<full name>", "note": "<text>"}`. The notes are in the order they were added, not sorted.
   - **`stats`.** It is recounted from the entries: `promoPrintings`, `withLorcanaJsonId`, `withProvisionalId`, `withOfficialArtUrl`, `foldIntoAllCards`, `noBaseCardInAllCards`, and `byPromoGrouping` with its codes in alphabetical order. All of them are correct on master today.
   - **Format.** The file is written as `JSON.stringify(x, null, 2)` with no trailing newline.
2. **`allCards.json` and `collection/promos.json`.** Both are written by the app's own merge, bridged through `src/app-bridge.ts`: `mergePromoPrintings` and `collectionPromos` in `scripts/lib/promo-printings.mjs`, with `finishesById` from `scripts/lib/finishes.mjs` for the versions `promos.json` keeps. The merge runs over the base's files and the edited catalog, exactly as `pnpm merge-promos --write` would, and the files are written in their formats (`allCards.json` 2-space plus a newline, `promos.json` compact plus a newline). A Sets 1 to 8 card's printing reaches `promos.json` only.
3. **The scan**, when an add has one or an edit replaces it. It goes to `apps/web/public/card-images-raw/{id}.{ext}`, as `commitCardImage` commits one. On master, the app's convert-reveal-images workflow turns it into `card-images-preview/{id}.avif` and its small size. A printing with no `images` takes its art from there, in the app's loader.

Checked on 2026-10-22: master's `allCards.json` and `promos.json` are exactly what the merge writes from master's catalog. Adding 1/P5 to the Mickey's group through the merge changes only:
- one new entry in the card's `variants`, after its Iconic;
- one new entry in `promos.json`;
- the catalog's own lines.

**What it checks at the base.** Each check stops the publish, writes nothing and says why:
- **The files are in step.** The merge over the branch's files as they are must change nothing. If it would, the catalog and the card files are out of step on the branch, and the commit would carry someone else's half-done change. The message names the cards the merge would change.
- **The code is free.** No other printing has the promo set and number. An edit is checked only when it changes the promo set or number (see "Settled during the build").
- **An edit's printing is unchanged.** The printing's catalog entry must still be what the form opened from. If it isn't, someone changed it, and the form shows the branch's values.
- **The promo set is known.** It must be one the app knows. An edit is checked only when it changes the promo set (see "Settled during the build").
- **The branch hasn't moved.** If it moves while the commit is built, `commitFiles` refuses it, as it already does ("Publish again.").

The commit message names the printing and its card, for example "chore(collection): add 1/P5 Mickey Mouse - Brave Little Prince from Card studio", as #68's version commits are worded. The wording is the builder's.

### After a publish

- The form closes, and the outcome line links the commit.
- The panel reads the branch's files again, and the printing is a row like any other. Its versions can change from its row through the tray.
- The art shows on inkweave.ink once the convert workflow has run and the app has deployed. The workflow runs on master only, so on any other branch the data lands but the art doesn't. The outcome line says so.
- The card window's picker and the binder follow the app's next deploy.

### Unsaved work

- **It counts as a draft.** A form with anything entered counts as unsaved work, held with the open card. Leaving the card or the page asks first, through the studio's `UnsavedChangesGuard`, whose words name it.
- **A mode switch keeps it,** as it keeps Edit card's own draft (R-57).
- **Forget token drops it.** The page's own Forget token asks first while it's dirty, as it does for the other drafts (R-84).
- **Each publish commits alone.** The form's publish never takes the card's own edits or the Version changes tray with it, and their publishes never take the form.

### The promo sets

- The form offers the app's promo sets, `PROMO_SETS` in `apps/web/src/shared/constants/promoSets.ts`, at admin's pin, bridged.
- A set missing there can't be chosen, and the form says the app needs it first. Since the list comes from the pin, a new promo set needs the app change and then a pin bump.
- In the code field, a printing's code reads "1/P5", as the app writes it (`promoCode`).

## The app part (first)

The app part is one app PR, opened from admin through the GitHub API, as #900 was:

1. **`PROMO_SETS` gains `{code: 'P5', name: 'Promo Set 5'}`** (owner, 2026-10-22: short name P5, full name Promo Set 5, like the others). It goes last, as the newest, with no `upcoming` numbers, since 1/P5 is the only one known. It changes nothing on the site until a P5 printing exists, because the binder lists only the sets that hold a card (`binderSets`).
2. **The app's docs** say how admin now writes promos:
   - `docs/CARD_DATA_PIPELINE.md`'s Promo printings section says Card studio adds and edits promo printings by writing the catalog and running the same merge, and that a new promo set needs `PROMO_SETS` first.
   - Its `variants` row says the Special entries are written by `pnpm merge-promos` or by admin's run of the same merge.
   - The Ids bullet says a provisional id is never issued twice. A printing removed by hand keeps its line in `provisionalIds`, marked "(removed)", because admin issues the next id from the highest one listed (owner, 2026-10-22).
   - The app's `CLAUDE.md` lists `scripts/lib/promo-printings.mjs`, with `fold-variants.mjs` and `finishes.mjs`, among what admin bridges, so renaming them is known to break admin's pin bump.

## The admin part (second)

The admin part can start before the app PR merges. Only its pin bump waits for the merge.

1. **The pin moves past the app PR's merge.** That brings P5 and about 20 other app commits, so the bump may need lint or type fixes of its own.
2. **The bridge** re-exports:
   - `PROMO_SETS`;
   - the merge functions, `mergePromoPrintings`, `collectionPromos` and `finishesById`, with types, since they are `.mjs`.
3. **The Printings panel** gets Add a printing, Edit on the promo rows, the form, its publish and its outcome.
4. **Docs.** `CLAUDE.md`'s Card studio paragraph covers adding and editing promo printings, and the files they write.

## Order of work

1. The owner approves this design.
2. An admin issue is filed, and the app PR references it.
3. The app PR for P5 and the docs. The owner merges it.
4. An implementation plan, a `feature/<issue>-promo-printings` branch, and the build, pin bump included.
5. A rehearsal on a throwaway app branch (`VITE_ADMIN_TARGET_BRANCH`):
   - add 1/P5 to the Mickey, then edit it;
   - check that each commit changes only that printing's entries, and that the merge over the result changes nothing.
6. The admin PR, which the owner approves. Merging it deploys admin.
7. On the owner's go-ahead, the Mickey's 1/P5 is added on master through the studio, with the versions the owner picks. Then the convert workflow runs, the app deploys, and it's checked on inkweave.ink.

## Constraints

- **The GitHub API only.** Admin writes to the app only through the GitHub API, on `VITE_ADMIN_TARGET_BRANCH` (`master` by default). Rehearsals use a throwaway branch.
- **The 1 MB limit.** `allCards.json` is about 2 MB, over the GitHub contents API's 1 MB limit, so it is read through the raw or blob routes, as #68 reads it.
- **Formats.** Every file keeps its format: `allCards.json` 2-space plus a newline, the collection files compact plus a newline, the catalog 2-space with no newline.
- **Art converts on master only.** The convert workflow runs on pushes to master.
- **No app code from admin.** The app part is an app PR.
- **Counts belong to each account.** Admin never reads or writes them.
- **Admin's gates:** CodeScene at 10, the design-token rules, the React Compiler lint (no `try … finally` in a component or hook), tests and stories. Studio tests stub `fetch` through the harnesses in `src/tools/studio/finishes/__tests__/`.

## Decided by the owner (2026-10-22)

- A new printing of the base card, visible and selectable in its version picker, not a card of its own.
- Promo Set 5 is added to the app the way the other promo sets are: short name P5, full name Promo Set 5.
- The fields: base card, promo set, number, versions, scan and its language, and an optional note. The studio works out the id and placement and refuses a taken number. Art variants, printed names, promo sources and preview cards' promos stay out.
- It lives in Edit card's Printings panel, as an Add a printing form under the rows, not in a New printing mode.
- Published printings can be edited: promo set, number, scan and language, and a new note. Versions stay with the row's choice and the tray. There is no removal, no editing of set printings, and no moving a printing to another card.
- Promos only. This was my guess early in the brainstorm, and the owner let it stand through the later approvals.
- A provisional id is never issued twice. A printing removed by hand keeps its line in `provisionalIds`, marked as removed, and the P5 app PR documents this.

## My calls, for the owner to check

- The scan is required when adding.
- Versions are always written out, Both included, as the Printings panel's choices are.
- A note goes in as typed and is appended. Existing notes stay as they are.
- `stats` is recounted from the entries, and `about` stays as it is.
- Editing replaces a scan only where the art isn't Ravensburger's.
- On the Sets 1 to 8 copy of a card Core reprints, the panel points to the Core copy instead of offering Add a printing.
- The next provisional id is one above the highest in `provisionalIds`, and a removed printing's line ends in "(removed)".
- Admin runs the app's own merge instead of writing its own copy of it, and refuses to publish when the branch's files aren't already what the merge writes.
- One form is open at a time, a mode switch keeps it, and leaving asks.
- The P5 PR also updates the app's docs: the pipeline doc and `CLAUDE.md`'s list of what admin bridges.
- The promo set list comes from admin's pin, so a new promo set needs a pin bump as well as the app change.

## Settled during the build

The build settled these after the owner approved the design. They are for the owner to check too.

- An edit is checked for a taken code only when it changes its promo set or number, and for an unknown promo set only when it changes its set. Twins share a code by right (26/P2's Moana and Vaiana printings, 28/C3's two Hades), so a note-only edit of one isn't refused for the state it found. An add is always checked.
- An edit never sends a scan for a printing with Ravensburger's art.
- Every refused publish reads the branch's files again, as a landed one does, so the panel shows the branch the publish saw.
- When an edited printing changed on the branch since its form opened, the form shows the branch's values and keeps the note the owner typed, since a note is only ever appended. When the printing is gone, the form closes and the line under the rows says so.
- The next provisional id is one above the highest in `provisionalIds` and among the catalog's entries, since a provisional printing can lack its line.

## Left to the builder

- Layout and wording within admin's design rules. The mockups described above are a guide.
- Where the form's draft lives, so that a mode switch keeps it.
- How the bridge types the `.mjs` functions.
- How the files are read and cached, and how the panel reads them again after a publish.
- Commit messages, tests and stories.

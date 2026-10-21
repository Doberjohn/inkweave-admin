# Printing finishes: which versions each printing comes in

Status: approved by the owner on 2026-10-21. It was reworked the same day, on the owner's word, to keep the versions in the card data the app already reads, with no new file. Two pieces of work follow from it:
- Doberjohn/inkweave#880, the app part. A session working in the app repo builds it first.
- Doberjohn/inkweave-admin#68, the admin part. It's built here once the app's part has merged.

## Why

Collection mode gives every pocket in the binder a Normal counter and a Foil counter (Doberjohn/inkweave#826). It is switched on only on staging.inkweave.ink for now (`VITE_SHOW_COLLECTION`). The app decides which counters a pocket shows by rarity alone: Enchanted, Epic and Iconic printings show Foil only, and everything else shows both (`isChaseRarity` in `apps/web/src/features/cards/loader.ts`).

That's wrong for printings that come in one version only:

- **The 13 alt foils.** These printings keep their base card's rarity, so their pockets also show a Normal counter, though they come only in foil. Sets 3 to 8 hold nine, as their own entries numbered past each set: Piglet - Pooh Pirate Captain, Yen Sid - Powerful Sorcerer, Mulan - Elite Archer, Mickey Mouse - Playful Sorcerer, Half Hexwell Crown, Bolt - Superdog, Elsa - Ice Maker, Goofy - Groundbreaking Chef and Pinocchio - Strings Attached. Sets 11 to 13 hold four: Sven, Mr. Incredible, Christopher Robin and Violet Parr (inkweave#796). The owner confirmed these 13 are exactly the ones wrong today (2026-10-20).
- **Promos printed in one version.** The promo catalog's notes (`scripts/data/promo-printings.json`, owner, 2026-10-18 and 19) settle which version a number of promos come in, yet every promo shows both counters. For example, Challenge Set 3 prints 1/C3 to 12/C3 in normal only, and 13/C3 to 24/C3 are the same cards in foil only.

The data to get this right already exists:
- **LorcanaJSON records each printing's versions** in `foilTypes`, and its docs say "'None' means no foiling". The app's pipeline drops that field today (Rule 5 in `docs/CARD_DATA_PIPELINE.md`). The app's own code notes that LorcanaJSON lists the 13 alt foils with one foil finish (`collectionStats.ts`).
- **The owner's promo catalog records the promos' versions** in its notes.

So the versions belong in the card data the app already reads, taken from those two sources. The owner keeps setting promos from admin. The alt foils, today's and every future set's, come right on their own, which also removes the way the 13 were missed.

## What success looks like

- On staging, Yen Sid #223's binder pocket and card window offer only Foil, 1/C3 offers only Normal, and 13/C3 only Foil.
- A future set's alt foils show only Foil from the day the set's cards arrive, with no step for anyone.
- When a promo's versions need changing, the owner opens its card in Card studio's Edit card, picks the version and saves. The binder follows after the app's next deploy.
- Nobody loses a copy they counted.

## Goals, non-goals and anti-goals

**Goals**

- Each printing (each binder pocket) comes in Both, Foil only or Normal only, recorded in the card data itself.
- Set printings take their versions from LorcanaJSON. Promos take theirs from the owner's catalog.
- The app's binder, card window and collection stats all follow it.
- The owner sets promos' versions in Edit card.

**Non-goals**

- No new data file. The versions live in the files the app already reads, which carry them from their sources (owner, 2026-10-21).
- No page of its own and no bulk list. The owner chose Edit card over both (2026-10-20).
- Set printings' versions aren't set from admin. If LorcanaJSON is ever wrong about one, the fix goes into the app's data, like any card fix.
- No setting for preview cards. They do appear in the binder during a reveal season (`withPrintingCards` in `binderCards.ts`), but their versions arrive with LorcanaJSON once their set is official (owner, 2026-10-21). Until then, a one-version preview printing shows both counters.
- No edits to Sets 1 to 8 cards' own data or art.
- No change to Browse: printing switcher, rarity filter and card pages stay as they are.
- No audit of promo sets beyond what the catalog's notes record. The owner sets the rest in admin as cases come up.
- No notice to players when their copies move (below).
- Hades - Dark Usurper's three C3 printings: no dataset holds their card until Set 15, and their pockets show no counters, so there is nothing to set yet.

**Anti-goals** (it fails if any of these happen, even if it otherwise works)

- A counted copy disappears, or sits hidden in a counter that no longer shows.
- Admin and the app disagree about a printing's versions.
- A save in admin overwrites a change someone else made to the catalog.

## Where the versions live

- **One field, `finishes`,** on a printing's entry: `["normal"]`, `["foil"]` or `["normal", "foil"]`, in that order, using the app's `Finish` values (`collectionParser.ts`). It's written only for a printing that comes in one version. A printing without it comes in both, and data that never had it, such as preview cards, follows the rarity rule, as today.
- **Set printings:** a set's own cards, their Enchanted, Epic and Iconic printings, and the alt foils.
  - They take `finishes` from LorcanaJSON's `foilTypes`. "None" in the list means the printing comes in normal, and any other entry is a foil type, so it comes in foil.
  - The pipeline writes it wherever it builds these entries: graduation and `pnpm sync-variants` for `allCards.json`'s cards and variants, and `pnpm generate-collection-data` for `public/data/collection/{set}.json`.
  - A printing whose `foilTypes` is missing (LorcanaJSON leaves it out for external reveals) gets no field, so it follows the rarity rule.
- **Promos:** the owner's catalog, `scripts/data/promo-printings.json`, gives a promo `finishes` when it comes in one version. Without it, a promo comes in both (owner, 2026-10-18).
  - `pnpm merge-promos` carries it into the promos' variants in `allCards.json` and into `collection/promos.json`, which `pnpm generate-collection-data` writes too.
  - LorcanaJSON's promo data isn't used for this. Its docs warn that Special-rarity data may be inaccurate, and the catalog's note on 10/C1 records one wrong case.
- **`finish`** (singular), which the catalog already defines, stays what it is: it tells apart two printings under one code. `finishes` is what a printing comes in.

**Starting state.** The 13 alt foils come out Foil only from LorcanaJSON, with no hand edit. The catalog gains `finishes` on 36 promos (owner, 2026-10-21: all the one-version promos its notes record, with 43/P2, 59/P3 and 63/P3 confirmed foil only):

| Promos | Ids | `finishes` |
|---|---|---|
| 5/C1 to 7/C1 | 80003, 1196, 1197 | `["foil"]` |
| 8/C1 to 10/C1 | 1198, 1664, 1199 | `["normal"]` |
| 11/C2 to 14/C2, 20/C2 | 80007, 80008, 80009, 80010, 80015 | `["foil"]` |
| 15/C2 to 18/C2 | 80011, 80012, 80013, 80014 | `["normal"]` |
| 1/C3 to 5/C3, 11/C3, 12/C3 | 80017 to 80023 | `["normal"]` |
| 13/C3 to 17/C3, 23/C3, 24/C3 | 80024 to 80030 | `["foil"]` |
| 43/P2 | 80048 | `["foil"]` |
| 59/P3, 62/P3, 63/P3 | 80050, 80052, 80053 | `["foil"]` |
| 61/P3 | 80051 | `["normal"]` |
| 7/P4 | 80054 | `["normal"]` |
| 8/P4 | 80055 | `["foil"]` |

C1's 1/C1 to 4/C1 come in both, as its note says, so they get no field.

## The app part (built first)

Built in the app repo from Doberjohn/inkweave#880.

1. **The pipeline keeps the versions.** Graduation, `sync-variants`, `generate-collection-data` and `merge-promos` write `finishes` as above. Rule 5 in `docs/CARD_DATA_PIPELINE.md` changes to match: `foilTypes` is still dropped, but its versions survive as `finishes`. The committed data is regenerated, so it carries the field.
   - Each of these scripts lists the one-version printings it wrote, so a wrong LorcanaJSON entry is easy to spot.
   - The PR lists every printing whose versions now differ from the rarity rule, for the owner to check before merging. That should be the 13 alt foils plus the 36 promos.
2. **The catalog's 36 promos get `finishes`,** checked by the catalog's tests: valid values, and a field only where a promo comes in one version.
3. **One rule for every surface.** A single function gives a printing's finishes: its `finishes` field when it has one, else the rarity rule. It replaces the rarity-only decisions in three places:
   - the binder pocket (`pocketEditor` in `CollectionBinder.tsx`, which passes `foilOnly`, and `CollectionSlotCounts.tsx`);
   - the card window (`WindowCopies.tsx`);
   - the collection stats' "held in both finishes" (`collectionStats.ts`). Today `heldOf` counts every held printing with a `baseId`, promos included, as held in both. From now on, a printing counts as held in both when every finish it comes in is held. Chase printings, alt foils and one-version promos count as they do today. A promo without the field comes in both, so it counts toward Master once both are held.

   The comment in `WindowCopies.tsx` saying promos come in both (owner, 2026-10-18) changes to match: promos default to both, and the catalog names the exceptions.
4. **Normal only.** The copies stripe can show a lone Normal part, as it already shows a lone Foil part for Enchanted, Epic and Iconic.
5. **Copies move, never vanish.** Once an account's counts have loaded (after `syncing`), any copies counted in a finish a printing doesn't come in move to where they belong:
   - **To its twin,** when the printing is a promo with exactly one twin: another printing in the same promo set, of the same card (same `baseId`), whose only finish is the missing one. A foil copy counted on 1/C3 becomes a foil copy of 13/C3 (owner, 2026-10-21). The starting catalog makes twins of C2's 11 to 14 with 15 to 18, C3's 1 to 5 with 13 to 17 and 11, 12 with 23, 24, P3's 61 with 62, and P4's 7 with 8.
   - **Otherwise, to the printing's own other finish,** as for the alt foils.

   The result is saved to the account like any other edit. The total stays the same, and it happens silently. The same applies to counts that arrive from a Dreamborn import.
6. **A catalog change reaches the site on its own.** Admin's Edit card will commit the catalog alone, through the GitHub API. The site must then show the change after that push's deploy, and master's generated files (`allCards.json`, `collection/promos.json`) must be brought back in line with the catalog automatically. The app already does this for admin's raw scans: `convert-reveal-images.yml` commits the converted files, and the Deploy run that the same push starts converts them too (inkweave#750, #751).
7. **The app's docs:** the "Promo printings (#805)" section of `docs/CARD_DATA_PIPELINE.md` says what `finishes` is, where each kind of printing gets it, and that admin's Edit card edits the catalog's.

Merged, this alone fixes the 13 alt foils and the 36 promos on staging.

## The admin part (built second)

It starts once the app's part has merged and admin's app pin has moved past it, through Dependabot or by hand. The bridge (`src/app-bridge.ts`) then re-exports the app's finishes function, so admin shows exactly what the app does.

1. **Search reaches every set.** Edit card's search adds the cards of Sets 1 to 8: the collection entries without a `baseId` in `/data/collection/1.json` to `8.json`, read through the existing `/data/` forward. They're tagged Released with their set. Sets 9 to 14 and preview cards behave as today, and the search still lists cards only, never printings (R-80).
2. **A Printings panel** opens with every released card, under its card data. It has one row per pocket the binder holds for the card:
   - the card itself;
   - every collection entry whose `baseId` is the card: Enchanted, Epic, Iconic and alt foils;
   - every entry of `/data/collection/promos.json` whose `baseId` is the card.

   Each row shows the printing's thumbnail, its name as the app gives it ("#223 · Alt foil", "1/C3"), and the versions it comes in. A set printing's versions are read-only, marked as LorcanaJSON's. A promo's are a choice: Both, Foil only or Normal only.
3. **What each kind of card shows:**
   - Sets 1 to 8 cards open printings-only: the read-only card data, then the Printings panel, with no image control, since their art is Ravensburger's.
   - Sets 9 to 14 keep their image control, with the Printings panel below it.
   - Preview cards get no Printings panel.
4. **Saving.**
   - A changed promo joins the change list as "1/C3 versions: Both → Normal only", with Revert. It makes the draft dirty, so the unsaved-changes guard asks before leaving.
   - Save commits `scripts/data/promo-printings.json` to `VITE_ADMIN_TARGET_BRANCH` through the existing GitHub commit layer. A staged image goes in the same commit when there is one. Choosing Both removes the promo's `finishes`.
   - App sessions edit the catalog by hand too, so admin reads it from that branch when the card opens and again at each save's base. The commit changes only this card's promos' `finishes`, applied to the catalog as it stands at the base. If any of those changed on the branch since it was read, the save stops and offers Load it again, as a stale preview card does (R-67, R-68).
   - The catalog is exactly `JSON.stringify(catalog, null, 2)` with no trailing newline. Written back the same way, only the edited lines change.
5. **After a save,** the outcome says the change shows in the binder once the app's deploy finishes. Today that's on staging only.
6. **Docs:** in `CLAUDE.md`, the Card studio paragraph says Edit card edits the promo catalog's versions, and names the collection data it reads.

## Order of work

1. The owner approves this design.
2. Two issues are filed:
   - in the app, Doberjohn/inkweave#880;
   - in admin, Doberjohn/inkweave-admin#68, which links the app issue and this document.
3. A session in the app repo builds the app part, and it merges. Staging then shows the 13 alt foils and the 36 promos correctly.
4. Admin's pin moves past that merge, and the admin part goes through the usual plan and review.

End-to-end checks happen on staging.inkweave.ink, signed in to an account with a collection.

## Constraints

- Admin writes into the app only through the GitHub API, to `VITE_ADMIN_TARGET_BRANCH` (`master` by default). Rehearsals use a throwaway branch.
- The catalog is the owner's hand-curated file, and app sessions edit it too. Admin's save must never overwrite their changes (anti-goals).
- Counts belong to each account (the `collections` table). Admin never reads or writes them.
- This session can't change the app's code. The app part is built by a session working in the app repo.
- Each repo's own gates apply. In admin that includes CodeScene 10, the design-token rules and the React Compiler lint. The app has its size budgets: `finishes` sits only on one-version printings, which keeps it small.

## Decided by the owner

- Edit card in Card studio, not a page of its own or a list (2026-10-20).
- Three choices per printing: Both, Foil only, Normal only (2026-10-20).
- Copies in a finish that goes away move to the one that stays (2026-10-20), and to the promo's twin when it has one (2026-10-21).
- The 13 alt foils and the one-version promos the catalog's notes record start out right, with 43/P2, 59/P3 and 63/P3 foil only (2026-10-20 and 21).
- A separate app issue and PR, with the app part built first (2026-10-21).
- Preview cards' versions come only once their set is official (2026-10-21).
- No new file. Set printings take their versions from LorcanaJSON, promos from the catalog, and the app brings its generated files back in line by itself when the catalog changes (2026-10-21).

## My calls, for the owner to check

- The field's name, `finishes`, written only for one-version printings.
- How LorcanaJSON's `foilTypes` become versions: "None" means normal, and anything else means foil.
- The app PR's list of every printing whose versions differ from the rarity rule, for the owner to check before merging.
- How the app finds a twin: same promo set, same card, and the missing finish as its only one.
- The stats follow the same rule: a promo without the field counts toward Master only once both versions are held. Today any held promo counts.
- "Normal" in admin's wording, the word the binder uses, rather than "standard".
- Sets 1 to 8 cards open printings-only, and set printings are read-only in admin.
- Copies move silently, with no notice to the player.
- A save changes only its own card's promos, and stops if any of them changed since it was read.

## Left to the builders

- How the deploy and the automatic commit keep the generated files in line with the catalog, provided both outcomes in app item 6 hold.
- Layout and wording inside each panel, within each repo's design rules.
- How and when the app applies the field, provided counters never follow the rarity rule for a printing that has it.
- How the app persists moved copies within its sync rules, provided no count is lost.
- How admin loads and caches the collection data, and the commit message.
- Tests and stories, as each repo does them.

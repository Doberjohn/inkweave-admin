# Printing finishes: which versions each printing comes in

Status: approved by the owner on 2026-10-21. Two pieces of work follow from it:
- Doberjohn/inkweave#880, the app part. A session working in the app repo builds it first.
- Doberjohn/inkweave-admin#68, the admin part. It's built here once the app's part has merged.

## Why

Collection mode gives every pocket in the binder a Normal counter and a Foil counter (Doberjohn/inkweave#826). It is switched on only on staging.inkweave.ink for now (`VITE_SHOW_COLLECTION`). The app decides which counters a pocket shows by rarity alone: Enchanted, Epic and Iconic printings show Foil only, and everything else shows both (`isChaseRarity` in `apps/web/src/features/cards/loader.ts`).

That's wrong for printings that come in one version only:

- **The 13 alt foils.** These printings keep their base card's rarity, so their pockets also show a Normal counter, though they come only in foil. Sets 3 to 8 hold nine, as their own entries numbered past each set: Piglet - Pooh Pirate Captain, Yen Sid - Powerful Sorcerer, Mulan - Elite Archer, Mickey Mouse - Playful Sorcerer, Half Hexwell Crown, Bolt - Superdog, Elsa - Ice Maker, Goofy - Groundbreaking Chef and Pinocchio - Strings Attached. Sets 11 to 13 hold four: Sven, Mr. Incredible, Christopher Robin and Violet Parr (inkweave#796). The owner confirmed these 13 are exactly the ones wrong today (2026-10-20).
- **Promos printed in one version.** The promo catalog's notes (`scripts/data/promo-printings.json`, owner, 2026-10-18 and 19) settle which version a number of promos come in, yet every promo shows both counters. For example, Challenge Set 3 prints 1/C3 to 12/C3 in normal only, and 13/C3 to 24/C3 are the same cards in foil only.

New cases come with every set and promo set. The owner missed these 13 while building cards. So which versions a printing comes in must be something the owner sets from admin, not a code change each time.

## What success looks like

- On staging, Yen Sid #223's binder pocket and card window offer only Foil, 1/C3 offers only Normal, and 13/C3 only Foil.
- When the owner finds a wrong case later, they open the card in Card studio's Edit card, pick the version for the printing and save. The binder follows after the app's next deploy.
- Nobody loses a copy they counted.

## Goals, non-goals and anti-goals

**Goals**

- One setting per printing (per binder pocket): Both, Foil only or Normal only.
- The app's binder, card window and collection stats all follow it.
- The owner sets it in Edit card.
- The 13 alt foils and every one-version promo the catalog's notes record start out set, so nobody has to fix them one at a time.

**Non-goals**

- No page of its own for this, and no bulk list. The owner chose Edit card over both (2026-10-20).
- No setting for preview cards. They do appear in the binder during a reveal season (`withPrintingCards` in `binderCards.ts`), but their versions are set only once their set is official (owner, 2026-10-21), which keeps graduation simple. Until then, a one-version preview printing shows both counters, and the runbook's graduation step (admin part, item 6) catches it.
- No edits to Sets 1 to 8 cards' own data or art.
- No change to Browse: printing switcher, rarity filter and card pages stay as they are.
- No audit of promo sets beyond what the catalog's notes record. The owner sets the rest in admin as cases come up.
- No notice to players when their copies move (below).
- Hades - Dark Usurper's three C3 printings: no dataset holds their card until Set 15, and their pockets show no counters, so there is nothing to set yet.

**Anti-goals** (it fails if any of these happen, even if it otherwise works)

- A counted copy disappears, or sits hidden in a counter that no longer shows.
- Admin and the app disagree about a printing's default.
- One save in admin overwrites another save's choices.

## The shared file

The two parts meet in one data file in the app repo. Admin writes it, and the app reads it.

- **Path:** `apps/web/public/data/printingFinishes.json`, served at `/data/printingFinishes.json`. It can't live in `public/data/collection/`, because `pnpm generate-collection-data` replaces that folder whole.
- **Shape:**

  ```json
  {
    "about": "Which finishes a collection printing comes in where it differs from the rarity rule (Enchanted, Epic and Iconic: foil; any other: normal and foil), keyed by the printing's collection id. Card studio's Edit card writes it.",
    "printings": {
      "946": {"finishes": ["foil"], "name": "Yen Sid - Powerful Sorcerer, Set 4 #223"},
      "80017": {"finishes": ["normal"], "name": "Mother Knows Best, 1/C3"}
    }
  }
  ```

- **Keys** are the printing's collection id: the id the binder keeps counts under, and the one the card window uses as `shownPrintingId ?? card.id`. That's a set card's own id, a chase or alt foil entry's id (it has a `baseId`), or a promo's id from `collection/promos.json`, provisional ones included.
- **`finishes`** is `["normal"]`, `["foil"]` or `["normal", "foil"]`, in that order, using the app's `Finish` values.
- **`name`** is there only for people reading a diff. No code reads it.
- **The file lists only differences.** An entry equal to the rarity rule is never written: choosing the default removes it. Keys are sorted by number, so a save's diff shows only its own lines.
- **The app ignores ids it doesn't hold.** A printing that left the data does no harm.
- **Starting contents: 49 entries.** The 13 alt foils, and the promos whose version the catalog's notes record (owner, 2026-10-21: all of them, with 43/P2, 59/P3 and 63/P3 confirmed foil only).

  | Printings | Ids | `finishes` |
  |---|---|---|
  | The 13 alt foils | 945, 946, 948, 949, 1179, 1931, 1932, 1933, 1934, 3570, 3571, 3572, 3573 | `["foil"]` |
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

  C1's 1/C1 to 4/C1 come in both, as its note says, so they need no entry.

## The app part (built first)

Built in the app repo from an app issue that carries this section and the shared file's.

1. **One rule for every surface.** A single function gives a printing's finishes: the file's entry when it has one, else the rarity rule. It replaces the rarity-only decisions in three places:
   - the binder pocket (`pocketEditor` in `CollectionBinder.tsx`, which passes `foilOnly`, and `CollectionSlotCounts.tsx`);
   - the card window (`WindowCopies.tsx`);
   - the collection stats' "held in both finishes" (`collectionStats.ts`). Today `heldOf` counts every held printing with a `baseId`, promos included, as held in both. From now on, a printing counts as held in both when every finish it comes in is held. With the starting file, the chase printings, the alt foils and the listed promos count as they do today. A promo the file doesn't list comes in both, so it counts toward Master once both are held.

   The comment in `WindowCopies.tsx` saying promos come in both (owner, 2026-10-18) changes to match: promos default to both, and the file names the exceptions.
2. **Normal only.** The copies stripe can show a lone Normal part, as it already shows a lone Foil part for Enchanted, Epic and Iconic.
3. **Copies move, never vanish.** Once an account's counts have loaded (after `syncing`), any copies counted in a finish a printing doesn't come in move to where they belong:
   - **To its twin,** when the printing is a promo with exactly one twin: another printing in the same promo set, of the same card (same `baseId`), whose only finish is the missing one. A foil copy counted on 1/C3 becomes a foil copy of 13/C3 (owner, 2026-10-21). The starting file makes twins of C2's 11 to 14 with 15 to 18, C3's 1 to 5 with 13 to 17 and 11, 12 with 23, 24, P3's 61 with 62, and P4's 7 with 8.
   - **Otherwise, to the printing's own other finish,** as for the alt foils.

   The result is saved to the account like any other edit. The total stays the same, and it happens silently. The same applies to counts that arrive from a Dreamborn import.
4. **The file loads with the collection data.** Counters follow it once it's loaded. If it fails to load, the rarity rule alone applies, as today.
5. **The starting file is part of this PR**, with a test that every entry's id is in the collection data, its finishes are valid, and it differs from the rule.
6. **The app's docs:** a short section in `docs/CARD_DATA_PIPELINE.md` beside "Promo printings (#805)": what the file is, that admin's Edit card writes it, and that it lives outside `public/data/collection/`.

Merged, this alone fixes the 49 starting cases on staging.

## The admin part (built second)

It starts once the app's part has merged and admin's app pin has moved past it, through Dependabot or by hand. The bridge (`src/app-bridge.ts`) then re-exports the app's finishes rule and the file's types, so admin's defaults always match the app's.

1. **Search reaches every set.** Edit card's search adds the cards of Sets 1 to 8: the collection entries without a `baseId` in `/data/collection/1.json` to `8.json`, read through the existing `/data/` forward. They're tagged Released with their set. Sets 9 to 14 and preview cards behave as today, and the search still lists cards only, never printings (R-80).
2. **A Printings panel** opens with every released card, under its card data. It has one row per pocket the binder holds for the card:
   - the card itself;
   - every collection entry whose `baseId` is the card (Enchanted, Epic, Iconic and alt foils);
   - every entry of `/data/collection/promos.json` whose `baseId` is the card.

   Each row shows the printing's thumbnail and its name as the app gives it ("#223 · Alt foil", "1/C3"), the choice Both / Foil only / Normal only, and whether that choice is the app's default or comes from the file.
3. **Sets 1 to 8 cards open printings-only:** the read-only card data, then the Printings panel, with no image control, since their art is Ravensburger's. Sets 9 to 14 keep their image control, with the Printings panel below it. Preview cards get no Printings panel.
4. **Saving.**
   - A changed choice joins the change list as "#223 versions: Both → Foil only", with Revert. It makes the draft dirty, so the unsaved-changes guard asks before leaving.
   - Save commits `printingFinishes.json` to `VITE_ADMIN_TARGET_BRANCH` through the existing GitHub commit layer. A staged image goes in the same commit when there is one.
   - Admin reads the file from that branch, as it reads `previewCards.json`, when the card opens and again at each save's base. The commit changes only this card's printings' entries, applied to the file as it stands at the base. If any of those entries changed on the branch since it was read, the save stops and offers Load it again, as a stale preview card does (R-67, R-68).
5. **After a save,** the outcome says the change shows in the binder once the app's deploy finishes. Today that's on staging only.
6. **Docs:**
   - In `CLAUDE.md`, the Card studio paragraph: what Edit card writes, and the new data it reads.
   - A step in `docs/REVEAL_RUNBOOK.md`: when a set graduates, open its alt foils and promos in Edit card and check their versions. That covers the way the 13 were missed.

## Order of work

1. The owner approves this design.
2. Two issues are filed:
   - in the app, the shared file and the app part;
   - in admin, the admin part, which links the app issue and this document.
3. A session in the app repo builds the app part, and it merges. Staging then shows the 49 starting cases correctly.
4. Admin's pin moves past that merge, and the admin part goes through the usual plan and review.

End-to-end checks happen on staging.inkweave.ink, signed in to an account with a collection.

## Constraints

- Admin writes into the app only through the GitHub API, to `VITE_ADMIN_TARGET_BRANCH` (`master` by default). Rehearsals use a throwaway branch.
- Counts belong to each account (the `collections` table). Admin never reads or writes them.
- This session can't change the app's code. The app part is built by a session working in the app repo.
- Each repo's own gates apply. In admin that includes CodeScene 10, the design-token rules and the React Compiler lint.

## Decided by the owner

- Edit card in Card studio, not a page of its own or a list (2026-10-20).
- Three choices per printing: Both, Foil only, Normal only (2026-10-20).
- Copies in a finish that goes away move to the one that stays (2026-10-20).
- The 13 alt foils and the C3 promos start out set (2026-10-20). So do the other one-version promos the catalog's notes record, in C1, C2, P3 and P4, and 43/P2, 59/P3 and 63/P3 are foil only (2026-10-21).
- A separate app issue and PR, with the app part built first (2026-10-21).
- A copy counted on a one-version promo moves to its twin when it has one (2026-10-21).
- Preview cards' versions are set only once their set is official (2026-10-21).

## My calls, for the owner to check

- The file's path, name and shape, and that it lists only differences from the rarity rule.
- How the app finds a twin: same promo set, same card, and the missing finish as its only one. That needs no extra field in the file.
- The stats follow the same rule: a promo the file doesn't list counts toward Master only once both versions are held. Today any held promo counts.
- "Normal" in admin's wording, the word the binder uses, rather than "standard".
- Sets 1 to 8 cards open printings-only.
- Copies move silently, with no notice to the player.
- A save changes only its own card's entries, and stops if any of them changed since it was read.
- The runbook step for graduations.

## Left to the builders

- Layout and wording inside each panel, within each repo's design rules.
- How and when the app loads the file, provided counters never follow a stale rule once it's loaded.
- How the app persists moved copies within its sync rules, provided no count is lost.
- How admin loads and caches the collection data, and the commit message.
- Tests and stories, as each repo does them.

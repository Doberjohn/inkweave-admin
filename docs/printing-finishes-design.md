# Printing finishes: which versions each printing comes in

Status: approved by the owner on 2026-10-21, then reworked the same day on the owner's word. The versions now live in the card data the app already reads, with no new file. Admin can change any printing, and its changes publish as one batch. Two pieces of work follow from it:
- Doberjohn/inkweave#880, the app part. A session working in the app repo builds it first.
- Doberjohn/inkweave-admin#68, the admin part. It's built here once the app's part has merged.

## Why

Collection mode gives every pocket in the binder a Normal counter and a Foil counter (Doberjohn/inkweave#826). It is switched on only on staging.inkweave.ink for now (`VITE_SHOW_COLLECTION`). The app decides which counters a pocket shows by rarity alone: Enchanted, Epic and Iconic printings show Foil only, and everything else shows both (`isChaseRarity` in `apps/web/src/features/cards/loader.ts`).

That's wrong for printings that come in one version only:

- **The 13 alt foils.** These printings keep their base card's rarity, so their pockets also show a Normal counter, though they come only in foil. Sets 3 to 8 hold nine, as their own entries numbered past each set: Piglet - Pooh Pirate Captain, Yen Sid - Powerful Sorcerer, Mulan - Elite Archer, Mickey Mouse - Playful Sorcerer, Half Hexwell Crown, Bolt - Superdog, Elsa - Ice Maker, Goofy - Groundbreaking Chef and Pinocchio - Strings Attached. Sets 11 to 13 hold four: Sven, Mr. Incredible, Christopher Robin and Violet Parr (inkweave#796). The owner confirmed these 13 are exactly the ones wrong today (2026-10-20).
- **Promos printed in one version.** The promo catalog's notes (`scripts/data/promo-printings.json`, owner, 2026-10-18 and 19) settle which version a number of promos come in, yet every promo shows both counters. For example, Challenge Set 3's 1/C3 to 5/C3, 11/C3 and 12/C3 come in normal only, and 13/C3 to 17/C3, 23/C3 and 24/C3 are the same cards in foil only.

The data to get this right already exists:
- **LorcanaJSON records each printing's versions** in `foilTypes`, and its docs say "'None' means no foiling". The app's pipeline drops that field today (Rule 5 in `docs/CARD_DATA_PIPELINE.md`). The app's own code notes that LorcanaJSON lists the 13 alt foils with one foil finish (`collectionStats.ts`).
- **The owner's promo catalog records the promos' versions** in its notes.

So the versions belong in the card data the app already reads, filled from those two sources. LorcanaJSON can be wrong, especially for promos, so the owner can correct any printing from admin. Since a round of corrections can easily touch 20 printings, they publish as one batch.

## What success looks like

- On staging, Yen Sid #223's binder pocket and card window offer only Foil, 1/C3 offers only Normal, and 13/C3 only Foil.
- A future set's alt foils show only Foil from the day the set's cards arrive, with no step for anyone.
- The owner corrects any printing from Card studio's Edit card. Twenty corrections across many cards go out in one commit, and the binder follows after the app's next deploy.
- A correction survives every later rebuild of the app's data.
- Nobody loses a copy they counted.

## Goals, non-goals and anti-goals

**Goals**

- Each printing (each binder pocket) comes in Both, Foil only or Normal only, recorded in the card data itself.
- LorcanaJSON fills in set printings' versions and the catalog fills in promos'. The owner can correct any printing.
- The app's binder, card window and collection stats all follow it.
- Corrections collect in a batch and publish in one commit.

**Non-goals**

- No new data file. The versions live in the files the app already reads (owner, 2026-10-21).
- No page of its own and no bulk list. The owner chose Edit card over both (2026-10-20).
- The batch holds version changes only. Edit card's field and image saves stay one card at a time, as today (owner, 2026-10-21).
- No setting for preview cards. They do appear in the binder during a reveal season (`withPrintingCards` in `binderCards.ts`), but their versions arrive with LorcanaJSON once their set is official (owner, 2026-10-21). Until then, a one-version preview printing shows both counters.
- No edits to Sets 1 to 8 cards' own data or art.
- No change to Browse: printing switcher, rarity filter and card pages stay as they are.
- No audit of promo sets beyond what the catalog's notes record. The owner corrects the rest in admin as cases come up.
- No notice to players about their copies (app part, item 5). They see each copy under the counter it belongs to.
- Hades - Dark Usurper's three C3 printings: no dataset holds their card until Set 15, and their pockets show no counters, so there is nothing to set yet.

**Anti-goals** (it fails if any of these happen, even if it otherwise works)

- A counted copy disappears, or sits hidden in a counter that no longer shows.
- The app changes a player's saved counts without the player changing them.
- A correction the owner published is undone by a later rebuild of the data.
- Admin and the app disagree about a printing's versions.
- A publish from admin overwrites a change someone else made in the meantime.
- Pending corrections are lost before the owner publishes or discards them.

## Where the versions live

**The field.** It's called `finishes`, and it sits on a printing's entry: `["normal"]`, `["foil"]` or `["normal", "foil"]`, in that order, using the app's `Finish` values (`collectionParser.ts`). A printing without it follows the rarity rule, as today. Wherever it's written, it's the entry's last key, so every file keeps the format it has today and an edit changes only the entries it edits. Everything else stays byte for byte as it was. A collection file is a single line, so a diff shows that one line as changed. The formats are:
- `allCards.json` is `JSON.stringify(x, null, 2)` plus a newline;
- the collection files are `JSON.stringify(x)` plus a newline;
- the catalog is `JSON.stringify(x, null, 2)` with no trailing newline.

**Its homes.** A printing's `finishes` appears on every entry that holds the printing, with the same value in each:

| Printing | Entries that hold it |
|---|---|
| A Sets 1 to 8 card, or any printing of Sets 1 to 14 (Enchanted, Epic, Iconic, alt foil) | its entry in `public/data/collection/{set}.json`; for Sets 9 to 14, also its variant in `allCards.json` |
| A Sets 9 to 14 card | its entry in `allCards.json` |
| A promo | its entry in the catalog, `scripts/data/promo-printings.json`; its entry in `collection/promos.json`; and, when its card is in `allCards.json`, its variant there |

**Who writes it.**
- **The app's scripts** fill set printings from LorcanaJSON's `foilTypes`. "None" in the list means the printing comes in normal, and any other entry is a foil type, so it comes in foil.
  - They write the field only where LorcanaJSON's versions differ from the rarity rule, and only on an entry that has no `finishes` yet.
  - They never change or remove a `finishes` that's already there. When a script rebuilds a file, it carries every existing value over by id. `generate-collection-data` replaces `public/data/collection/` whole, so it reads the old values first.
  - This applies to graduation, `sync-variants` and `generate-collection-data`.
  - A printing whose `foilTypes` is missing gets no field. LorcanaJSON leaves it out for external reveals.
- **The catalog** gives a promo `finishes` when it comes in one version. Without it, a promo comes in both (owner, 2026-10-18). `merge-promos` copies the catalog's value into the promo's other entries. LorcanaJSON's promo data isn't used for this: its docs warn that Special-rarity data may be inaccurate, and the catalog's note on 10/C1 records one wrong case.
- **Admin** writes the owner's correction as an explicit value, Both included, into every entry that holds the printing, the catalog included for a promo. A correction is therefore never missing for a script to refill, and the catalog and its outputs stay in step, so nothing has to rebuild after admin's commit.

**`finish`** (singular), which the catalog already defines, stays what it is: it tells apart two printings under one code. `finishes` is what a printing comes in.

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

1. **The pipeline keeps the versions.** Graduation, `sync-variants`, `generate-collection-data` and `merge-promos` write and carry `finishes` as above. Rule 5 in `docs/CARD_DATA_PIPELINE.md` changes to match: `foilTypes` is still dropped, but its versions survive as `finishes`. The committed data is regenerated, so it carries the field.
   - Each of these scripts lists the printings it gave a `finishes`, so a wrong LorcanaJSON entry is easy to spot at the next graduation.
   - The PR lists every printing whose versions now differ from the rarity rule, for the owner to check before merging. That should be the 13 alt foils plus the 36 promos.
2. **The catalog's 36 promos get `finishes`,** checked by the catalog's tests: valid values.
3. **One rule for every surface.** A single function gives a printing's finishes: its `finishes` field when it has one, else the rarity rule. Admin re-exports it through its bridge, so it has to stay importable. It replaces the rarity-only decisions in three places:
   - the binder pocket (`pocketEditor` in `CollectionBinder.tsx`, which passes `foilOnly`, and `CollectionSlotCounts.tsx`);
   - the card window (`WindowCopies.tsx`);
   - the collection stats' "held in both finishes" (`collectionStats.ts`). Today `heldOf` counts every held printing with a `baseId`, promos included, as held in both. From now on, a printing counts as held in both when every finish it comes in is held. Chase printings, alt foils and one-version promos count as they do today. A promo without the field comes in both, so it counts toward Master once both are held.

   The comment in `WindowCopies.tsx` saying promos come in both (owner, 2026-10-18) changes to match: promos default to both, and the data names the exceptions.
4. **Normal only.** The copies stripe can show a lone Normal part, as it already shows a lone Foil part for Enchanted, Epic and Iconic.
5. **Copies are never lost, and the app never rewrites them on its own** (owner, 2026-10-21). Players' saved counts stay as they were entered. Copies counted in a finish a printing doesn't come in show under the finish they belong to:
   - **Under its twin,** when the printing is a promo with exactly one twin: another printing in the same promo set, of the same card (same `baseId`), whose only finish is the missing one. A foil copy counted on 1/C3 shows in 13/C3's Foil counter (owner, 2026-10-21). The starting catalog makes twins of C2's 11 to 14 with 15 to 18, C3's 1 to 5 with 13 to 17 and 11, 12 with 23, 24, P3's 61 with 62, and P4's 7 with 8.
   - **Otherwise, under the printing's own other finish,** as for the alt foils.

   The binder, the card window and the stats all count them there. The move is saved only when the player changes that count: the saved counts then become what the player sees, and the stray copies' old entry is cleared, so nothing counts twice. So when the owner undoes a mistaken correction, every player who hasn't changed that card since gets their original counts back. Counts that arrive from a Dreamborn import are saved as imported and shown the same way.
6. **The app's docs.** The "Promo printings (#805)" section of `docs/CARD_DATA_PIPELINE.md` says:
   - what `finishes` is, and where each kind of printing gets it;
   - that the scripts never change one that's there;
   - that admin's Edit card writes corrections into the card files and the catalog.

Merged, this alone fixes the 13 alt foils and the 36 promos on staging.

## The admin part (built second)

It starts once the app's part has merged and admin's app pin has moved past it, through Dependabot or by hand. The bridge (`src/app-bridge.ts`) then re-exports the app's finishes function, so admin shows exactly what the app does.

1. **Search reaches every set.** Edit card's search adds the cards of Sets 1 to 8: the collection entries without a `baseId` in `/data/collection/1.json` to `8.json`, read through the existing `/data/` forward. They're tagged Released with their set. Sets 9 to 14 and preview cards behave as today, and the search still lists cards only, never printings (R-80).
2. **A Printings panel** opens with every released card, under its card data. It has one row per pocket the binder holds for the card:
   - the card itself;
   - every collection entry whose `baseId` is the card: Enchanted, Epic, Iconic and alt foils;
   - every entry of `/data/collection/promos.json` whose `baseId` is the card.

   Each row shows the printing's thumbnail, its name as the app gives it ("#223 · Alt foil", "1/C3"), and the choice Both / Foil only / Normal only. It also says whether the current value is the app's default or comes from the data. The values come from the target branch's files, as the rest of Edit card's data does, so Publish's check compares like with like.
3. **What each kind of card shows:**
   - Sets 1 to 8 cards open printings-only: the read-only card data, then the Printings panel, with no image control, since their art is Ravensburger's.
   - Sets 9 to 14 cards keep their image control, with the Printings panel below it.
   - Preview cards get no Printings panel.
4. **The batch.**
   - Changing a printing's versions commits nothing. It adds a pending change to one batch for the whole studio, which stays as the owner moves between cards and modes.
   - A tray, like the tuning editor's, shows the batch as "N changes", one row per printing ("Yen Sid - Powerful Sorcerer #223: Both → Foil only"), each with Revert. The tray has Publish and Discard.
   - The tray flags every change that removes a version before it's published. Players will see the copies they counted in that version under the one that stays (app part, item 5).
   - A changed row in the Printings panel shows that it's pending.
   - The batch is kept in this browser, per target branch, until it's published or discarded, so a reload doesn't lose it. A pending batch is never dropped without the owner seeing it, Forget token included.
   - Edit card's own Save still commits the open card's fields or image alone, as today. It never takes the batch with it.
5. **Publishing.**
   - Publish makes one commit to `VITE_ADMIN_TARGET_BRANCH` through the existing GitHub commit layer. For every change in the batch, it writes the explicit value into every entry that holds the printing (the table above), with the files read at the commit's base. Only the edited entries change.
   - A file whose text has drifted from its format (listed above), for example by a newline added at its end by hand, would be rewritten whole. The publish refuses such a file before it writes anything, and names the file and its format (#74).
   - Each change remembers the value its printing had when the change was made. If any printing's value on the branch no longer matches, the publish stops, and the studio reads the values from the branch again at once:
     - a change whose printing still matches stays as it is;
     - a change whose printing changed stays in the batch too, marked as a clash showing the branch's new value, until the owner keeps it (on top of the new value) or drops it.
   - Publish stays off while a clash is open. Unlike the tuning editor's reload (R-18), nothing leaves the batch without the owner choosing it (owner, 2026-10-21).
   - `allCards.json` is about 2 MB, more than the GitHub contents API's 1 MB JSON limit, so reading and writing it goes through the raw or blob routes.
6. **After a publish,** the outcome links the commit and says the changes show in the binder once the app's deploy finishes. Today that's on staging only. The Printings panel reads the branch's files again, and until that read lands, each published printing's row shows the value the publish wrote (#74).
7. **Docs.** In `CLAUDE.md`, the Card studio paragraph covers the batch, the files a publish writes, and the collection data Edit card reads.

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
- Admin now writes the app's own card files: `allCards.json`, which the whole app and the synergy engine read, and the collection files. Like the owner's hand-curated catalog, app sessions and scripts edit them too. A publish must leave them exactly as the app's scripts would write them, and must never overwrite a change made since (anti-goals).
- Counts belong to each account (the `collections` table). Admin never reads or writes them.
- This session can't change the app's code. The app part is built by a session working in the app repo.
- Each repo's own gates apply. In admin that includes CodeScene 10, the design-token rules and the React Compiler lint. The app has its size budgets, and `finishes` sits only on exceptions, which keeps it small.

## Decided by the owner

- Edit card in Card studio, not a page of its own or a list (2026-10-20).
- Three choices per printing: Both, Foil only, Normal only (2026-10-20).
- Copies counted in a finish that goes away show under the one that stays (2026-10-20), under the promo's twin when it has one (2026-10-21). The app never saves that move on its own: it's saved only when the player changes that count, so undoing a mistaken correction gives players their original counts back (2026-10-21).
- Admin's tray flags a change that removes a version before it's published (2026-10-21).
- The 13 alt foils and the one-version promos the catalog's notes record start out right, with 43/P2, 59/P3 and 63/P3 foil only (2026-10-20 and 21).
- A separate app issue and PR, with the app part built first (2026-10-21).
- Preview cards' versions come only once their set is official (2026-10-21).
- No new file: the versions live in the card data the app already reads, filled from LorcanaJSON and the catalog (2026-10-21).
- The owner can correct any printing, not just promos (2026-10-21).
- Version changes collect in a batch that publishes in one commit. The batch holds version changes only (2026-10-21).
- A change whose printing someone else changed meanwhile stays in the batch as a clash until the owner keeps or drops it (2026-10-21, from cubic's review of #70).

## My calls, for the owner to check

- The field's name, `finishes`, and its place as each entry's last key.
- How LorcanaJSON's `foilTypes` become versions: "None" means normal, and anything else means foil. The scripts write it only where it differs from the rarity rule.
- The scripts never change a value that's there, so a correction always wins over LorcanaJSON. If LorcanaJSON later fixes a printing the owner already corrected, nothing changes.
- Admin writes every copy of a printing's value itself, so no automatic rebuild runs after a publish.
- The app PR's list of every printing whose versions differ from the rarity rule, for the owner to check before merging.
- How the app finds a twin: same promo set, same card, and the missing finish as its only one.
- The stats follow the same rule: a promo without the field counts toward Master only once both versions are held. Today any held promo counts.
- The batch is kept in this browser until it's published or discarded.
- "Normal" in admin's wording, the word the binder uses, rather than "standard".
- Sets 1 to 8 cards open printings-only.
- What a player's edit saves on a printing that shows stray copies: the counts the player sees, with the strays' old entry cleared.

## Left to the builders

- Layout and wording inside each panel and the tray, within each repo's design rules.
- How the scripts read and carry existing values, provided no published correction is ever lost.
- How and when the app applies the field, provided counters never follow the rarity rule for a printing that has it.
- How the app shows stray copies and saves a player's edit within its sync rules, provided no count is lost or counted twice.
- How admin stores the batch, loads and caches the collection data, and words the commit message.
- Tests and stories, as each repo does them.

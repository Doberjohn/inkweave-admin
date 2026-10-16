## Phase R4: Card studio

> Part of [R: Admin redesign](../R-redesign.md). Read its decisions (R-57 to R-91 settle this phase's questions), corrections to the spec, global constraints, shared interfaces, "R1 as built", "R2 as built" and "R3 as built" first.

> **Re-base notes (2026-10-07).** The outline was written on 2026-10-01 against the planned R1 code. R1 to R3 are merged and live (`main` @ `b490fb7`). The app pin moves from `bc877e1` to `16283a13` in its own chore PR before the R4 branch is cut (R-85), so every task builds on `main @ e5e5029` with pin `16283a13`. The 2026-10-07 audit (one pass per outline task, the open questions, and a parity check against today's `/reveal` and `/image`) fed decisions R-57 to R-91. The owner took every recommendation, and settled R-73 as "refuse every number above `SET_TOTAL`". Changes:
> 1. **Decisions.** The outline's eight open questions and the audit's own are settled (R-57 to R-91). "Decided (2026-10-07)" below names each one's owning task.
> 2. **What R1 to R3 already built.** R4 reuses it and rebuilds none of it:
>    - **The bridge** already exports `InkIcon`, `RaritySymbol` and `rarityConfigOf` (`app-bridge.ts:46`, `:76-77`). At the pin `RaritySymbol` draws Enchanted, Epic and Iconic too (`RaritySymbol.tsx:12-21`), so `InkwellIcon` is R4's only new icon, and the three webps go (R-83).
>    - **R2's guard.** `UnsavedChangesGuard` with `leaves` replaces the outline's `useUnsavedGuard` and its `window.confirm` (R2-5a's hand-off, `R2-05a-unsaved-guard.md:678-693`).
>    - **The gate.** `GithubTokenGate({onSave})` renders inside the page's own `PageLayout … writes` (R1-7). It has no `title` prop.
>    - **The shell.** The focus handoff (R3-1a); `ForgetTokenOffer` and `isRejectedToken` (R-26); `PageLayout`'s `flush`, `documentTitle` and `scrollKey`; `cardsHref`.
>    - **R3's slot.** R3 shipped `CardAnalyticsView.headerActions` and no link, so R4 adds "Edit in Card studio" rather than moving it (R-82).
> 3. **Contract.** These change the outline's contract:
>    - `studioHref` and `StudioMode` live in `src/shell/nav.ts` (R-81).
>    - There is no `StudioStyles.tsx`: new `adm-*` classes go in AdminStyles, and layout constants in `studioStyles.ts` (R-41).
>    - The guard's message may be a function of the held target (R-58), with R2's in-flight sentence moved into a shared helper.
>    - The reveal controller gains `imageName`, `imageDataUrl`, `uploadError`, `imageError`, `commitError` and `dirty`, and its `publish` returns its promise (R4-6a).
>    - The bridge gains `InkwellIcon` and `transformRawCards` (R-66), and loses the webps (R-83).
>    - With a token, `PageLayout` renders inside `StudioWorkspace`, so the tab title can name Edit's open card, which only the workspace's controller knows (R4-6a).
>    - Signatures take objects wherever a module would pass 30% primitive arguments.
>    - **The task files are the source of the names.** Each contract block below is the producing task file's Produces block, as drafted and verified on 2026-10-07. Where a later task file was drafted against this header's first sketch, it maps to these names (each such task's Step 1 checks them).
> 4. **The pin (16283a13).** These facts were counted on the pinned file:
>    - `previewCards.json` holds 204 cards (ids 14001 to 14204) and 63 abilities, all keywords. 38 cards carry `variants` (24 at `bc877e1`). No card has `scanLanguage`, and one printing does (14213, the Epic of 14085, `it`). No card is dual-ink, 44 have no version, one has no rarity (14009), and two full names print `’` (14047's name, 14178's version). The file round-trips through `JSON.stringify(…, null, 2) + '\n'`.
>    - Set 14 is fully revealed: `SET_TOTAL` is 204, and the pinned file holds every number from 1 to 204. So New reveal has no free number until set 15 (see the rehearsal row under Tasks).
>    - `transformRawCards` is exported from the app's loader, and `CardTranslationPanel` has a `language` prop, which R4 doesn't pass.
>    - Tests on the pinned file hard-code no count or id, and guard the empty file that graduation leaves (2026-10-23).
> 5. **Shared rules.** New sections below set what every task follows: states and their order, focus (R-59 with R-48), keying, scroll and the tab title, the edits rule, the stale check (R-67), outcomes scoped to the seed (R-69), and visible errors (R-72).
> 6. **Modules and Code Health.** Hooks are wiring over pure helpers in `.ts` modules (`readiness.ts`, `cardEdit.ts`, `previewCardsFile.ts`, `editorState.ts`, `editSave.ts`, `branchCards.ts`). The contract blocks below carry a hand count of primitive parameters per module.
> 7. **Tests.** `src/test/revealForm.ts` and `src/tools/studio/studioFixtures.ts` are shared. `DeferredReader` and the image helpers already live in `src/test`. Mocks reset in `beforeEach`, because Vitest 5's `clearAllMocks` keeps implementations.
> 8. **Tasks.** The outline's seven tasks become 21 implementer tasks plus the controller's R4-7 and R4-8.
>    - **Split:** R4-1, R4-2 and R4-3 in two each; R4-4 in three; R4-5 into 5a to 5f; R4-6 into 6a to 6c.
>    - **Added:** 5s (guard wording), 5h (#32), 4d (branch-only cards, R-66), the owner's rehearsal (R-86) and R4-8.
>    - **Merged:** R-73 into 3a, and the handoff's retirement into R4-8 (R-88).
>    - **Dropped:**
>      - `useUnsavedGuard`, `StudioStyles.tsx`, three of the four bridge exports, and "move R3's link";
>      - the reveal-sync run in tasks that touch no contract file or bridge line;
>      - `pnpm build`, full lint and `test:run` inside tasks (gates once);
>      - the in-task live rehearsal.
> 9. **Conventions.** The branch is `feature/24-redesign-r4`, and the plan goes in first (R-56's convention). Every task file has re-base notes, "Step 1: check what this task builds on", targeted gates, a Code Health step and its commit.
> 10. **Verified** in `scratchpad/r4-rebase/sandbox-header`: a copy of `src/`, `scripts/` and the configs at `b490fb7` plus the uncommitted pin bump, with `node_modules` and `upstream/` junctioned in and Vite's caches in the sandbox.
>     - **Typecheck.** Contract additions 2 to 4 typecheck as first sketched (`tsc -p tsconfig.app.json`, exit 0): the bridge's `InkwellIcon` and `transformRawCards`, `nav.ts`'s `studioHref`, the guard's `to` and message function, and `writeInFlightMessage` with `CalibrationPage` switched to it. Addition 4 now carries R4-5s's two refinements (the `dirty` gate on `to`, the words kept while the dialog fades), which R4-5s verified in its own sandbox.
>     - **Tests.** `vitest run --project app src/shell src/router.test.tsx …/CalibrationPage.test.tsx` plus three probe files: 11 files, 172 tests pass. They include R2's in-flight wording (`CalibrationPage.test.tsx:829`), unchanged. The probes check:
>       - `studioHref`'s table, an encoded id included;
>       - a held card change and a held leave, worded differently through the message function;
>       - that `transformRawCards` gives each of the 204 pinned cards an `imageUrl` and keeps 14213's `it`.
>     - **Reveal-sync.** `vitest run --project scripts scripts/reveal-sync/web.test.mjs` passes with the new bridge lines (2 tests).
>     - **Lint.** Every sketched file passes `pnpm exec eslint --max-warnings 0 --stdin` in the repo.
>     - **Not run.** CodeScene can't run in the sandbox, which is no git repository; each task runs `code_health_review` itself.

**Contract additions** (to the main plan's "Shared interfaces (R1)" and "Contract additions from the task drafts"). They add names and rename nothing. Every R4 task builds against them, and a task that has to change one says so in its own re-base notes. The plan commit records them in the main plan, as R3's did. R4-8 corrects any line the code changed and lists it under Departures.

1. **What R4 imports from R1 to R3, unchanged.**
    ```ts
    // src/shell/PageLayout.tsx: title, subtitle, actions, writes, flush (R2-6), documentTitle (R-51), scrollKey (R3's fix wave)
    // src/shell/focusHandoff.ts (R3-1a, R-48): FocusHandoff, useFocusHandoff, focusUnmoved, useTakeHandoff
    // src/shell/UnsavedChangesGuard.tsx, useUnsavedChangesGuard.ts (R2-5a, R-19): LeavesPage; widened in R4-5s (addition 4)
    // src/github: GithubTokenGate({onSave}) (R1-7), ForgetTokenOffer({onForget}) and isRejectedToken(message) (R-26),
    //   goLiveNote(onMaster), and githubCommit.ts's commitFiles, readRepoFile, stripDataUrl, utf8ToBase64, targetBranch
    //   and CommitResult. githubCommit.ts is never edited: it sits at CodeScene's String Heavy Arguments edge
    // src/components: useImageUpload (choose, clearIf, file, dataUrl, error), useHiddenFileInput (focused, inputProps)
    // src/ui: Panel (titleFocusable), SegmentedControl, MeterBar, Notice; src/shell/nav.ts: cardsHref
    // src/tools/reveal: commitNewCard, buildPreviewCard, validateRevealCardForm, insertCardIntoPreviewJson, constants.ts
    //   (the reveal-sync contract, below); components/SynergyPreviewPanel (restyled in place by R4-5e, R-90)
    // src/tools/image: commitCardImage (image-only saves, unchanged), filterCards (kept, R-30; R4-2b folds apostrophes)
    // the bridge: useCardDataContext ({cards, isLoading, error, getCardById, retryLoad}), useContainerWidth (ResizeObserver,
    //   contentRect), CardTile, CardTranslationPanel, smallImageUrl, InkIcon, RaritySymbol, rarityConfigOf, CtaButton,
    //   LinkButton, ALL_INKS, inkBlock, SET_TOTAL, REVEAL_SET_CODE, REVEAL_ID_BASE, PINNED_PREVIEW_CARDS_JSON
    ```
    - **The card list.** `CardDataProvider` loads the card list once, starting with `isLoading` true. The list is every card from set 9 up: the deployed `allCards.json` plus the deployed `previewCards.json`, and `allCards` wins on an id in both (`loader.ts:187-240` at the pin; the merge and the set-9 floor at `:212-216`). So Edit card searches every card in the card list (Core sets 9 and up), not every card ever printed.
    - **Return types.** As in R3, no signature here annotates a component's return type (`@types/react` 19.3 has only `React.JSX`).
2. **The bridge (R4-5a, R4-5h, R4-4d).** Verified in the sandbox:
    ```ts
    // R4-5a, after InkIcon (:46):
    // Inkable or Uninkable, as the app draws them (Card studio's Inkable buttons).
    export {InkwellIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkwellIcon';
    // R4-4d (R-66), the loader line (:62) gains transformRawCards, and its comment (:60-61) says why: the app's own
    // transform (the engine's, plus imageUrl, the image hashes, scanLanguage and the printings), so a card only the
    // branch file holds points at its art
    export {searchCardsByName, smallImageUrl, transformRawCards} from '../upstream/inkweave/apps/web/src/features/cards/loader';
    // R4-5h (R-83, admin#32): :78-82 go (the three webps and their comment). :74-75's comment is rewritten: RaritySymbol
    // draws the five rarities and the three printings by lowercase key, and rarityConfigOf maps a card's rarity to one
    // of the five (R4-5h's Step 4 has the words)
    // R4-6c: EMPTY_BOX and GOLD_GLOW leave the constants export (:19, :22), since their last importers are deleted
    ```
    - **Scripts.** `scripts/reveal-sync/web.mjs:47` loads the bridge to read the season. So a task that edits `app-bridge.ts` also runs `pnpm vitest run --project scripts scripts/reveal-sync/web.test.mjs`. Bridged modules already import SVG and WebP assets (`RaritySymbol.tsx:1-9`), and they load under that runner.
    - **Printings on `/web`.** R4-5h has `BreakdownCards` draw its printings through `RaritySymbol` (`BreakdownCards.tsx:27-28`, `:51`), so `PRINTING_SYMBOLS` goes.
    - **The rarity picker** draws `<RaritySymbol rarity={r.toLowerCase()} …/>` for every rarity it shows. It is `aria-hidden`, so the button's text names it.
3. **`src/shell/nav.ts` (R4-5a, R4-6a, R4-6c; R-57, R-81).** Verified in the sandbox:
    ```ts
    /** Card studio's two modes (R-57): New reveal, and Edit card. */
    export type StudioMode = 'new' | 'edit';
    /**
     * Card studio in a mode, opened on a card when one is given (R-81): what the
     * mode switch, the Edit search's rows and Card analytics' "Edit in Card studio"
     * navigate to. New reveal is the bare path, and a switch keeps the card, so Back
     * returns to the other mode (R-57).
     */
    export function studioHref(mode: StudioMode, cardId?: string | null): string {
      const params = new URLSearchParams();
      if (mode === 'edit') params.set('mode', 'edit');
      if (cardId) params.set('card', cardId);
      const search = params.toString();
      return search ? `/studio?${search}` : '/studio';
    }
    // '/studio', '/studio?card=14023', '/studio?mode=edit', '/studio?mode=edit&card=14023'; an id is encoded ('a&b' -> 'a%26b')
    // R4-6a, first in the Publish group, beside the old items until R4-6c removes them:
    {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
    ```
    - **Hand count.** `nav.ts` goes from 4 parameters to 6, every one a string or `StudioMode`. R3's 4 of 4 passed the PR gate, and String Heavy Arguments fired on `githubCommit.ts` only at 12 or more. R4-5a runs `code_health_review` on `nav.ts`, and R4-8 runs `analyze_change_set` before the push.
    - **Matching.** `navItemFor` owns `/studio` and every path under it, and the search plays no part, so `/studio?mode=edit` marks Card studio current. `isWritePath('/studio')` is true, so the sidebar shows the token box.
    - **`SegmentedControl`'s doc comment** (`SegmentedControl.tsx:13-15`) still expects the studio to reset on a switch. R4-5a rewrites those two sentences (R-57).
4. **The guard's wording (R4-5s, R-58).** The change is additive: `/calibration` keeps its string, and nothing is renamed. As R4-5s built and verified it:
    ```ts
    // src/shell/useUnsavedChangesGuard.ts: UnsavedChangesGuardState gains
    to: Location | null;   // where the held navigation goes; non-null exactly when `blocked` (gated on `dirty`, as
                           // `blocked` is), so null in the render where the edits clear. A pure heldTarget(blocker) reads it
    // src/shell/UnsavedChangesGuard.tsx: the prop widens; UnsavedChangesDialog's props are unchanged
    export type UnsavedMessage = string | ((to: Location) => string);   // called during render, only while a navigation is held
    message: UnsavedMessage;   // a private messageFor resolves it; while the dialog fades out it keeps the words it last showed
    // src/shell/writeInFlight.ts (new): R2's F13 sentence, moved out of CalibrationPage.tsx:18-20
    export interface WriteInFlight {action: 'publish' | 'save'}
    export function writeInFlightMessage({action}: WriteInFlight): string;
    // "A {action} to {targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed."
    // CalibrationPage passes writeInFlightMessage({action: 'publish'}): the same sentence, word for word
    ```
    - **One guard.** The studio mounts one guard in `StudioWorkspace`, the component that owns both drafts (R4-6a). No story renders that component, because the router holds one blocker:
    ```tsx
    <UnsavedChangesGuard
      dirty={drafts.reveal || drafts.edit}
      leaves={(from, to) => shouldBlockStudioNavigation(from, to, drafts)}
      message={(to) => studioUnsavedMessage({from: location, to, drafts, busy})}
    />
    ```
    - **The wording.** `studioUnsavedMessage(leave: StudioLeave)` (R4-6a, in `studioPaths.ts`; addition 6) builds on `draftsAtRisk`, so the dialog names exactly the drafts the hold protects. A card change names only the Edit draft. Leaving `/studio` names every dirty draft. `busy` (a `StudioDrafts`: New's `publishing`, Edit's `saving`) swaps a draft's line for `writeInFlightMessage` for that write. R4-6a lands the whole helper, so R4-6b only tests a card change.
5. **Styles (R4-5a; R-41, R-75).** There is no component-level `<style>`. `AdminStyles` stays the one stylesheet (`AdminStyles.tsx:144`). It gains seven classes, each built only from `ADMIN_*` tokens, the `SPACING` scale and named height constants (as `NAV_ITEM_HEIGHT` is):
    ```ts
    // adm-acc-head  : an accordion section's header, the <button> in its <h2>; [aria-expanded="true"] turns the ::after
    //                 chevron down; hover rowHover; ring inside (-2px)
    // adm-pick-btn  : a rarity, Inkable or Uninkable button, full width, 34px tall; [aria-pressed="true"] is adm-card-btn's
    //                 one selected look (accentTintSoft fill, accentStrong border; R-75); ring 2px out
    // adm-ink-tile  : with adm-pick-btn ("adm-pick-btn adm-ink-tile"): a 48px ink tile; data-size="sm": 40px
    // adm-switch    : the Dual-ink <input type="checkbox" role="switch">: :checked golds the track and slides the ::before knob
    // adm-file-btn  : a <label> round useHiddenFileInput's input, as a bordered 36px button ("Replace card image");
    //                 data-focused="true", from the hook's `focused`, rings it 2px out
    // adm-file-cover: a <label> laid over the card preview, for its caption pill; hover draws an inset edge;
    //                 data-focused="true" rings it 2px out
    // adm-range     : the cost slider (<input type="range">), styled per engine; data-unset="true" hides the thumb
    ```
    - **Why two file classes.** The preview overlay and "Replace card image" look nothing alike, so one class would need its look overridden inline (R4-5a).
    - **Tests.** Each class joins `AdminStyles.test.tsx`'s `CLASSES`, plus `FOCUSABLE`, `PRESSABLE` and the reduced-motion block (`AdminStyles.tsx:134-139`) where they apply. A `<label>` never matches `:focus-visible`, so `adm-file-btn` and `adm-file-cover` stay out of `FOCUSABLE` and get their own `[data-focused="true"]` assertion.
    - **One story,** `Admin/Theme` → `Studio Controls`, shows the classes before R4-5b to R4-5d use them: jsdom draws no pseudo-element.
    - **Layout constants.** They live in `src/tools/studio/studioStyles.ts`, R3's `cardStyles.ts` pattern: `CSSProperties` constants (addition 6).
      - **Wide:** `minmax(320px,400px) minmax(0,1fr) minmax(0,1fr) 280px`, with the form slot across the two middle columns, two by two.
      - **Narrow:** the handoff's flex-wrap.
      - **The root:** max width 1600, centred, padded `SPACING.lg` (16), with gaps of `SPACING.md` (12). Its box is the same in both layouts, so a switch can't move the measure across the threshold.
6. **Paths and layout (R4-5a; R-57, R-63, R-64).**
    ```ts
    // src/tools/studio/studioPaths.ts (R4-5a)
    export type StudioLocation = Pick<Location, 'pathname' | 'search'>;   // a router Location or a URL
    export interface StudioDrafts {reveal: boolean; edit: boolean}       // each draft's dirty
    export function studioModeOf(location: StudioLocation): StudioMode;  // ?mode=edit is 'edit'; anything else 'new'
    export function studioCardOf(location: StudioLocation): string | null; // ?card=, or null (an empty ?card= too)
    /** Leaving /studio: every dirty draft. Another card, or none: the Edit draft. A mode switch: none (R-57). */
    export function draftsAtRisk(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): StudioDrafts;
    /** UnsavedChangesGuard's `leaves`: true when draftsAtRisk names a draft. */
    export function shouldBlockStudioNavigation(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): boolean;
    // R4-6a adds (addition 4; R-84):
    export interface StudioLeave {from: StudioLocation; to: StudioLocation; drafts: StudioDrafts; busy: StudioDrafts}
    export function studioUnsavedMessage(leave: StudioLeave): string;          // one line per draft draftsAtRisk names
    export function forgetTokenQuestion(drafts: StudioDrafts): string | null;  // the in-page Forget token's confirm; null when clean

    // src/tools/studio/studioLayout.ts (R4-5a)
    export type StudioLayout = 'wide' | 'narrow';
    export const STUDIO_PADDING: 16;      // SPACING.lg, the measured root's padding
    export const STUDIO_WIDE_MIN: number; // 1328 = 1360 - 2 * STUDIO_PADDING (R-64): the handoff's border box, against
                                          // useContainerWidth's content box
    export function studioLayout(width: number): StudioLayout;   // 0 (unmeasured, and always in jsdom) is narrow
    export type StudioSlot = 'card' | 'form' | 'aside';
    export const STUDIO_SLOT_ORDER: Readonly<Record<StudioLayout, readonly StudioSlot[]>>;   // R-63's DOM order

    // src/tools/studio/studioStyles.ts (R4-5a): inline styles, as cardStyles.ts
    export const STUDIO_GAP: 12;                                                   // SPACING.md
    export const STUDIO_GRID: Readonly<Record<StudioLayout, CSSProperties>>;       // the measured root
    export const STUDIO_SLOT: Readonly<Record<StudioLayout, Readonly<Record<StudioSlot, CSSProperties>>>>;
    export const STUDIO_FORM: Readonly<Record<StudioLayout, CSSProperties>>;       // StudioForm's root: 2×2 wide, a stack narrow
    export const STUDIO_PANEL: CSSProperties;   // Panel's surface
    export const FIELD_LABEL: CSSProperties;    // 12px, muted
    export const HINT: CSSProperties;           // 11px, muted (never dim, R-6)
    export const ERROR_TEXT: CSSProperties;     // 11px, COLORS.error, as PendingTray prints one
    ```
    - **Hand count.** `studioPaths.ts` has 0 primitive parameters in 9 after R4-5a, and 1 in 13 after R4-6a (`draftLine`'s `keyof StudioDrafts`). `studioLayout.ts` has 1 of 1, a small module like R3's `lastCard.ts` (2 of 2, which passed R3's gate). `studioStyles.ts` has no functions.
    - **Where the layout comes from.** `StudioWorkspace` measures its own root, which is present in every mode and state. `useContainerWidth`'s effect depends only on `[ref]`, so an element swapped in later would never be measured, and nothing conditional takes the ref. A sidebar collapse resizes the root, and the layout follows.
    - **DOM order (R-63).** The card comes first when wide, and the form first when narrow, as the handoff orders them (`STUDIO_SLOT_ORDER`). R4-6a's `StudioSlots` renders the three regions as keyed children, so React moves them between layouts instead of remounting them.
7. **The form helpers and readiness (R4-3a; R-60, R-72, R-73).**
    ```ts
    // src/tools/reveal/emptyForm.ts (new; not a reveal-sync contract file, and named apart from src/test/revealForm.ts)
    export const EMPTY_FORM: Readonly<RevealCardForm>;   // moved from useRevealAdmin.ts:15-34, unchanged
    export function sameForm(a: Readonly<RevealCardForm>, b: Readonly<RevealCardForm>): boolean;   // key by key; order doesn't count
    // src/tools/reveal/validateForm.ts: intField (:26) is exported, body unchanged. R-73: a private collectorError(form,
    //   existingIds), called from checkIdentity, refuses a number above SET_TOTAL: "#N is past the {SET_TOTAL}-card set:
    //   special printings go in through variants.mjs stage". validateForm.test.ts:71's "skips the ink check past the
    //   numbered set" gives way to that refusal. Every exported signature is unchanged
    // src/tools/reveal/constants.ts (R-60): SCAN_LANGUAGES gains {code: 'fr', label: 'French'}, and `type ScanLanguage = string`,
    //   so an entry's hand-marked code needs no cast (R4-2a's Appendix A has the verified block)
    // src/tools/studio/readiness.ts
    export interface ImageStatus {name: string | null; ready: boolean; error: string | null}
    // name: the chosen file's (null before one); ready: its bytes are read and pass; error: the upload's own
    export type ChecklistId = 'collectorNumber' | 'name' | 'ink' | 'cost' | 'typeStats' | 'cardText' | 'image';
    export interface ChecklistItem {id: ChecklistId; label: string; done: boolean; message: string | null}   // message null iff done
    /** "Ready to publish N/7": every item done exactly when validation.ok and the image bytes are read. */
    export function revealChecklist(form: RevealCardForm, validation: ValidationResult,
      image: Pick<ImageStatus, 'ready' | 'error'>): ChecklistItem[];
    /** R-72: the errors on values the operator filled in; a blank value's error is dropped, and `image` never appears. */
    export function visibleErrors(form: RevealCardForm, errors: Readonly<Record<string, string>>): Record<string, string>;
    /**
     * R-72 for the file input: null until a file is chosen, then the file's own error (the upload's: unreadable bytes,
     * or not the format its name claims), else the validator's image error.
     */
    export function visibleImageError(errors: Readonly<Record<string, string>>, image: ImageStatus): string | null;
    export type SectionId = 'identity' | 'ink' | 'type' | 'text';
    export type SectionState = 'error' | 'complete' | 'incomplete';
    export interface SectionStatus {state: SectionState; message: string | null}   // message: the first shown error
    export function sectionStatuses(form: RevealCardForm, errors: Readonly<Record<string, string>>): Record<SectionId, SectionStatus>;
    // src/test/revealForm.ts (tests and stories only)
    export const RUBY_NUMBER: number;                                            // inkBlock('Ruby').first
    export function revealForm(overrides?: Partial<RevealCardForm>): RevealCardForm;   // a complete Ruby character
    ```
    - **Hand count.** `readiness.ts` 0 of 18 (1 of 18 if `firstError`'s `keys` is counted), `emptyForm.ts` 0 of 2, `src/test/revealForm.ts` 0 of 1. `validateForm.ts` goes from 4 of 18 to 4 of 20.
    - **The validator is the one source of what is required.** The section and checklist key tables stay private (no `SECTION_FIELDS` export); the tests check key coverage through the outputs.
    - **Ink.** The Ink item and the ink section count as done only once the number is in the set (`1 ≤ intField(collectorNumber) ≤ SET_TOTAL`), which is exactly when the validator's ink-block check runs. So the Amber default never ticks them. Until then, the item reads "Checked against the collector number: set it first".
    - **A fresh form reads 1/7.** Card text is ticked from the start: it is optional, and it has no error until text is typed.
8. **The reveal controller (R4-3b; R4-6a).**
    ```ts
    // src/tools/reveal/livePreview.ts: the card being written, shared by New reveal and Edit card (R4-4b)
    export function buildPreview(form: RevealCardForm, imageDataUrl: string | null): LorcanaCard | null;   // moved unchanged
    export function computeSynergies(card: LorcanaCard | null, allCards: LorcanaCard[]): SynergyGroup[];  // moved unchanged
    /** The image a controller holds: New reveal's upload, or Edit card's staged file (R4-4b's StagedImage has this shape). */
    export interface ChosenImage {name: string | null; dataUrl: string | null; error: string | null}
    /** R-72's file-control error: visibleImageError(validation.errors, {name, ready: dataUrl !== null, error}). */
    export function imageErrorOf(image: ChosenImage, validation: ValidationResult): string | null;
    // RevealAdminController (useRevealAdmin.ts:71-85) gains, read from existing state:
    dirty: boolean;                // !sameForm(form, EMPTY_FORM) || a file is chosen (read or not)
    imageName: string | null;      // upload.file?.name ?? null
    imageDataUrl: string | null;   // upload.dataUrl: its bytes, once read and checked
    uploadError: string | null;    // upload.error: unreadable bytes, or not the format the name claims
    imageError: string | null;     // imageErrorOf({name: imageName, dataUrl, error: uploadError}, validation): null until a file is chosen
    commitError: string | null;    // the last publish's own failure, cleared as a publish starts
    // publishError stays (commitError ?? uploadError) while RevealPage reads it; R4-6c removes it with the page.
    //   readyToPublish now returns the publish's inputs or null, and canPublish is `ready !== null`; same four checks.
    // R4-6a: publish: () => Promise<void> (was () => void), so the page asks for the focus handoff once it settles
    ```
    - **Hand count.** `livePreview.ts` has 1 primitive parameter in 6, and `useRevealAdmin.ts` 0 in 7.
    - **What the panel shows.** `imageError` is R-72's file-control error, through R4-3a's `visibleImageError`: null until a file is chosen ("Upload a card image" is the checklist's), then the file's own error (the upload's: unreadable bytes, or not the format its name claims), else the validator's image error. Edit's controller derives its `imageError` through the same `imageErrorOf` (R4-4b), so both panes word an image alike. R4-6a's page test pins a fresh New reveal form with no image error.
9. **The Edit write path (R4-1a, R4-1b; R-67, R-78, R-79).**
    ```ts
    // src/tools/reveal/replaceCardInPreviewJson.ts (R4-1a)
    export const EDITABLE_CARD_KEYS = [
      'name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity', 'franchise', 'subtypes',
      'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage',
    ] as const;
    export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];
    /** A new value per changed key; null removes the key (a cleared rarity, an English scan); undefined is no change. */
    export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};
    export interface PreviewCardEdit {id: number; changes: PreviewCardChanges}
    export function mergeCardChanges(card: LorcanaJSONCard, changes: PreviewCardChanges): LorcanaJSONCard;
    export function replaceCardInPreviewJson(fileText: string, edit: PreviewCardEdit): string;   // fail-closed; throws, never half-writes
    // src/tools/reveal/githubClient.ts (R4-1b), beside commitNewCard (unchanged)
    export class StaleCardError extends Error { name = 'StaleCardError'; }   // no constructor (erasableSyntaxOnly); built with a message
    export function readPreviewCards(token: string): Promise<LorcanaJSONCard[]>;   // at targetBranch(); refuses a file with no cards array
    export interface CardEditCommit {
      token: string;
      loaded: LorcanaJSONCard;                       // the entry as loaded, or as its last save left it
      changes: PreviewCardChanges;
      image: {dataUrl: string; ext: string} | null;  // through stripDataUrl, to card-images-raw/{id}.{ext}
    }
    export function commitCardEdit(opts: CardEditCommit): Promise<CommitResult>;
    ```
    - **Guards.** Each refusal in `replaceCardInPreviewJson` is its own helper, each at cyclomatic complexity 3 or less, as `validateForm.ts` does it, and every message starts "previewCards.json":
      - not JSON, or no `cards` array;
      - a file that doesn't round-trip;
      - empty `changes` (all `undefined` included), a key outside `EDITABLE_CARD_KEYS`, or a required key set to `null`;
      - R-79: a `scanLanguage` that isn't a two-letter code other than `en` (the app's `/^(?!en$)[a-z]{2}$/`);
      - a missing or duplicated id;
      - any change to another card, the card's index, the card count, or the file outside its cards.
    - **The stale check (R-67)** and the commit messages (R-78) are under "Shared rules".
    - **Hand counts.** `replaceCardInPreviewJson.ts` has 2 primitive parameters in 15 (the entry's `fileText`, and the private `parseFile`'s). `githubClient.ts` has 1 in 6, counting its private helpers `readCardsAt({token, ref})`, `checkBaseEntry({cards, loaded})` and `editMessage(edit)`, which take objects.
    - **Edit's next entry.** `commitCardEdit` returns only a `CommitResult`, so after a fields save the editor patches the file with `mergeCardChanges(loaded, changes)` (R4-4c). Under R-67 it matches the committed entry on every compared key.
    - **The barrel.** `src/tools/reveal/index.ts` isn't touched: R4-6c deletes it.
10. **The Edit model, search and change rows (R4-2a, R4-2b; R-60, R-61, R-65, R-76).**
    ```ts
    // src/tools/studio/cardEdit.ts (R4-2a)
    export type ImageOnlyReason = 'released' | 'unnumbered' | 'other-set' | 'unrepresentable';
    export type CardKind = {kind: 'fields'} | {kind: 'image'; reason: ImageOnlyReason};
    export const IMAGE_ONLY_NOTES: Readonly<Record<ImageOnlyReason, string>>;   // R-61's sentence and R-65's three
    export const FIELD_KEYS: Readonly<Record<keyof RevealCardForm, readonly EditableCardKey[]>>;   // the keys each field builds
    export function formFromPreviewCard(entry: LorcanaJSONCard): RevealCardForm;
    export function roundTrips(entry: LorcanaJSONCard): boolean;           // form → buildPreviewCard gives every editable key back
    export function editKindOf(entry: LorcanaJSONCard | null): CardKind;   // 'fields' only for a numbered REVEAL_SET_CODE entry that roundTrips
    export function cardChanges(loaded: LorcanaJSONCard, before: RevealCardForm, after: RevealCardForm): PreviewCardChanges;   // throws on a renumber
    export function validateCardEdit(form: RevealCardForm, imageName: string | null): ValidationResult;   // empty id set; no image is fine
    export function hasEdits(edit: {changes: PreviewCardChanges; imageName: string | null}): boolean;     // the edits rule
    // src/tools/studio/editSearch.ts (R4-2b)
    export const SEARCH_LIMIT = 40;
    export type CardTag = 'Preview' | 'Released';
    export interface SearchRow {card: LorcanaCard; tag: CardTag | null}   // null: a reveal-set card while the file is unread (R-71);
                                                                         // R4-4d adds deployed: boolean (false: only the branch file holds it)
    export interface EditSearchInput {
      cards: readonly LorcanaCard[];            // the card list (Core sets 9 and up); R4-4d passes the union
      query: string;
      previewIds: ReadonlySet<number> | null;   // the branch file's ids; null while it loads or after a failed read
    }                                           // R4-4d adds branchOnlyIds?: ReadonlySet<number> (none: every row deployed)
    export interface EditSearchResult {rows: SearchRow[]; total: number}   // rows: the first SEARCH_LIMIT; total: every match
    export function previewIdsOf(entries: readonly LorcanaJSONCard[] | null): ReadonlySet<number> | null;
    export function cardTag(card: LorcanaCard, previewIds: ReadonlySet<number> | null): CardTag | null;
    export function searchCards(input: EditSearchInput): EditSearchResult;
    // src/tools/studio/changeRows.ts (R4-2b)
    export interface ChangeRow {id: EditableCardKey | 'image'; label: string; from: string; to: string}   // never truncated (R2's tray)
    export interface ChangeRowsInput {loaded: LorcanaJSONCard | null; changes: PreviewCardChanges; imageName: string | null}
    export function changeRows(input: ChangeRowsInput): ChangeRow[];   // form order, then {id: 'image', label: 'Image', from: 'current art', to: imageName}
    export function changeCount(rows: readonly ChangeRow[]): string;   // 'No changes yet' | '1 change' | 'N changes'
    // src/tools/studio/scanLanguages.ts (R4-2b, R-60): the select (R4-5b) and the change rows share it
    export interface ScanLanguageOption {code: string; label: string}
    export function languageName(code: string): string;   // Intl.DisplayNames(['en'])'s name, else the code; it gives each listed label
    export function scanLanguageOptions(current: string): readonly ScanLanguageOption[];   // SCAN_LANGUAGES, plus current if unlisted
    ```
    - **`cardChanges`.** It compares JSON values through `FIELD_KEYS`, in which `type` maps to `type` and all four stats, and `name` and `version` each to themselves and `fullName`. A same-value retype, or a whitespace edit that builds the same card, emits nothing. The `collectorNumber` field maps to no key: Edit locks it (R-91), and a renumber throws.
    - **The search.** `searchCards` makes one `filterCards(cards, query, Infinity)` pass. R4-2b makes `filterCards` fold `‘` and `’` to `'` on both sides, as the app's `searchKey` does; its signature is unchanged.
      - **Blank query (R-76).** The branch file's preview cards come first, each part in the card list's order, capped at `SEARCH_LIMIT`, with the total. A typed query keeps `filterCards`' ranking, the file's cards first within each rank.
      - **Tags (R-71).** A card the file holds is Preview. A reveal-set card reads `null` (no chip) while the file is unread, and any other card is Released straight from the card list.
    - **Display only.** Dirty, Save, the save path and the guard use `hasEdits`, never the row count.
    - **Hand counts.** `cardEdit.ts` 1 primitive parameter in 9, `studioFixtures.ts` 1 in 5 (the private `ruby(offset)`), `editSearch.ts` 0 of 8, `changeRows.ts` 0 of 3 (3 of 11 with its lambdas), and `filterCards.ts` 2 of 4 (2 of 3 at main). `scanLanguages.ts` is 2 of 2, a small module of string parameters like R3's `lastCard.ts`.
11. **The Edit controller (R4-4a to R4-4d; R-66, R-68 to R-71).** The lookup's names are R4-4b's (`kind`, `listFailed`, `fileFailed`), which R4-4c builds on.
    ```ts
    // src/tools/studio/previewCardsFile.ts (R4-4a): the pure state, with the landing rules the hook wires
    export type PreviewCardsFile =
      | {status: 'loading'}
      | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number; reloadError?: string}   // C1
      | {status: 'error'; error: string};                                                                           // no read has landed
    // src/tools/studio/usePreviewCardsFile.ts (R4-4a): useLiveTuning's model, with `requested` as state, not a ref
    export type UsePreviewCardsFileResult = PreviewCardsFile & {
      requested: number;                                      // the newest read asked for
      reload: () => Promise<LorcanaJSONCard[] | null>;        // settles once the newest read lands: its cards, or null
      commit: (entry: LorcanaJSONCard) => void;               // a fields save landed: patch the entry in now, and read again
    };
    export function usePreviewCardsFile(token: string): UsePreviewCardsFileResult;

    // src/tools/studio/editorState.ts (R4-4b): every rule as a function of plain inputs, each taking one object or domain types
    export type EditLookup =
      | {kind: 'listFailed'; error: Error}                   // the card list failed, with or without a card
      | {kind: 'none'}                                       // no ?card=: the search
      | {kind: 'loading'}                                    // the card list, or a set-14 card waiting for the file
      | {kind: 'missing'; cardId: string}                    // from R4-4d, only once the file lacks it too
      | {kind: 'fileFailed'; error: string}                  // a set-14 card, and previewCards.json can't be read (R-71)
      | {kind: 'gone'; card: LorcanaCard}                    // R4-4d (R-66): a reveal-band id the branch file no longer holds
      | {kind: 'ready'; card: LorcanaCard; entry: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null};
    export function editLookup(input: {cardId: string | null; list: CardListState; file: PreviewCardsFile}): EditLookup;
    // also: Draft {cardId, seed, read, follow, edit, image}, seedDraft, needsSeed, patchDraft (the number stays, R-91),
    //   discardDraft, stageImage, stagedImage, draftChanges, draftValidation, editPreview, editSynergies, openCard,
    //   openTag, previewFileView; R4-4b's Produces block has them in full
    // src/tools/studio/editSave.ts (R4-4c)
    export type SaveFailure = 'stale' | 'rejected-token' | 'other';
    export interface EditResult {commitUrl: string; withImage: boolean}
    export function savePlanOf(input: SaveInput): SavePlan | null;   // fields (commitCardEdit) or image only (commitCardImage)
    export function failureOf(error: unknown): {failure: SaveFailure; message: string};   // rewords commitFiles' race as a save
    // also savedDraft (R-70), keepEdits (R-68), imageSent and reseeded
    // src/tools/studio/branchCards.ts (R4-4d): editSources (the union), hasPreviewId, isDeployed, deployedOf,
    //   branchLookup (gone; missing waits for the file) and goneNote

    // src/tools/studio/useCardEditor.ts (R4-4b; R4-4c's useEditSave.ts holds the save side)
    export interface CardEditorController {
      lookup: EditLookup;
      retry: () => Promise<boolean>;            // the card list's retryLoad when it failed, and previewCards.json whenever the
                                                // search shows a file error (a failed first read or a later reloadError):
                                                // R4-6b's Step 10, or R4-4c if it takes that condition
      previewFile: PreviewFileView & {reload: () => void};   // {status, previewIds: ReadonlySet<number> | null, error}: the search's, any card or none
      tag: CardTag | null;
      form: RevealCardForm | null;              // null for an image-only card, and until the card is ready
      imageOnly: ImageOnlyReason | null;
      patchForm: (patch: Partial<RevealCardForm>) => void;
      validation: ValidationResult;
      changes: ChangeRow[]; dirty: boolean; discard: () => void;
      previewCard: LorcanaCard | null; synergyGroups: SynergyGroup[];   // no synergies for an image-only card (R-61)
      imageName: string | null; imageDataUrl: string | null; imageError: string | null;   // imageError: imageErrorOf(staged, validation)
      onImageChange: (file: File | null) => Promise<void>;   // the ported image tests await it
      revertImage: () => void;
      // R4-4c (EditSave, which the controller extends)
      canSave: boolean; saving: boolean;
      save: () => Promise<void>;                // settles once the commit lands or fails
      result: EditResult | null; saveError: string | null; failure: SaveFailure | null;   // this draft's last save only (R-69)
      loadAgain: () => Promise<boolean>;        // after 'stale': re-read, re-seed, keep what still applies (R-68)
      dropped: number | null;                   // the edits the last Load it again dropped; null until one lands
      // R4-4d
      searchCards: LorcanaCard[];               // the branch-only cards (transformRawCards), then the card list
      branchOnlyIds: ReadonlySet<number>;       // for searchCards' rows ("not deployed yet")
      deployed: boolean;                        // false while the open card is branch-only
      reloadFile: () => void;                   // R4-6b calls it once a New reveal publish lands (R-66)
    }
    export function useCardEditor(input: {token: string; cardId: string | null}): CardEditorController;
    ```
    - **Ownership.**
      - **R4-4a** owns the file: read numbering in state, `reloadError`, `commit(entry)` and the promise-returning `reload`.
      - **R4-4b** owns the lookup, the draft and its render-time re-seed, image staging owned by the draft's seed, the preview, synergies, changes, dirty and discard. It never calls `upload.choose` during render.
      - **R4-4c** owns the save side: `editSave.ts`, `useEditSave.ts`, and the re-seed that keeps edits (R-68).
      - **R4-4d** owns `gone`, the union list, `deployed` and `reloadFile`. It reads its sources through `editSources`, so R4-4a's to R4-4c's code doesn't change.
      - A task file may add fields; it renames none.
    - **Hand count.** `usePreviewCardsFile.ts` has 1 primitive parameter in 2 (`token`; `land`'s `landing` is an object), where `useLiveTuning.ts` has 2 in 4. `editorState.ts` 0 of 24, `useCardEditor.ts` 0 of 5 (R4-4b), 0 of 6 from R4-4c (`retryReads`), `editSave.ts` 0 of 19 and `useEditSave.ts` 0 of 6. `branchCards.ts` 0 of 12 (1 of 18 with its lambdas).
12. **The components (R4-5b to R4-5f; R-61, R-74, R-75, R-77, R-89, R-90).** Each lives in `src/tools/studio/components/`, and each takes one props object. These are the props the page wires; the task files hold the rest.
    ```ts
    // R4-5b: StudioForm, FormSection, Field and TextField (port RevealAdminForm.tsx:32-68's errorId, controlProps and Field
    //   onto adm-input/adm-select, through a pure fieldWiring.ts: aria-describedby is the hint, then the error),
    //   IdentitySection, InkRaritySection, TypeStatsSection, CardTextSection; formSections.ts holds SectionProps, the
    //   closed headers' summaries, costSlider and dualInk. SR_ONLY moves from VoteLogTable.tsx:13-23 to src/ui/layout.ts
    StudioForm(props: {form: RevealCardForm; errors: Readonly<Record<string, string>>; onChange: (patch: Partial<RevealCardForm>) => void;
      layout: StudioLayout; locked?: ReadonlySet<keyof RevealCardForm>});
    //   errors are the validator's: StudioForm shows them through visibleErrors and sectionStatuses (R-72). Edit passes
    //   locked {collectorNumber} (R-91 1): read-only, still focusable, with the reason as its hint. The Dual-ink switch
    //   (its open state lifted into StudioForm, so the narrow accordion can't reset it) is R4-5b's; the ink, rarity and
    //   Inkable controls start as interim ports of today's selects and checkbox
    // R4-5c: the pickers replace the interim controls inside InkRaritySection and TypeStatsSection (same props); inkPicks.ts
    //   holds the rules: InkPicker and SecondInkPicker (R-75: the second row leaves out the primary, a primary equal to the
    //   second clears it, "Ink · {name}"), RarityPicker (STUDIO_RARITIES: RARITIES less Enchanted, filtered in the studio,
    //   "None" first, each through an aria-hidden RaritySymbol; R-74, R-83) and InkwellPicker (InkwellIcon)
    // R4-5d: cardPanel.ts holds the pure parts (StagedImage, frameState, pillCaption, stagedNote, IMAGE_ACCEPT, IMAGE_FORMATS)
    StudioCardPanel(props: {card: LorcanaCard | null; mode: StudioMode; layout: StudioLayout;
      staged: StagedImage;               // {name, error}: the controller's imageName, and the image error R-72 lets show
      current?: LorcanaCard | null;      // Edit: the card as it stands, for R-89's thumbnail and its alt; New passes none
      onImageChange: (file: File | null) => void; onRevertImage?: () => void});
    //   the preview (an aria-hidden CardTile, tabIndex -1, under the adm-file-cover pill), the caption, "See translation",
    //   Replace card image (Edit) and Revert image, the formats, the error in a polite live region, the staged note
    // R4-5e: also loadAgainNote.ts ("Loaded the card again from {branch}. …", with what it dropped; R-68)
    ReadyChecklist(props: {items: readonly ChecklistItem[]});   // a Panel "Ready to publish", "{done}/{total}"; open items muted, never red
    ChangeList(props: {rows: readonly ChangeRow[]; onDiscard: () => void; busy?: boolean});   // Discard (all) and the Image
    //   row; no per-row revert (R-77). A Panel headed changeCount(rows) (titleFocusable); rows keyed by row.id, each its
    //   label over <code>{from} → {to}</code>, never cut short; Discard ("Discard all changes") focuses the heading itself,
    //   then calls onDiscard. busy holds Discard (disabled) while a save runs: the Edit pane passes its saving
    CommitOutcome(props: {result: {commitUrl: string} | null; error: string | null; note: string; dropped?: number | null;
      onLoadAgain?: () => void; onForgetToken?: () => void; handoff?: FocusHandoff});
    //   an always-mounted <p role="status" tabIndex={-1}> (PendingTray.tsx:180-192): "Committed. View commit. {note}", or
    //   loadAgainNote({dropped}); "View commit" keeps target _blank and rel noreferrer; a failure is a Notice tone="error"
    //   with a neutral CtaButton "Load it again" (a stale refusal only), and ForgetTokenOffer on isRejectedToken (R-26);
    //   it takes the handoff once something shows
    SynergyPanel(props: {groups: SynergyGroup[]});   // a Panel "Synergies", action "computed live", round the restyled rows (R-90)
    // R4-5f: also searchStatus.ts (the status line's words), CardMarks.tsx (tags, inks, rarity glyph), src/ui/Tag.tsx
    //   (admin's one chip; RawTag and LowNTag render through it) and src/ui/cardFacts.ts (moved from cards/cardView.ts, R-61)
    EditSearch(props: {rows: readonly SearchRow[]; total: number; query: string; onQuery: (query: string) => void;
      list: {loading: boolean; error: Error | null; onRetry: () => void};
      file: {error: string | null; onRetry: () => void; onForgetToken?: () => void};
      notice?: React.ReactNode;          // a line above the field: R4-6b's missing, fileFailed and gone lines
      handoff?: FocusHandoff});
    //   the count line is an always-mounted role="status"; rows wait for the card list; a file error shows beside the
    //   rows, not in place of them, with "Read previewCards.json again" or Forget token (R-71); each row is a Link
    EditingBanner(props: {card: LorcanaCard; tag: CardTag; deployed: boolean; handoff?: FocusHandoff});
    //   h2 tabIndex -1; "View card analytics" (cardsHref, deployed cards only, R-33) and "Load a different card"
    //   (studioHref('edit')), both react-router Links with adm-link
    ReleasedCardFacts(props: {card: LorcanaCard; note: string});   // R-61's list; note from IMAGE_ONLY_NOTES
    ```
    - **Stories.** Every component gets one, under "Admin/Publish/Card studio/…" leaf titles, built from `studioFixtures.ts`. Links render under a `MemoryRouter` decorator, and nothing a story renders calls `useBlocker`.
13. **The page (R4-6a to R4-6c; R-57, R-59, R-63, R-66, R-82, R-84).**
    ```tsx
    // src/tools/studio/StudioPage.tsx (R4-6a, R4-6b): holds the page's one handoff, useFocusHandoff in R4-6a, then
    //   useStudioHandoff (src/tools/studio/useStudioHandoff.ts) from R4-6b, above both branches
    export function StudioPage();
    // No token: PageLayout title="Card studio" writes, padded, no actions, round <GithubTokenGate onSave={…} />.
    // A token: <StudioWorkspace key={token} token={token} handoff={handoff} /> (R-84)
    // src/tools/studio/StudioWorkspace.tsx (R4-6a)
    export function StudioWorkspace(props: {token: string; handoff: FocusHandoff});
    // useRevealAdmin() and useCardEditor({token, cardId}); its own PageLayout "Card studio" writes flush, with the mode
    // SegmentedControl in actions (R-57, R-91 4), documentTitle and scrollKey; the one guard (addition 4); the measured
    // root; NewRevealPane (R4-6a) or EditPane (R4-6b) in StudioSlots, in layout order (R-63). A private
    // useForgetToken({drafts, handoff}) asks first through window.confirm(forgetTokenQuestion(drafts)) (R-84)
    // src/tools/studio/studioCopy.ts (R4-6a): STUDIO_TITLE, STUDIO_SUBTITLE, publishLabel({publishing}), newRevealNote(),
    //   studioDocumentTitle({mode, card}); R4-6b adds Edit's save label and notes
    // src/shell/PageLayout.tsx (R4-6a): FLUSH_BODY gains scrollbarGutter: 'stable', so a scrollbar can't flip the layout
    //   back and forth near STUDIO_WIDE_MIN
    // src/router.tsx: R4-6a adds {path: 'studio', element: <StudioPage />}; R4-6c replaces :25-26 (and the imports at :9-10):
    {path: 'reveal', element: <Navigate to={studioHref('new')} replace />},   // R-10: old links land in the studio
    {path: 'image', element: <Navigate to={studioHref('edit')} replace />},
    // CardPageBody's 'card' case (R4-6c, R-82), through the Overview's PanelLink (overview/PanelLink.tsx:13-21), a router Link:
    headerActions={<PanelLink to={studioHref('edit', state.card.id)}>Edit in Card studio</PanelLink>}
    // the story's CtaButton (CardAnalyticsView.stories.tsx:78-81) becomes the same link
    ```
    - **Why the workspace renders the layout.** `documentTitle` names Edit card's open card, which lives in `useCardEditor` under the gate (R-84). Each branch renders exactly one `PageLayout`, so writePages' invariants hold: one `h1`, one `main`, the branch notice and the tab title.
    - **Labels and notes.**
      - **Buttons:** `Publish to ${targetBranch()}`, or "Publishing…" while it runs. `Save changes to ${targetBranch()}`, or "Saving…".
      - **New reveal's go-live note** is `goLiveNote('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.')`, as the runbook says (`REVEAL_RUNBOOK.md:34`; R-66). The old "~2-3 min" (`RevealPage.tsx:26`) goes.
      - **Edit's note** is chosen by `result.withImage`. An Edit save with an image keeps the image tool's note (`ImagePage.tsx:20`), and a fields-only save uses New's.
    - **The mode switch.** It pushes `studioHref(mode, card)`, never replaces, so Back returns to the other mode. Picking the current mode does nothing. `SegmentedControl`'s doc comment is R4-5a's (addition 3).
    - **After a New publish (R-66).** R4-6b calls R4-4d's `reloadFile()` once a New reveal publish lands (it watches `ctrl.result`), so the new card is in the search at once.
14. **`NAV_ITEMS` at the end of R4, in order:**
    ```ts
    // {id:'overview', label:'Overview', mark:'Ov', path:'/', group:'main', writes:false}
    // {id:'calibration', label:'Calibration & tuning', mark:'Ca', path:'/calibration', group:'insights', writes:true}
    // {id:'activity', label:'Vote activity', mark:'Ac', path:'/activity', group:'insights', writes:false}
    // {id:'web', label:'Web analytics', mark:'Wa', path:'/web', group:'insights', writes:false}
    // {id:'cards', label:'Card analytics', mark:'Cd', path:'/cards', group:'insights', writes:false}
    // {id:'studio', label:'Card studio', mark:'Cs', path:'/studio', group:'publish', writes:true}
    // URL contract: /studio?mode=edit&card=<id> (studioHref). No ?mode is New reveal; ?card= is the Edit card and survives
    // a mode switch. /reveal and /image redirect (replace) to studioHref('new') and studioHref('edit') (R-10).
    ```

**What R4 delivers.**
- **Card studio at `/studio`.** It replaces `/reveal` and `/image` (README §7, R-2, R-3, R-10), and the two old paths redirect into it. One page holds both drafts, guarded by one `UnsavedChangesGuard` whose wording names what a navigation would drop (R-57, R-58).
- **New reveal.** It runs on `useRevealAdmin`, `validateRevealCardForm`, `buildPreviewCard` and `commitNewCard`, and behaves as the reveal publisher does today, with these additions:
  - a ready checklist and section dots derived from the validator, with red only for filled values that fail (R-72);
  - a refusal for numbers past the set (R-73), and French in the scan languages (R-60);
  - the handoff's preview-led layout, with the card panel's caption (R-89) and the restyled synergies (R-90).
- **Edit card.** It searches every card in the card list (Core sets 9 and up), plus the cards only the branch file holds (R-66):
  - **A preview card** gets field edits plus an image in one commit, through `replaceCardInPreviewJson`. The commit keeps `variants` and every key the form doesn't hold (R-2, R-67).
  - **A released card**, or a preview entry the form can't hold, gets an image-only commit through the unchanged `commitCardImage`. It shows a facts list and its reason (R-61, R-65).
  - **Image fixes never wait on `previewCards.json`** unless the card is in set 14 (R-71).
  - **Admin#14.** This delivers its item 3 for cards: refresh to the English scan, renames included. Printings stay a hand edit (R-80).
- **Links.** "Edit in Card studio" on Card analytics (R-82), and "View card analytics" from the Editing banner (R-33).
- **Also:**
  - `/web` draws printings through `RaritySymbol`, which folds admin#32 in (R-83);
  - the shared in-flight wording (R-58);
  - runbook, skill and reveal-sync wording (R4-7).

**The reveal-sync contract (unchanged in every task).**
- `scripts/reveal-sync/web.mjs:61-74` loads `src/tools/reveal/{validateForm,buildPreviewCard,insertCardIntoPreviewJson}.ts` by path, and `web.mjs:47` loads `src/app-bridge.ts` for the season.
- `write-chain.test.mjs` and `write.test.mjs` import those three files, plus `constants.ts` (`write.test.mjs:7-10`). `adjudicate.mjs`'s `toRevealForm` (`:474`) builds forms in the current `RevealCardForm` shape, and never sets `scanLanguage`.
- So these files stay where they are, their exported signatures stay the same, and `RevealCardForm` keeps its shape. The additions R4 makes are all additive:
  - R4-3a exports `intField`, adds R-73's past-the-set refusal under `checkIdentity` (a private `collectorError`), adds French to `SCAN_LANGUAGES` and widens `ScanLanguage` to `string` (R-60).
  - The studio's Dual-ink switch and Inkable buttons are a view over `ink2` and `inkwell`, not new form state.
- **The checks.**
  - A task that touches one of those four files (R4-3a) runs `pnpm vitest run --project scripts scripts/reveal-sync`.
  - A task that edits `app-bridge.ts` (R4-5a, R4-5h, R4-4d, R4-6c, and R4-7: SR-3, a comment, where its full `scripts/reveal-sync` run covers `web.test.mjs`) runs `pnpm vitest run --project scripts scripts/reveal-sync/web.test.mjs`.
  - Other tasks skip both.
  - `pnpm build:engine` must have run once (`pnpm typecheck` runs it).

**Shared rules.** Every task follows these. A task that departs from one says so in its re-base notes.

- **States and their order.**
  - **The page.**
    - **No token:** `PageLayout title="Card studio" writes` (padded, no `flush`, no `actions`) round `GithubTokenGate`. That keeps writePages' invariants: one `h1`, one `main`, the branch notice and the tab title.
    - **A token:** `StudioWorkspace key={token}`, which renders its own `PageLayout … writes flush` (addition 13).
  - **Edit's lookup.** It follows R3's `cardPageState` order (`cardPageState.ts:33-39`), as `EditLookup` (addition 11) lists it: `listFailed`, `none`, `loading`, `missing`, `fileFailed`, `gone`, `ready`.
    - The card is found with `getCardById` during render. A `?mode=edit&card=` link that lands before the list loads reads loading, not missing. From R4-4d, an id the card list lacks also waits for the file, since only the branch file may hold it (R-66).
    - **R-71:** a card outside `REVEAL_SET_CODE` is ready (released, image-only) straight from the card list. Only set-14 cards wait for the file.
    - **R-71:** a failed file read shows beside the search, with "Read previewCards.json again", or Forget token on a 401 (R4-5f). It never takes the search's place.
  - **Writes, on both modes** (spec correction "Write states"): busy, then success (the commit link and the go-live note) or failure (an alert). Publish stays off while a publish runs, and Save while a save runs, whichever card it was made from (R4-4c).
- **Focus (R-59, with R-48).**
  - **One handoff.** The page holds one handoff: `useFocusHandoff` in R4-6a, then `useStudioHandoff` from R4-6b. Focus moves only when the control that had it unmounts, and only if focus fell to `<body>` (`useTakeHandoff`, `focusUnmoved`).
  - **Never on a click.** Link-driven changes request the handoff from state, never in a click handler: a router link's navigation renders as a transition, so a click-time request lands on the old view (R3-7). The page requests it through `useStudioHandoff` (R4-6b, `src/tools/studio/useStudioHandoff.ts`, modelled on R3's `useCardHandoff`, `CardAnalyticsPage.tsx:16-50`), which asks during `StudioPage`'s render:
    - when the URL's `card` changes, unless the navigation is a REPLACE; a move to no card asks too, since "Load a different card" unmounts with the card and the search field takes focus;
    - when the card list's Retry lands (its error clears).
  - **Reads that land.** The file's Retry ("Read previewCards.json again") and Load it again ask through `askWhenLanded` (R4-6b's `EditPane.tsx`) once their read lands, never on the click. A read that fails again asks for nothing.
  - **Plain state updates** request it in the handler: Save token (as `CalibrationPage.tsx:63-66` does) and the in-page Forget token.
  - **Writes** request it once their commit settles, landed or failed: `publish` and `save` return their promises (R4-6a, R4-4c). A button that goes disabled drops focus to `<body>` in a browser (jsdom keeps it there, so tests drop it by hand).
  - **Targets:**
    - Save token, with New reveal open and no outcome showing: the form's first control;
    - the in-page Forget token: the gate's field;
    - a new card: the Editing banner's `h2` (`tabIndex={-1}`);
    - "Load a different card", or the card going away: the search field;
    - an unknown, waiting (`fileFailed`) or gone card: the notice's line (`<p tabIndex={-1}>`, R4-5f's `notice`);
    - a Publish or Save that leaves focus on `<body>`: the outcome line, which `CommitOutcome` takes while it shows an outcome.
  - **Inside a component, with no page handoff:** Discard focuses the change list's heading before it empties the list (R4-5e, as R2's Clear all does), and Revert image focuses the remaining file control (R4-5d).
  - **The mode switch** stays mounted, so focus stays on it.
- **Keying, scroll and the tab title.**
  - **The workspace.** `StudioWorkspace` is keyed by token (R-84). Both drafts live under the gate:
    - the sidebar's Forget token drops them without asking, extending R-27's noted limit;
    - the in-page Forget token, offered on a 401 (R-26), asks first while a draft is dirty, with `window.confirm` as `TuningAside.tsx:130-136` does.
  - **Both controllers stay mounted** in `StudioWorkspace`, and only the active mode's pane renders. So a switch keeps both drafts, and resets only view state, such as the open accordion section.
  - **The Edit view** is keyed by card id (R-46).
  - **Scroll and title.** `PageLayout` gets `scrollKey={studioHref(mode, card)}`, so every mode or card change opens at the top (owner, 2026-10-07). It gets `documentTitle` "{fullName} · Card studio" (`studioDocumentTitle`, R4-6a) once an Edit card resolves, and nothing before, so a bare `/studio` reads "Card studio · Inkweave admin" (R-51).
- **The edits rule.**
  - **Edit:** `hasEdits({changes, imageName})`, from `cardEdit.ts`, is the one rule for Edit's `dirty`, its Save button, its save path (fields, or image only) and the guard. A whitespace-only edit that builds the same card is no edit.
  - **New reveal:** `dirty` is `!sameForm(form, EMPTY_FORM)` or a chosen file.
  - **After a save.** The Edit card stays open (R-70). The saved values become its new baseline, the staged image clears, and edits typed during the save survive as new changes.
- **The stale check (R-67).**
  - **One commit.** `commitCardEdit` reads `previewCards.json` at the base commit and compares only `EDITABLE_CARD_KEYS` plus `id`, `setCode` and `number` against `loaded` (JSON equality). It merges the changes into the entry as it stands there, so `variants` come from the base.
  - **Refusals.**
    - A differing entry: `StaleCardError` "Card {id} changed on {branch} since you loaded it. Load it again."
    - A missing entry: `StaleCardError` "Card {id} is no longer in previewCards.json on {branch}. Load it again."
    - `commitFiles`' race message ("… Publish again.", `githubCommit.ts:161`): Edit words it as a save, "{branch} changed while saving, so nothing was saved. Save again." (R4-4c's `failureOf`). New reveal keeps it.
  - **Messages (R-78).** An edit commits as `fix(reveals): update {fullName} ({setCode}{number})`, plus " and its image" when one goes with it. When it removes `scanLanguage`, the message is `fix(reveals): refresh {fullName} ({setCode}{number}) to its English scan`. An image-only save keeps `commitCardImage`'s message.
  - **Load it again (R-68)** keeps a changed field when the fresh entry's form still holds the value that edit started from, keeps a staged image, and says how many edits it dropped (`dropped`, null until one lands).
- **Outcomes scoped to the seed (R-69).**
  - Every re-seed bumps the draft's `seed`: a new card, a first read, or a followed re-read. Result, error and failure kind clear on each re-seed.
  - A save's outcome applies only while its seed still matches. A save that lands after the operator left the card is dropped, as R2 drops one: the guard already warned "you won't see whether it landed".
  - **Failures** are classified as `'stale'`, `'rejected-token'` (`isRejectedToken`) or `'other'`.
  - **`result.withImage`** picks Edit's go-live note.
- **Visible errors (R-72).**
  - **A blank required field** is incomplete: a neutral dot, no inline error and no `aria-invalid`. The checklist names it.
  - **Red** shows only for a filled value that fails (a malformed number, the ink-block clash, a collision, a past-the-set number, glyph words), or for a file that fails its extension or byte check.
  - **Where the rule lives.** `visibleErrors` decides it for the section dots, the fields and the closed accordion headers. For the file controls, `visibleImageError` (R4-3a) decides it, through each controller's `imageError` (`imageErrorOf`, addition 8): null until a file is chosen, then the file's own error (the upload's: unreadable bytes, or not the format its name claims), else the validator's image error. So "Upload a card image" shows only in the checklist.
  - `validateForm.ts` keeps reporting every error, unchanged.
- **Code Health.**
  - **The PR gate** requires new code at CodeScene 10, and it is stricter than the local tool:
    - cyclomatic complexity 8 or less per function, inner lambdas included;
    - at most 4 arguments;
    - under 30% primitive arguments per module (string, number, boolean and their aliases);
    - no `a || b || c` chains (Complex Conditional).
  - **How R4 keeps to them:**
    - hooks are wiring, with the branching in pure helpers in `.ts` modules, each taking one object;
    - tables over branches (`FIELD_KEYS`, `changeRows`' `LABELS`, the checklist rows, the lookup order as early returns);
    - small subcomponents.
  - **Hand counts.** Every task states its primitive count per new module (the contract blocks above give them). `githubCommit.ts` is never touched.

**Deleted in R4-6c.** Each one's tests are ported first, in the task named:
- `src/tools/reveal/RevealPage.tsx`, and `src/tools/reveal/index.ts` (a barrel: every R2 and R3 module imports directly)
- `src/tools/reveal/components/{RevealAdminForm,CardPreviewPanel}{.tsx,.stories.tsx}`
- `src/tools/reveal/__tests__/{RevealAdminForm,RevealAdminFormCardText}.test.tsx` (ported in R4-5b and R4-5c) and `CardPreviewPanel.test.tsx` (ported in R4-5d)
- `src/tools/image/{ImagePage.tsx,useImageAdmin.ts,index.ts}`
- `src/tools/image/components/{CardImagePicker,ImageComparePanel,UploadColumn}{.tsx,.stories.tsx}`
- `src/tools/image/__tests__/useImageAdmin.test.ts` (its five cases ported: three in R4-4b, two in R4-4c; its "clears the published card" case becomes "keeps the card open, clears the image", R-70) and `CardImagePicker.test.tsx` ("narrows the list as you search", ported in R4-5f; "picks a card and marks the selected one pressed" lapses, since a search row is a Link to the card's URL, which R4-5f's row tests pin)
- `src/components/ImageUploadTile{.tsx,.stories.tsx}`: only `ImageComparePanel` uses it
- from the bridge, `EMPTY_BOX` and `GOLD_GLOW`: `CardPreviewPanel.tsx:6-7` and `ImageUploadTile.tsx` are their last importers (R1-12's rule)
- `RevealAdminController.publishError`: `RevealPage.tsx:44-46` is its one reader
- `src/tools/__tests__/writePages.test.tsx`: its three cases are ported into `StudioPage.test.tsx` through `createMemoryRouter` in R4-6a, and R4-6c folds the same invariants into `router.test.tsx`'s `WRITE_PAGES` cases. They are one `h1` plus the branch notice with a token; no Forget token on the page; and the gate under the same `h1` and notice.

**Updated in R4-6c:**
- `src/router.tsx` and `router.test.tsx`:
  - `WRITE_PAGES` (`:101-106`) keeps two rows, `/studio` (R4-6a's) and `/calibration`, and `/reveal` moves to `/studio` at `:43`, `:55-56` and `:67`.
  - The redirect cases assert `router.state.location` and a REPLACE.
  - The test keeps the real token store, with no mock.
- `src/shell/AdminShell.test.tsx`: it mounts `StudioPage` at `studio` in place of `ImagePage` (`:5`, `:29`, `:50`).
- `nav.ts` (the two old items go, and `navItemFor`'s doc example moves to `/studio/`), `nav.test.ts` (`:5-6`, `:13`, `:19`, `:24` and R4-6a's studio block), `Sidebar.test.tsx` (`:33-41`, `:46`, `:53`, `:70-72`, `:81`), `Sidebar.stories.tsx:32` and `PageLayout.stories.tsx:42`.
- `useRevealAdmin.ts` and its test, R4-6a's `studioFixtures.ts` and `NewRevealPane.test.tsx`: `publishError` goes.
- The card page: `CardPageBody.tsx`'s link (R-82); `CardAnalyticsPage.test.tsx`'s stand-in view renders `headerActions`, and the test asserts the href; the story's Link.
- Comments:
  - R4-6a's `StudioPage.test.tsx` comment, and `CardAnalyticsView.tsx`'s `headerActions` doc comment (`:27`);
  - the comments R4-6c's Step 9 rewords, since they speak of a retired file or the old tool as live: `cardPanel.ts` (R4-5d), `NewRevealPane.tsx` (R4-6a), `readiness.ts` (R4-3a) and `SynergyPreviewPanel.tsx`'s doc (R4-5e), plus `studioCopy.ts` (R4-6b) if it cites `ImagePage.tsx:20`.
- `SynergyPreviewPanel.stories.tsx`: its title becomes `Admin/Publish/Card studio/Synergy rows` (R4-5e's hand-off).

**Kept:**
- **`src/tools/reveal`:**
  - the reveal-sync contract files;
  - `githubClient.ts` (with R4-1b's additions) and `useRevealAdmin.ts` (with R4-3b's);
  - the new `replaceCardInPreviewJson.ts`, `livePreview.ts` and `emptyForm.ts`;
  - `components/SynergyPreviewPanel`, restyled by R4-5e;
  - and their tests.
- **`src/tools/image`:** `filterCards.ts`, with R4-2b's apostrophe fold, and `githubClient.ts` (`commitCardImage`, unchanged), with their tests.
- **`src/components`:** `useHiddenFileInput` and `useImageUpload`, unchanged.

**Conventions.**
- **Branch.** Work on `feature/24-redesign-r4`, cut from `main` after the pin-bump PR merges (R-85). There is one PR for the phase, and every commit message ends `(#24)`.
- **The plan goes in first** (R4-0, the controller's). The first commit carries this header, the task files and these `docs/plans/R-redesign.md` edits:
  - `:17`: the Branch sentence adds `feature/24-redesign-r4` (R4).
  - `:19`: Status says R4 was detailed on 2026-10-07.
  - After the R3 decisions table (`:86`): "## Decisions for R4 (owner, 2026-10-07)", R-57 to R-91.
  - **"Corrections to the spec" (`:103-116`):**
    - R-91's four entries: the locked collector number; the staged-image notes, Edit's "New image staged ({file}). It replaces the current art when you save." and New reveal's "Scan staged ({file}). It's published with the card." (R4-5d); the width from `useContainerWidth`; the mode switch in `actions`.
    - "Card studio validation (R4)" reworded for R-72: a blank required field is incomplete, not an error.
    - "Icons (R1, R3, R4)" reworded for R-83: `InkwellIcon` is R4's one new icon, and `RaritySymbol` draws every printing, so no webp.
  - `:157`: the R4 row's last cell becomes "Below (detailed 2026-10-07)".
  - **"File structure (R1)", "Shared interfaces (R1)" and "Contract additions from the task drafts":**
    - `src/tools/studio/*` and the new `src/tools/reveal` modules;
    - `nav.ts`'s `studioHref` and `StudioMode`;
    - the guard's `to` and message function, and `writeInFlight.ts`;
    - AdminStyles' seven classes;
    - the bridge record (`:671-675`: `InkwellIcon` and `transformRawCards` added; the webps, `EMPTY_BOX` and `GOLD_GLOW` gone);
    - `NAV_ITEMS` at the end of R4;
    - "Deleted in R4".
  - `:840`: the heading becomes "## Phase R4: Card studio (detailed)".
  - `:842` becomes "[R-redesign/R4-card-studio.md](R-redesign/R4-card-studio.md): tasks R4-1a to R4-8, re-based on R3 as built and the pin bump (main @ e5e5029, pin 16283a13) on 2026-10-07. Its decisions are R-57 to R-91 above."

  - **What to copy.** Copy only this header and the 23 task files (`R4-01a-preview-json-merge.md` … `R4-08-close.md`, the ones the Tasks table links) into `docs/plans/R-redesign/`, never a file named `*.template.md`: the scratchpad also holds drafting leftovers that match `R4-*.md` (`R4-04d.template.md`, `R4-06a.template.md`). Before `git add`, check that this lists exactly those 24 files, this header (`R4-card-studio.md`, replacing the outline) and the 23 task files:
    ```bash
    ls docs/plans/R-redesign/R4-*
    ```

  After the owner approves, stage and commit in two Bash calls:
  ```bash
  git add docs/plans/R-redesign.md docs/plans/R-redesign/R4-*.md
  ```
  ```bash
  USER_APPROVED=1 git commit -m "docs(plan): settle R4's decisions and re-base its plan (#24)"
  ```
- **The task loop (gates once, owner rule).**
  1. **Step 1: check what this task builds on.** Confirm the files and exports earlier tasks produce, with a command that shows them (`git log --oneline main..HEAD`, plus an `rg` or `ls` for the names).
  2. Write the failing tests. Run `pnpm vitest run --project app <paths>` (or `--project scripts`) and see the failure the task names.
  3. Implement, then run the same command. Run the reveal-sync checks above only when the task touches a contract file or the bridge.
  4. Run `pnpm exec eslint --max-warnings 0 <the changed files>`, then `pnpm typecheck` once.
  5. **Code Health.** Run `code_health_review` on each changed source file (10, with the hand count). If a finding appears, fix it, review again, and confirm with `code_health_score`.
  6. **Commit.** `git add <the task's named paths>` is its own Bash call. Then run `pre_commit_code_health_safeguard` on the staged paths, and go on only when it passes. `USER_APPROVED=1 git commit -m "<the task's message>"` is its own unpiped Bash call, with the Bash tool, never PowerShell, and only after the owner approves.
     - The pre-commit hook runs the full lint and `test:run`: never run those in full in a step, and never pass `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers and retry.
     - Stage only the task's named paths: never `git add -A` or `git add .`.

  No task runs `pnpm build`; R4-8 does. Check a proposed block with `pnpm exec eslint --stdin --stdin-filename src/<path>`.
- **Citations.** `file:line` references are at `main @ e5e5029` and pin `16283a13`. `R4-0*.md:N` and `R4-card-studio.md:N` name the 2026-10-07 drafts: read those as task ids, since the line numbers move.

**Test isolation and fixtures.** `src/test/setup.ts` resets only the artifact cache, and `vite.config.ts` sets neither `restoreMocks` nor `unstubGlobals`. The `app` project's `vmForks` pool shares a worker across files (#35), so every file undoes what it stubs.
- **Shared fixtures.** Builders take one argument, an object except where a list is the input.
  - `src/test/revealForm.ts` (R4-3a): `revealForm(overrides?: Partial<RevealCardForm>)`, a valid Character whose number sits in Ruby's block (`RUBY_NUMBER`, from `inkBlock`), promoted from `validateForm.test.ts:9-31`. `validateForm.test.ts` imports it as `form`, so no test body there changes; the readiness tests and the form harness import it too.
  - `src/tools/studio/studioFixtures.ts`: a plain module the tests and stories share, since a story can't import a test file. R4-2a creates it, and later tasks only add exports to it (R4-4b's `listCard`, `RELEASED_SONG`, `BRANCH_ENTRIES` and `STUDIO_CARDS`; R4-4d's `BRANCH_ONLY_ENTRY`; R4-5d's `PANEL_CARD` and art URLs; R4-5e's `SYNERGY_GROUPS`; R4-6a's `revealController`).
    - **Builders:** `previewEntry(overrides?: Partial<LorcanaJSONCard>)` (a numbered, keyword-only set-14 Ruby Character that round-trips), `previewFileText(cards)` (`JSON.stringify({metadata, sets, cards}, null, 2) + '\n'`), `studioCard(seed)` (a `LorcanaCard`) and `cardOf(entry)` (the card list's card for an entry).
    - **Named entries:**
      - a dual-ink entry (the pinned file has none) and an entry with `variants`;
      - a `ja` scan, and an unlisted code (`zh`; French is listed from R-60);
      - an unnumbered entry, another set's entry, and an entry with a non-keyword ability (R-65's three cases);
      - a released card (set 9) and a name with `’`.
  - **Existing helpers:** `src/test/DeferredReader.ts`, `src/test/images.ts` (`pngFile`, `imageDataUrl`) and `src/test/base64.ts`. Import them; never copy them.
- **Mocks.**
  - **Shape.** Hoisted `vi.fn()`s, with `mockReset()` in a block-bodied `beforeEach`: Vitest 5's `clearAllMocks` keeps implementations, so a default set with `mockResolvedValue` would leak.
  - **The bridge.** Bridge mocks keep the real bridge through `importOriginal`: `validateForm.ts` and `constants.ts` read `ALL_INKS`, `inkBlock`, `REVEAL_SET_CODE` and `REVEAL_ID_BASE` from it.
  - **The card list** is R3's store (`CardAnalyticsPage.test.tsx:10-40`), so a test can move it from loading to loaded or failed.
  - **Widths.** `useContainerWidth` is mocked through the bridge for the wide and narrow cases (`WeeklyCard.test.tsx:10-16`), never with a `ResizeObserver` stub.
  - **GitHub.** GitHub calls go through the branch-free URL table (`githubClient.test.ts:10-30`), with `stubGitHub({preview, previewStatus})` taking an object (R4-1b).
- **Stubs.** `vi.unstubAllGlobals()` (fetch, FileReader), `vi.unstubAllEnvs()` (`VITE_ADMIN_TARGET_BRANCH`) and `vi.restoreAllMocks()` (`window.confirm`) run in `afterEach`, and `localStorage.clear()` too.
- **The token.** Page tests seed the real store, `localStorage['inkweave.reveal-admin.gh-token']`, as `CalibrationPage.test.tsx:19` and `AdminShell.test.tsx:40` do. Nothing mocks `useGithubToken`.
- **Routing.** A page that mounts the guard (`StudioPage`, `AdminShell` with it, `router.test.tsx`) renders under `createMemoryRouter`, never the `MemoryRouter` wrapper. Guard tests click "Stay on this page" or "Leave this page", never `window.confirm`.
- **Data.** Fetched JSON is compared with `toEqual`. Tests on `PINNED_PREVIEW_CARDS_JSON` hard-code no count or id, and guard the empty file that graduation leaves, so they never pass over no cards. R4-2a walks every pinned card, and falls back to its fixtures on an empty file. R4-1a edits the first card with `variants`, and inserts a local card when there is none: editing all 204 nears Vitest's 5 s timeout under the hook's load.

**Review focus.** The inputs most likely to bite on real data, each with a test in the task that owns it:
1. **Keys the form doesn't hold (R4-1a, R4-1b).** An edit keeps `variants`, from the base commit's entry, and a base that gained `variants` since the load still lands (R-67). The pinned-file case edits a card that has them.
2. **The empty file after graduation (2026-10-23).** It affects every test on the pinned file, the search's blank query (R-76) and the `gone` state (R4-4d).
3. **Deep links before the card list loads (R4-4b, R4-6b).** "Edit in Card studio" lands on `?mode=edit&card=` while the list loads, and must read loading, not missing.
4. **Late reads and saves (R4-4b, R4-4c).** One file's bytes are never paired with another file's name. An image staged for one card is never saved to another. A save that lands after a card change shows nothing (R-69).
5. **Focus on transitions (R4-6b).** A request made on a link's click lands on the old view, so the page requests from state.
6. **Widths (R4-6a, the rehearsal).** The wide layout needs a window of about 1600px with the sidebar open, or 1425px with it collapsed. So 1366px and 1440px screens get the accordion (R-64).

**Decided (2026-10-07).** The outline's open questions, and the audit's own, are settled in the main plan's "Decisions for R4". The owner took every recommendation, and settled R-73's scope.

| Question | Decision | Owner (also) |
|---|---|---|
| 1. Mode switch | R-57: both drafts mounted, no prompt; the switch pushes `studioHref`, in `actions` | R4-6a (R4-5a `studioHref` and `SegmentedControl`'s comment) |
| 2. Unlisted scan languages | R-60: French added; any other code named through `Intl.DisplayNames` | R4-3a (R4-2b `scanLanguages.ts`, R4-5b select) |
| 3. Released cards | R-61: a facts list, no disabled form, no synergies | R4-5f (R4-2a kind, R4-6b) |
| 4. "View card analytics" | Settled by R-33; R-82: "Edit in Card studio" added as a Link in CardPageBody | R4-5f, R4-6c |
| 5. App-repo docs | R-62: one inkweave issue after the merge, drafted in R4-8 | R4-8 |
| 6. Tab order when wide | R-63: card first in the DOM when wide, form first when narrow | R4-6a (R4-5a) |
| 7. Image-only preview cards | R-65: `editKindOf` plus `roundTrips`, fail closed, one message per case | R4-2a (R4-5f, R4-6b) |
| 8. Cards only in the branch file | R-66: in the search, tagged "not deployed yet"; `gone` after graduation; New's note says 15 to 20 minutes | R4-4d (R4-6a note, R4-6b reload) |
| (new) Guard wording | R-58: the message as a function of the held target; the shared in-flight sentence | R4-5s (R4-6a, R4-6b) |
| (new) Focus, keying, tab title | R-59: requests from state; banner `h2`; `documentTitle`; `scrollKey` | R4-6b (R4-5e, R4-5f, R4-6a) |
| (new) Wide threshold | R-64: `STUDIO_WIDE_MIN` 1328 on the content box | R4-5a |
| (new) Stale check | R-67: editable keys plus id, setCode, number; merged at the base | R4-1b |
| (new) Load it again | R-68: keeps the edits that still apply, says how many dropped | R4-4c |
| (new) Late outcomes | R-69: scoped to the seed | R4-4c (R4-4b) |
| (new) After a save | R-70: the card stays open, a departure from the image tool | R4-4c |
| (new) Image fixes and the file | R-71: only set-14 cards wait for `previewCards.json` | R4-4b (R4-5f, R4-6b) |
| (new) Errors on a blank form | R-72: incomplete, not red; `visibleErrors`, `visibleImageError` | R4-3a (R4-3b, R4-4b, R4-5b, R4-5d, R4-5e) |
| (new) Numbers past the set | R-73: refuse every number above `SET_TOTAL` | R4-3a |
| (new) Enchanted in the picker | R-74: filtered out in the studio; `RARITIES` unchanged | R4-5c |
| (new) Ink picker | R-75: the handoff's rules, admin's one selected look | R4-5c (R4-5a classes) |
| (new) Blank-query order | R-76: the branch file's cards first | R4-2b |
| (new) Per-row revert | R-77: not in R4; Discard and Revert image | R4-5e (R4-8 drafts the follow-up if wanted) |
| (new) Commit messages | R-78: update, "and its image", refresh to English | R4-1b |
| (new) Guards beyond the merge | R-79: the `scanLanguage` code check | R4-1a |
| (new) Printings and admin#14 | R-80: printings stay a hand edit; runbook :102 and :108 | R4-7 (R4-8 closes #14) |
| (new) Where `studioHref` lives | R-81: `nav.ts` | R4-5a |
| (new) "Edit in Card studio" | R-82: a Link, through `PanelLink` itself | R4-6c |
| (new) Rarity symbols, admin#32 | R-83: `RaritySymbol` everywhere; the webps go | R4-5h (R4-5c) |
| (new) Forget token and drafts | R-84: workspace keyed by token; the in-page offer asks while dirty | R4-6a (R4-5e, R4-6b) |
| (new) Pin bump | R-85: its own chore PR before R4 | the controller, before R4-0 |
| (new) The rehearsal | R-86: owner-held, before 2026-10-23 | after R4-6c (see Tasks) |
| (new) Closing admin#24 | R-87: on the owner's word, after deploy; check #14 too | R4-8 |
| (new) Retiring the handoff | R-88: the branch's last commit | R4-8 |
| (new) Card panel details | R-89: caption, pill caption, current-art thumbnail, formats | R4-5d |
| (new) Synergy panel | R-90: restyled, in a Panel "Synergies · computed live" | R4-5e |
| (new) Spec corrections | R-91: four entries in "Corrections to the spec" | the plan commit |

**Out of scope.** Drafted in R4-8 for the owner to file, only if wanted:
- per-row revert in the change list (R-77);
- a printing's English refresh, for example `variants.mjs refresh <number>` (R-80);
- drag-and-drop upload (R-89 drops "drop image" from the copy).

The app-repo docs issue (R-62) is drafted in R4-8 and filed on the owner's word. After #24 closes, these stand alone: #29, #30, #33, #34 and #37.

**Task order.** Each task leaves lint, typecheck and tests green.

| Task | Needs | Decisions | Commit |
|---|---|---|---|
| R4-1a | | R-79 | `feat(reveal): replace one preview card in previewCards.json, fail-closed (#24)` |
| R4-3a | | R-60, R-72, R-73 | `feat(studio): derive the reveal checklist and section dots from the validator (#24)` |
| R4-5a | | R-63, R-64, R-75, R-81 | `feat(studio): add studioHref, the studio's paths, layout and classes, and InkwellIcon (#24)` |
| R4-5s | | R-58 | `feat(shell): word the unsaved-changes guard for the held navigation (#24)` |
| R4-5h | | R-83 | `refactor(analytics): draw the printing symbols through RaritySymbol and drop the bridged webps (#24)`, body "Closes #32." |
| R4-1b | R4-1a | R-67, R-78 | `feat(reveal): add commitCardEdit and readPreviewCards, refusing a stale entry (#24)` |
| R4-2a | R4-1a, R4-3a | R-61, R-65 | `feat(studio): add the Edit card model (#24)` |
| R4-2b | R4-1a, R4-2a, R4-3a | R-60, R-76 | `feat(studio): add the Edit search and change rows (#24)` |
| R4-3b | R4-3a | R-72 | `feat(reveal): expose the reveal draft's image, errors and dirty state (#24)` |
| R4-4a | R4-1b | | `feat(studio): read previewCards.json from the target branch (#24)` |
| R4-4b | R4-2a, R4-2b, R4-3b, R4-4a | R-61, R-71, R-72 | `feat(studio): add the Edit card controller's loading side (#24)` |
| R4-4c | R4-1b, R4-4b | R-68, R-69, R-70 | `feat(studio): save Edit card's fields and image (#24)` |
| R4-4d | R4-2b, R4-4c | R-66 | `feat(studio): find and open cards only the branch file holds (#24)` |
| R4-5b | R4-2b, R4-3a, R4-5a | R-60, R-72, R-91 | `feat(studio): add the studio form and its accordion (#24)` |
| R4-5c | R4-5a, R4-5b | R-74, R-75, R-83 | `feat(studio): add the ink, rarity and inkwell pickers (#24)` |
| R4-5d | R4-2a, R4-3b, R4-5a | R-72, R-89 | `feat(studio): add Card studio's card panel (#24)` |
| R4-5e | R4-2a, R4-2b, R4-3a, R4-4c (checked, not imported) | R-77, R-84, R-90 | `feat(studio): add the studio aside (#24)` |
| R4-5f | R4-2a, R4-2b, R4-4d, R4-5a | R-59, R-61, R-65, R-71 | `feat(studio): add the Edit search, banner and released-card facts (#24)` |
| R4-6a | R4-3b, R4-4b, R4-4c, R4-5a to R4-5e, R4-5s | R-57, R-58, R-63, R-66, R-84 | `feat(studio): open Card studio at /studio with New reveal (#24)` |
| R4-6b | R4-4c, R4-4d, R4-5d to R4-5f, R4-6a | R-58, R-59, R-66, R-71, R-84 | `feat(studio): add Edit card to Card studio (#24)` |
| R4-6c | R4-6b | R-10, R-82 | `feat(studio): redirect /reveal and /image to Card studio and retire the old tools (#24)` |
| R4-7 | R4-6c, the rehearsal | R-80 | `docs(studio): point the runbook, skills and reveal-sync wording at Card studio (#24)` |
| R4-8 | every task | R-62, R-87, R-88 | `docs: describe Card studio as built (#24)` (CLAUDE.md, only if its Step 12 finds a gap), `docs(plan): record R4 as built (#24)`, then `chore(redesign): retire the design handoff (#24)` |

Where a task file's commit step differs from this table, the task file wins.

## Tasks

Each task lives in its own file beside this one, in build order. Every implementer task ends with a commit that leaves lint, typecheck and tests green. R4-7 and R4-8 are the controller's.

| Task | File | Delivers |
|---|---|---|
| R4-1a | [R4-01a-preview-json-merge.md](R4-01a-preview-json-merge.md) | `replaceCardInPreviewJson` and `mergeCardChanges`: one guard helper per refusal, the `scanLanguage` check (R-79), `{id, changes}`, and the pinned-file case with its post-graduation fallback |
| R4-3a | [R4-03a-readiness.md](R4-03a-readiness.md) | `readiness.ts` (checklist, `sectionStatuses`, `visibleErrors`, `visibleImageError`; R-72), `emptyForm.ts` (`EMPTY_FORM`, `sameForm`), the `intField` export, the past-the-set refusal (R-73), French and `ScanLanguage = string` (R-60) and `src/test/revealForm.ts` |
| R4-5a | [R4-05a-studio-foundations.md](R4-05a-studio-foundations.md) | `studioHref` and `StudioMode` in `nav.ts` (R-81), `studioPaths.ts`, `studioLayout.ts` (R-64, R-63's slot order), `studioStyles.ts`, the seven `adm-*` classes and their story, `SegmentedControl`'s comment (R-57) and `InkwellIcon` in the bridge |
| R4-5s | [R4-05s-guard-wording.md](R4-05s-guard-wording.md) | The guard's `to` and message function, and `writeInFlightMessage`, with `/calibration` switched and unchanged (R-58) |
| R4-5h | [R4-05h-rarity-symbols.md](R4-05h-rarity-symbols.md) | `/web`'s printings through `RaritySymbol`, and the three webps and their comment out of the bridge (R-83, admin#32) |
| R4-1b | [R4-01b-edit-client.md](R4-01b-edit-client.md) | `StaleCardError`, `readPreviewCards` and `commitCardEdit`: the stale check (R-67), the messages (R-78), and the `githubClient.test.ts` stub refactor |
| R4-2a | [R4-02a-card-edit-model.md](R4-02a-card-edit-model.md) | `cardEdit.ts`: `formFromPreviewCard`, `roundTrips`, `editKindOf` with its reasons (R-65), `cardChanges` over `FIELD_KEYS`, `validateCardEdit`, `hasEdits`; `studioFixtures.ts` |
| R4-2b | [R4-02b-edit-search.md](R4-02b-edit-search.md) | `editSearch.ts` (`previewIdsOf`, `cardTag`, `searchCards`, `SEARCH_LIMIT`; R-71, R-76), the apostrophe fold in `filterCards`, `changeRows.ts` (with `changeCount`) and `scanLanguages.ts` (R-60) |
| R4-3b | [R4-03b-reveal-controller.md](R4-03b-reveal-controller.md) | `livePreview.ts` (with `ChosenImage` and `imageErrorOf`), and the reveal controller's `imageName`, `imageDataUrl`, `uploadError`, `imageError`, `commitError` and `dirty`, with the checklist invariant tests |
| R4-4a | [R4-04a-preview-file-hook.md](R4-04a-preview-file-hook.md) | `previewCardsFile.ts` and `usePreviewCardsFile`: read numbering in state, `reloadError` (C1), `commit(entry)`, a promise-returning `reload`, and their tests |
| R4-4b | [R4-04b-editor-loading.md](R4-04b-editor-loading.md) | `editorState.ts`, and `useCardEditor`'s loading side: the lookup order, the draft and its re-seed, seed-owned image staging, preview, synergies, changes, dirty, discard and the released kind (R-71); the image tool's loading cases |
| R4-4c | [R4-04c-editor-saving.md](R4-04c-editor-saving.md) | The save side (`editSave.ts`, `useEditSave.ts`): both save paths, the seed-scoped outcome (R-69, R-70), `withImage`, the failure kinds and the race reworded as a save, Load it again keeping edits (R-68), promise-returning retry; admin#14's English-plus-rename case and the 401 cases |
| R4-4d | [R4-04d-branch-only-cards.md](R4-04d-branch-only-cards.md) | Branch-only cards (R-66): `transformRawCards` in the bridge, `branchCards.ts`, the union search list with `deployed`, their lookup, the `gone` state and `reloadFile` |
| R4-5b | [R4-05b-form-frame.md](R4-05b-form-frame.md) | `Field`, `FormSection` (accordion ARIA, status in text), the Identity, Ink & rarity (interim selects, and the Dual-ink switch), Type & stats (cost box and slider) and Card text sections, and `StudioForm` (wide 2×2, narrow accordion); `SR_ONLY` to `src/ui/layout.ts`; the ported form and card-text tests |
| R4-5c | [R4-05c-pickers.md](R4-05c-pickers.md) | `inkPicks.ts`, the ink picker (R-75), the second-ink row under R4-5b's switch, the rarity picker (R-74, R-83) and the Inkable buttons, in place of R4-5b's interim controls |
| R4-5d | [R4-05d-card-panel.md](R4-05d-card-panel.md) | `StudioCardPanel`: the preview (no Tab stop), the caption and pill (R-89), Replace card image, the staged notes, Revert image, the current-art thumbnail, image errors and focus after Revert |
| R4-5e | [R4-05e-aside.md](R4-05e-aside.md) | `ReadyChecklist`, `ChangeList` (Discard, focus; R-77), `CommitOutcome` (always-mounted status, Load it again and `loadAgainNote`, Forget token) and the restyled `SynergyPanel` (R-90) |
| R4-5f | [R4-05f-edit-entry.md](R4-05f-edit-entry.md) | `EditSearch` (per-source states, the status line, the handoff), `EditingBanner` (`h2` handoff, `cardsHref` and `studioHref` links, tag) and `ReleasedCardFacts` (R-61, R-65); `Tag` and `cardFacts` in `src/ui` |
| R4-6a | [R4-06a-studio-page.md](R4-06a-studio-page.md) | `StudioPage`: the gate inside `PageLayout writes`; `StudioWorkspace` keyed by token, rendering the page's layout, holding both controllers, the measured root and the slot order (R-63); the New reveal pane with its labels, note and outcome; the one guard with `studioUnsavedMessage`, and `forgetTokenQuestion` (R-84); the `/studio` route and nav item beside the old ones; writePages' cases ported |
| R4-6b | [R4-06b-edit-pane.md](R4-06b-edit-pane.md) | The Edit pane: the lookup states, the guard's `leaves` and wording for a card change, the URL-driven handoffs (R-59), notes chosen by `withImage`, the 401 offers (R-84), and the reload after a New publish (R-66) |
| R4-6c | [R4-06c-retire-old-routes.md](R4-06c-retire-old-routes.md) | The `/reveal` and `/image` redirects; the two nav items gone; the router, nav, Sidebar, AdminShell and PageLayout test and story sweep; the old pages, components, tests, `writePages.test.tsx` and both barrels deleted; `publishError`, `EMPTY_BOX` and `GOLD_GLOW` gone; "Edit in Card studio" (R-82); the `rg` checks |
| Owner's rehearsal | (no file; R-86) | **Owner-held, before set 14 graduates on 2026-10-23.** The owner enters the token and creates the throwaway app branch, then runs `pnpm dev` with `VITE_ADMIN_TARGET_BRANCH` set to it. The controller writes the checklist and records the results. It covers: edit a preview card that has `variants` and confirm they survive; refresh one card to English with a rename; replace a released card's image; the layout at 1366px and 1440px, sidebar open and collapsed (R-64). **New reveal (owner, 2026-10-07):** set 14 is fully revealed at the pin (204 of `SET_TOTAL` 204), so every number collides with the card list or is refused by R-73. The rehearsal checks New reveal up to the disabled Publish, its checklist naming the collision; `commitNewCard` is unchanged and covered by tests, and a live publish, with R-66's branch-only card, waits for set 15 |
| R4-7 | [R4-07-docs.md](R4-07-docs.md) | **Controller's.** The runbook (R-80's printing note, :102 and :108 at master's #728 wording), fetch-reveals SKILL.md, the reveal-sync strings and test name, `vite-env.d.ts`, `.env.example` and CLAUDE.md's tools, routes and guard lines, quoting the built UI's strings. The owner approves the uncommitted edit to the user-level scan-reveal-card skill separately |
| R4-8 | [R4-08-close.md](R4-08-close.md) | **Controller's, on R3-9's model.** Every task landed; sweeps for deleted modules, R-53 boundaries and stale names; the interfaces as built; Storybook; `pnpm build` and `check:deps` (the hooks run lint, `test:run` and typecheck); `analyze_change_set`; the parallel final review; the follow-up drafts (R-62, plus R-77 and R-80 if wanted); "R4 as built"; the handoff's retirement as the branch's last commit (R-88); push, PR and checks; after the merge, Deploy, the owner's `/studio` smoke test; #32 closes on R4-5h's keyword and is checked, and #14 and #24 are closed by hand on the owner's word (R-87) |

<!--
Cross-task critic pass (2026-10-07, 19:30): all seven items applied, none skipped.
- Item 4 (4): R4-5e already carries ChangeList's busy?: boolean (its re-base note on Discard held while a save runs, ChangeListProps), so addition 12 takes it. R4-6b's draft as of 19:31 still renders <ChangeList rows={edit.changes} onDiscard={edit.discard} /> with no busy; if its Discard item does not land, the controller drops "the Edit pane passes its saving" from addition 12, or adds busy={edit.saving} to R4-6b.
- Re-linted with pnpm exec eslint --max-warnings 0 --stdin in the repo: addition 7's readiness.ts block and addition 11's CardEditorController (exit 0 each). Additions 12 and 13 are signature sketches, not statements, so they can't be linted as written; their changes are comments and ChangeList's props, which match R4-5e's ChangeListProps.
-->

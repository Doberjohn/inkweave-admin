> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-9, 2026-10-06).** A new task. The 2026-10-01 outline had no docs step at all (audit-R3-7: "There is no docs step anywhere in R3"). R1 closed with R1-12. R2 put its CLAUDE.md edits in R2-7 and its checks under "Before the PR". What this task does, and why:
> 1. **It closes R3.** Ten tasks hand it docs edits:
>    - R3-1: the bridge record;
>    - R3-1a: the moved pieces, `DataAsOf`, `LowNTag`, `sharePercent`, `twoUp`, the focus handoff and `VoteSpan`;
>    - R3-4b: `NetworkDiagram`, `networkLayout.ts`, `LABEL_HALO` and `.adm-net-link`;
>    - R3-4c: `SplitMeter`;
>    - R3-5: `cardsHref` and `.adm-option`;
>    - R3-6a, R3-6b and R3-6c: the view's modules (`cardView.ts`, `cardStyles.ts`, `voteCharts.ts`, `engineCharts.ts`, `EnginePanels.tsx`), `Panel`'s `titleFocusable` (R3-6c), the network subtitle's forms and the focus after the Engine view's Retry;
>    - R3-7: `documentTitle`, the `NAV_ITEMS` record, `CardPageBody.tsx`, its departures from the header's sketch, and its real-data items;
>    - R3-8: `knownCards.ts` with `KnownCardsProvider`, `CardName`, the test helper `renderWithCards`, `.adm-link`, `Panel`'s `title` widened to `React.ReactNode`, and a CLAUDE.md line on card-name links.
>
>    The plan commit recorded R3's planned contract in the main plan. R3-7 writes the route lines, `CLAUDE.md:16` and `docs/PLAN.md:75`. This task checks both against the code.
> 2. **Checks first, docs last.** The real-data check can send a fix back to an owning task, and that fix can change an interface. So the docs record the code as it stands after the check. Step 3 reads the record from the exports, not from the plan text.
> 3. **Two docs commits.**
>    - `docs: describe Card analytics, the network diagram and the split meter (#24)` for CLAUDE.md, plus `docs/PLAN.md` if R3-7 left D10 alone.
>    - `docs(plan): record R3 as built (#24)` for the plan files.
> 4. **Exact anchors.** Every "Current" below is quoted from the working copy of `R-redesign.md`, which is what the plan commit (Step 0) commits, and from `CLAUDE.md` at `aea40b4`. The one exception is the Roadmap's R3 row, quoted as the plan commit leaves it: that commit changes its last cell to "Below".
>    - Each edit was applied to copies of both files, and each anchor matched exactly once.
>    - The two rows the plan commit may reword (Status and the Roadmap's R3 row) are replaced whole, whatever they say then. Both steps say so where the edit is made.
>    - So is the Routes bullet, which R3-7 edits.
> 5. **CLAUDE.md.**
>    - The kit sentence gains `NetworkDiagram`.
>    - The primitives sentence gains `SplitMeter`. R-42 keeps it out of the kit, so the chart rule needs no exception.
>    - The Routes bullet gets its final text. R3-7 adds `/cards`, and this adds `cardsHref`, what a bare `/cards` does, the card-name links through `CardName` (R3-8), and the test rule for the synergy fetch, whose cache no test can empty.
>    - One sentence names the focus handoff (R-48), and the rule R3-7 found by mutation: a router link never requests it on click. So R4's studio follows both. That sentence goes beyond this task's brief, and the owner may drop it.
> 6. **The R4 outline.**
>    - Its open question 4 is settled by R-33 (`cardsHref`).
>    - R3 ships no "Edit in Card studio" link: the R3 header says `/studio` doesn't exist yet. R4-6 still expects to move that link (`R4-card-studio.md:827`).
>    - One edit to question 4 says both. R4's own re-base does the rest.
> 7. **The real-data check.**
>    - **The items asked for:** names the `textWidth` estimate drops, the network's tie subtitle, Cards to review, the weekly bars' density over the whole span, the engine-silent split, accuracy sentiment from raw answers, and the links into `/cards`.
>    - **The R3 header adds:** the tab title, focus after a partner link, state across cards, the not-found copy on a rotated id, and the layout at 1440px and 1366px.
>    - **R3-6c and R3-7 add:** the network subtitle's two tie forms, each on a card the script finds; focus after a Voted pairs link; Retry on a failed read, for the engine panel and the card list (R-45, R-48); and Back from a card opened from the prompt, which R3-7 accepted.
>    - **Expected values** come from a script (Step 8) that works out each definition again from the files. Through `forwarded-paths.json`'s origin, it fetches the card list and the synergy files the dev server forwards.
>    - **Run on the owner's 2026-10-05 files, the script surfaced three more things:**
>      - **Repeated names.** The network prints short names, so two printings of one character print alike: "Cinderella" twice on the first card to review, and "Anna" on another. Step 10 checks that each link's accessible name still tells them apart.
>      - **Sentiment.** The Overview's accuracy sentiment and the log's raw answers disagree in sign. That feeds follow-up 2.
>      - **A third card.** The first two cards the rules pick have no accuracy answers. A third card, the one with the most answers, carries the sentiment check.
> 8. **Follow-up issues.** Step 19 drafts five issues:
>    - the R3 header's three;
>    - R3-1's flag about `RaritySymbol` and the printing webps;
>    - the "Votes" filter that R-25 deferred.
>
>    They are filed only on the owner's word, and their bodies carry no vote, voter or event counts.
> 9. **Code Health.** `analyze_change_set` runs once all the code is in (Step 6). After the push, the PR's "CodeScene Code Health Review (main)" check is the real gate. The server is stricter: R1 and R2 each failed it on files the local MCP 1.1.3 scored 10.0.
> 10. **Verified (2026-10-06):**
>     - **The script and the identity command.** Step 8's script and Step 7's identity command ran on the owner's 2026-10-05 files with network access. The identity printed `true`. The script printed every line Step 8 lists for cards A, B and C, with `identity holds: true` for each. After the review fixes (its gaps unrounded as the page prints them, one decimal on Engine → community, and the tie-form scan), it ran again, exit 0: it printed both "Tie form" lines, each with a card. No number from either run is copied into this file. The script, run as a `scripts/` module, passes `pnpm exec eslint --max-warnings 0 --stdin` against the repo's config, which a probe confirmed lints that path.
>     - **The edits.** After the review fixes, a script applied them to copies of the files:
>       - `R-redesign.md`: the working copy, with the plan commit's records applied first (the R3 header's Conventions), then Step 21's Roadmap edit;
>       - `CLAUDE.md` and `R4-card-studio.md` at `aea40b4`, with Step 20's edits.
>
>       Each "Current" and "After this line" matched exactly once. So did the anchors for D10 and `## Phase R4`. The Status line's "Current" in Step 23 is the working copy's; the plan commit rewords it, and Step 23 replaces the paragraph whatever it says. Step 21 item 1 quotes the Roadmap row as the plan commit leaves it, and replaces the whole row whatever its last cell says.
>     - **The Step 21 greps,** run on that copy after the cross-task review, print seven rows (all from the plan commit), the thirteen contract names once each, and five `Panel`, `AdminShell` and `adm-link` lines: the plan commit's `src/ui/*.tsx` row names `titleFocusable` too. Step 20's grep prints CLAUDE.md lines 15, 16 and 18.
>     - **The sweep.** Step 2's commands, run on `aea40b4`, print only the four `./focusHandoff` imports that R3-1a moves, which is why their expected output is empty after R3. The cards sweep matches `.accuracySentiment` with its dot, so the fixtures' `accuracySentiment: null` fields (`cardFixtures.ts`, R3-7's page test and `CardPageBody.stories.tsx`) don't trip it.
>     - **Step 3's class check** (`comm` against main's class names) printed exactly `.adm-link`, `.adm-net-link` and `.adm-option` when run, one at a time, against R3-8's, R3-4b's and R3-5's sandbox `AdminStyles.tsx`.
>     - **The browser snippets** parse (`node --check`). F and F-off also ran in node against a stub `fetch`: a `/data/synergies/` read rejects with "Failed to fetch", whether given a string or a `Request`, any other read passes through, and F-off restores the original. The rest can't run before the page exists, so they were written against these, and Step 9 says what to do if a selector finds nothing:
>       - R3-4b's markup: links `a.adm-net-link` in a `<ul>`, and names as `<text>` in the SVG of the same clip layer;
>       - R1-12's chart census;
>       - `Panel`'s `<section>` and `ChartFrame`'s `<figcaption>`;
>       - the header's `h2[tabindex="-1"]`.
>     - **`analyze_change_set`** on today's branch returns `{"results":[],"quality_gates":"passed"}`, the shape Step 6 reads.

### Task R3-9: Docs and the real-data check

**Files:**
- **Modify:**
  - `CLAUDE.md`:
    - `:15`, the kit and the primitives;
    - `:16`, the Routes bullet's final text, with the card-name links (R3-8);
    - `:18`, the focus handoff.
  - `docs/plans/R-redesign.md`:
    - the Status line, the Roadmap's R3 row, any record the code changed, and a new "### R3 as built".
  - `docs/plans/R-redesign/R4-card-studio.md`: open question 4.
- **Modify only if R3-7 left it:** `docs/PLAN.md`, D10 (`:75`).
- **Check, no change expected** (Step 20's greps):
  - `README.md` and `docs/REVEAL_RUNBOOK.md`, which name no admin page route;
  - `.storybook/preview.tsx`, which mounts `AdminStyles` for every story (R1-2).
- **Test:** none new. The checks are the sweep, the gates, a Storybook build and smoke run, `analyze_change_set`, and the real-data run.

**Interfaces:**
- **Consumes:** every R3 task as committed. The records come from the code (Step 3), checked against the contract additions in the R3 header and the task files. Among them:
  - `NETWORK_MAX_NODES` (12) and R3-4's order: score, then name;
  - `cardsToReview` (5 cards with at least `MIN_RULE_VOTES` score votes);
  - `activityWindow(votes, 'all')` with `bucketTitle` and `partialWeeks`;
  - `engineSilentForCard`'s split;
  - `accuracyAnswers`' sentiment;
  - `cardsHref`, `LAST_CARD_KEY` (`'inkweave-admin.last-card'`) and R-29's not-found copy;
  - R3-6c's `networkSubtitle` forms and `Panel`'s `titleFocusable`;
  - R3-8's `KnownCardsContext`, `KnownCardsProvider`, `CardName`, `PairNames`, `PairLine`, `renderWithCards`, `.adm-link` and `Panel`'s `title?: React.ReactNode`.
- **Produces:** no code. The docs edits below, the follow-up issue drafts, and the R3 PR.

- [ ] **Step 1: Confirm every R3 task landed**

Run in Git Bash:

```bash
cd /d/johnn/Projects/inkweave-admin
git branch --show-current
git status --short
git log --oneline main..HEAD
ls src/ui/DataAsOf.tsx src/ui/LowNTag.tsx src/ui/SplitMeter.tsx src/ui/layout.ts src/shell/focusHandoff.ts src/shell/knownCards.ts src/shell/KnownCardsProvider.tsx src/tools/analytics/GapScale.tsx src/tools/analytics/CardName.tsx src/test/cardLinks.tsx src/charts/networkLayout.ts src/charts/NetworkDiagram.tsx scripts/lib/__tests__/cardVotesParity.test.mjs
ls src/tools/analytics/cards
ls src/tools/analytics/calibration/focusHandoff.ts
```

Expected:
- **The branch** is `feature/24-redesign-r3`.
- **`git status`** prints nothing. The plan commit took the `R-redesign.md` edit, and no task left a file behind.
- **`git log`** lists the plan commit (`docs(plan): settle R3's decisions and re-base its plan (#24)`) and then one commit per task:
  - R3-1, R3-1a, R3-5b, R3-2, R3-3, R3-4, R3-4b, R3-4c, R3-5, R3-6a, R3-6b, R3-6c, R3-7 and R3-8;
  - any `fix(…)` commits the owner approved since.

  The messages are the task files' own, which can differ from the header's table. Map each commit to its task. If a task has no commit, stop and do that task first.
- **The first `ls`** prints its 13 paths.
- **The cards folder** lists at least these, and the view's parts that R3-6a to R3-6c named:
  - `cardFixtures.ts`, `cardStats.ts`, `cardVotes.ts`, `engineView.ts` and `useCardSynergies.ts`;
  - `lastCard.ts`, `cardSearch.ts`, `CardSwitcher.tsx` and `CardSwitcher.stories.tsx`;
  - `cardView.ts`, `cardStyles.ts`, `voteCharts.ts` and `engineCharts.ts`;
  - `CardAnalyticsView.tsx` and its stories, `RawVotePanels.tsx`, `EnginePanels.tsx`, `cardPageState.ts`, `CardPageBody.tsx` and `CardAnalyticsPage.tsx`;
  - `__tests__`.
- **The last `ls`** prints `ls: cannot access 'src/tools/analytics/calibration/focusHandoff.ts': No such file or directory`. R3-1a moved it.

- [ ] **Step 2: Sweep for names R3 dropped and for broken boundaries**

```bash
cd /d/johnn/Projects/inkweave-admin
git grep -nE "cardRoutes|cardAnalyticsPath|SplitBar|sharesOf|PrecomputedPairData|inkweave\.admin\.last-card|Loadable<|partnerSentence|getComputedTextLength|weekWindow" -- src scripts .storybook CLAUDE.md
git grep -nw StrengthTier -- src
git grep -n "focusHandoff';" -- src | grep -v "/shell/focusHandoff';"
git grep -nE "WEEKS_SHOWN|\.accuracySentiment\b|calibrationModel" -- src/tools/analytics/cards ':!src/tools/analytics/cards/cardFixtures.ts' ':!src/tools/analytics/cards/__tests__'
git grep -nE "from '\.\./(charts|tools)" -- src/ui
git grep -nE "from '(\.\./)+tools/" -- src/shell src/ui src/charts src/theme ':!*.stories.tsx' ':!*.test.ts' ':!*.test.tsx' ':!**/__tests__/**'
git grep -nE "export (function sharePercent|interface VoteSpan|function twoUp|function DataAsOf|function LowNTag)" -- src
```

Expected: the first six commands print nothing. Each name they look for is one R3 dropped, or a boundary R3 kept:
- **Dropped names:**
  - `cardRoutes.ts` and `cardAnalyticsPath` (now `nav.ts` and `lastCard.ts`);
  - the kit `SplitBar` and `sharesOf` (R-42, R-43);
  - the bridged `PrecomputedPairData` and `StrengthTier` (R-55);
  - the outline's storage key;
  - `Loadable`, `partnerSentence` (R-41) and the DOM text measurement (R-40);
  - the 12-week window (R-36);
  - a `pairs[]` sentiment (R-32): the card page reads no `.accuracySentiment`. The fixtures still fill the `accuracySentiment: null` field that `RuleStat` and `VoteAnalytics.global` require (`cardFixtures.ts`, R3-7's page test and `CardPageBody.stories.tsx`). The pattern's dot skips those fields, and the two exclusions keep fixtures and tests out of the sweep.
- **Boundaries kept:**
  - `cards/` never imports `calibrationModel.ts`, which pulls in the engine and the tuning modules.
  - No `src/ui` file imports from `src/charts` or `src/tools`.
  - No module outside stories and tests in `src/shell`, `src/ui`, `src/charts` or `src/theme` imports from `src/tools` (R-53, as the plan commit rewords it). R3-8 put `knownCards.ts` and `KnownCardsProvider.tsx` in `src/shell` and `CardName` in `src/tools/analytics` for this reason.

The last command prints exactly one line from each of these files:
- `src/ui/format.ts` (or `src/ui/share.ts`, if Step 3's known risk came true)
- `src/tools/analytics/activity/activityModel.ts`
- `src/ui/layout.ts`
- `src/ui/DataAsOf.tsx`
- `src/ui/LowNTag.tsx`

A comment that only records history ("not the outline's SplitBar") is fine. Anything else is a defect of the task that owns the file. Report it to the owner, and fix it there as its own `fix(<area>): … (#24)` commit once the owner approves.

- [ ] **Step 3: Read the interfaces as built**

```bash
cd /d/johnn/Projects/inkweave-admin
git grep -nE "^export " -- src/ui/DataAsOf.tsx src/ui/LowNTag.tsx src/ui/SplitMeter.tsx src/ui/layout.ts src/shell/focusHandoff.ts src/shell/knownCards.ts src/shell/KnownCardsProvider.tsx src/charts/networkLayout.ts src/charts/NetworkDiagram.tsx src/tools/analytics/CardName.tsx src/test/cardLinks.tsx
git grep -nE "^export (function|const) (sharePercent|cardsHref|LABEL_HALO)\b|documentTitle\?:" -- src/ui/format.ts src/shell/nav.ts src/charts/axis.ts src/shell/PageLayout.tsx
git diff --name-only --no-renames --diff-filter=M main...HEAD -- src/ui src/charts src/shell src/theme ':!*.stories.tsx' ':!*.test.ts' ':!*.test.tsx' ':!**/__tests__/**'
git diff main...HEAD -- src/ui/Panel.tsx src/tools/analytics/VoteDetailTable.tsx
git diff main...HEAD -- src/app-bridge.ts src/tools/analytics/voteLogTypes.ts
comm -13 <(git show main:src/theme/AdminStyles.tsx | grep -oE "\.adm-[a-z-]+" | sort -u) <(grep -oE "\.adm-[a-z-]+" src/theme/AdminStyles.tsx | sort -u)
```

The third command lists every existing module in `src/ui`, `src/charts`, `src/shell` and `src/theme` that R3 modified. As planned, that is eight:
- `src/ui/format.ts` (`sharePercent`, R3-1a) and `src/ui/Panel.tsx` (`titleFocusable`, R3-6c; `title?: React.ReactNode`, R3-8);
- `src/charts/axis.ts` and `src/charts/ScatterChart.tsx` (`LABEL_HALO` moves to `axis.ts`, R3-4b);
- `src/shell/nav.ts` (`cardsHref`, R3-5; the `cards` item, R3-7), `src/shell/PageLayout.tsx` (`documentTitle`, R3-7) and `src/shell/AdminShell.tsx` (`KnownCardsProvider` round the outlet, R3-8);
- `src/theme/AdminStyles.tsx` (three classes).

For each one, read `git diff main...HEAD -- <file>` and compare its exported names and props with its record in the main plan, which the plan commit wrote. A file not in this list, or a changed export the list doesn't name, needs a line in Step 21 and one under "Departures".

The last command prints the classes R3 added, one per line: `.adm-link` (R3-8), `.adm-net-link` (R3-4b) and `.adm-option` (R3-5). It compares class names rather than diff lines, because a new class that joins a selector list (the focus ring's, or reduced motion's) rewrites that line, and a diff grep would print the list's first, older class too.

Compare each export with the main plan's records ("File structure (R1)", "Shared interfaces (R1)", "Chart kit (R1-3b)" and "Contract additions from the task drafts"), which are the contract as planned.
- **If they match by name, parameters and types,** Step 21 leaves that record alone.
- **If one differs, the code wins.** Write the as-built line over the record in Step 21, and add a line under "Departures" in Step 23 that says which task changed it and why. Its commit message, or the task file's re-base notes, says why.
- **Known risk.** R3-1a's note 10 flags `format.ts`. If the server gate failed it, `sharePercent` may have moved to `src/ui/share.ts` on the owner's word. If so, record that path.

- [ ] **Step 4: Run the gates**

First make sure no preview server is running (`mcp__Claude_Browser__preview_list` is empty). The pre-commit Vitest run times out on its workers while one runs. Then:

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm check:deps
git diff --name-only main...HEAD -- .claude/hooks
```

Expected:
- `lint` exits 0 with no problems.
- `typecheck` exits 0.
- `test:run` ends with every test file and test passed, `scripts/lib/__tests__/cardVotesParity.test.mjs` among them.
- `build` ends with Vite's `✓ built in …`.
- `check:deps` prints `Dependency parity with the app: OK`.
- The last command prints nothing. R3 doesn't touch `.claude/hooks`, so `pnpm check:hooks` needn't run.

If Vitest reports "Timeout waiting for worker", stop this session's preview servers, wait for other sessions' runs to finish, and run it again.

- [ ] **Step 5: Check the stories**

Every new view has a story:

```bash
cd /d/johnn/Projects/inkweave-admin
for f in $(git diff --name-only --no-renames --diff-filter=A main...HEAD -- 'src/*.tsx' | grep -vE '\.(stories|test)\.tsx$|/__tests__/'); do
  [ -f "${f%.tsx}.stories.tsx" ] || echo "no story: $f"
done
```

Expected: the only files printed are ones whose stories live elsewhere:
- **Covered elsewhere:**
  - `src/tools/analytics/cards/CardAnalyticsPage.tsx`, a route host: the view has the stories.
  - `src/ui/DataAsOf.tsx` (`PageLayout.stories.tsx`'s read-only meta, R3-1a), and `src/ui/LowNTag.tsx` and `src/ui/SplitMeter.tsx` (`Primitives.stories.tsx`).
  - `src/charts/NetworkDiagram.tsx` (`Charts.stories.tsx`).
  - R3-8's three:
    - `src/tools/analytics/CardName.tsx`, which the `CardLinks` stories in Vote detail, Vote activity and Overview render;
    - `src/shell/KnownCardsProvider.tsx`, a provider: those stories give `KnownCardsContext` a value of their own;
    - `src/test/cardLinks.tsx`, a test helper.
- **Parts the view's stories render,** such as the card header, the KPI row and the panels.

Anything else: report it to the owner. The task that created the view owes its story.

Build Storybook once, into a git-ignored folder. The repo has no build script, and CI doesn't build Storybook:

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm exec storybook build --quiet --disable-telemetry -o node_modules/.cache/storybook-check
echo "exit=$?"
rm -rf node_modules/.cache/storybook-check
```

Expected: `exit=0`. "Failed to resolve import" or "does not provide an export named" means a story imports a moved module. The likeliest is the old `calibration/focusHandoff` or `chartData`'s `sharePercent`. Fix it in that story's task.

Then the smoke run:
1. Load the `anthropic-skills:built-in-browser` skill.
2. Start Storybook with `mcp__Claude_Browser__preview_start` `{name: "admin-storybook"}` (port 6007).
3. Navigate to `http://localhost:6007`.
4. Run this with `mcp__Claude_Browser__javascript_tool`. It is R1-12's script: it renders every story in a hidden iframe and reports any that errors or never renders.

```js
const index = await (await fetch('/index.json')).json();
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');
function check(story) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:900px';
    frame.src = `/iframe.html?id=${story.id}&viewMode=story`;
    document.body.append(frame);
    const started = Date.now();
    let shownAt = 0;
    const poll = setInterval(() => {
      const body = frame.contentDocument?.body;
      const failed = body?.classList.contains('sb-show-errordisplay');
      if (!shownAt && body?.classList.contains('sb-show-main')) shownAt = Date.now();
      // A render error can land just after the story first shows, so wait 1.5 s more.
      const settled = shownAt > 0 && Date.now() - shownAt > 1500;
      if (failed || settled || Date.now() - started > 30000) {
        clearInterval(poll);
        const message = failed ? frame.contentDocument.querySelector('#error-message')?.textContent : '';
        frame.remove();
        resolve({story: `${story.title} / ${story.name}`, status: failed ? 'error' : settled ? 'ok' : 'timeout', message});
      }
    }, 250);
  });
}
const results = [];
for (let i = 0; i < stories.length; i += 6) results.push(...(await Promise.all(stories.slice(i, i + 6).map(check))));
({stories: stories.length, problems: results.filter((r) => r.status !== 'ok')});
```

Expected: `{stories: <count>, problems: []}`. On a first run a `timeout` can come from Vite optimizing dependencies, so run it once more. A second `timeout`, or any `error`, is a defect of that story's task.

Then:
- **The sidebar's "Card analytics" node** is a plain group: View (R3-6a), Switcher (R3-5), Raw-vote panels (R3-6b), Engine panels (R3-6c) and Page states (R3-7). Open each and check that its stories open.
- **The switcher's story** has the repo's first play functions (R3-5). The smoke run doesn't see a failed play function, so open its story with the list open and check that the addon panel's "Interactions" tab reports a pass.
- **Accessibility.** List the R3 story files with `git diff --name-only --no-renames --diff-filter=A main...HEAD -- '*.stories.tsx'`. Then check these in the addon panel's "Accessibility" tab, as R1-12 Step 13 does:
  - the first story of each listed file;
  - every network story in `Charts.stories.tsx`;
  - `SplitMeters` and `Tags` in `Primitives.stories.tsx`;
  - the three `CardLinks` stories R3-8 adds to existing files (Vote detail, Vote activity and Overview), where the `link-in-text-block` rule checks `.adm-link`'s underline.

  Expected: 0 violations. Report any rule id with the story's name.
- **Stop Storybook:** `mcp__Claude_Browser__preview_list`, then `mcp__Claude_Browser__preview_stop`.

- [ ] **Step 6: Check Code Health across the branch**

Load the tool with ToolSearch (`select:mcp__codescene__analyze_change_set`), then call it with `{base_ref: "main", git_repository_path: "D:\\johnn\\Projects\\inkweave-admin"}`. It reviews committed files only, so run it after the last code commit.

Expected:
- `"quality_gates":"passed"`.
- No entry in `results` with `"verdict":"degraded"`.
- No finding on any file R3 added.

The PR gate wants new code at 10. A finding on a new file fails it even when the file has no "before".

If a file is flagged, report it to the owner with its findings. Fix it in the owning task's files as its own `fix(<area>): … (#24)` commit, approved like any other, then rerun Step 4 and this step.

The files most likely to be flagged:
- **`format.ts` and `activityModel.ts`** for their share of primitive arguments. `format.ts` grew to 10 parameters; `activityModel.ts` sits at 28.6% against a 30% limit (R3-1a, note 10).
- **The view's bigger parts**, for complexity. The limit is cyclomatic complexity 8.

A pass here is not proof. The server gate failed R1 and R2 on files this tool passed, so Step 25 reads the PR's own check.

- [ ] **Step 7: Prepare the real data (the owner's files)**

```bash
cd /d/johnn/Projects/inkweave-admin
ls -la public/admin-data/
node -e "for (const f of ['vote-analytics.json', 'vote-log.json', 'vercel-analytics.json']) { const d = JSON.parse(require('fs').readFileSync('public/admin-data/' + f, 'utf8')); console.log(f, 'generated', d.generatedAt); }"
git check-ignore -v public/admin-data/vote-log.json
```

Expected:
- `ls` shows the three files.
- `node` prints a `generated` timestamp for each, normally all from one Deploy run.
- `check-ignore` prints a line ending in `public/admin-data/	public/admin-data/vote-log.json`.

If a file is missing, or `JSON.parse` throws `Unexpected token '<'` (a saved login page), ask the owner to follow "Seeing R1 with real data locally". Signed in to `https://inkweave-admin.vercel.app`, they save the three `/admin-data/` files into `public/admin-data/`. Never sign in to Vercel yourself.

Then the histogram identity from the R3 header. It prints one boolean and never a count:

```bash
cd /d/johnn/Projects/inkweave-admin
node --input-type=module -e "import fs from 'node:fs'; const read = (f) => JSON.parse(fs.readFileSync('public/admin-data/' + f, 'utf8')); const {pairs} = read('vote-analytics.json'); const {votes} = read('vote-log.json'); const key = (a, b) => (a < b ? a + ':' + b : b + ':' + a); const scored = new Map(); for (const v of votes) if (v.score != null) scored.set(key(v.a, v.b), (scored.get(key(v.a, v.b)) ?? 0) + 1); console.log('every pairs[] row has exactly its score votes in the log:', pairs.every((p) => scored.get(key(p.a, p.b)) === p.scoreVotes));"
```

Expected: `… in the log: true`. It printed `true` on the 2026-10-05 files.

`false` can mean a vote landed between the precompute's two reads. `precompute-vote-analytics.mjs:127` reads `pair_scores`, then `:131` reads the votes, so one pair can be off by a vote (R3-3). If it prints `false`, ask the owner for a newer Deploy's files before calling it a defect. If it fails again on them, it is a defect of R3-3, whose parity test should have caught it.

- [ ] **Step 8: Work out the numbers the page must show**

This prints to the local terminal only. Never paste its numbers into a commit, the PR or an issue.

The script works out each R3 definition again, independently of the code:
- the calibration side from `pairs[]` (R3-2);
- the raw side from the vote log (R3-3);
- the engine side from each card's synergy file (R3-4, R-37).

The card list comes from the app's own `/data/allCards.json` and `/data/previewCards.json`, through `forwarded-paths.json`'s origin, the files the dev server forwards. It keeps Core cards only (set 9 and up, as `loader.ts:194-198` does), so it needs network access. It approximates the page's list: the engine's `transformCard` can drop a malformed card, so a count off by one on "outside the card list" is worth a look before calling it a bug.

It picks three cards by rule:
- **Card A:** the first card to review.
- **Card B:** the Core card with the most engine-silent pairs, among those with both kinds (R-31).
- **Card C:** the Core card with the most accuracy answers (R-32).

It also picks:
- **two tie-form cards** for the network subtitle (R3-6c, note 4): the first listed card whose drawn twelve all share the cut's score (`tied > shown` with `shown === 12`), and the first whose tie at the cut sits below stronger partners (`tied > shown` with `shown < 12`). It reads the listed cards' synergy files eight at a time and stops once it has both, or after 400 cards;
- **the numeric voted id outside the card list** with the most votes, for the not-found check.

It prints numbers as the page does. Gaps are unrounded, through the same two places and U+2212 as `fmtGap`; the headline's band reads the gap at `verdictGap`'s rounding; Engine → community has one decimal, as `fmtScore` prints it; and counts group their digits, as `fmtInt` does.

```bash
cd /d/johnn/Projects/inkweave-admin
node --input-type=module <<'EOF'
import {readFileSync} from 'node:fs';

const ORIGIN = JSON.parse(readFileSync('forwarded-paths.json', 'utf8')).origin;
const readJson = (file) => JSON.parse(readFileSync(`public/admin-data/${file}`, 'utf8'));
async function getJson(path) {
  const res = await fetch(ORIGIN + path);
  const json = res.ok && (res.headers.get('content-type') ?? '').includes('application/json');
  return json ? res.json() : null;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (day) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
const int = (n) => n.toLocaleString('en-US');
const signed = (n) => {
  if (n == null) return '—';
  const text = Math.abs(n).toFixed(2);
  return Number(text) === 0 ? text : `${n < 0 ? '\u2212' : '+'}${text}`;
};
const share = (f) => (f > 0 && f < 0.005 ? '<1%' : f < 1 && f >= 0.995 ? '>99%' : `${Math.round(f * 100)}%`);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const weekStart = (day) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
const collator = new Intl.Collator('en');
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const va = readJson('vote-analytics.json');
const log = readJson('vote-log.json');
const [all, preview] = await Promise.all([getJson('/data/allCards.json'), getJson('/data/previewCards.json')]);
const primaryIds = new Set((all?.cards ?? []).map((c) => String(c.id)));
const listed = new Map();
for (const c of [...(all?.cards ?? []), ...(preview?.cards ?? []).filter((p) => !primaryIds.has(String(p.id)))]) {
  if (Number(c.setCode) >= 9) listed.set(String(c.id), c);
}
if (listed.size === 0) throw new Error(`No card list from ${ORIGIN}: check the network`);
const nameOf = (id) => listed.get(id)?.fullName ?? id;
console.log(`Files: vote analytics ${va.generatedAt.slice(0, 10)}, vote log ${log.generatedAt.slice(0, 10)}; card list ${listed.size} Core cards`);

// Calibration side (pairs[]), per card, as cardStats.ts computes it.
const byCard = new Map();
for (const p of va.pairs) {
  for (const [id, name] of [[p.a, p.aName], [p.b, p.bName]]) {
    const entry = byCard.get(id) ?? {id, name, pairs: []};
    entry.pairs.push(p);
    byCard.set(id, entry);
  }
}
function calibration(pairs) {
  const votes = pairs.reduce((n, p) => n + p.scoreVotes, 0);
  const mean = (f) => (votes === 0 ? null : pairs.reduce((s, p) => s + f(p) * p.scoreVotes, 0) / votes);
  return {pairs: pairs.length, votes, gap: mean((p) => p.gap), engine: mean((p) => p.engineScore), community: mean((p) => p.communityScore)};
}
const review = [...byCard.values()]
  .map((c) => ({...c, cal: calibration(c.pairs)}))
  .filter((c) => c.cal.votes >= 10)
  .sort((x, y) => Math.abs(y.cal.gap) - Math.abs(x.cal.gap) || y.cal.votes - x.cal.votes || x.name.localeCompare(y.name))
  .slice(0, 5);
console.log(`Cards to review: ${review.map((c) => `${c.name} ${signed(c.cal.gap)} (${int(c.cal.votes)})`).join(' | ')}`);

// Raw side (vote-log.json), per card, as cardVotes.ts computes it.
const inPairs = new Set(va.pairs.map((p) => pairKey(p.a, p.b)));
function rawFor(id) {
  const votes = log.votes.filter((v) => v.a === id || v.b === id);
  const scored = votes.filter((v) => v.score != null);
  const silent = new Map();
  for (const v of scored) {
    const partner = v.a === id ? v.b : v.a;
    if (!inPairs.has(pairKey(v.a, v.b))) silent.set(partner, (silent.get(partner) ?? 0) + 1);
  }
  const unlisted = [...silent.keys()].filter((partner) => !listed.has(partner)).length;
  const answers = votes.map((v) => v.accuracy).filter((a) => a != null);
  const tally = (n) => answers.filter((a) => a === n).length;
  return {
    votes: votes.length, scored: scored.length, voters: new Set(votes.map((v) => v.voter)).size,
    silentPairs: silent.size, unlisted, silentVotes: [...silent.values()].reduce((s, n) => s + n, 0),
    tooHigh: tally(-1), right: tally(0), tooLow: tally(1), answered: answers.length,
    weeks: new Set(votes.map((v) => weekStart(v.ts.slice(0, 10)))),
  };
}
const days = log.votes.map((v) => v.ts.slice(0, 10)).sort();
const [firstDay, lastDay] = [days[0], days.at(-1)];
const weeks = Math.round((Date.parse(weekStart(lastDay)) - Date.parse(weekStart(firstDay))) / 604_800_000) + 1;
const partFirst = weekStart(firstDay) !== firstDay;
const partLast = addDays(weekStart(lastDay), 6) !== lastDay;
console.log(`Votes per week (every card): ${weeks} bars, weeks of ${fmtDay(weekStart(firstDay))} to ${fmtDay(weekStart(lastDay))}; first week ${partFirst ? 'partial' : 'whole'}, last week ${partLast ? 'partial' : 'whole'}`);

// Engine side (the card's synergy file), as engineView.ts orders it (R-37).
const scoreText = (score) => (Number.isInteger(score) ? String(score) : score.toFixed(1));
// The tie at the cut (R3-4's tieAtCut) in the subtitle form R3-6c gives it.
function tieForm(partners, drawn) {
  const last = drawn.at(-1);
  const tied = last ? partners.filter((p) => p.score === last.score).length : 0;
  const shown = last ? drawn.filter((p) => p.score === last.score).length : 0;
  if (partners.length <= 12 || tied === shown) return {form: 'none', text: 'no tie clause'};
  const tie = `${shown} of the ${tied} partners at score ${scoreText(last.score)}`;
  if (shown === 12) return {form: 'allTied', text: `every drawn partner tied: "${tie}, by name, of …", with no "Thicker spokes score higher."`};
  return {form: 'belowTop', text: `a tie below stronger partners: "${tie} make the cut, by name."`};
}
async function engineFor(id) {
  const data = await getJson(`/data/synergies/${id}.json`);
  if (!data) return null;
  const partners = Object.entries(data.pairs)
    .map(([pid, pair]) => ({id: pid, score: pair.aggregateScore, name: nameOf(pid), label: listed.get(pid)?.name ?? pid}))
    .sort((x, y) => y.score - x.score || collator.compare(x.name, y.name) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const capped = data.groups.some((g) => g.synergies.length >= 100);
  const drawn = partners.slice(0, 12);
  return {partners: partners.length, capped, tie: tieForm(partners, drawn), drawn: drawn.map((p) => p.label)};
}

async function report(label, id) {
  const cal = calibration(byCard.get(id)?.pairs ?? []);
  const raw = rawFor(id);
  // verdictGap's rounding (R3-2): the headline's band reads the gap as fmtGap prints it.
  const gap = cal.gap == null ? null : Math.sign(cal.gap) * Number(Math.abs(cal.gap).toFixed(2));
  console.log(`\n${label}: /cards/${id} ${nameOf(id)}`);
  console.log(`  KPIs: Score votes ${int(cal.votes)} | Pairs voted ${int(cal.pairs)} | Mean gap ${signed(cal.gap)}${cal.votes >= 10 ? '' : ' (low n)'} | Engine → community ${cal.engine?.toFixed(1) ?? '—'} → ${cal.community?.toFixed(1) ?? '—'}`);
  const phrase = gap == null || cal.votes < 10 ? null : Math.abs(gap) < 0.5 ? 'is well-calibrated' : gap < 0 ? 'runs generous' : 'runs harsh';
  console.log(`  Headline: ${phrase ? `The engine ${phrase} on this card` : 'The engine has too few score votes to judge this card'}`);
  const sentiment = raw.answered ? (raw.tooLow - raw.tooHigh) / raw.answered : null;
  console.log(`  Raw: ${int(raw.votes)} votes (${int(raw.scored)} scored) | Distinct voters ${int(raw.voters)} | Accuracy sentiment ${signed(sentiment)} over ${int(raw.answered)} answers`);
  if (raw.answered) console.log(`  How voters answered: Too high ${share(raw.tooHigh / raw.answered)} (${int(raw.tooHigh)}) | Right ${share(raw.right / raw.answered)} (${int(raw.right)}) | Too low ${share(raw.tooLow / raw.answered)} (${int(raw.tooLow)})`);
  console.log(`  Engine-silent: ${int(raw.silentPairs)} pairs: ${int(raw.unlisted)} with a partner outside the card list, ${int(raw.silentPairs - raw.unlisted)} with both cards in Core | identity holds: ${raw.scored === cal.votes + raw.silentVotes}`);
  console.log(`  Votes per week: ${raw.weeks.size} of the ${weeks} weeks have a vote`);
  const engine = await engineFor(id);
  if (!engine) return console.log('  Engine: no synergy file (the page shows its empty state)');
  const more = engine.partners > 12 ? `, "and ${engine.partners - 12} more in the table"` : '';
  console.log(`  Engine: ${engine.partners} partners${engine.capped ? ' (capped: "At least")' : ''}${more} | subtitle: ${engine.tie.text}`);
  console.log(`  Network, strongest first: ${engine.drawn.join(' | ')}`);
  const twice = [...new Set(engine.drawn.filter((name, i) => engine.drawn.indexOf(name) !== i))];
  if (twice.length) console.log(`  Drawn names printed twice (two printings): ${twice.join(', ')}`);
}

const silentCore = [...listed.keys()]
  .map((id) => ({id, raw: rawFor(id)}))
  .filter(({raw}) => raw.unlisted > 0 && raw.silentPairs > raw.unlisted)
  .sort((x, y) => y.raw.silentPairs - x.raw.silentPairs || (x.id < y.id ? -1 : 1));
const rotated = [...new Set(log.votes.flatMap((v) => [v.a, v.b]))]
  .filter((id) => !listed.has(id) && /^\d+$/.test(id))
  .map((id) => ({id, n: log.votes.filter((v) => v.a === id || v.b === id).length}))
  .sort((x, y) => y.n - x.n || (x.id < y.id ? -1 : 1));

if (review[0]) await report('Card A (first to review)', review[0].id);
if (silentCore[0]) await report('Card B (engine-silent of both kinds)', silentCore[0].id);
const answering = [...listed.keys()]
  .map((id) => ({id, n: rawFor(id).answered}))
  .filter(({n}) => n > 0)
  .sort((x, y) => y.n - x.n || (x.id < y.id ? -1 : 1));
if (answering[0]) await report('Card C (most accuracy answers)', answering[0].id);

// One card of each tie form, for the subtitle check (R3-6c): the listed cards' synergy files, eight at a time.
async function findTieForms(limit) {
  const found = {};
  const ids = [...listed.keys()].slice(0, limit);
  for (let i = 0; i < ids.length && !(found.allTied && found.belowTop); i += 8) {
    const batch = await Promise.all(ids.slice(i, i + 8).map(async (id) => ({id, engine: await engineFor(id)})));
    for (const {id, engine} of batch) {
      if (engine && engine.tie.form !== 'none') found[engine.tie.form] ??= {id, engine};
    }
  }
  return found;
}
const forms = await findTieForms(400);
console.log('');
for (const [form, label] of [['allTied', 'Tie form, every drawn partner tied'], ['belowTop', 'Tie form, a tie below stronger partners']]) {
  const hit = forms[form];
  console.log(hit ? `${label}: /cards/${hit.id} ${nameOf(hit.id)} | subtitle: ${hit.engine.tie.text}` : `${label}: none among the first 400 listed cards`);
}
console.log(`\nRotated id (not-found check): /cards/${rotated[0]?.id ?? '—'}`);
const answered = log.votes.filter((v) => v.accuracy != null);
const logSentiment = answered.length ? answered.reduce((s, v) => s + v.accuracy, 0) / answered.length : null;
console.log(`Overview accuracy sentiment ${signed(va.global.accuracySentiment)} (pairs[]) vs the log's raw answers ${signed(logSentiment)}`);
EOF
```

Expected, line by line:
- **`Files:`** gives the two files' dates. "Card list" is the Core card count, not zero.
- **`Cards to review:`** lists five cards, widest gap first (R-28; Step 9): the name and the mean gap the page shows, and in brackets the score votes, which only break ties in the order. The page's rows don't show them.
- **`Votes per week (every card):`** gives the bar count of the whole log's span and whether its end weeks are partial (R-36; Step 10).
- **For cards A, B and C:**
  - `KPIs:`, `Headline:` (R-50's phrase, or the low-n headline) and `Raw:`;
  - `How voters answered:`, when the card has accuracy answers;
  - `Engine-silent:` with its two halves (R-31), and `identity holds: true`;
  - `Votes per week:`, the weeks with a vote;
  - `Engine:`: partners, "At least" when capped, "and K more in the table", and the subtitle's tie form (R-37): "no tie clause", "every drawn partner tied" or "a tie below stronger partners", with the words the subtitle gives it;
  - `Network, strongest first:`, the twelve short names in drawing order;
  - `Drawn names printed twice`, when two printings share a name.
- **The two `Tie form` lines,** each with a card and its subtitle words, for Step 11. "none among the first 400 listed cards" means the files hold no such card: record that form as not seen on real data.
- **`Rotated id`**, for Step 15.
- **The Overview's sentiment** (from `pairs[]`) against the log's raw answers (Step 12, follow-up 2).

Keep the output open for Steps 9 to 16. If `identity holds` prints `false` for a card, see Step 7.

- [ ] **Step 9: Start the dev server, and check the first visit and Cards to review**

Start the server with `mcp__Claude_Browser__preview_start` `{name: "admin-dev"}` (port 5180). If 5180 is taken by the owner's own `pnpm dev`, use that server. If another session runs reveal-sync in this repo, an EBUSY on `.reveal-sync-convert/` can kill the server. Read `preview_logs`, then restart it.

The checks use these snippets, each run with `mcp__Claude_Browser__javascript_tool`. Each returns plain values. A snippet that declares a `const` can fail on a second run in the same page with "has already been declared". If it does, wrap it in braces (`{ … }`) or reload the page first.

**P (the page):**

```js
({
  path: location.pathname,
  title: document.title,
  h1: document.querySelector('h1')?.textContent,
  card: document.querySelector('main h2[tabindex="-1"]')?.textContent ?? null,
  focused: `${document.activeElement?.tagName} ${document.activeElement?.textContent?.trim().slice(0, 60) ?? ''}`,
  current: document.querySelector('a[aria-current="page"]')?.getAttribute('href'),
  meta: document.body.innerText.match(/Data as of\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null,
  branchNotice: document.body.innerText.includes('Writes to Doberjohn/inkweave'),
  lastCard: localStorage.getItem('inkweave-admin.last-card'),
  kpis: [...document.querySelectorAll('section[aria-label="Key figures"] > *')].map((el) => el.innerText.replace(/\s*\n+\s*/g, ' | ')),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
});
```

**N (the network's census):** links, printed names, the names left out, and link names that repeat:

```js
const first = document.querySelector('a.adm-net-link');
const figure = first?.closest('figure');
const plot = first?.closest('ul')?.parentElement;
const links = [...(plot?.querySelectorAll('a.adm-net-link') ?? [])].map((a) => a.getAttribute('aria-label') ?? '');
const printed = [...(plot?.querySelectorAll('svg text') ?? [])].map((t) => t.textContent);
let next = 0;
const dropped = [];
for (const name of links) {
  if (next < printed.length && name.startsWith(printed[next])) next += 1;
  else dropped.push(name.split(': ')[0]);
}
const titles = links.map((name) => name.split(': ')[0]);
({
  heading: figure?.querySelector('figcaption')?.innerText.split('\n').slice(0, 2),
  plotWidth: Math.round(plot?.getBoundingClientRect().width ?? 0),
  links: links.length,
  printed: printed.length,
  dropped,
  sameTitle: titles.filter((title, i) => titles.indexOf(title) !== i),
  more: figure?.innerText.match(/and [\d,]+ more in the table/)?.[0] ?? null,
  firstLink: links[0] ?? null,
});
```

**W (Votes per week):**

```js
const fig = [...document.querySelectorAll('figure')].find((f) => f.querySelector('figcaption')?.innerText.startsWith('Votes per week'));
const slider = fig?.querySelector('[role="slider"]');
const bars = slider ? Number(slider.getAttribute('aria-valuemax')) - Number(slider.getAttribute('aria-valuemin')) + 1 : 0;
const svgWidth = fig?.querySelector('svg')?.getBoundingClientRect().width ?? 0;
({
  heading: fig?.querySelector('figcaption')?.innerText.split('\n').slice(0, 2),
  bars,
  svgWidth: Math.round(svgWidth),
  pitch: bars ? Math.round(((svgWidth - 48) / bars) * 10) / 10 : null,
  xLabels: [...(fig?.querySelectorAll('svg text') ?? [])].map((t) => t.textContent).filter((s) => /^[A-Z][a-z]{2} \d/.test(s)),
  now: slider?.getAttribute('aria-valuetext') ?? null,
  tableRows: fig?.querySelectorAll('tbody tr').length ?? 0,
});
```

**R (Cards to review):** each row's text (its name and its mean gap; R3-7's `ReviewRow`) and its link:

```js
({
  path: location.pathname,
  prompt: document.body.innerText.includes('Pick a card'),
  review: [...document.querySelectorAll('main a[href^="/cards/"]')].map((a) => `${(a.closest('li') ?? a).innerText.replace(/\s*\n+\s*/g, ' · ')} -> ${a.getAttribute('href')}`),
});
```

**L (links into `/cards`, each checked against the card list):**

```js
const all = await (await fetch('/data/allCards.json')).json();
const preview = await fetch('/data/previewCards.json').then((r) => r.json()).catch(() => ({cards: []}));
const listed = new Set([...all.cards, ...(preview.cards ?? [])].filter((c) => Number(c.setCode) >= 9).map((c) => String(c.id)));
const links = [...document.querySelectorAll('main a[href^="/cards/"]')];
const ids = links.map((a) => decodeURIComponent(a.getAttribute('href').slice('/cards/'.length)));
({
  path: location.pathname,
  links: links.length,
  unresolved: ids.filter((id) => !listed.has(id)),
  bareNumbers: links.filter((a) => /^\d+$/.test(a.textContent.trim())).length,
  sample: links.slice(0, 3).map((a) => `${a.textContent.trim()} -> ${a.getAttribute('href')}`),
});
```

**G (where each panel sits):**

```js
[...document.querySelectorAll('main section')]
  .filter((section) => section.parentElement?.closest('main section') == null)
  .map((section) => {
    const box = section.getBoundingClientRect();
    const name = section.getAttribute('aria-label') ?? section.querySelector('h2, h3')?.textContent.trim().slice(0, 32);
    return `${name}: x ${Math.round(box.left)}, y ${Math.round(box.top + scrollY)}, w ${Math.round(box.width)}`;
  });
```

**V (each frame's pressed view):**

```js
[...document.querySelectorAll('figure')].map((figure) => {
  const title = figure.querySelector('figcaption')?.innerText.split('\n')[0];
  const pressed = [...figure.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.textContent.trim());
  return `${title}: ${pressed.join(', ')}`;
});
```

**F (make the synergy reads fail, for Retry):** the page's `fetchCardSynergies` calls the global `fetch` each time, so this makes every read of `/data/synergies/` fail until **F-off** restores it. It changes nothing else, and a reload undoes it.

```js
window.__realFetch ??= window.fetch;
window.fetch = (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  return url.includes('/data/synergies/') ? Promise.reject(new TypeError('Failed to fetch')) : window.__realFetch(input, init);
};
'synergy reads fail until F-off';
```

**F-off:**

```js
window.fetch = window.__realFetch ?? window.fetch;
'fetch restored';
```

If a snippet finds nothing (`links: 0`, `bars: 0`, `review: []`) on a page that plainly shows the thing, the markup differs from what R3-4b and R3-6 planned. Read the element with `read_page`, adjust the selector, and note it for the as-built record. Don't call it a defect yet.

**The first visit.**
1. Navigate to `http://localhost:5180/`.
2. Clear the last card with `localStorage.removeItem('inkweave-admin.last-card')`. Touch only this key: never read or change the token's.
3. Click the sidebar's "Card analytics" (`find`, then `left_click`).
4. Run P and R.

Expected:
- `path: '/cards'`, `h1: 'Card analytics'`, `title: 'Card analytics · Inkweave admin'`, `current: '/cards'` and `branchNotice: false`.
- `prompt: true`.
- `review` lists Step 8's five "Cards to review", in that order. Each row reads the card's name, then its mean gap with U+2212 for negatives, and links to `/cards/<id>`. R3-7's row has no score votes: the bias bar sits between the two.
- `meta` is the vote analytics date from Step 8's first line, once vote analytics has loaded.
- A screenshot shows the prompt above the list.

**Following a link.** Click the first card in the list (`find` its name, then `left_click`), and run P. Expected:
- `path: '/cards/<card A's id>'`.
- `card` holds card A's name and version.
- `title` is "{card A's full name} · Card analytics · Inkweave admin" (R-51).
- `focused` starts with `H2` (R-48): the link unmounted with the prompt, so the header took focus.
- `lastCard` is card A's id.

**Back from a card opened from the prompt (accepted).** Run `navigate` with `"back"`, then P. Expected: `path` is still `/cards/<card A's id>`. Back lands on the bare `/cards` entry, which now redirects (REPLACE) to the card just remembered. Run `navigate` with `"back"` once more, then P. Expected: `path: '/'`. R3-7 accepted this double step ("History duplicates, accepted", from R-28's "last viewed" default). Record it for the owner, not as a defect. If the first Back shows the prompt instead, the redirect didn't run: that is a defect of R3-7.

**The redirect.** Navigate to `http://localhost:5180/cards`, which is a full reload, and run P. Expected: `path: '/cards/<card A's id>'`, the last card viewed.

- [ ] **Step 10: Card A: KPIs, the rules, the network and the weekly bars**

On card A's page, run P, then `get_page_text`. Compare with Step 8's card A lines:
- **The KPIs.** Score votes, Pairs voted, Mean gap and Engine → community match to the precision shown. Negatives carry U+2212. Distinct voters and Accuracy sentiment each wear the `raw` tag. When Step 8's `Raw:` line for card A ends "over 0 answers", as it did on the 2026-10-05 files, Accuracy sentiment reads "—".
- **The headline** is Step 8's `Headline:`, word for word.
- **The read line and the gap scale.** A screenshot shows the dot at the gap's side of the track.
- **The rules table.** Rules under 10 score votes carry "low n" and sort last (R-35).

Run this to read the rules' links:

```js
[...document.querySelectorAll('main a[href^="/calibration?rule="]')].map((a) => `${a.textContent.trim()} -> ${a.getAttribute('href')}`);
```

Expected: one link per rule row, each to `/calibration?rule=<ruleId>` (R-34). Click the first one. `/calibration` opens with that rule's row pressed and the sidebar marking "Calibration & tuning". Then navigate back.

**The network** (R-37 to R-41). Run N. Expected:
- **`links`** is 12, and **`more`** is Step 8's "and K more in the table".
- **`heading`'s second line** is the subtitle. When Step 8 printed a tie, the subtitle holds its three numbers: shown, of the tied, at the score ("12 of the 30 partners at score 8, by name" is R-37's example). With "no tie clause", it has none.
- **The names.** The printed names, in order, are Step 8's twelve short names less the `dropped` ones.
- **`dropped`.** Record it. R3-4b's probe printed all twelve names from a 480px plot up, so at this desktop width expect `[]`. A dropped name here is for the owner (R-40). The fallback is DOM measurement, which R-40 rejected.
- **`sameTitle`** is `[]`. If Step 8 printed "Drawn names printed twice", then two links show the same short name. Their accessible names must still differ, by the full name in the tooltip's title.

  If they repeat, a screen reader hears two identical links. That is a defect of R3-6c's partner nodes: the tooltip title should be the full name. Report it.
- **Hover the first node** (`hover` on its dot). A zoom shows the tooltip, the other spokes dimmed, and its name in the text colour. Hovering the page title clears it.
- **"and K more in the table"** opens the table view and focuses the table (`document.activeElement.tagName` is `TABLE`). It has one row per partner, strongest first and in name order within each score. Its first twelve rows are the twelve drawn partners. Switch back to Chart.

**The weekly bars** (R-36). Run W. Expected:
- `bars` equals Step 8's "Votes per week (every card)" count.
- `heading`'s subtitle names the part weeks as `partialWeeks` words them (", first and last weeks partial" when both ends are partial).
- Record `pitch`, the plot's pixels per bar. Votes per week runs at full width, under the `twoUp(376)` row that Community scores and How voters answered share (R3-6b). At 1440px its SVG is about 1,094px wide (the 1,136px column less the panel's border and padding), which gives about 35px a bar over a 30-week span; at 1366px, about 32px. On a phone, with the sidebar collapsed, it is about 6px.

  At a desktop width, a pitch under 10px is for the owner. R3-6b moved the chart to full width because a 376px track left each week under 10px at 30 weeks. The whole span grows by a bar a week, and R-36 chose it over a 12-week window, so a smear of bars would reopen that decision.
- A zoom shows the x labels thinned with none overlapping, and the latest week in the accent, the rest neutral.

Click the plot's slider (`find` "slider", then `left_click`), press End and read `aria-valuetext`. Expected: the last week's title with its clip, such as "Week of Oct 5 (to Oct 6)", and that week's votes. Home gives the first week, with "(from …)" when the first week is partial.

Then switch the frame to Table and run W again. Expected:
- `tableRows` equals `bars`.
- The rows with any votes number Step 8's "weeks have a vote".

Switch back to Chart.

- [ ] **Step 11: Card B: the engine-silent split**

Navigate to `http://localhost:5180/cards/<card B's id>`, and read the page with `get_page_text`. Expected:
- **The caption under Voted pairs** (R-31) gives Step 8's card B numbers:
  - the engine-silent pairs;
  - the pairs whose partner is outside the current card list;
  - the pairs with both cards in Core.

  The caption shows only once both files have loaded.
- **The KPIs and the headline** match Step 8's card B lines.
- **Voted pairs** is one list that scrolls inside its panel, with no "Show all" (R-47).
  - Partner names are links (`cardsHref`).
  - Engine → community prints as `scoreText` prints it.
  - The gaps wear their gap colours.

Run N and record `dropped` and the subtitle against Step 8, as on card A.

**The network subtitle's two tie forms** (R-37; R3-6c, note 4). For each of Step 8's two `Tie form` lines, navigate to its card and run N. Compare `heading`'s second line with the line's quoted words:
- **Every drawn partner tied.** The subtitle starts "12 of the N partners at score S, by name, of" (with "at least" before the total when the count is capped). It has no "Thicker spokes score higher.", because every spoke has the same score.
- **A tie below stronger partners.** The subtitle starts "The 12 strongest of …", and holds "D of the N partners at score S make the cut, by name." and then "Thicker spokes score higher.".

A form Step 8 found no card for is recorded as not seen. A subtitle in the other form, or with the wrong numbers, is a defect of R3-6c's `networkSubtitle` (or of R3-4's `tieAtCut`).

- [ ] **Step 12: Card C: accuracy sentiment from raw answers**

Navigate to `http://localhost:5180/cards/<card C's id>`, then run P and `get_page_text`. Expected:
- **The Accuracy sentiment KPI** (raw tag) is Step 8's card C sentiment, with U+2212 for a negative. Its hint names the answer count (R-32).
- **How voters answered.** The split meter's legend reads Step 8's "How voters answered:" line, "Too high N% (n)", "Right …" and "Too low …". A part with no answers keeps its row as "0% (0)" (R3-4c). Shares print through `sharePercent`: "<1%" and ">99%", never a 0% next to a count (R-43).
- **The headline.** It is Step 8's `Headline:` for card C. If Step 8 marks card C's mean gap "(low n)", the headline is the low-n one, "The engine has too few score votes to judge this card", and the Mean gap KPI is uncoloured, with the "low n" hint. That was so on the 2026-10-05 files, so this card covers the low-n state too.

Then open a card with raw votes and no accuracy answers. Card A was one on the 2026-10-05 files: its `Raw:` line ends "over 0 answers". How voters answered shows the bare track and "No accuracy answers yet." (R-42; R3-6b's `emptyText`), and the caption counting accuracy answers doesn't say "0 votes answered…".

Then open `http://localhost:5180/` and read the calibration card's "Accuracy sentiment". It equals Step 8's Overview figure, from `pairs[]`, which R3 leaves alone. Note how it compares with the raw figure for the follow-up issue (Step 19): on the 2026-10-05 files the two differ in sign.

- [ ] **Step 13: Focus and state across cards (R-46, R-48), and the switcher**

On card A:
1. Switch Votes per week to Table, and run V. Expected: that frame reads `Table`, and every other frame reads `Chart`.
2. `find` the network's link list ("Strongest synergy partners of …"), then `left_click` its first link.
3. Run P and V. Expected:
   - `path` is the first partner's page.
   - `focused` starts with `H2` and names the partner.
   - Every frame reads `Chart`: the view is keyed by card (R-46).
4. A screenshot of the network shows no tooltip and no dimmed spoke.
5. Navigate back. Card A's page shows again, keyed afresh.

A Voted pairs link, and the Engine view's Retry (R-45, R-48). The link asks for no handoff: the page asks when the URL names another card (R3-7). R3-6c's Retry asks for a handoff of its own panel's.
1. On card A, run F.
2. `find` card A's Voted pairs table ("Voted pairs, widest gap first"), then `left_click` its first partner link. Every Voted pairs partner is in the card list, since `pairs[]` holds engine-scored pairs only (R-29).
3. Run P. Expected:
   - `path` is that partner's page;
   - `focused` starts with `H2` and names the partner, the card header's heading.
4. Run `get_page_text`. Expected: the Engine view reads "Could not load this card's synergies (Failed to fetch)", with a Retry button.

   If the Engine view loaded instead, this card's synergy file was read earlier in the session, and the app caches a file once it loads. Go back and take the next Voted pairs link.
5. Run F-off, then `find` "Retry" and `left_click` it. Run P. Expected: the Engine view and the network load, and `focused` is `H2 Engine view`: the panel's heading took the handoff (`Panel`'s `titleFocusable`, R3-6c).

The owner can do the same with DevTools' Network panel set to Offline, after the page has loaded, in place of F.

The card list's Retry (R-45, R-48) needs the owner. The Browser pane can't fail the card list once it has loaded, and Offline would also stop the page itself from reloading. Ask the owner to do this in their own Chrome:
1. Open `http://localhost:5180/cards/<card A's id>`, and DevTools' Network request blocking.
2. Block `*/data/allCards.json`, and reload. Expected: "Could not load the card list (…)" with a Retry button, and no card.
3. Unblock it, then Tab to Retry and press Enter. Expected: card A's page, with focus on its h2 (`document.activeElement` in the console).

If the owner skips it, list it under "Held for the owner" in Step 23.

The switcher (R-30, R-48):
1. `find` "Switch card" and `left_click` the combobox.
2. Type the first two letters of a card name (`type`), wait one second, and take a screenshot. Expected: at most 6 options, newest set first, each with its ink icons and number.
3. Press ArrowDown, then Enter, and run P. Expected:
   - `path` is that card's page.
   - `focused` is the input. Focus stays in the switcher (R-48): `document.activeElement.getAttribute('role')` is `combobox`.
4. Select the input's text (`triple_click`), type `zzqx`, and wait one second. Expected: "No cards match." shows while the list is closed (R-30).
5. Clear the input.

- [ ] **Step 14: Links into `/cards` (R3-8, R-33)**

Run L on each page below:
1. `http://localhost:5180/activity`, on the "All" range: the vote log and Most voted pairs.
2. `http://localhost:5180/`: Latest votes.
3. `http://localhost:5180/calibration`: select the first rule row, then a pair, for the vote detail's heading.

Expected on each:
- `links` is more than 0.
- `unresolved: []`: every link goes to a card the list knows.
- `bareNumbers: 0`: a name that is only an id stays plain text. Those ids are rotated or old preview cards, and they touch 60% of the log's votes.

Click one link on `/activity`. It opens that card, and P's `card` names it. The sidebar marks "Card analytics".

- [ ] **Step 15: The not-found copy and the stored card**

Navigate to `http://localhost:5180/cards/<Step 8's rotated id>`, then run P and `get_page_text`. Expected:
- The page reads "No card has the id {id} in the current card list. Cards from sets before 9 rotated out of Core, and a preview id changes when its card is released." (R-29).
- No vote section shows.
- `lastCard` is still the last card that resolved. A rotated id is never stored, and `forgetLastCard` clears only the id that is stored.

Then navigate to `http://localhost:5180/cards`. It lands on that last good card.

- [ ] **Step 16: Layout at 1440px, 1366px and phone width**

Check the sidebar is open first (240px; R1-12 Step 22's measurement). On the phone preset, collapse it if it is open: R1-6 starts it collapsed on a small screen, but a saved preference wins. Leave it as you found it at the end. Then, for each size:
1. Set the size with `mcp__Claude_Browser__resize_window`: `{width: 1440, height: 900}`, then `{width: 1366, height: 768}`, then `{preset: "mobile"}`.
2. Navigate to card A, which reloads the page.
3. Run G, P, N and W, and take a full screenshot.
4. Navigate to card B, and run N.

Expected at 1440px and 1366px:
- **`overflow` is 0:** no sideways scroll.
- **G's rows** (a column of 1,136px or 1,062px):
  - "Calibration for this card" and "Voted pairs" share a `y`, since `twoUp(420)` goes two-up from an 860px column.
  - "Community scores" and "How voters answered" share a `y`: the `twoUp(376)` row holds only those two (R3-6b). "Votes per week" sits outside that row, on its own row under them, and runs the full width: its `w` is the column's.
  - The Engine view and the network panel each run the full width (R-39).
- **N's `dropped`** is `[]` on cards A and B, and **W's `pitch`** is recorded.

Expected on the phone preset:
- `overflow` is 0, and every panel is stacked (one `x`).
- **Record N's `dropped`** for cards A and B. The side names go first, and R-40 accepted that: the tooltip, the links' names and the table carry every name.

Then reset with `{preset: "desktop"}`.

Report to the owner: the dropped names at each width for cards A and B, and the weekly pitch at each width. These are the two numbers R-40 and R-36 asked the real data to settle.

- [ ] **Step 17: Fetch once, no errors, then stop the server**

1. Run `mcp__Claude_Browser__tabs_create` and navigate the new tab to `http://localhost:5180/`.
2. In that tab, click through the sidebar: Card analytics, then Vote activity, then Card analytics again. Then click one partner link on the card page. Use `find` with the tab's `tabId`, then `left_click`. These are client-side navigations, so don't use `navigate`, which reloads.
3. Run `mcp__Claude_Browser__read_network_requests` with `{tabId, urlPattern: "/admin-data/"}`. Expected: exactly one request each for `vote-analytics.json`, `vote-log.json` and `vercel-analytics.json`. The per-session cache (R1-5) holds across `/cards`.
4. Run it again with `urlPattern: "/data/synergies/"`. Expected: one request per card opened, and none twice.
5. Close the tab.

Then:
- `mcp__Claude_Browser__read_console_messages` with `{onlyErrors: true}`. Expected: no entries, except any that Step 13's forced failure left ("Failed to fetch" on `/data/synergies/`).
- `mcp__Claude_Browser__preview_logs` with `{level: "error"}`. Expected: no lines.

Stop the server (`preview_list`, then `preview_stop`).

If any check in Steps 9 to 17 failed:
1. Report it to the owner with its screenshot.
2. Fix it in the owning task's files as its own commit (`fix(<area>): <what> (#24)`), approved like any other.
3. Rerun Steps 4 and 6, then the failed step.

The screenshots show real counts, so don't save them in the repo or attach them to the PR.

- [ ] **Step 18: Confirm the analytics files stay out of git**

```bash
cd /d/johnn/Projects/inkweave-admin
git status --short -- public/
git status --short --ignored -- public/admin-data/
git log --oneline main..HEAD -- public/admin-data/
```

Expected:
- The first command prints nothing.
- The second prints `!! public/admin-data/`.
- The third prints nothing.

Never `git add -f` them.

- [ ] **Step 19: Draft the follow-up issues (the owner files them)**

Show the owner the drafts below, and add any finding from Steps 9 to 17 the owner wants filed instead of fixed. File each one only on the owner's word, with the command under it.

Keep vote, voter and event counts out of every title and body: words such as "most" and "a few" carry the point. If the owner says only "done", ask which issues they filed.

1. **The Overview's Engine-silent KPI** (R-31):

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Overview: the Engine-silent pairs KPI mostly counts rotated cards" --body-file - <<'EOF'
The Overview's "Engine-silent pairs" KPI (`src/tools/analytics/overview/OverviewKpis.tsx`, hint "voted, no synergy", in gold) counts voted pairs the engine doesn't score. The engine scores Core cards only (set 9 and up), and most of those pairs involve a card that rotated out of Core or an old preview id. So the number mostly counts rotation, not engine gaps.

R3's card page splits the same count in two (decision R-31): pairs whose partner is outside the current card list, and pairs with both cards in Core that the engine still doesn't score. The second half is the one worth acting on.

Options: split the KPI the same way, or reword its hint and drop the gold.

Part of the admin redesign (#24), raised by R3's decision R-31.
EOF
```

2. **The Overview's accuracy sentiment** (R-32):

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Overview: accuracy sentiment rests on the few pairs that carry one" --body-file - <<'EOF'
The Overview's accuracy sentiment is `global.accuracySentiment`, which `computeGlobal` (`scripts/lib/voteAnalytics.mjs`) averages over the `pairs[]` rows that carry a sentiment. Very few rows do, because a pair's sentiment comes from the view's accuracy answers on engine-scored pairs only.

R3's card page computes it from the vote log's raw accuracy answers instead (decision R-32): the share of "too low" minus the share of "too high". On the 2026-10-05 files, the Overview's figure and the raw answers across the whole log disagree in sign.

Proposal: when the vote log has raw votes, compute the global sentiment from the raw answers, tag it raw as the card page does, and give the answer count in its hint.

Part of the admin redesign (#24), raised by R3's decision R-32.
EOF
```

3. **In the app, the votes left on set 13's preview ids:**

```bash
gh issue create --repo Doberjohn/inkweave --title "Votes cast on set 13 preview ids were stranded when the cards were released" --body-file - <<'EOF'
During the set 13 reveal season, preview cards had temporary ids in the 13xxx range. When the cards were released they got their real ids, but the votes already cast on the preview ids stayed on them. Those ids are no longer in any card list. Admin can't name them (the vote log falls back to the id), and they count toward no released card's calibration.

Proposal: a one-off migration that remaps the votes on each set 13 preview id to its released card's id (matched by name and version), and a step in set graduation, `pnpm graduate-set` (`scripts/graduate-canonical-set.mjs`; `docs/CARD_DATA_PIPELINE.md`, "ID convention reminder" and "Rules during canonical integration"), which replaces the preview ids with canonical ones, so the next season carries its votes over.

Found while building admin's Card analytics (Doberjohn/inkweave-admin#24, R3).
EOF
```

4. **`RaritySymbol` and the printing webps** (R3-1's flag):

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Draw printing symbols through RaritySymbol and drop the bridged webps" --body-file - <<'EOF'
At the app pin, `RaritySymbol` also draws Enchanted, Epic and Iconic (`RaritySymbol.tsx`), but admin's bridge comments say it draws Common to Legendary only. Web analytics' breakdown cards still map printings to the bridged `enchantedSymbol`, `epicSymbol` and `iconicSymbol` webps (`src/tools/analytics/web/BreakdownCards.tsx`, `PRINTING_SYMBOLS`).

Proposal: pass the printing keys to `RaritySymbol`, drop `PRINTING_SYMBOLS` and the three webp re-exports, and fix the comments in `src/app-bridge.ts`. Check the icons on /web's "By rarity" breakdown afterwards.

Part of the admin redesign (#24), flagged in R3-1.
EOF
```

5. **The "Votes: Any / 2+ / 5+" filter** (R-25), only if the owner wants it tracked now. R-25 deferred it from R2, and R3's per-card pages make thin data plain to see:

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Calibration and Card analytics: a minimum-votes filter for pairs" --body-file - <<'EOF'
Most voted pairs have a single score vote, so pair-level views are noisy. Decision R-25 deferred a "Votes: Any / 2+ / 5+" filter from R2's /calibration. R3's /cards shows the same thinness per card.

Proposal: one filter that scopes the pair list, the scatter, the histogram and the card page's Voted pairs, off by default.

Part of the admin redesign (#24).
EOF
```

Each `gh issue create` prints the issue URL. Note each URL for Step 23.

- [ ] **Step 20: Edit CLAUDE.md, check docs/PLAN.md, and settle R4's open question 4**

Use the Edit tool. Each "Current" occurs exactly once. If one doesn't match, a task edited the line: report it, and don't guess.

**1. "The tools", the first bullet (`:15`): the kit and the primitives.** Current:

```md
The kit is hand-built SVG on the admin theme, with no chart library, and every new chart builds on it. `Sparkline`, `MeterBar` and `BiasBar` stay `src/ui` primitives.
```

New:

```md
The kit is hand-built SVG on the admin theme, with no chart library, and every new chart builds on it: bar, line and scatter charts, and since R3 the synergy `NetworkDiagram`. `Sparkline`, `MeterBar`, `SplitMeter` and `BiasBar` stay `src/ui` primitives: small marks beside numbers the page prints, not charts.
```

**2. "The tools", the write-pages bullet (`:18`): the focus handoff after the guard.** Current:

```md
The guard needs the data router, so tests render a guarded page with `createMemoryRouter`, never the `MemoryRouter` wrapper.
```

New:

```md
The guard needs the data router, so tests render a guarded page with `createMemoryRouter`, never the `MemoryRouter` wrapper. When an action unmounts the control that had focus (Save token, Retry, a link to the next card), the page hands focus to the next view through `src/shell/focusHandoff.ts`, and never moves it otherwise (R-48). A router link never requests the handoff in its click handler: React Router renders the navigation as a transition, so the old view, still mounted, would take the request first. The page requests it from its state instead: when the URL names another card, except on a REPLACE, which is no one's action, or when its data's error clears (`/cards`, R3-7).
```

If the owner keeps this sentence, keep its last two: they are the rule R3-7 found by mutation, and R4's studio would otherwise repeat the bug. A plain state change, such as R2's Save token or the Engine view's Retry, may still request the handoff on click.

**3. The Routes bullet (`:16`).** R3-7 edited this line to add `/cards`. Replace the whole bullet, whatever R3-7 left, with the "New" text. If R3-7's version says something the "New" text lacks, keep it and tell the owner. As it stood at `aea40b4`:

```md
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity` and `/web`, and the write tools `/reveal` and `/image`. `/calibration` writes too: its aside is the tuning editor. `src/shell/nav.ts` lists the sidebar's items and marks the ones that write (`writes`). `src/router.tsx` also redirects retired paths: `/analytics` goes to `/`, and `/tuning` to `/calibration`. The insights pages read `/admin-data/` only through `fetchAdminData`, which keeps each file's promise for the session (`src/test/setup.ts` empties it before every test).
```

New:

```md
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity`, `/web` and `/cards/:cardId?` (Card analytics), and the write tools `/reveal` and `/image`. `/calibration` writes too: its aside is the tuning editor. `src/shell/nav.ts` lists the sidebar's items, marks the ones that write (`writes`) and builds the links into pages (`calibrationHref`, `cardsHref`). `/cards/:cardId` shows one card, and a bare `/cards` opens the last card viewed, which each browser remembers (`cards/lastCard.ts`), or a "Pick a card" prompt. Card names on the other insights pages link to `/cards` only through `CardName`, `PairNames` or `PairLine` (`src/tools/analytics/CardName.tsx`), for ids the card list holds (`KnownCardsContext`, R-33): AdminShell's `KnownCardsProvider` fills it, and its default links nothing, so a view's tests and stories need no card list. `src/router.tsx` also redirects retired paths: `/analytics` goes to `/`, and `/tuning` to `/calibration`. The insights pages read `/admin-data/` only through `fetchAdminData`, which keeps each file's promise for the session (`src/test/setup.ts` empties it before every test). `/cards` also reads each card's synergy file from the forwarded `/data/synergies/` through the bridged `fetchCardSynergies`, whose cache no test can empty, so tests mock it through the bridge, or give each case an id no other test fetches.
```

**4. `docs/PLAN.md`, D10.** R3-7 owns this edit. Check it:

```bash
cd /d/johnn/Projects/inkweave-admin
grep -c 'R3 adds `/cards' docs/PLAN.md
```

The pattern stops after `/cards`, with no closing backtick, because R3-7 writes `/cards/:cardId?`.

Expected: `1`. If it prints `0`, R3-7 left it out, so make R3-7's edit here, in R3-7's words. Current:

```md
R2 redirects `/tuning` to `/calibration`, and R4 redirects `/reveal` and `/image` to `/studio` |
```

New:

```md
R2 redirects `/tuning` to `/calibration`, R3 adds `/cards/:cardId?`, and R4 redirects `/reveal` and `/image` to `/studio` |
```

**5. `docs/plans/R-redesign/R4-card-studio.md`, open question 4.** Current (`:1027`):

```md
4. **"View card analytics".** R4 links to `/cards/{id}`. Align this with the path R3 ships, and with its path helper if it has one.
```

New:

```md
4. **"View card analytics".** Settled in R3 (R-33): link with `cardsHref(id)` from `src/shell/nav.ts`, which builds `/cards/{id}`. R3 shipped no "Edit in Card studio" link, because `/studio` didn't exist yet. So R4-6 adds it rather than moving it: `CardAnalyticsPage` passes it to `CardAnalyticsView` as `headerActions`, which puts it in the card header (see "Modify R3's 'Edit in Card studio' link" above, which R4's re-base rewrites).
```

Then:

```bash
cd /d/johnn/Projects/inkweave-admin
git diff --stat -- CLAUDE.md docs/PLAN.md docs/plans/R-redesign/R4-card-studio.md
grep -nE "NetworkDiagram|SplitMeter|cardsHref|CardName|focusHandoff" CLAUDE.md
grep -nE "/cards|/calibration|/activity" README.md docs/REVEAL_RUNBOOK.md
grep -n "<AdminStyles />" .storybook/preview.tsx
```

Expected:
- **The stat** shows `CLAUDE.md` and `R4-card-studio.md`, plus `docs/PLAN.md` only if this step edited D10.
- **The first grep** prints lines 15, 16 and 18:
  - 15 names `NetworkDiagram` and `SplitMeter`;
  - 16 names `cardsHref` and `CardName`;
  - 18 names `focusHandoff`.
- **The second grep** prints one line, `docs/REVEAL_RUNBOOK.md:120`, whose `/cards` is in `https://illumineertales.com/cards.json`, not an admin route. So neither file names an admin page route, and neither needs an edit. Any other line names a route: check that it is still right.
- **The third** prints one line: Storybook's preview mounts `AdminStyles` for every story (R1-2), so R3's new classes reach the stories with no change there.

- [ ] **Step 21: Check R3's records in the main plan**

The plan commit recorded R3's planned contract in `docs/plans/R-redesign.md` (file-structure rows, shared interfaces, chart kit, contract additions), as R2's did. Make two kinds of edit only: item 1 below, and, for each export Step 3 found different from its record, the as-built line, with a line under "Departures" in Step 23.

**1. The Roadmap table, the R3 row.** Replace the whole R3 row, whatever its last cell says. The plan commit changes that cell from "Outline below" to "Below" (the R3 header's Conventions). Current, after the plan commit:

```md
| **R3** | Card analytics at `/cards` (`cardStats.ts` + tests, switch-card combobox, engine view from `fetchCardSynergies`, the synergy network diagram) | Per-card pages | Below |
```

If the last cell differs (the plan commit was made another way), match the row by its start, `| **R3** | Card analytics at`, which occurs once.

New:

```md
| **R3** | Card analytics at `/cards` (the card models `cardStats.ts` and `cardVotes.ts`, the switch-card combobox, the engine view from `fetchCardSynergies`, the synergy network diagram, the split meter); card names on the other insights pages link to it | Per-card pages | Below (detailed 2026-10-06) |
```

Then check the table and the blocks:

```bash
cd /d/johnn/Projects/inkweave-admin
git diff --stat -- docs/plans/R-redesign.md
grep -nE "^\| \`src/(ui/layout\.ts|shell/focusHandoff\.ts|shell/knownCards\.ts|test/cardLinks\.tsx|tools/analytics/cards/\*|tools/analytics/CardName\.tsx|tools/analytics/GapScale\.tsx)\`" docs/plans/R-redesign.md
grep -nE "export function (cardsHref|sharePercent|twoUp|DataAsOf|LowNTag|SplitMeter|NetworkDiagram|networkLayout|useFocusHandoff|useIsKnownCard|KnownCardsProvider|CardName|renderWithCards)\b" docs/plans/R-redesign.md
grep -nE "titleFocusable|\{title\?: React\.ReactNode|KnownCardsProvider\` round the outlet|adm-link \(" docs/plans/R-redesign.md
```

Expected:
- **The first grep** prints seven rows. All seven come from the plan commit.
- **The second** prints one line for each of the thirteen names.
- **The third** prints five lines: the `src/ui/*.tsx` row (it names `titleFocusable`), the `AdminShell.tsx` row, the `adm-link` comment line, and the `Panel` line with its `titleFocusable` comment.

Compare the cards row with Step 1's `ls`, and name any non-test module it misses.

- [ ] **Step 22: Commit CLAUDE.md**

Show the owner `git diff --stat` and the commands, and ask for approval. Then, with the Bash tool, run the staging as its own call. Add `docs/PLAN.md` only if Step 20 edited it:

```bash
git add CLAUDE.md
```

Then, as its own unpiped call:

```bash
USER_APPROVED=1 git commit -m "docs: describe Card analytics, the network diagram and the split meter (#24)"
```

Expected: the pre-commit hook runs `pnpm lint` and `pnpm test:run`, then git prints the commit summary. The plan files stay unstaged until Step 24.

- [ ] **Step 23: Record R3 as built**

In `docs/plans/R-redesign.md`, replace the **Status:** paragraph (`:19`). Use `<date>` from `date +%F`. The plan commit may have reworded its R3 sentence, so replace the paragraph whatever it says. As of 2026-10-06:

```md
**Status:** R1 built and checked against real data on 2026-10-02; see "R1 as built". R2 built, checked against real data and merged on 2026-10-06 (PRs #27 and #28); see "R2 as built". R3 is being detailed (decisions R-28 to R-56); R4 is outlined below and detailed when it starts.
```

New:

```md
**Status:** R1 built and checked against real data on 2026-10-02; see "R1 as built". R2 built, checked against real data and merged on 2026-10-06 (PRs #27 and #28); see "R2 as built". R3 built and checked against real data on <date>; see "R3 as built". R4 is outlined below and detailed when it starts.
```

Then insert this section right before the line `## Phase R4: Card studio (outline)`, after whatever the plan commit put under `## Phase R3`. Leave one blank line on each side. The `<…>` slots are filled from this task's run. Each slot says what goes in it:

```md
### R3 as built (<date>)

Tasks R3-1 to R3-9 (with R3-1a, R3-4b, R3-4c, R3-5b and R3-6a to R3-6c) on `feature/24-redesign-r3`<, then the final review's fix wave (`<sha>`, …), if there was one>.

- **What shipped:**
  - **`/cards`, Card analytics.**
    - The page header's Switch card search (R-30), and under it the card header (R-49).
    - A KPI row, with Accuracy sentiment from raw answers (R-32).
    - Calibration for the card beside its voted pairs, with an engine-silent caption split in two (R-31).
    - Community scores and How voters answered two-up, and under them, at full width, Votes per week over the log's whole span (R-36).
    - The Engine view, and under it the network of the twelve strongest partners (R-37 to R-39). The network's subtitle takes one of three forms (R3-6c): a cut between two scores; a tie below stronger partners ("7 of the 8 partners at score 7 make the cut, by name."); or every drawn partner tied ("12 of the 30 partners at score 8, by name, of at least 142 in all", with no "Thicker spokes score higher."). After the Engine view's Retry, focus goes to the panel's heading (`Panel`'s `titleFocusable`), or back to Retry when the read fails again (R-45, R-48).

    A bare `/cards` opens the last card viewed, or a "Pick a card" prompt with Cards to review (R-28). The tab names the card (R-51).
  - **Links.**
    - In: card names on Vote activity, the Overview and Calibration, through `CardName`, for ids the card list resolves (R-33).
    - Out: the card's rules link to `/calibration?rule=` (R-34).
  - **The chart kit.** `NetworkDiagram` over `networkLayout.ts`, with names measured by `textWidth` (R-40), the kit's dimming and naming (R-41), and `LABEL_HALO` in `axis.ts`.
  - **Shared pieces.**
    - In `src/ui`: `DataAsOf`, `LowNTag`, `sharePercent` and `twoUp` (R3-1a), and `SplitMeter` (R3-4c).
    - In `src/shell`: the focus handoff (R3-1a), and `KnownCardsContext` with its provider (R3-8).
    - In `activityModel.ts`: `VoteSpan`, beside `activityWindow` (R3-1a).
    - In `src/tools/analytics`: `CardName`, `PairNames` and `PairLine` (R3-8).
  - **Also:**
    - `GapScale` in `src/tools/analytics`, and `Verdict.phrase`, which fixed the Overview's "The engine well-calibrated" (R-50, R-53);
    - `PageLayout`'s `documentTitle` and `nav.ts`'s `cardsHref`;
    - `Panel`'s `titleFocusable` (R3-6c), and its `title` widened to `React.ReactNode` for linked names (R3-8);
    - `.adm-option`, `.adm-net-link` and `.adm-link`;
    - the bridge's new names (R-55).
- **Departures from the plan:**
  - **Task R3-7, re-base (2026-10-06), against the R3 header's sketch:**
    - `cardPageState` returns a discriminated `CardPageState` (`{kind: 'card', card}`, `{kind: 'unknown', cardId}`, `{kind: 'failed', error}`, and the prompt and loading kinds) and takes the context's `getCardById`, so `CardPageBody`'s `switch` narrows each state with no checks of its own;
    - `useRememberCard(state)` takes that state, in place of `useRememberCard({cardId, card, isLoading, error})`;
    - the page requests the focus handoff from its state, when the URL names another card (never on a REPLACE) or the card list's error clears, and never on click: a router link's click-time request is taken by the old card's heading inside the navigation's transition (found by mutation);
    - the prompt's line and the not-found line take focus too (`<p tabIndex={-1}>`), so a Retry that lands on either keeps focus;
    - browser Back and Forward between two cards ask for the handoff too, and the heading takes it only if focus fell to `<body>`.
  - <Then one sub-bullet each for any other departure, in this form: `**Task R3-N, Step k:** what changed and why (approved <date>).` Include every interface Step 3 found different from the plan, and any fix commit from Steps 2, 5, 6 or 17. If there are none, delete this slot.>
- **Held for the owner:** <each finding the owner chose to hold rather than fix, with where it stands, or "nothing.". Include the card list's Retry if the owner didn't run it (Step 13).>
- **Follow-up issues:** <each filed issue as `repo#N: title`, or "drafted in R3-9, not filed">.
- **Real-data check:** run on <date> against the files of <the files' generatedAt date>.
  - **Numbers.** They matched the files for three cards: the first to review, one with both kinds of engine-silent pairs, and the one with the most accuracy answers. Cards to review, the not-found copy and the links in matched too. <Or: what didn't, and the fix commit.>
  - **Network subtitle.** Both tie forms read as R3-6c words them, each on a card the check found. <Or: the form not seen on these files, or what didn't match and the fix.>
  - **Focus and Retry.** Focus landed on the new card's heading after a Voted pairs link, a network node and a Cards to review link, and stayed in the switcher after a pick. After the Engine view's Retry it went to the panel's heading. <The card list's Retry: checked by the owner, or held.>
  - **History.** Back from a card opened from the prompt takes two steps to leave, as R3-7 accepted.
  - **Layout.** It held at 1440px and 1366px, and stacked on a phone with no sideways scroll.
  - **Network names** dropped by `textWidth` (R-40): <n> at 1440px, <n> at 1366px, <n> at phone width. <Twice-printed short names: told apart by the links' names, or the fix.>
  - **Votes per week** (R-36): <bars> bars, at about <n>px a bar at full width at 1440px and <n>px on a phone.
  - **Accuracy sentiment.** The Overview's figure (from `pairs[]`) and the raw answers <agree / disagree in sign>, which follow-up <#N> takes up.
  - **Code Health.** `analyze_change_set` passed. <The PR's CodeScene check, once read in Step 25.>
```

Keep vote, voter and event counts out of it, as "R2 as built" does. Bar counts, pixel widths and name counts aren't vote counts.

Check the result:

```bash
cd /d/johnn/Projects/inkweave-admin
grep -n "^### R3 as built\|^## Phase R4\|R3 built and checked" docs/plans/R-redesign.md
grep -c "<date>" docs/plans/R-redesign.md
```

Expected:
- The first grep prints the Status line, then `### R3 as built (…)`, then `## Phase R4: …`, in that order.
- The second prints `0`: every slot is filled. A literal `<date>` or `<n>` left behind is a slot you missed. Search for `<` in the new section.

- [ ] **Step 24: Commit the plan record**

Show the owner `git diff --stat` and the commands, and ask for approval. Then, with the Bash tool, run the staging as its own call:

```bash
git add docs/plans/R-redesign.md docs/plans/R-redesign/R4-card-studio.md
```

Then, as its own unpiped call:

```bash
USER_APPROVED=1 git commit -m "docs(plan): record R3 as built (#24)"
```

Expected: the hook runs, and git prints the commit summary. Then `git status --short` prints nothing.

- [ ] **Step 25: Push and open the R3 PR (owner approval)**

Show the owner these, and ask for approval:
- the branch and `git log --oneline main..HEAD`;
- the push command;
- the PR title and body below.

Adjust the body first:
- **Departures.** If "R3 as built" lists any, add a `## Departures from the plan` section that restates them.
- **A dropped bullet.** If a Verification bullet didn't hold, say what did instead.
- **No counts.** Keep vote, voter and event counts and the screenshots out of the body.

After a clear yes, run each command with the Bash tool:

```bash
cd /d/johnn/Projects/inkweave-admin
USER_APPROVED=1 git push -u origin feature/24-redesign-r3
```

Expected: the pre-push hook runs `pnpm check:deps` and `pnpm typecheck`, then git reports the branch pushed.

```bash
gh pr create --repo Doberjohn/inkweave-admin --base main --head feature/24-redesign-r3 \
  --title "feat(cards): admin redesign R3, card analytics (#24)" \
  --body-file - <<'EOF'
## Summary

R3 of the admin redesign ([plan](https://github.com/Doberjohn/inkweave-admin/blob/feature/24-redesign-r3/docs/plans/R-redesign.md), decisions R-28 to R-56): one read-only page per card at `/cards`.

- **Card analytics at `/cards/:cardId`:**
  - **The page header** has a Switch card search on the app's autocomplete, and "No cards match." for a miss. Under it, the card header gives the card's picture, name and kind.
  - **The KPIs** include Accuracy sentiment from the card's raw answers.
  - **Calibration for the card** sits beside its voted pairs:
    - a verdict and the gap scale shared with the Overview;
    - its rules, linked to their `/calibration` entries;
    - a caption that splits the engine-silent pairs into rotated partners and Core pairs the engine misses.
  - **Community scores and How voters answered** sit side by side, with **Votes per week** under them at full width, over the vote log's whole span.
  - **The Engine view** has a tier split and a Retry for a failed read, and under it the network diagram of the twelve strongest partners. Its subtitle says when the cut falls inside a tie of equal scores.
  - **A bare `/cards`** opens the last card viewed, or a "Pick a card" prompt with the cards most worth a look.
  - **The tab** names the card.
- **Links:** card names on Vote activity, the Overview and Calibration link to their card pages, for cards in the current card list. One component prints them (`CardName`), and a small context (`KnownCardsContext`) tells it which ids the list holds, so a view's own tests and stories need no card list.
- **Chart kit:** `NetworkDiagram`, a radial ego network built on the kit: hand-built SVG, one tooltip that the keyboard reaches too, a Table view through `ChartFrame`, and node links that are real links.
- **Shared pieces:**
  - `DataAsOf`, `LowNTag`, the new `SplitMeter`, `sharePercent` and `twoUp` move into `src/ui`;
  - the focus handoff moves into `src/shell`;
  - `GapScale` moves into `src/tools/analytics`;
  - `Panel` gains `titleFocusable`, and its `title` takes links.

  The Overview's verdict is a full sentence again: "The engine is well-calibrated", where it read "The engine well-calibrated".
- **Bridge:** only the names R3 uses. The vote log's answer fields are typed to the values the database allows.
- **Docs:** CLAUDE.md (routes and card-name links, the kit and primitives, the focus handoff), `docs/PLAN.md` D10, and the plan's "R3 as built".

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (with the card-identity parity test on the precompute's own transforms), `pnpm build` and `pnpm check:deps` pass.
- **Storybook:** a one-off `storybook build` succeeds. Every story renders, and the new stories pass the accessibility panel.
- **CodeScene** `analyze_change_set` passes locally.
- **Real data:** checked locally against the deployment's analytics files (saved locally, git-ignored, not committed):
  - KPIs, verdicts, the engine-silent split, the raw sentiment and the weekly bars match numbers computed independently from the files, for three cards picked by rule;
  - Cards to review matches;
  - the network's order and tie subtitle match the card's synergy file, and both tie forms read as planned;
  - links in resolve, focus lands on the new card's heading after a partner link, and a frame left on Table resets on the next card;
  - Retry on a failed synergy read reloads it and hands focus to the Engine view's heading;
  - a rotated id shows the not-found copy;
  - the layout holds at 1440px and 1366px and stacks on a phone;
  - each analytics file is fetched once per session.

Part of #24 (R3 of R4).
EOF
gh pr view --repo Doberjohn/inkweave-admin feature/24-redesign-r3 --json url,closingIssuesReferences
```

Expected:
- `gh pr create` prints the PR URL.
- `gh pr view` shows it with `"closingIssuesReferences": []`. #24 stays open, because R4 follows.

Give the owner the URL. Then, once the checks finish:

```bash
gh pr checks --repo Doberjohn/inkweave-admin feature/24-redesign-r3
```

Expected: `CodeScene Code Health Review (main)` passes, with `build-and-test`, GitGuardian, CodeRabbit and cubic.

If CodeScene fails, its link opens the delta on codescene.io; the owner can open it. Fix each named function in the owning task's files as a `fix(<area>): … (#24)` commit, approved, then push again. Check each cubic and CodeRabbit finding with a fresh subagent, and go through them with the owner before replying on a thread.

Fill the "Code Health" slot in "R3 as built" with the check's result. Do it in a `docs(plan)` commit that the owner approves, or in R4's plan commit if the PR has merged by then.

- [ ] **Step 26: After the merge (owner)**

The push to `main` runs Deploy. The owner opens `https://inkweave-admin.vercel.app/cards` while signed in, and checks:
- the prompt and Cards to review, with the nightly data;
- one card's page;
- a card link from Vote activity.

Then run `gh issue view 24 --repo Doberjohn/inkweave-admin --json state`. Expected: `OPEN`, since the issue tracks R1 to R4. R4's plan commit sets the Status line's "merged on <date> (PR #N)" for R3, as R2's did.

<!--
Review of 2026-10-06 (18 notes), applied to this file. None rejected; where the fix was adjusted, the reason is given.
- 1: Step 20 item 4's grep stops after `/cards` (no closing backtick), tested against R3-7's line (prints 1; the old pattern printed 0). The fallback "New" is R3-7's text word for word.
- 2: Step 21 item 1 quotes the row with "Below", as the plan commit leaves it, and says in the step to replace the whole row whatever its last cell says. Re-base notes 4 and 10 corrected.
- 3: applied as given. Besides the two exclusions, the pattern's dot (`\.accuracySentiment\b`) is what skips `accuracySentiment: null` in R3-7's `CardPageBody.stories.tsx` (R3-07-route-page.md:1153), which neither exclusion covers. Checked with git grep on today's branch: `\b` works, and the exclusions parse.
- 4: Step 21 item 13 now edits Panel's line (titleFocusable and the ReactNode title together, R1's `JSX.Element` kept as R3-5b keeps older lines). Step 3 diffs Panel.tsx and VoteDetailTable.tsx, and lists every modified src/ui, src/charts, src/shell and src/theme module (eight, named) to compare against the record. "R3 as built" lists both Panel changes under "Also".
- 5: R3-08-card-links.md has since landed (20:01), so this file is reconciled with it rather than with the sandbox diff: its file names, its Produces block (contract lines in items 15 and 18), its `.adm-link` description (item 11), its CLAUDE.md sentence (folded into the Routes bullet, as the note asks), and its own commit message (Step 1 maps commits by task files). Step 3's class check uses `comm` against main's class names instead of the suggested `git diff ... | grep -oE "^\+\.adm-[a-z-]+"`: R3-4b and R3-5 add their classes to existing selector lists (the focus ring's, reduced motion's), so the diff grep would also print `+.adm-nav-item` and the like. The `comm` form printed exactly the one new class against each of R3-8's, R3-4b's and R3-5's sandbox AdminStyles.tsx. Step 1's `ls` gains the four R3-8 paths, Step 2 a src/shell boundary check (R-53, R3-8's reason for its placement), Step 5 the R3-8 exceptions and the three `CardLinks` stories in the a11y pass.
- 6: item 8's cards row names cardView.ts, cardStyles.ts, R3-6a's four parts, voteCharts.ts and RawVotePanels, engineCharts.ts and EnginePanels.tsx, and CardPageBody.tsx; Step 1's folder list too.
- 7: Step 8's script finds a card of each tie form (batches of 8, stopping at both or 400 cards); Step 11 checks both subtitles. Step 13 adds the Voted pairs link (focus on the new h2) and the Engine view's Retry through a fetch patch (F/F-off), with DevTools Offline as the owner's alternative. For the card list, Offline mode can't work (the reload that fails the list would fail the page itself), so the owner blocks `*/data/allCards.json` with DevTools' request blocking instead. Step 9 adds Back from a card opened from the prompt. "Departures" is pre-filled with R3-7's five; Step 5 checks the "Card analytics" sidebar node.
- 8: Step 10 (full width, about 35px a bar at 1440px, 32px at 1366px, 6px on a phone; the threshold is now 10px, R3-6b's reason for full width), Step 16 and Step 23's slot. Widths recomputed from SPACING.xl = 20 and BAR_Y_AXIS_WIDTH = 40 plus the 8px pad.
- 9, 10: applied. The R snippet falls back to the link when a link sits in no <li>.
- 11: applied, and the script ran again on the local 2026-10-05 files (exit 0), linted clean as a scripts/ module.
- 12: item 16 copies R3-4b's block from R3-04b-network-diagram.md as it stands at 20:39 (it changed after the note: label-in-name, Escape and "no click hook" comments), less its two lines that items 11 and 17 record.
- 13: applied; `JSX.Element` stays only on R1's existing Panel line.
- 14: applied in "R3 as built" and the PR body; R3-4c now sits beside SplitMeter, VoteSpan is R3-1a's.
- 15, 16, 17: applied.
- 18: (a) parenthetical dropped. The sentence that messages can differ stays: on 2026-10-06 R3-4's, R3-4c's and R3-8's task files still differ from the header's table. (b) the issue body names `pnpm graduate-set` and the CARD_DATA_PIPELINE.md sections by heading rather than by line, since it goes to the app repo and line numbers drift. (c) Step 20 runs the README/runbook grep, which prints one line today (REVEAL_RUNBOOK.md:120, illumineertales' cards.json), and checks `.storybook/preview.tsx`.

Cross-task review of 2026-10-06, A3 and A4 applied. The plan commit now records R3's contract, so Step 21 keeps item 1 and checks the rest; the notes above that cite Step 21's items 8, 11, 13 and 15 to 18 describe the earlier draft. Step 3 compares against the plan's records. Step 21's third grep prints five lines, not four: the plan commit's `src/ui/*.tsx` row names `titleFocusable` (checked on a copy of the working R-redesign.md with the plan commit's records applied). Re-base note 4 had no "23 edits"; only note 10 did.
-->

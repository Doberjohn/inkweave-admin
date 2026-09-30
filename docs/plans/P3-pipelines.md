# P3: Pipelines (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the two admin pipelines out of the app repo into admin:
- the analytics precomputes run in admin's deploy workflow and ship their JSON inside the login-gated deployment;
- reveal ingestion publishes each batch as a PR in `Doberjohn/inkweave`.

**Architecture:**
- **P3a, analytics.** `.github/workflows/deploy.yml` gains a nightly schedule and three steps:
  1. check out the app's current `master` into `app-master/`;
  2. build its engine and synergy data;
  3. run admin's ports of the two precompute scripts, which write `public/admin-data/`.

  Vite copies `public/` into the build, so the data ships inside the deployment, behind Vercel login.
- **Pin bump.** `upstream/inkweave` moves to the app's current `master`, in a PR of its own, before P3b.
- **P3b, reveal ingestion.** `scripts/reveal-sync/` and the `fetch-reveals` skill are ported from the bumped pin. Their write phase stops writing into a local app checkout. Instead it:
  1. creates a branch in the app repo;
  2. commits through the Git Data API;
  3. opens a PR there;
  4. commits its `state.json` straight to admin's `main`.

  All four go through `gh`.

**Tech stack:**
- GitHub Actions (cron, multi-repository checkout)
- pnpm 9 filtered installs
- Node 24 ES modules
- the Supabase JS client
- the Vercel Web Analytics Query API
- Vitest 5 (Vitest 4 until the pin bump)
- for P3b: the `gh` CLI, Vite's `runnerImport`, and `sharp` through the app's converter

**Tracking:** Doberjohn/inkweave-admin#3. Spec: `docs/PLAN.md` (decisions D7 and D8, sections 4.4 and 4.5, and the "P3: Pipelines" outline). Issue #3 carries the step outline this plan details.

---

## Decisions (owner, 2026-09-29 and 30)

| # | Decision | Detail |
|---|---|---|
| P3-1 | Two PRs, one plan | P3a (analytics) says "Part of #3". P3b (reveal ingestion) says "Closes #3". This plan covers both. |
| P3-2 | Bump the pin before P3b | After the pin (`e70249be`), the app's `master` changed reveal-sync: `text.mjs`, `extract-card.mjs`, the `fetch-reveals` skill, `revealSet.ts`, and `state.json` (+141 lines, and growing through the reveal season). P3b ports from a pin bumped in its own PR. P3a doesn't wait: the analytics scripts haven't changed since the pin. |
| P3-3 | Nightly plus manual | A `schedule` cron of `0 4 * * *` plus `workflow_dispatch`, as D8 says. The analytics steps run on every trigger, push included: a deployment built without them would ship with no `/admin-data/`. |
| P3-4 | Quiet logs | The repo was public on 2026-09-29, and the owner plans to make it private around 2026-10-01. A public repo's workflow logs are public. So the precompute scripts log the files they write, never vote, voter or event counts. |
| P3-5 | Decouple the app's integrity test from `state.json` | Admin alone owns `state.json`, and nothing copies it into the app. The app's `reveal-set-integrity.test.ts` drops its cross-check between `scanLanguage` and the `provisional-translation` entries in the app's own `state.json`. It keeps the language-code check (Doberjohn/inkweave#656). #14's reveal-tool change then only sets or clears `scanLanguage` in `previewCards.json`. This replaces the outline's recommendation, mirroring admin's `state.json` into the app: the next reveal PR would have overwritten the app copy that #14 writes. |
| P3-6 | State commits go straight to `main` (2026-09-30) | After a run opens its app PR, `write` commits the run's `state.json` to admin's `main` through the GitHub API, the way the tools commit data to the app. A run reads `state.json` from `main` at `start`, and refuses to publish if it has moved since. CI and Deploy skip pushes that change only that file. If the owner closes a reveal PR unmerged, its state commit is reverted (`docs/REVEAL_RUNBOOK.md`). |

## Schedule and minutes

Measured on 2026-09-29:
- admin's Deploy: median 1.1 min over its last 6 runs. Admin's CI: median 0.9 min over 32 runs.
- The app's own deploy of the same pieces: checkout 2 s, engine build about 1 s (tsup, ESM 0.3 s and DTS 0.7 s), and `precompute-synergies` 6.9 s.

The analytics steps also run:
- an install of the app's workspace, with no install scripts. pnpm 9 ignored `--filter inkweave-synergy-engine` here and installed all 876 packages, so the step installs the workspace without the filter. A dry run on 2026-09-29 took 57 s on Windows with a warm store, and a Linux runner links faster.
- the two precomputes, about 15 to 30 s. Supabase reads paginate at 1,000 rows, and the Web Analytics API takes one count query, one trend query and one query per breakdown for each event.

That adds about 1.5 to 2 min, so a deploy run takes about 3 min.

| Trigger | Runs a month | Minutes a month |
|---|---|---|
| Nightly cron | 30 | ~90 |
| Merges to `main` | ~10 | ~30 |
| **Deploy total** | | **~120** |

While the repo is public, standard-runner minutes are free. Once it's private, they count against the budget the two repos share, where the app's CI (about 10 min a run) is the main consumer.

Caveats:
- GitHub can start scheduled runs late when load is high.
- Schedules run on the default branch, `main`.
- In a public repo, GitHub disables a scheduled workflow after 60 days without repository activity. That stops mattering once the repo is private.

## File structure

**P3a creates:**

| File | Responsibility |
|---|---|
| `scripts/lib/voteAnalytics.mjs` | Pure vote-analytics builders, ported unchanged |
| `scripts/lib/vercelAnalytics.mjs` | The Web Analytics query plan and builders, ported unchanged |
| `scripts/lib/__tests__/voteAnalytics.test.mjs`, `scripts/lib/__tests__/vercelAnalytics.test.mjs` | Their 44 tests, ported to run in the node environment |
| `scripts/precompute-vote-analytics.mjs` | Reads Supabase and the app checkout at `APP_DIR`; writes `public/admin-data/vote-analytics.json` and `vote-log.json` |
| `scripts/precompute-vercel-analytics.mjs` | Reads the Web Analytics Query API; writes `public/admin-data/vercel-analytics.json` |

**P3a modifies:** `.github/workflows/deploy.yml`, `.gitignore`, `eslint.config.js`, `vite.config.ts`, `CLAUDE.md` and `docs/PLAN.md`.

**The pin bump modifies:**
- the `upstream/inkweave` pointer;
- `package.json` and `pnpm-lock.yaml`, wherever `check:deps --fix` asks;
- any admin file that a changed app module breaks.

**P3b** creates `scripts/reveal-sync/**`, the `fetch-reveals` skill and two docs. It also changes the reveal publisher, the bridge, both workflows and `CLAUDE.md`. Part 3 has the file table.

**The analytics tool needs no change.** P2 already reads `/admin-data/{vote-analytics,vote-log,vercel-analytics}.json`, and its notices name these Actions secrets and the Deploy workflow.

---

## Part 1: P3a, analytics (branch `feature/3-pipelines`, PR "Part of #3")

### Task 1: Port the analytics libraries and their tests

**Files:**
- Create: `scripts/lib/voteAnalytics.mjs`, `scripts/lib/vercelAnalytics.mjs`
- Create: `scripts/lib/__tests__/voteAnalytics.test.mjs`, `scripts/lib/__tests__/vercelAnalytics.test.mjs`

- [ ] **Step 1: Copy the four files from the pinned app**

```bash
mkdir -p scripts/lib/__tests__
cp upstream/inkweave/scripts/lib/voteAnalytics.mjs upstream/inkweave/scripts/lib/vercelAnalytics.mjs scripts/lib/
cp upstream/inkweave/scripts/lib/__tests__/voteAnalytics.test.mjs upstream/inkweave/scripts/lib/__tests__/vercelAnalytics.test.mjs scripts/lib/__tests__/
```

- [ ] **Step 2: Run the tests in the node environment**

Admin's Vitest defaults to jsdom. These are pure Node modules, so give each test file the same first line as `scripts/export-banner.test.mjs`:

```bash
sed -i '1i // @vitest-environment node' scripts/lib/__tests__/voteAnalytics.test.mjs scripts/lib/__tests__/vercelAnalytics.test.mjs
```

- [ ] **Step 3: Run them**

Run: `pnpm exec vitest run scripts/lib`
Expected: 2 files and 44 tests pass (22 each).

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: exit 0. These are plain Node modules, so the design-token rules have nothing to flag. If a rule fires, fix the line rather than disabling the rule.

- [ ] **Step 5: Commit** (after the owner approves)

```bash
git add scripts/lib
USER_APPROVED=1 git commit -m "feat(analytics): port the analytics libraries and tests (#3)"
```

### Task 2: The vote precompute, reading the app checkout at `APP_DIR`

**Files:**
- Create: `scripts/precompute-vote-analytics.mjs`

It is the app's `scripts/precompute-vote-analytics.mjs` with five changes:
1. Its reads come from `APP_DIR`: the synergy files, the engine's rule roster and the card names.
2. It writes to `public/admin-data/`.
3. It imports `@supabase/supabase-js` directly. Admin declares it at the app's version.
4. There is no `apps/web/.env.local` fallback: the deploy sets the environment.
5. It writes both files on the empty path too, and logs file names instead of counts.

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
/**
 * Vote analytics for the admin analytics tool (docs/PLAN.md, D8). Joins the
 * community votes in Supabase with the engine's synergy data from the app's
 * current master, and writes the two files the tool reads behind the admin
 * login:
 *   public/admin-data/vote-analytics.json  calibration by rule and by pair
 *   public/admin-data/vote-log.json        the raw votes, day by day
 *
 * Reads:
 *   - Supabase pair_scores (anon key, VITE_SUPABASE_ANON_KEY): the gap data
 *   - Supabase votes (service-role key, SUPABASE_SERVICE_ROLE_KEY, optional):
 *     weekly activity, voters, dimensions and the vote log
 *   - the app checkout at APP_DIR (default app-master), once its engine is built
 *     and precompute-synergies has run: apps/web/public/data/synergies/ for engine
 *     scores and rules, packages/synergy-engine/dist for the rule roster, and
 *     apps/web/public/data/{allCards,previewCards}.json for card names
 *
 * Without the service-role key it leaves out the raw-vote parts; without Supabase
 * env at all it writes empty-but-valid files. Workflow logs are public while the
 * repo is, so it logs the files it wrote, never counts.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {buildAnalytics, buildVoteLog, pairKey} from './lib/voteAnalytics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = path.resolve(ROOT, process.env.APP_DIR ?? 'app-master');
const APP_DATA = path.join(APP_DIR, 'apps/web/public/data');
const OUT_DIR = path.join(ROOT, 'public/admin-data');
const VOTE_COLUMNS =
  'created_at, ip_hash, card_a_id, card_b_id, score, accuracy, is_real, would_play, difficulty, who_carries';
const EMPTY_LOG = {votes: [], voterCount: 0};

/** Write one admin-data file, naming it (never its contents) in the log. */
function writeOut(name, value) {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify({...value, generatedAt: new Date().toISOString()}));
  console.log(`  wrote public/admin-data/${name}`);
}

/** The empty-but-valid analytics written when Supabase env is absent. */
function emptyArtifact() {
  return {
    hasRawVotes: false,
    global: {totalVotes: 0, distinctPairs: 0, distinctVoters: null, meanGap: null,
      accuracySentiment: null, engineSilentPairs: 0, weekly: [], dimensionFill: null},
    rules: [], pairs: [],
  };
}

/** Read every row of a Supabase table, paginating past PostgREST's 1000-row cap. */
async function fetchAllRows(client, table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const {data, error} = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table} read failed: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

/** Read the synergy artifacts into an enginePairs Map + per-rule pair totals. */
function loadEngineArtifacts(synDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(synDir, '_manifest.json'), 'utf8'));
  const enginePairs = new Map();
  const ruleTotalPairs = {};
  for (const cardId of manifest) {
    const data = JSON.parse(fs.readFileSync(path.join(synDir, `${cardId}.json`), 'utf8'));
    for (const [targetId, pairData] of Object.entries(data.pairs)) {
      const key = pairKey(cardId, targetId);
      if (enginePairs.has(key)) continue;
      const connections = pairData.connections.map((c) => ({ruleId: c.ruleId}));
      enginePairs.set(key, {engineScore: pairData.aggregateScore, connections});
      for (const c of connections) ruleTotalPairs[c.ruleId] = (ruleTotalPairs[c.ruleId] ?? 0) + 1;
    }
  }
  return {enginePairs, ruleTotalPairs};
}

/** Rule roster (labels + zero-vote rules) from the app's built engine. */
async function loadRuleRoster() {
  const engine = path.join(APP_DIR, 'packages/synergy-engine/dist/index.js');
  const {getAllRules} = await import(pathToFileURL(engine).href);
  return getAllRules().map((r) => ({ruleId: r.id, ruleName: r.name, category: r.category}));
}

/** Record a card's display name, keeping the first occurrence (allCards wins). */
function addNameIfAbsent(names, card) {
  // Card ids are numbers here; vote/pair_scores card ids are strings, so key by
  // String(id) so that `names.get(stringId)` in the builders matches.
  if (!names.has(String(card.id))) names.set(String(card.id), card.fullName ?? card.name ?? String(card.id));
}

/** Card id -> display name, from allCards.json + previewCards.json. */
function loadCardNames() {
  const names = new Map();
  const files = ['allCards.json', 'previewCards.json']
    .map((f) => path.join(APP_DATA, f))
    .filter((p) => fs.existsSync(p));
  for (const p of files) {
    const {cards} = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const c of cards) addNameIfAbsent(names, c);
  }
  return names;
}

async function main() {
  console.log('⚙ Pre-computing vote analytics...');
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    console.warn('  ⚠ Supabase env absent: writing empty files.');
    writeOut('vote-analytics.json', emptyArtifact());
    writeOut('vote-log.json', EMPTY_LOG);
    return;
  }

  const {enginePairs, ruleTotalPairs} = loadEngineArtifacts(path.join(APP_DATA, 'synergies'));
  const allRules = await loadRuleRoster();
  const names = loadCardNames();
  const scoreRows = await fetchAllRows(createClient(url, anon), 'pair_scores', '*');

  let rawVotes = null;
  if (service) {
    rawVotes = await fetchAllRows(createClient(url, service), 'votes', VOTE_COLUMNS);
  } else {
    console.warn('  ⚠ SUPABASE_SERVICE_ROLE_KEY absent: leaving out weekly activity, voters, dimensions and the vote log.');
  }

  writeOut('vote-analytics.json', buildAnalytics({scoreRows, enginePairs, allRules, names, ruleTotalPairs, rawVotes}));
  writeOut('vote-log.json', rawVotes ? buildVoteLog(rawVotes, names) : EMPTY_LOG);
}

main().catch((err) => {
  console.error('Vote-analytics precompute failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the empty path**

```bash
env -u VITE_SUPABASE_URL -u VITE_SUPABASE_ANON_KEY -u SUPABASE_SERVICE_ROLE_KEY node scripts/precompute-vote-analytics.mjs
node -e "for (const f of ['vote-analytics', 'vote-log']) console.log(f, Object.keys(require('./public/admin-data/' + f + '.json')).join(','))"
```

Expected: the warning, then `wrote public/admin-data/vote-analytics.json` and `wrote public/admin-data/vote-log.json`. The keys printed are:
- `vote-analytics hasRawVotes,global,rules,pairs,generatedAt`
- `vote-log votes,voterCount,generatedAt`

The full path needs the Supabase secrets, so it first runs in the deploy after the merge (Task 9). If it fails there, the run stops before deploying, and the previous deployment keeps serving.

- [ ] **Step 3: Clean up and lint**

```bash
rm -r public/admin-data
pnpm exec eslint scripts/precompute-vote-analytics.mjs
```

Expected: no output from ESLint.

- [ ] **Step 4: Commit** (after the owner approves)

```bash
git add scripts/precompute-vote-analytics.mjs
USER_APPROVED=1 git commit -m "feat(analytics): precompute vote analytics from the app's master into /admin-data/ (#3)"
```

### Task 3: The Web Analytics precompute

**Files:**
- Create: `scripts/precompute-vercel-analytics.mjs`

It is the app's script with four changes:
1. It writes to `public/admin-data/`.
2. `VERCEL_PROJECT_ID` becomes `ANALYTICS_VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID` becomes `ANALYTICS_VERCEL_TEAM_ID`. In the deploy workflow, `VERCEL_PROJECT_ID` names admin's own project, for the Vercel CLI.
3. There is no `apps/web/.env.local` fallback.
4. It logs the file name instead of event counts.

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
/**
 * Web Analytics for the admin analytics tool (docs/PLAN.md, D8). Queries the
 * Vercel Web Analytics Query API for the custom events in EVENT_QUERIES and
 * writes public/admin-data/vercel-analytics.json, which the tool reads behind
 * the admin login.
 *
 * Reads (build-time only; never VITE_-prefixed, so they can't reach the bundle):
 *   - VERCEL_ANALYTICS_TOKEN        Vercel access token with read scope (required)
 *   - ANALYTICS_VERCEL_PROJECT_ID   prj_… of the app's Vercel project (required).
 *     Not VERCEL_PROJECT_ID: in the deploy workflow that names admin's own project.
 *   - ANALYTICS_VERCEL_TEAM_ID      team_… that owns it (optional; omit for a
 *     personal-account project)
 *   - VERCEL_ANALYTICS_WINDOW_DAYS  lookback in days (optional, default 60, at most 62)
 *
 * A web-analytics tab is not worth a failed deploy: without the token or project
 * id, or when the API fails, this writes the empty-but-valid file and exits 0.
 * It exits 1 only when it cannot write that file. Workflow logs are public while
 * the repo is, so it logs the file it wrote and, on an API failure, the endpoint
 * and HTTP status: never event counts or response bodies.
 *
 * Docs: https://vercel.com/docs/analytics/web-analytics-api
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  EVENT_QUERIES,
  DEFAULT_BREAKDOWN_LIMIT,
  eventNameFilter,
  breakdownDimension,
  breakdownValueKey,
  reportingWindow,
  resolveWindowDays,
  buildEvent,
  buildVercelAnalytics,
  emptyVercelAnalytics,
} from './lib/vercelAnalytics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/admin-data');
const OUT_NAME = 'vercel-analytics.json';
const API_BASE = 'https://api.vercel.com/v1/query/web-analytics';
// Each request's deadline, body included. Fetch has no overall one, so a stalled
// request would hold the deploy instead of failing into the empty file.
const REQUEST_TIMEOUT_MS = 30_000;

/** Write the admin-data file, naming it (never its contents) in the log. */
function writeArtifact(obj) {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(path.join(OUT_DIR, OUT_NAME), JSON.stringify({...obj, generatedAt: new Date().toISOString()}));
  console.log(`  wrote public/admin-data/${OUT_NAME}`);
}

/**
 * One authenticated GET against the Web Analytics Query API; returns the `data` field.
 * Its errors name the endpoint and HTTP status only: the workflow logs them, and a
 * response body can hold event data.
 */
async function vercelQuery(endpoint, params, {token, projectId, teamId}) {
  const search = new URLSearchParams({projectId, ...params});
  if (teamId) search.set('teamId', teamId);
  const res = await fetch(`${API_BASE}/${endpoint}?${search}`, {
    headers: {Authorization: `Bearer ${token}`},
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Vercel API ${endpoint} ${res.status}`);
  // JSON.parse quotes the text around a syntax error, so its message is replaced too.
  const body = await res.json().catch(() => {
    throw new Error(`Vercel API ${endpoint} ${res.status}: the response could not be read as JSON`);
  });
  return body.data;
}

/** Pull count + trend + every configured breakdown for one event. */
async function queryEvent(query, window, creds) {
  const filter = eventNameFilter(query.name);
  const count = await vercelQuery('events/count', {filter}, creds);
  const trend = await vercelQuery(
    'events/aggregate',
    {since: window.since, until: window.until, by: 'day', filter},
    creds,
  );
  const breakdowns = [];
  for (const b of query.breakdowns) {
    const rows = await vercelQuery(
      'events/aggregate',
      {
        since: window.since,
        until: window.until,
        by: breakdownDimension(b),
        filter,
        limit: String(b.limit ?? DEFAULT_BREAKDOWN_LIMIT),
      },
      creds,
    );
    breakdowns.push({prop: b.prop, label: b.label, valueKey: breakdownValueKey(b), numeric: b.numeric, rows});
  }
  return buildEvent({name: query.name, label: query.label, count, trend, breakdowns});
}

async function main() {
  console.log('⚙ Pre-computing Vercel Web Analytics...');
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  const projectId = process.env.ANALYTICS_VERCEL_PROJECT_ID;
  const teamId = process.env.ANALYTICS_VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.warn('  ⚠ VERCEL_ANALYTICS_TOKEN / ANALYTICS_VERCEL_PROJECT_ID absent: writing the empty file.');
    writeArtifact(emptyVercelAnalytics());
    return;
  }

  const days = resolveWindowDays(process.env.VERCEL_ANALYTICS_WINDOW_DAYS);
  const window = reportingWindow(new Date(), days);
  const creds = {token, projectId, teamId};

  const events = [];
  for (const query of EVENT_QUERIES) {
    events.push(await queryEvent(query, window, creds));
  }
  writeArtifact(buildVercelAnalytics({events, window}));
}

main().catch((err) => {
  // An API failure must not break a deploy: log it, write the empty file so the
  // tab shows its no-data state, and exit 0. If even that write fails, exit 1, so
  // no deploy ships without the file.
  console.warn(`  ⚠ Vercel-analytics precompute failed; writing the empty file: ${err.message}`);
  try {
    writeArtifact(emptyVercelAnalytics());
  } catch (writeErr) {
    console.warn(`  ⚠ Could not write the empty file: ${writeErr.message}`);
    process.exitCode = 1;
  }
});
```

- [ ] **Step 2: Run the empty path**

```bash
env -u VERCEL_ANALYTICS_TOKEN -u ANALYTICS_VERCEL_PROJECT_ID node scripts/precompute-vercel-analytics.mjs
node -e "console.log(Object.keys(require('./public/admin-data/vercel-analytics.json')).join(','))"
```

Expected: the warning, then `wrote public/admin-data/vercel-analytics.json`. The keys printed are `hasVercelData,reportingWindow,events,generatedAt`.

- [ ] **Step 3: Clean up and lint**

```bash
rm -r public/admin-data
pnpm exec eslint scripts/precompute-vercel-analytics.mjs
```

- [ ] **Step 4: Commit** (after the owner approves)

```bash
git add scripts/precompute-vercel-analytics.mjs
USER_APPROVED=1 git commit -m "feat(analytics): precompute Web Analytics into /admin-data/ (#3)"
```

### Task 4: Keep the app checkout and the generated data out of the repo and the tools

**Files:**
- Modify: `.gitignore`, `eslint.config.js:32`, `vite.config.ts` (the `test.exclude` line)

- [ ] **Step 1: `.gitignore`.** Append:

```gitignore
# P3 analytics: the app checkout the deploy builds from, and the files it writes
app-master/
public/admin-data/
```

- [ ] **Step 2: ESLint.** In `eslint.config.js`, change the global ignores line:

```js
  {ignores: ['dist', 'coverage', 'upstream', 'app-master']},
```

- [ ] **Step 3: Vitest.** In `vite.config.ts`, extend `test.exclude`:

```ts
    exclude: ['**/node_modules/**', 'upstream/**', 'app-master/**', 'dist/**'],
```

- [ ] **Step 4: Check.**

Run: `pnpm lint && pnpm exec vitest run scripts`
Expected: both pass, and the analytics and banner tests all run.

- [ ] **Step 5: Commit** (after the owner approves)

```bash
git add .gitignore eslint.config.js vite.config.ts
USER_APPROVED=1 git commit -m "chore(analytics): ignore the app checkout and the generated admin data (#3)"
```

### Task 5: [owner] The Actions secrets

The owner runs these and types each value; never type one for them. `gh secret set` prompts for the value unless `--body` is given.

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: the app's Supabase project `ttyidjyaxnycbpxwngqr`, under Settings → API. These are the same values as the app's client env.
- `SUPABASE_SERVICE_ROLE_KEY`: the same page. It is secret: it bypasses row-level security.
- `VERCEL_ANALYTICS_TOKEN`: a Vercel access token, created under Account Settings → Tokens and scoped to the team that owns the app project. Create a new one rather than copying the app's: P5 removes the app's from its Vercel env.
- `ANALYTICS_VERCEL_PROJECT_ID`: the app's project id. It isn't sensitive, and issue #3 gives it.

```bash
gh secret set VITE_SUPABASE_URL --repo Doberjohn/inkweave-admin
gh secret set VITE_SUPABASE_ANON_KEY --repo Doberjohn/inkweave-admin
gh secret set SUPABASE_SERVICE_ROLE_KEY --repo Doberjohn/inkweave-admin
gh secret set VERCEL_ANALYTICS_TOKEN --repo Doberjohn/inkweave-admin
gh secret set ANALYTICS_VERCEL_PROJECT_ID --repo Doberjohn/inkweave-admin --body prj_uU766Ax6BMYanXQqSjiaGWsYnom9
```

`ANALYTICS_VERCEL_TEAM_ID` needs no secret of its own: the workflow passes `secrets.VERCEL_ORG_ID`, admin's team. That assumes the app project lives in the same Vercel team. If it doesn't, the Web Analytics step logs its warning, and the tab shows its no-data state (Task 9 checks this).

- [ ] **Verify:** `gh secret list --repo Doberjohn/inkweave-admin` lists the five new names next to `APP_REPO_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and `VERCEL_TOKEN`.

### Task 6: The analytics steps in the deploy workflow

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Replace the file with this version.** Compared with the current file, it adds the `schedule` trigger and the three steps between "Install dependencies" and "Pull Vercel production settings". It also adds the `/admin-data/` URL to the final assertion.

```yaml
# Admin deploy (docs/PLAN.md, D4). Vercel cannot clone the private submodule,
# so the build runs here and ships with `vercel deploy --prebuilt`, mirroring
# the app's own deploy workflow. Vercel login is the whole security model, so
# nothing ships unless the project uses All Deployments protection, and the last
# step fails the run if any admin URL answers an anonymous request.
name: Deploy

on:
  push:
    branches: [main]
  # The analytics refresh (docs/PLAN.md, D8; docs/plans/P3-pipelines.md, P3-3).
  schedule:
    - cron: '0 4 * * *'
  workflow_dispatch:

# Nothing here writes to GitHub, and checkout authenticates with APP_REPO_TOKEN,
# so the workflow's own GITHUB_TOKEN only needs to read.
permissions:
  contents: read

concurrency:
  group: deploy-admin
  cancel-in-progress: false

# Pinned for the same reason as the app's deploy.yml: unpinned `npx vercel`
# can straddle two CLI versions inside one job.
env:
  VERCEL_CLI_VERSION: '60.0.0'

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v7
        with:
          submodules: true
          token: ${{ secrets.APP_REPO_TOKEN }}
          # Submodules are fetched inside this step; don't leave the token in
          # .git/config for later steps (dependency install scripts included).
          persist-credentials: false

      # Third-party action pinned to a commit; bump the SHA and comment together.
      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0

      - uses: actions/setup-node@v7
        with:
          node-version-file: '.nvmrc'
          cache: pnpm

      # Standard Protection leaves production domains such as inkweave-admin.vercel.app
      # public, so the job stops here, before install and build, unless the project
      # uses All Deployments. The script needs only Node and the Vercel secrets.
      - name: Refuse to deploy unless every URL needs Vercel login
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: node scripts/vercel-project-urls.mjs

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Analytics (docs/PLAN.md, D8). Calibration compares votes with the scores
      # production serves, so the engine and synergy data come from the app's
      # current master, not the pinned submodule. Every run needs this, push
      # included: the files ship inside the deployment, under /admin-data/.
      - name: Check out the app's master for analytics
        uses: actions/checkout@v7
        with:
          repository: Doberjohn/inkweave
          ref: master
          path: app-master
          token: ${{ secrets.APP_REPO_TOKEN }}
          persist-credentials: false

      # precompute-synergies needs only the built engine, and that build needs no
      # install scripts, so none run: faster, and no third-party postinstall runs
      # in the deploy job.
      - name: Build the app's engine and synergy data
        run: |
          pnpm --dir app-master install --frozen-lockfile --ignore-scripts
          pnpm --dir app-master --filter inkweave-synergy-engine build
          node app-master/scripts/precompute-synergies.mjs

      # The secrets reach only this step. Its log names the files it writes,
      # never their numbers: workflow logs are public while the repo is.
      - name: Precompute analytics into public/admin-data/
        env:
          APP_DIR: app-master
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          VERCEL_ANALYTICS_TOKEN: ${{ secrets.VERCEL_ANALYTICS_TOKEN }}
          ANALYTICS_VERCEL_PROJECT_ID: ${{ secrets.ANALYTICS_VERCEL_PROJECT_ID }}
          # The app's Vercel project lives in admin's team.
          ANALYTICS_VERCEL_TEAM_ID: ${{ secrets.VERCEL_ORG_ID }}
        run: |
          node scripts/precompute-vote-analytics.mjs
          node scripts/precompute-vercel-analytics.mjs

      - name: Pull Vercel production settings
        run: npx "vercel@${VERCEL_CLI_VERSION:?}" pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: npx "vercel@${VERCEL_CLI_VERSION:?}" build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy prebuilt output to production
        id: deploy
        run: |
          url=$(npx "vercel@${VERCEL_CLI_VERSION:?}" deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> "$GITHUB_OUTPUT"

      # The domain list is read after the deploy: a project's first production
      # deploy is what gives it the <project>.vercel.app domain. The vote log is
      # the most sensitive file admin serves, so it is asserted by name too.
      - name: Assert every admin URL is behind Vercel login
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          DEPLOY_URL: ${{ steps.deploy.outputs.url }}
          ADMIN_PRODUCTION_URL: ${{ vars.ADMIN_PRODUCTION_URL }}
        run: |
          node scripts/vercel-project-urls.mjs > "$RUNNER_TEMP/project-urls.txt"
          mapfile -t project_urls < "$RUNNER_TEMP/project-urls.txt"
          node scripts/assert-login-gate.mjs "$DEPLOY_URL" "$ADMIN_PRODUCTION_URL" "$ADMIN_PRODUCTION_URL/admin-data/vote-log.json" "${project_urls[@]}"
```

- [ ] **Step 2: Check the YAML parses and the steps are in order**

Run: `node -e "const y = require('fs').readFileSync('.github/workflows/deploy.yml', 'utf8'); for (const m of y.matchAll(/- name: (.+)/g)) console.log(m[1]); console.log(/cron: '0 4 \* \* \*'/.test(y) ? 'nightly cron present' : 'CRON MISSING')"`

Expected: the step names in order, with the three analytics steps before "Pull Vercel production settings", then `nightly cron present`. GitHub validates the workflow when it is pushed. A syntax error shows on the Actions tab as "Invalid workflow file".

- [ ] **Step 3: Commit** (after the owner approves)

```bash
git add .github/workflows/deploy.yml
USER_APPROVED=1 git commit -m "feat(deploy): build analytics from the app's master nightly and on every deploy (#3)"
```

### Task 7: Document the pipeline

**Files:**
- Modify: `CLAUDE.md` (a new section after "The tools")
- Modify: `docs/PLAN.md` (the P3 outline)

- [ ] **Step 1: `CLAUDE.md`.** Add this section after "## The tools":

```markdown
## Pipelines

- **Analytics.** The Deploy workflow runs nightly (04:00 UTC), on every push to `main`, and on demand (`gh workflow run deploy.yml --repo Doberjohn/inkweave-admin`). It checks out the app's `master` into `app-master/`, builds that engine and its synergy data, and runs `scripts/precompute-{vote,vercel}-analytics.mjs`. Those write `public/admin-data/`, which ships inside the login-gated deployment. `app-master/` and `public/admin-data/` are git-ignored; locally the analytics tool shows its "not generated" state.
- **Secrets.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_ANALYTICS_TOKEN` and `ANALYTICS_VERCEL_PROJECT_ID` (the app's Vercel project: in the workflow, `VERCEL_PROJECT_ID` names admin's own). The owner sets them.
- **Logs.** The precomputes log the files they write, never vote, voter or event counts: a public repo's workflow logs are public.
```

- [ ] **Step 2: `docs/PLAN.md`.** Under "### P3: Pipelines", add the same pointer line P2 has:

```markdown
Detailed plan and as-built notes: [docs/plans/P3-pipelines.md](plans/P3-pipelines.md).
```

- [ ] **Step 3: Commit** (after the owner approves)

```bash
git add CLAUDE.md docs/PLAN.md
USER_APPROVED=1 git commit -m "docs: record the analytics pipeline (#3)"
```

### Task 8: Gates, CodeScene, PR

- [ ] **Step 1: Run the gates**

Run: `pnpm check:deps && pnpm typecheck && pnpm lint && pnpm test:run && pnpm build`
Expected: all pass. The test count grows by 44.

- [ ] **Step 2: CodeScene.** Run `analyze_change_set` against `main`, and `code_health_review` on each new script (the change-set analysis can skip new files). Expected: the quality gate passes. Ported code that trips a smell gets the smallest fix that clears it. Don't reshape it wholesale.

- [ ] **Step 3: Push and open the PR** (after the owner approves)

```bash
USER_APPROVED=1 git push -u origin feature/3-pipelines
gh pr create --repo Doberjohn/inkweave-admin --base main --title "Analytics pipeline in the admin deploy (P3a)" --body "Part of #3. The analytics precomputes run in admin's deploy (nightly, on every push to main, and on demand) from the app's current master, and ship their JSON inside the login-gated deployment under /admin-data/. Plan: docs/plans/P3-pipelines.md."
```

Expected: CI (build-and-test) passes. CI doesn't run the deploy workflow, so the analytics steps first run on merge.

### Task 9: After the merge

- [ ] **Step 1: The merge's deploy.** Open the Deploy run for the merge commit. Expected:
  - the analytics step prints `wrote public/admin-data/vote-analytics.json`, `vote-log.json` and `vercel-analytics.json`, with no `⚠` line;
  - the last step prints `gated` for the deployment, the production URL and `…/admin-data/vote-log.json`.

A `⚠` line from the Web Analytics precompute means the token, the project id or the team assumption from Task 5 is wrong. Fix the secret, then run `gh workflow run deploy.yml --repo Doberjohn/inkweave-admin`.
- [ ] **Step 2: [owner] The tool.** The owner opens `/analytics` on the deployed admin. Calibration, Activity and Web Analytics show real data.
- [ ] **Step 3: The schedule.** The next day, `gh run list --repo Doberjohn/inkweave-admin --workflow deploy.yml --event schedule --limit 1` shows a successful run.

### P3a as built (2026-09-29)

- **The install.** The app-master install runs without `--filter` and with `--ignore-scripts`. pnpm 9 installed the whole workspace even with the filter. Skipping install scripts saves time, and no third-party postinstall (Sentry's CLI download, husky) runs in the deploy job. The engine build needs none of them.
- **The local checks, before any secret existed:**
  - Both scripts' empty paths wrote their files with the expected keys.
  - The Web Analytics script's failure path: a dummy token drew a 403, and the script wrote the empty file and exited 0.
  - A dry run against a shallow clone of the app's `master` (`76d13bc`): the workflow's install, engine build and `precompute-synergies` (22,503 pairs), then the vote script with a dummy Supabase URL. It read every synergy file, the rule roster and the card names, and stopped at the `pair_scores` fetch, exiting 1 without writing anything.

---

## Part 2: Bump the pin (branch `feature/3-bump-upstream`, its own PR)

The P3b port reads from the pin, so the pin moves to the app's current `master` first. This follows CLAUDE.md, "Updating the app pin".

### Task 10: Bump `upstream/inkweave`

- [ ] **Step 1: Branch from an up-to-date `main`**

```bash
git switch main && git pull --ff-only && git switch -c feature/3-bump-upstream
```

- [ ] **Step 2: [owner approves] Move the pin**

```bash
USER_APPROVED=1 git submodule update --remote upstream/inkweave
git -C upstream/inkweave log -1 --format='%h %cI %s'
```

Expected: the app's current `master` head. The bump is 138 commits or more at the time of writing.

- [ ] **Step 3: Align the dependencies**

Run: `pnpm check:deps --fix && pnpm install`
Expected: `Dependency parity with the app: OK` on a second `pnpm check:deps`.

- [ ] **Step 4: Run the bridge contract and everything else**

Run: `pnpm typecheck && pnpm lint && pnpm test:run && pnpm build`

Three kinds of breakage to expect, each fixed in admin (upstream stays read-only):
- A bridged module moved or changed its exports. Fix the re-export in `src/app-bridge.ts`, which is the only file allowed to import from upstream.
- The app's design-token ESLint rules changed. Fix the flagged admin lines. `SynergyBanner.tsx`'s exception list may only shrink.
- The app added runtime dependencies. `check:deps --fix` already added them.

- [ ] **Step 5: Storybook smoke.** Run `pnpm storybook`. Open the tuning editor, the reveal form and the analytics page stories, and check the console shows no errors.

- [ ] **Step 6: Commit, PR, merge** (after the owner approves)

```bash
git add upstream/inkweave package.json pnpm-lock.yaml
USER_APPROVED=1 git commit -m "chore: bump upstream/inkweave to <short sha> (#3)"
USER_APPROVED=1 git push -u origin feature/3-bump-upstream
gh pr create --repo Doberjohn/inkweave-admin --base main --title "chore: bump upstream/inkweave to <short sha>" --body "Brings reveal-sync and the fetch-reveals skill up to the app's master before P3b ports them (#3). Also unblocks #14 (scanLanguage)."
```

`<short sha>` is the hash Step 2 printed. Stage any admin fixes from Step 4 in the same commit or in commits before it. CI on this PR is the bridge's contract test.

---

## Part 3: P3b, reveal ingestion (branch `feature/3-reveal-ingestion`, PR "Closes #3")

reveal-sync moves from the app into admin, ported from the bumped pin (`c05cb253`). Its analysis half ports unchanged: the gates, the official list, the blind readers, adjudication and the report. Its write half changes:
- It reads the app's `previewCards.json` from `master` and admin's `state.json` from `main` through `gh`. It then works from snapshots of both.
- It converts art in a scratch folder. It opens a PR in the app repo holding `previewCards.json` and the new AVIFs.
- It commits the new `state.json` straight to admin's `main` (P3-6).

Nothing reads or writes a local app checkout any more.

**Found while planning (2026-09-30):**
- **The write chain.** `write` validates and builds cards with the reveal publisher's own modules. Admin's copies in `src/tools/reveal/` come from the old pin. Since then the app added house style (#635, commits `597d3a77` and `495f1b45`). Task 11 ports it first, so the publisher and reveal-sync both write house-style text. No other admin tool drifted: the app's image, tuning and analytics features are unchanged since `e70249be`.
- **App code in Node.** reveal-sync loads TypeScript through Vite's `runnerImport`. It reaches the app only through `src/app-bridge.ts`, as `src/` does. The bridge imports the app's CSS, but Vite's CSS plugins fail outside a dev server ("Cannot read properties of undefined (reading 'get')"). So `web.mjs` resolves each stylesheet to an empty module before those plugins see it. Loading the bridge and the chain this way took about 8 s.
- **The converter.** `scripts/convert-preview-images.mjs` converts `apps/web/public/card-images-raw/` into `card-images-preview/` beside itself, and has no flags for other folders. `upstream/` is read-only, so `write` runs a copy of it from a git-ignored scratch folder inside admin, where `sharp` resolves from admin's `node_modules`. The app's CI conversion (`convert-reveal-images.yml`) remains the reveal publisher's route: it converts raws pushed to `master`, which a PR branch never triggers.
- **CodeScene.** Every reveal-sync module scores 10.0 at the pin.
- **Staying in the app until P4.** `scripts/sync-variants.mjs` loads its season through the app's own `reveal-sync/web.mjs`.

**As built (2026-09-30).** Execution added these fixes to the tasks below:
- **Task 12, the port.** Three fixes to get the copy running:
  - `text.mjs` imported the engine by its path in the app monorepo (`../../packages/synergy-engine/dist/index.js`). It now imports `inkweave-synergy-engine`, admin's workspace package, which is the same build.
  - Two tests in `text.test.mjs` read every real card as a corpus. They now read it from the pinned app's data (`upstream/inkweave/apps/web/public/data`), as a file, never an import.
  - `browser.mjs`'s `/* global */` directive redeclared `fetch`, `Blob` and `URL`, which admin's lint already declares. They were dropped, with no change at runtime.
- **Task 20, the rehearsal.** A rehearsal run skips the official list, so `openRun` refused it. `rehearse.mjs` now records a stand-in summary, so `run.mjs write` and `report` open it like any run. The rehearsal behaved as planned:
  - It opened Doberjohn/inkweave#662 from `reveals/set14-20260930-115045` into `reveals-verify`.
  - The PR held exactly `previewCards.json` (+32 lines, one card) and two AVIFs, at 337×470 and 191×266.
  - The state commit changed only `state.json` (+5 lines).
  - Publishing again made no GitHub call, and `start`'s open-PR check saw #662.
  - Everything was closed and deleted afterwards.
- **Task 21, the runbook.** It copies the reveal-operations sections (ids, ink blocks, record conventions, variant printings). It links the app doc's Production section and app-side gotchas instead of copying them: those cover the app's own flag, deploy and E2E, and would drift here.

**P3b creates:**

| File | Responsibility |
|---|---|
| `scripts/reveal-sync/**` | The pipeline, from the pin: 14 modules, 2 fixture files, 9 test files and `state.json` |
| `scripts/reveal-sync/github.mjs` | Every GitHub call a run makes, through `gh api` |
| `scripts/reveal-sync/convert.mjs` | AVIFs through a scratch copy of the app's converter |
| `scripts/reveal-sync/base.mjs` | What `start` checks and reads: no open reveal PR, then both bases |
| `scripts/reveal-sync/publish.mjs` | The app PR and the state commit, resumable |
| `scripts/reveal-sync/rehearse.mjs` | Task 20's end-to-end check against throwaway branches |
| `scripts/reveal-sync/__fixtures__/gh.mjs` | A fake `gh api` for tests |
| `scripts/reveal-sync/{web,github,convert,base,runstore,write,publish}.test.mjs` | Tests for the new and changed modules |
| `.claude/skills/fetch-reveals/SKILL.md` | The skill, run from an admin session |
| `docs/PREVIEW_CARD_PARSER.md`, `docs/REVEAL_RUNBOOK.md` | The parser reference and the operations runbook |
| `src/tools/reveal/__tests__/RevealAdminFormCardText.test.tsx` | #635's form behaviour |

**P3b modifies:**
- `src/tools/reveal/validateForm.ts` and `buildPreviewCard.ts`
- `src/tools/reveal/components/RevealAdminForm.tsx`, with its story and tests
- `src/app-bridge.ts`
- `.gitignore` and `eslint.config.js`
- `.github/workflows/ci.yml` and `deploy.yml`
- `CLAUDE.md` and `docs/PLAN.md`

Every commit below needs the owner's approval, with the `USER_APPROVED=1` prefix, and runs through the pre-commit gate (lint and `pnpm test:run`). Stop preview servers first (memory: pre-commit worker timeout).

### Task 11: Bring the reveal publisher's write chain up to the pin (#635)

**Files:**
- Modify: `src/tools/reveal/validateForm.ts`, `src/tools/reveal/buildPreviewCard.ts`, `src/tools/reveal/components/RevealAdminForm.tsx`, `src/tools/reveal/components/RevealAdminForm.stories.tsx`
- Test: `src/tools/reveal/__tests__/validateForm.test.ts`, `src/tools/reveal/__tests__/buildPreviewCard.test.ts`
- Create: `src/tools/reveal/__tests__/RevealAdminFormCardText.test.tsx`

The engine at the pin exports the three functions #635 uses: `canonicalizeCardFullText`, `findGlyphWords` and `findSpelledGlyphWords`. Admin's copies were restructured in P2: they import through the bridge, the stat check is `checkStats`, and the form uses a `control()` helper. So the app's diff is adapted here rather than applied.

- [ ] **Step 1: Write the failing tests**

In `src/tools/reveal/__tests__/validateForm.test.ts`, below `const NO_IDS = new Set<number>();`:

```ts
/** The Card Text error for this text, on an otherwise valid form. */
function fullTextError(fullText: string): string | undefined {
  return validateRevealCardForm(form({fullText}), NO_IDS, 'mei.png').errors.fullText;
}

/** The Keywords error for these chips, on an otherwise valid form. */
function keywordsError(keywords: string): string | undefined {
  return validateRevealCardForm(form({keywords}), NO_IDS, 'mei.png').errors.keywords;
}
```

Then add these at the end of the `describe('validateRevealCardForm', ...)` block:

```ts
  // House style (#635): a word the build cannot turn into a glyph must not reach the data.
  it('refuses a capitalized glyph word house style cannot place, naming it', () => {
    const r = validateRevealCardForm(form({fullText: 'Your Strength wins.'}), NO_IDS, 'mei.png');
    expect(r.ok).toBe(false);
    expect(r.errors.fullText).toMatch(/"Strength"/);
  });

  it('accepts glyph words the build rewrites, such as "pay 1 Ink less"', () => {
    expect(fullTextError('you pay 1 Ink less for the next item.')).toBeUndefined();
  });

  it('accepts a card name that holds a glyph word', () => {
    expect(fullTextError('Play an item named Ink Amplifier.')).toBeUndefined();
  });

  // "gain 2 ◊" would pass every check and read as no lore gain; released text says "gain 2 lore".
  it('points a capitalized gained Lore to the lowercase word, not the glyph', () => {
    expect(fullTextError('Gain 2 Lore.')).toMatch(/"gain 2 lore"/);
  });

  // Keyword chips become ability text as typed; the build rewrites nothing there.
  it('refuses a glyph word in a keyword chip, naming it', () => {
    expect(keywordsError('Challenger +2 Strength')).toMatch(/"Strength"/);
  });

  it('accepts real keyword chips', () => {
    expect(keywordsError('Singer 5\nShift 3\nResist +1')).toBeUndefined();
  });
```

At the end of `describe('buildPreviewCard', ...)` in `src/tools/reveal/__tests__/buildPreviewCard.test.ts`:

```ts
  // Kit Cloudkicker - Sure Shot (14192) as it was typed in; the engine reads glyphs only (#635).
  it('writes card text in house style, glyphs for the words', () => {
    const card = buildPreviewCard(
      form({
        fullText:
          'Shift 3 (You may pay 3 Ink to play this on top of one of your characters named Kit Cloudkicker.)',
      }),
    );
    const canonical =
      'Shift 3 ⬡ (You may pay 3 ⬡ to play this on top of one of your characters named Kit Cloudkicker.)';
    expect(card.fullText).toBe(canonical);
    expect(card.fullTextSections).toEqual([canonical]);
  });
```

Create `src/tools/reveal/__tests__/RevealAdminFormCardText.test.tsx`:

```tsx
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, it, expect} from 'vitest';
import {RevealAdminForm} from '../components/RevealAdminForm';
import type {RevealCardForm} from '../buildPreviewCard';

// Kit Cloudkicker - Sure Shot (14192) as it was typed into the reveal publisher (#635).
const SPELLED_OUT =
  'Shift 3 (You may pay 3 Ink to play this on top of one of your characters named Kit Cloudkicker.)';

function kitForm(fullText: string): RevealCardForm {
  return {
    collectorNumber: '192',
    name: 'Kit Cloudkicker',
    version: 'Sure Shot',
    rarity: 'Rare',
    franchise: '',
    cost: '5',
    ink: 'Steel',
    ink2: '',
    inkwell: true,
    type: 'Character',
    strength: '3',
    willpower: '4',
    lore: '2',
    moveCost: '',
    subtypes: '',
    keywords: '',
    fullText,
  };
}

/** The form with real state, beside a Publish button, as RevealPage lays them out. */
function Harness({fullText}: {fullText: string}) {
  const [form, setForm] = useState(() => kitForm(fullText));
  return (
    <>
      <RevealAdminForm form={form} errors={{}} onChange={(patch) => setForm((f) => ({...f, ...patch}))} />
      <button type="button">Publish</button>
    </>
  );
}

const cardText = () => screen.getByLabelText('Full card text (one ability per line)');

describe('RevealAdminForm Card Text', () => {
  it('shows the house-style rewrite when the owner moves on to another control', async () => {
    const user = userEvent.setup();
    render(<Harness fullText={SPELLED_OUT} />);
    await user.click(cardText());
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    expect(cardText()).toHaveValue(
      'Shift 3 ⬡ (You may pay 3 ⬡ to play this on top of one of your characters named Kit Cloudkicker.)',
    );
  });

  // Alt-tab to copy the next ability blurs the field but leaves it the active element. A
  // rewrite then would trim the trailing newline and glue the next paste onto this line.
  it('leaves the text exactly as typed when the window loses focus', async () => {
    const user = userEvent.setup();
    const typed = `${SPELLED_OUT}\n`;
    render(<Harness fullText={typed} />);
    await user.click(cardText());
    fireEvent.blur(cardText());
    expect(cardText()).toHaveValue(typed);
  });
});
```

- [ ] **Step 2: Run them and watch five fail**

Run: `pnpm vitest run src/tools/reveal`
Expected: five failures:
- the three refusing tests;
- the house-style build test;
- the rewrite-on-leave form test.

The three accepting tests and the window-blur test already pass: nothing checks or rewrites the text yet.

- [ ] **Step 3: Implement**

`src/tools/reveal/validateForm.ts`:
1. Replace line 1 with `import {findGlyphWords, findSpelledGlyphWords, type Ink} from 'inkweave-synergy-engine';`
2. Below `const VALID_EXT = ...`, add:

```ts
/** How card data writes each glyph word, with a released example. Lore is a word when gained. */
const GLYPH_HINTS: Record<string, string> = {
  Ink: 'use ⬡ ("pay 2 ⬡")',
  Strength: 'use ¤ ("their ¤")',
  Willpower: 'use ⛉ ("+1 ⛉")',
  Lore: 'use ◊ for the stat ("+1 ◊"), or lowercase "lore" to gain it ("gain 2 lore")',
};
```

3. Above `function checkImage`, add:

```ts
/**
 * Card text must reach the data in house style (#635): the engine matches glyphs, so a
 * spelled-out "1 Ink" silently costs a card its mechanics. buildPreviewCard rewrites the
 * shapes it knows; a capitalized word still left is one it cannot place, so publish waits.
 * Keyword chips reach the ability text as typed, with no rewrite, so any glyph word there
 * is refused; no real keyword holds one.
 */
function checkCardText(form: RevealCardForm, errors: Errors): void {
  const [word] = findGlyphWords(form.fullText);
  if (word) errors.fullText = `"${word}" is spelled out: ${GLYPH_HINTS[word] ?? 'use its glyph'}`;
  const [chipWord] = findSpelledGlyphWords(form.keywords);
  if (chipWord) {
    errors.keywords = `Keywords take a name and a number only ("Shift 3"): remove "${chipWord}"`;
  }
}
```

4. In `validateRevealCardForm`, call `checkCardText(form, errors);` between `checkStats(form, errors);` and `checkImage(imageName, errors);`.

`src/tools/reveal/buildPreviewCard.ts`:
1. Replace line 1 with:

```ts
import {
  canonicalizeCardFullText,
  type Ink,
  type CardType,
  type LorcanaJSONCard,
} from 'inkweave-synergy-engine';
```

2. Replace `const fullText = form.fullText.replace(/\r\n/g, '\n').trim();` with:

```ts
  // House style (#635): the engine matches glyphs, not "1 Ink", so write the glyphs.
  const fullText = canonicalizeCardFullText(form.fullText);
```

`src/tools/reveal/components/RevealAdminForm.tsx`:
1. Replace the first two imports with:

```tsx
import type {ChangeEvent, FocusEvent} from 'react';
import {canonicalizeCardFullText, type Ink} from 'inkweave-synergy-engine';
```

2. Below `const statFields = STAT_FIELDS[form.type] ?? [];`, add:

```tsx
  // Show the house-style rewrite (#635) when the owner moves on within the page. Not when the
  // window or tab loses focus (alt-tab to copy the next ability): the field is still the active
  // element then, and trimming its trailing newline would glue the next paste onto this line.
  const canonicalizeOnLeave = (e: FocusEvent<HTMLTextAreaElement>) => {
    const field = e.currentTarget;
    if (field.ownerDocument.activeElement === field) return;
    onChange({fullText: canonicalizeCardFullText(field.value)});
  };
```

3. Replace the Card Text `<textarea ... />` with:

```tsx
        <textarea
          {...control('fullText')}
          style={{...fieldStyle, minHeight: 100}}
          value={form.fullText}
          onChange={text('fullText')}
          onBlur={canonicalizeOnLeave}
        />
```

`src/tools/reveal/components/RevealAdminForm.stories.tsx`:
1. Add `import {validateRevealCardForm} from '../validateForm';` below the `RevealAdminForm` import.
2. Replace `function Harness({errors}: ...)` and its first line with:

```tsx
interface HarnessProps {
  errors: Record<string, string>;
  start?: RevealCardForm;
}

function Harness({errors, start = initial}: HarnessProps) {
  const [form, setForm] = useState(start);
```

3. Append:

```tsx
/**
 * Kit Cloudkicker - Sure Shot (14192) as it was typed in. Click into Card Text and out
 * again: the words become glyphs (#635).
 */
export const SpelledOutCardText: Story = {
  render: () => (
    <Harness
      errors={{}}
      start={{
        ...initial,
        fullText:
          'Shift 3 (You may pay 3 Ink to play this on top of one of your characters named Kit Cloudkicker.)',
      }}
    />
  ),
};

const LEFTOVER_TEXT = 'PANDA POWER Your Strength wins every challenge.';

/** A glyph word house style cannot place: the validator's own message (on the page, Publish waits). */
export const LeftoverGlyphWord: Story = {
  render: () => {
    const form = {...initial, fullText: LEFTOVER_TEXT};
    const fullText = validateRevealCardForm(form, new Set(), 'mei.png').errors.fullText ?? '';
    return <Harness errors={{fullText}} start={form} />;
  },
};
```

- [ ] **Step 4: Run the tests and the gates**

Run: `pnpm vitest run src/tools/reveal`, then `pnpm lint` and `pnpm typecheck`
Expected: every reveal test passes, and the existing CRLF test still passes (`canonicalizeCardFullText` normalizes line endings). Lint and typecheck are clean.

- [ ] **Step 5: Look at the two stories**

Start `admin-storybook`. Open "Reveal Admin/RevealAdminForm":
- In `SpelledOutCardText`, click into Card Text, then out. The glyphs appear.
- `LeftoverGlyphWord` shows the `"Strength" is spelled out` message.

The console stays clean. Stop Storybook afterwards.

- [ ] **Step 6: Commit** (owner approves)

```bash
git add src/tools/reveal
USER_APPROVED=1 git commit -m "fix(reveal): write card text in house style, refuse unknown glyph words (Doberjohn/inkweave#635) (#3)"
```

### Task 12: Port reveal-sync as it is

**Files:**
- Create: `scripts/reveal-sync/**` (26 files), `.claude/skills/fetch-reveals/SKILL.md`, `docs/PREVIEW_CARD_PARSER.md`
- Modify: `scripts/reveal-sync/write-chain.test.mjs` (its imports only)

- [ ] **Step 1: Copy the files from the pin, byte for byte**

```bash
for f in $(git -C upstream/inkweave ls-tree -r --name-only HEAD -- scripts/reveal-sync .claude/skills/fetch-reveals docs/PREVIEW_CARD_PARSER.md); do mkdir -p "$(dirname "$f")"; git -C upstream/inkweave show "HEAD:$f" > "$f"; done
git status --short -uall | wc -l
```

Expected: 28 new files (26 under `scripts/reveal-sync/`, plus the skill and the parser doc). Without `-uall`, git collapses each new folder into one line.

- [ ] **Step 2: Run the tests in Node**

Admin's Vitest defaults to jsdom, and the app ran these in Node (`vitest.scripts.config.mjs`). As P3a did, give each test file the environment header:

```bash
for t in scripts/reveal-sync/*.test.mjs; do printf '%s\n' '// @vitest-environment node' | cat - "$t" > "$t.tmp" && mv "$t.tmp" "$t"; done
```

- [ ] **Step 3: Point the write-chain test at the reveal publisher's modules**

In `scripts/reveal-sync/write-chain.test.mjs`, replace the three `../../apps/web/src/features/reveal-admin/...` imports with:

```js
import {validateRevealCardForm} from '../../src/tools/reveal/validateForm.ts';
import {buildPreviewCard} from '../../src/tools/reveal/buildPreviewCard.ts';
import {insertCardIntoPreviewJson} from '../../src/tools/reveal/insertCardIntoPreviewJson.ts';
```

and in its header comment, replace "the same chain /admin/reveal uses" with "the same chain the reveal publisher uses (src/tools/reveal/)".

- [ ] **Step 4: Run the ported tests**

Run: `pnpm vitest run scripts/reveal-sync`
Expected: all 9 files pass. The write-chain test's house-style expectations (`Shift 4 ⬡` for Test Chloe) need Task 11.

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: clean. If admin's rules flag a ported line, fix that line without changing what it does, and name each fix in the commit body.

- [ ] **Step 6: Commit** (owner approves)

```bash
git add scripts/reveal-sync .claude/skills/fetch-reveals docs/PREVIEW_CARD_PARSER.md
USER_APPROVED=1 git commit -m "feat(reveals): port reveal-sync and the fetch-reveals skill from the pin (#3)"
```

The skill still describes the app checkout until Task 19. Nothing runs it before then.

### Task 13: Load app code through the bridge

**Files:**
- Modify: `src/app-bridge.ts`, `scripts/reveal-sync/web.mjs`
- Create: `scripts/reveal-sync/web.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/reveal-sync/web.test.mjs`:

```js
// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {loadSeason, loadWriteChain} from './web.mjs';

// Both load admin's TypeScript through Vite, the bridge included: seconds on a cold start.
const SLOW = 60_000;

describe('web', () => {
  it('reads the season from the pinned app through the bridge', async () => {
    const season = await loadSeason();
    expect(season.setCode).toMatch(/^\d+$/);
    expect(season.setNumber).toBe(Number(season.setCode));
    expect(season.setSlug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(season.setTotal).toBeGreaterThan(0);
    expect(Number.isInteger(season.idBase)).toBe(true);
    expect(Object.keys(season.inkBlocks)).toHaveLength(6);
  }, SLOW);

  it("loads the reveal publisher's write chain", async () => {
    const chain = await loadWriteChain();
    expect(Object.keys(chain).sort()).toEqual([
      'buildPreviewCard',
      'insertCardIntoPreviewJson',
      'validateRevealCardForm',
    ]);
    expect(Object.values(chain).every((fn) => typeof fn === 'function')).toBe(true);
  }, SLOW);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run scripts/reveal-sync/web.test.mjs`
Expected: FAIL. The ported `web.mjs` resolves Vite from `apps/web/package.json`, which doesn't exist in admin.

- [ ] **Step 3: Re-export the two season constants the bridge lacks**

In `src/app-bridge.ts`, add `REVEAL_SET_NUMBER` and `SET_NAMES` to the list re-exported from `'../upstream/inkweave/apps/web/src/shared/constants'`, keeping the list's order. Both are exported there at the pin: `revealSet.ts:13` and `theme.ts:231`.

- [ ] **Step 4: Rewrite the top of `web.mjs`, `loadSeason` and `loadWriteChain`**

Replace everything above `/** "Hyperia City" -> ...` (the file's comment, imports, `ROOT`, `WEB` and `importWeb`) with:

```js
/**
 * Load admin's TypeScript from Node: the season through the app bridge (src/app-bridge.ts,
 * the one module that reaches the pinned app), and the write chain the reveal publisher uses
 * (src/tools/reveal/). Vite's `runnerImport` transforms them the way the dev server does, so
 * nothing is duplicated, and a season rotation reaches the skill with a pin bump.
 *
 * The bridge imports the app's CSS, and Vite's CSS plugins only work inside a running dev
 * server ("Cannot read properties of undefined (reading 'get')"). No stylesheet matters
 * here, so each resolves to an empty module before those plugins see it.
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const EMPTY_STYLE = '\0reveal-sync:empty-style';
const NO_CSS = {
  name: 'reveal-sync:no-css',
  enforce: 'pre',
  resolveId: (id) => (/\.css(\?|$)/.test(id) ? EMPTY_STYLE : null),
  load: (id) => (id === EMPTY_STYLE ? 'export default ""' : null),
};

async function importTs(relative) {
  const {runnerImport} = await import('vite');
  const {module} = await runnerImport(path.join(ROOT, relative), {
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    plugins: [NO_CSS],
  });
  return module;
}
```

Keep `siteSetSlug` as ported. Replace `loadSeason` and `loadWriteChain` with:

```js
/** The season this run targets, as the pinned app defines it. */
export async function loadSeason() {
  const app = await importTs('src/app-bridge.ts');
  const setName = app.SET_NAMES[app.REVEAL_SET_CODE];
  if (!setName) throw new Error(`SET_NAMES has no entry for set ${app.REVEAL_SET_CODE}`);
  return {
    setCode: app.REVEAL_SET_CODE,
    setNumber: app.REVEAL_SET_NUMBER,
    setName,
    setSlug: siteSetSlug(setName),
    setTotal: app.SET_TOTAL,
    idBase: app.REVEAL_ID_BASE,
    inkBlocks: Object.fromEntries(app.ALL_INKS.map((ink) => [ink, app.inkBlock(ink)])),
  };
}

/** validateRevealCardForm, buildPreviewCard and insertCardIntoPreviewJson, as the reveal publisher uses them. */
export async function loadWriteChain() {
  const dir = 'src/tools/reveal';
  const [validate, build, insert] = await Promise.all([
    importTs(`${dir}/validateForm.ts`),
    importTs(`${dir}/buildPreviewCard.ts`),
    importTs(`${dir}/insertCardIntoPreviewJson.ts`),
  ]);
  return {
    validateRevealCardForm: validate.validateRevealCardForm,
    buildPreviewCard: build.buildPreviewCard,
    insertCardIntoPreviewJson: insert.insertCardIntoPreviewJson,
  };
}
```

Vite is imported lazily, so a module that only needs `ROOT` doesn't load it.

- [ ] **Step 5: Run the tests and the gates**

Run: `pnpm vitest run scripts/reveal-sync`, then `pnpm typecheck` and `pnpm lint`
Expected: every reveal-sync test passes, and typecheck confirms the two new bridge exports.

- [ ] **Step 6: Commit** (owner approves)

```bash
git add src/app-bridge.ts scripts/reveal-sync/web.mjs scripts/reveal-sync/web.test.mjs
USER_APPROVED=1 git commit -m "feat(reveals): load the season and the write chain through admin's bridge (#3)"
```

### Task 14: The GitHub layer

**Files:**
- Create: `scripts/reveal-sync/github.mjs`, `scripts/reveal-sync/github.test.mjs`, `scripts/reveal-sync/__fixtures__/gh.mjs`

`gh` holds the owner's credentials. So every call goes through `gh api`, and no token passes through this code. A test swaps the one function that spawns `gh`.

- [ ] **Step 1: The fake `gh`**

`scripts/reveal-sync/__fixtures__/gh.mjs`:

```js
/** A fake `gh api` for tests. */
import {setGhRunner} from '../github.mjs';

/** Install a fake that answers each call from `route` and records it; returns the calls. */
export function fakeGh(route) {
  const calls = [];
  setGhRunner((args, input) => {
    const call = {endpoint: args[0], method: args[2], body: input === undefined ? undefined : JSON.parse(input)};
    calls.push(call);
    const answer = route(call);
    if (answer instanceof Error) throw answer;
    return answer === undefined ? '' : JSON.stringify(answer);
  });
  return calls;
}

/** A route answering `${method} ${endpoint}` from a table; any other call fails the test. */
export const table = (answers) => (call) => {
  const key = `${call.method} ${call.endpoint}`;
  if (!(key in answers)) throw new Error(`unexpected gh call: ${key}`);
  return answers[key];
};

/** The contents API's answer for a file holding `text`. */
export const fileAnswer = (text, sha) => ({
  content: Buffer.from(text).toString('base64'),
  encoding: 'base64',
  sha,
});

/** A failed call, as execFileSync reports one. */
export const ghError = (stderr) => Object.assign(new Error('Command failed: gh api'), {stderr});
```

- [ ] **Step 2: Write the failing tests**

`scripts/reveal-sync/github.test.mjs`:

```js
// @vitest-environment node
import {afterEach, describe, expect, it} from 'vitest';
import {
  advanceBranch,
  createBranch,
  createCommit,
  listDir,
  openPullRequest,
  openPullsFrom,
  readFile,
  setGhRunner,
} from './github.mjs';
import {fakeGh, fileAnswer, ghError, table} from './__fixtures__/gh.mjs';

afterEach(() => setGhRunner());

describe('github', () => {
  it('reads a file as text, with its blob sha', () => {
    fakeGh(table({'GET repos/o/r/contents/a/b.json?ref=master': fileAnswer('{"cards":[]}\n', 'abc')}));
    expect(readFile('o/r', 'a/b.json', 'master')).toEqual({text: '{"cards":[]}\n', sha: 'abc'});
  });

  it('refuses a file too large for the contents API', () => {
    fakeGh(() => ({content: '', encoding: 'none', sha: 'abc'}));
    expect(() => readFile('o/r', 'big.json', 'master')).toThrow(/1 MB/);
  });

  it('lists a directory from its git tree, which has no 1,000-entry cap', () => {
    fakeGh(
      table({
        'GET repos/o/r/contents/a/b?ref=master': [
          {name: 'c', type: 'dir', sha: 'tree-c'},
          {name: 'c.json', type: 'file', sha: 'f'},
        ],
        'GET repos/o/r/git/trees/tree-c': {tree: [{path: '1.avif'}, {path: '1-sm.avif'}]},
      }),
    );
    expect(listDir('o/r', 'a/b/c', 'master')).toEqual(new Set(['1.avif', '1-sm.avif']));
  });

  it('commits on a parent: a blob per file, a tree on its tree, then the commit', () => {
    const calls = fakeGh(
      table({
        'GET repos/o/r/git/commits/p1': {tree: {sha: 't0'}},
        'POST repos/o/r/git/blobs': {sha: 'b1'},
        'POST repos/o/r/git/trees': {sha: 't1'},
        'POST repos/o/r/git/commits': {sha: 'c1'},
      }),
    );
    expect(createCommit('o/r', {parent: 'p1', message: 'm', files: [{path: 'a.json', base64: 'YQ=='}]})).toBe('c1');
    expect(calls[1].body).toEqual({content: 'YQ==', encoding: 'base64'});
    expect(calls[2].body).toEqual({base_tree: 't0', tree: [{path: 'a.json', mode: '100644', type: 'blob', sha: 'b1'}]});
    expect(calls[3].body).toEqual({message: 'm', tree: 't1', parents: ['p1']});
  });

  it('creates branches and never forces an update', () => {
    const calls = fakeGh(() => ({}));
    createBranch('o/r', 'reveals/x', 's1');
    advanceBranch('o/r', 'main', 's2');
    expect(calls.map(({method, endpoint, body}) => [method, endpoint, body])).toEqual([
      ['POST', 'repos/o/r/git/refs', {ref: 'refs/heads/reveals/x', sha: 's1'}],
      ['PATCH', 'repos/o/r/git/refs/heads/main', {sha: 's2', force: false}],
    ]);
  });

  it('opens a PR, and finds open ones by branch prefix', () => {
    fakeGh(
      table({
        'POST repos/o/r/pulls': {html_url: 'https://github.com/o/r/pull/9'},
        'GET repos/o/r/pulls?state=open&per_page=100': [
          {number: 9, html_url: 'u9', head: {ref: 'reveals/set14-x'}},
          {number: 8, html_url: 'u8', head: {ref: 'feature/1-y'}},
        ],
      }),
    );
    expect(openPullRequest('o/r', {head: 'h', base: 'master', title: 't', body: 'b'})).toBe('https://github.com/o/r/pull/9');
    expect(openPullsFrom('o/r', 'reveals/')).toEqual([{number: 9, url: 'u9', branch: 'reveals/set14-x'}]);
  });

  it("names the call and gh's own message when a call fails", () => {
    fakeGh(() => ghError('gh: Reference already exists (HTTP 422)\n'));
    expect(() => createBranch('o/r', 'reveals/x', 's1')).toThrow(
      'gh api POST repos/o/r/git/refs: gh: Reference already exists (HTTP 422)',
    );
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm vitest run scripts/reveal-sync/github.test.mjs`
Expected: FAIL. `./github.mjs` does not exist yet.

- [ ] **Step 4: Implement `scripts/reveal-sync/github.mjs`**

```js
/**
 * Every GitHub call a run makes, through the owner's `gh` login (docs/plans/P3-pipelines.md,
 * P3-5 and P3-6): the app repo a run reads its base from and opens its PR against, and
 * admin's own repo, where state.json lives. `gh` holds the credentials, so no token passes
 * through this code.
 */
import {execFileSync} from 'node:child_process';

export const APP_REPO = 'Doberjohn/inkweave';
export const ADMIN_REPO = 'Doberjohn/inkweave-admin';
/** The app branch a run starts from and opens its PR against. The rehearsal overrides it. */
export const APP_BASE = process.env.REVEAL_SYNC_APP_BASE || 'master';
/** Admin's branch holding state.json. The rehearsal overrides it. */
export const STATE_BRANCH = process.env.REVEAL_SYNC_STATE_BRANCH || 'main';
/** Every reveal PR's branch starts with this. */
export const PR_PREFIX = 'reveals/';

const gh = (args, input) =>
  execFileSync('gh', ['api', ...args], {
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

let runner = gh;

/** Tests swap in a fake `gh api`; no argument restores the real one. */
export function setGhRunner(next = gh) {
  runner = next;
}

/** One REST call. A body goes to gh as JSON on stdin; the answer comes back parsed. */
export function ghApi(endpoint, {method = 'GET', body} = {}) {
  const args = [endpoint, '--method', method, ...(body === undefined ? [] : ['--input', '-'])];
  let out;
  try {
    out = runner(args, body === undefined ? undefined : JSON.stringify(body));
  } catch (error) {
    const detail = String(error.stderr || error.message).trim();
    throw new Error(`gh api ${method} ${endpoint}: ${detail}`, {cause: error});
  }
  return out.trim() ? JSON.parse(out) : null;
}

const at = (ref) => `?ref=${encodeURIComponent(ref)}`;

/** A file's UTF-8 text and blob sha, at a branch or commit. */
export function readFile(repo, filePath, ref) {
  const file = ghApi(`repos/${repo}/contents/${filePath}${at(ref)}`);
  if (file.encoding !== 'base64') throw new Error(`${filePath} is over the contents API's 1 MB limit`);
  return {text: Buffer.from(file.content, 'base64').toString('utf8'), sha: file.sha};
}

/** The names in a directory at a branch or commit, read as a git tree (no 1,000-entry cap). */
export function listDir(repo, dirPath, ref) {
  const slash = dirPath.lastIndexOf('/');
  const dir = ghApi(`repos/${repo}/contents/${dirPath.slice(0, slash)}${at(ref)}`).find(
    (entry) => entry.type === 'dir' && entry.name === dirPath.slice(slash + 1),
  );
  if (!dir) return new Set();
  return new Set(ghApi(`repos/${repo}/git/trees/${dir.sha}`).tree.map((entry) => entry.path));
}

/** The commit a branch points at. */
export const branchTip = (repo, branch) => ghApi(`repos/${repo}/git/ref/heads/${branch}`).object.sha;

/**
 * A commit on `parent` writing `files` ({path, base64}): a blob each, a tree on the parent's
 * tree, then the commit. No branch moves; returns the commit's sha.
 */
export function createCommit(repo, {parent, message, files}) {
  const baseTree = ghApi(`repos/${repo}/git/commits/${parent}`).tree.sha;
  const tree = files.map((file) => ({
    path: file.path,
    mode: '100644',
    type: 'blob',
    sha: ghApi(`repos/${repo}/git/blobs`, {method: 'POST', body: {content: file.base64, encoding: 'base64'}}).sha,
  }));
  const treeSha = ghApi(`repos/${repo}/git/trees`, {method: 'POST', body: {base_tree: baseTree, tree}}).sha;
  return ghApi(`repos/${repo}/git/commits`, {method: 'POST', body: {message, tree: treeSha, parents: [parent]}}).sha;
}

/** A new branch at `sha`. GitHub refuses a name that exists. */
export function createBranch(repo, branch, sha) {
  ghApi(`repos/${repo}/git/refs`, {method: 'POST', body: {ref: `refs/heads/${branch}`, sha}});
}

/** Move a branch to `sha`. Never forced: GitHub refuses anything but a fast-forward. */
export function advanceBranch(repo, branch, sha) {
  ghApi(`repos/${repo}/git/refs/heads/${branch}`, {method: 'PATCH', body: {sha, force: false}});
}

/** Open a PR; returns its URL. */
export function openPullRequest(repo, {head, base, title, body}) {
  return ghApi(`repos/${repo}/pulls`, {method: 'POST', body: {head, base, title, body}}).html_url;
}

/** The open PRs whose branch starts with `prefix`, as {number, url, branch}. */
export function openPullsFrom(repo, prefix) {
  return ghApi(`repos/${repo}/pulls?state=open&per_page=100`)
    .filter((pr) => pr.head.ref.startsWith(prefix))
    .map((pr) => ({number: pr.number, url: pr.html_url, branch: pr.head.ref}));
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run scripts/reveal-sync/github.test.mjs`
Expected: 7 tests pass.

- [ ] **Step 6: Try one real read**

```bash
node -e "import('./scripts/reveal-sync/github.mjs').then((g) => { const f = g.readFile(g.APP_REPO, 'apps/web/public/data/previewCards.json', 'master'); console.log(f.sha, JSON.parse(f.text).cards.length); })"
```

Expected: a 40-character sha and the number of preview cards on the app's `master`.

- [ ] **Step 7: Commit** (owner approves)

```bash
git add scripts/reveal-sync/github.mjs scripts/reveal-sync/github.test.mjs scripts/reveal-sync/__fixtures__/gh.mjs
USER_APPROVED=1 git commit -m "feat(reveals): read and write both repos through gh (#3)"
```

### Task 15: Convert art from a scratch copy of the app's converter

**Files:**
- Create: `scripts/reveal-sync/convert.mjs`, `scripts/reveal-sync/convert.test.mjs`
- Modify: `.gitignore`, `eslint.config.js`

- [ ] **Step 1: Write the failing tests**

`scripts/reveal-sync/convert.test.mjs`:

```js
// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {afterEach, describe, expect, it} from 'vitest';
import {convertScans, removeScratch, scratchFor} from './convert.mjs';

const RUN = `convert-test-${process.pid}`;

/** A plain PNG standing in for an official scan. */
async function scan(width, height) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-scan-')), 'official.png');
  await sharp({create: {width, height, channels: 3, background: '#557799'}}).png().toFile(file);
  return file;
}

afterEach(() => removeScratch(RUN));

describe('convertScans', () => {
  it("makes both AVIFs at the app's sizes, with the app's own converter", async () => {
    const {exitCode, made} = convertScans(RUN, [{id: 14040, source: await scan(734, 1024)}]);
    expect(exitCode).toBe(0);
    expect(made.map(({files}) => files.map((file) => file.name))).toEqual([['14040.avif', '14040-sm.avif']]);
    const sizes = await Promise.all(
      made[0].files.map(async (file) => {
        const {width, height} = await sharp(file.path).metadata();
        return [width, height];
      }),
    );
    expect(sizes).toEqual([
      [337, 470],
      [191, 266],
    ]);
  }, 30_000);

  it('runs nothing for no scans, and leaves no scratch folder', () => {
    expect(convertScans(RUN, [])).toEqual({exitCode: 0, made: []});
    expect(fs.existsSync(scratchFor(RUN).root)).toBe(false);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run scripts/reveal-sync/convert.test.mjs`
Expected: FAIL. `./convert.mjs` does not exist yet.

- [ ] **Step 3: Implement `scripts/reveal-sync/convert.mjs`**

```js
/**
 * AVIFs from official scans, made by the app's own converter
 * (upstream/inkweave/scripts/convert-preview-images.mjs), so admin never drifts from the
 * sizes and quality the app ships. It converts beside itself and upstream/ is read-only, so
 * it runs from a copy in a scratch folder inside admin, where `sharp` resolves from admin's
 * node_modules. Copying a file from upstream is fine; importing from it is the bridge's job.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from './web.mjs';

const CONVERTER = path.join(ROOT, 'upstream/inkweave/scripts/convert-preview-images.mjs');
/** The two variants the app ships, and only shows together. */
export const VARIANTS = ['', '-sm'];

/** A run's scratch copy of the converter's layout. */
export function scratchFor(runId) {
  const root = path.join(ROOT, '.reveal-sync-convert', runId);
  return {
    root,
    script: path.join(root, 'scripts/convert-preview-images.mjs'),
    raw: path.join(root, 'apps/web/public/card-images-raw'),
    out: path.join(root, 'apps/web/public/card-images-preview'),
  };
}

export function removeScratch(runId) {
  fs.rmSync(scratchFor(runId).root, {recursive: true, force: true});
}

/**
 * Convert each {id, source} scan. Returns the converter's exit code, and the ids whose two
 * AVIFs exist afterwards, each with its files as [{name, path}]. The files stay in the
 * scratch folder until removeScratch.
 */
export function convertScans(runId, scans) {
  if (!scans.length) return {exitCode: 0, made: []};
  const scratch = scratchFor(runId);
  removeScratch(runId);
  fs.mkdirSync(scratch.raw, {recursive: true});
  fs.mkdirSync(path.dirname(scratch.script), {recursive: true});
  fs.copyFileSync(CONVERTER, scratch.script);
  for (const {id, source} of scans) {
    fs.copyFileSync(source, path.join(scratch.raw, `${id}${path.extname(source)}`));
  }
  const result = spawnSync(process.execPath, [scratch.script], {cwd: scratch.root, stdio: 'inherit'});
  const avifs = (id) =>
    VARIANTS.map((suffix) => ({name: `${id}${suffix}.avif`, path: path.join(scratch.out, `${id}${suffix}.avif`)}));
  const made = scans
    .map(({id}) => ({id, files: avifs(id)}))
    .filter(({files}) => files.every((file) => fs.existsSync(file.path)));
  return {exitCode: result.error ? -1 : result.status, made};
}
```

- [ ] **Step 4: Keep the scratch folder out of git and lint**

Append to `.gitignore`:

```
# P3b: the scratch copy of the app's converter a reveal write runs from
.reveal-sync-convert/
```

In `eslint.config.js`, add `'.reveal-sync-convert'` to the global `ignores` (`{ignores: ['dist', 'coverage', 'upstream', 'app-master', '.reveal-sync-convert']}`).

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run scripts/reveal-sync/convert.test.mjs`
Expected: 2 tests pass. The converter's own `✓ converted` lines print. Afterwards `git status --short` shows no `.reveal-sync-convert/`.

- [ ] **Step 6: Commit** (owner approves)

```bash
git add scripts/reveal-sync/convert.mjs scripts/reveal-sync/convert.test.mjs .gitignore eslint.config.js
USER_APPROVED=1 git commit -m "feat(reveals): convert art with the app's own converter from a scratch copy (#3)"
```

### Task 16: Work from snapshots, and stage the write in the run

**Files:**
- Create: `scripts/reveal-sync/base.mjs`, `base.test.mjs`, `runstore.test.mjs`, `write.test.mjs`
- Modify: `scripts/reveal-sync/cli.mjs`, `runstore.mjs`, `write.mjs`, `run.mjs`

After this task, `start` reads both bases through `gh` and refuses while a reveal PR is open, replacing the app's clean-checkout and fresh-branch checks. `write` stages everything a run publishes in the run dir. Task 17 publishes it.

- [ ] **Step 1: `cli.mjs` drops `git`**

Replace `scripts/reveal-sync/cli.mjs` with:

```js
/** Small helpers shared by the reveal-sync command line. */

/** A problem the owner can act on: printed as a message rather than a stack trace. */
export class UsageError extends Error {}

export const say = (...lines) => console.log(lines.join('\n'));

/** The run's cards with this status, as [slug, card] pairs. */
export const entries = (run, status) =>
  Object.entries(run.cards).filter(([, card]) => card.status === status);

export const byNumber = ([, a], [, b]) => (a.number ?? 0) - (b.number ?? 0);
```

- [ ] **Step 2: Write the failing runstore test**

`scripts/reveal-sync/runstore.test.mjs`:

```js
// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {UsageError} from './cli.mjs';
import {readPreviewText, readState, stateFile, writeBase, writeState} from './runstore.mjs';

beforeEach(() => vi.stubEnv('REVEAL_SYNC_RUNS', fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-runs-'))));
afterEach(() => vi.unstubAllEnvs());

describe("a run's base", () => {
  it('keeps the preview data and the state exactly as start read them', () => {
    writeBase('r1', {previewText: '{"cards":[]}\n', stateText: '{\n  "sets": {}\n}\n'});
    expect(readPreviewText('r1')).toBe('{"cards":[]}\n');
    expect(readState('r1')).toEqual({sets: {}});
  });

  it("writes the run's state the way serializeState does", () => {
    writeBase('r1', {previewText: '{}', stateText: '{"sets":{}}'});
    writeState('r1', {sets: {14: {cards: {b: {status: 'written'}, a: {status: 'skipped'}}}}});
    expect(Object.keys(JSON.parse(fs.readFileSync(stateFile('r1'), 'utf8')).sets[14].cards)).toEqual(['a', 'b']);
  });

  it('stops a run whose base is missing, telling the owner to start again', () => {
    expect(() => readPreviewText('r2')).toThrow(UsageError);
    expect(() => readState('r2')).toThrow(/Start a new run/);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run scripts/reveal-sync/runstore.test.mjs`
Expected: FAIL. `writeBase` is not exported, and the runs folder is fixed when the module loads.

- [ ] **Step 4: Rework `runstore.mjs`**

1. Append to the file's opening comment:

```js
 *
 * A run works from the base `start` read through gh (base.mjs): the app's previewCards.json
 * and admin's state.json. `write` stages what the run publishes in out/, and publish.mjs
 * pushes it.
```

2. Replace the imports and everything down to `cardDir` (the `ROOT` import, `PREVIEW_REL`, `PREVIEW_FILE`, `STATE_FILE`, `RAW_DIR`, `AVIF_DIR`, `RUNS`, `DOWNLOADS`, `runDir` and `cardDir`) with:

```js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {UsageError} from './cli.mjs';
import {serializeState} from './state.mjs';

/** The app's preview data, as a path in the app repo. */
export const PREVIEW_REL = 'apps/web/public/data/previewCards.json';
/** The app folder that holds preview cards' AVIFs. */
export const AVIF_REL = 'apps/web/public/card-images-preview';
/** Run-to-run memory, as a path in admin's repo (docs/plans/P3-pipelines.md, P3-5). */
export const STATE_REL = 'scripts/reveal-sync/state.json';

/** Read on every call, so a test or the rehearsal can point it elsewhere. */
const runsRoot = () => process.env.REVEAL_SYNC_RUNS ?? path.join(os.tmpdir(), 'inkweave-reveal-sync');
const DOWNLOADS = process.env.REVEAL_SYNC_DOWNLOADS ?? path.join(os.homedir(), 'Downloads');

export const runDir = (runId) => path.join(runsRoot(), runId);
export const cardDir = (runId, slug) => path.join(runDir(runId), 'cards', slug);
/** What `write` stages for the app PR: previewCards.json and avif/. */
export const outDir = (runId) => path.join(runDir(runId), 'out');
/** The run's state.json: the base as `start` read it, then as `write` left it. */
export const stateFile = (runId) => path.join(runDir(runId), 'state.json');
const previewFile = (runId) => path.join(runDir(runId), 'preview.json');
```

3. In `readRun`, replace `${RUNS}` with `${runsRoot()}`.

4. Replace `readRunFile` with:

```js
/** A file an earlier step of the run wrote. Missing, the run cannot go on. */
function readRunText(file, what) {
  if (!fs.existsSync(file)) throw new UsageError(`${what} is missing (${file}). Start a new run.`);
  return fs.readFileSync(file, 'utf8');
}

/** The same, parsed. Not valid JSON, the run cannot go on either. */
function readRunFile(file, what) {
  const text = readRunText(file, what);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new UsageError(`${what} is not valid JSON (${file}: ${error.message}). Start a new run.`);
  }
}
```

5. Replace `readState`, `writeState` and `readPreviewText` with:

```js
/** The run's base, as `start` read it: the app's preview data and admin's state. */
export function writeBase(runId, {previewText, stateText}) {
  fs.mkdirSync(runDir(runId), {recursive: true});
  fs.writeFileSync(previewFile(runId), previewText);
  fs.writeFileSync(stateFile(runId), stateText);
}

/** The app's previewCards.json, as the run's base holds it. */
export const readPreviewText = (runId) => readRunText(previewFile(runId), `run ${runId}'s preview data`);

export const readState = (runId) => readRunFile(stateFile(runId), `run ${runId}'s state`);

export function writeState(runId, state) {
  fs.writeFileSync(stateFile(runId), serializeState(state));
}
```

Run: `pnpm vitest run scripts/reveal-sync/runstore.test.mjs`
Expected: 3 tests pass.

- [ ] **Step 5: Write the failing start-check tests**

`scripts/reveal-sync/base.test.mjs`:

```js
// @vitest-environment node
import {afterEach, describe, expect, it} from 'vitest';
import {assertNoOpenRevealPr, readBase} from './base.mjs';
import {setGhRunner} from './github.mjs';
import {fakeGh, fileAnswer, table} from './__fixtures__/gh.mjs';

const OPEN_PRS = 'GET repos/Doberjohn/inkweave/pulls?state=open&per_page=100';

afterEach(() => setGhRunner());

describe('the start check', () => {
  it('refuses while a reveal PR is open, naming it', () => {
    fakeGh(
      table({
        [OPEN_PRS]: [
          {number: 700, html_url: 'https://github.com/Doberjohn/inkweave/pull/700', head: {ref: 'reveals/set14-20261001-101500'}},
          {number: 701, html_url: 'https://github.com/Doberjohn/inkweave/pull/701', head: {ref: 'feature/1-other'}},
        ],
      }),
    );
    expect(assertNoOpenRevealPr).toThrow(/pull\/700\)/);
  });

  it('lets a run start when no reveal PR is open', () => {
    fakeGh(table({[OPEN_PRS]: [{number: 701, html_url: 'u', head: {ref: 'feature/1-other'}}]}));
    expect(assertNoOpenRevealPr).not.toThrow();
  });

  it("reads the app's preview data from master and admin's state from main", () => {
    fakeGh(
      table({
        'GET repos/Doberjohn/inkweave/contents/apps/web/public/data/previewCards.json?ref=master': fileAnswer('{"cards":[]}', 'p1'),
        'GET repos/Doberjohn/inkweave-admin/contents/scripts/reveal-sync/state.json?ref=main': fileAnswer('{"sets":{}}\n', 's1'),
      }),
    );
    expect(readBase()).toEqual({
      appBase: 'master',
      stateBranch: 'main',
      preview: {text: '{"cards":[]}', sha: 'p1'},
      state: {text: '{"sets":{}}\n', sha: 's1'},
    });
  });
});
```

Run: `pnpm vitest run scripts/reveal-sync/base.test.mjs`
Expected: FAIL. `./base.mjs` does not exist yet.

- [ ] **Step 6: Implement `scripts/reveal-sync/base.mjs`**

```js
/**
 * What a run starts from (docs/plans/P3-pipelines.md, Task 16): no reveal PR still open,
 * then the app's previewCards.json and admin's state.json, read through gh with their blob
 * shas. This replaces the app's checks on a local checkout (a clean tree on a fresh branch).
 */
import {UsageError} from './cli.mjs';
import {ADMIN_REPO, APP_BASE, APP_REPO, PR_PREFIX, STATE_BRANCH, openPullsFrom, readFile} from './github.mjs';
import {PREVIEW_REL, STATE_REL} from './runstore.mjs';

/** One reveal PR at a time: a second would fight the first over previewCards.json. */
export function assertNoOpenRevealPr() {
  const open = openPullsFrom(APP_REPO, PR_PREFIX);
  if (open.length) {
    throw new UsageError(
      `a reveal PR is still open (${open.map((pr) => pr.url).join(', ')}). Merge or close it first; closing one unmerged also means reverting its state commit (docs/REVEAL_RUNBOOK.md).`,
    );
  }
}

/** The app's preview data and admin's state, each with the blob sha it was read at. */
export function readBase() {
  return {
    appBase: APP_BASE,
    stateBranch: STATE_BRANCH,
    preview: readFile(APP_REPO, PREVIEW_REL, APP_BASE),
    state: readFile(ADMIN_REPO, STATE_REL, STATE_BRANCH),
  };
}
```

Run: `pnpm vitest run scripts/reveal-sync/base.test.mjs`
Expected: 3 tests pass.

- [ ] **Step 7: Write the failing staging tests**

`scripts/reveal-sync/write.test.mjs`:

```js
// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {validateRevealCardForm} from '../../src/tools/reveal/validateForm.ts';
import {buildPreviewCard} from '../../src/tools/reveal/buildPreviewCard.ts';
import {insertCardIntoPreviewJson} from '../../src/tools/reveal/insertCardIntoPreviewJson.ts';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../src/tools/reveal/constants.ts';
import {adjudicate} from './adjudicate.mjs';
import {parseCardLines} from './extract-card.mjs';
import {setGhRunner} from './github.mjs';
import {cardDir, outDir, readState, writeBase} from './runstore.mjs';
import {serializeState} from './state.mjs';
import {writePhase} from './write.mjs';
import {TEST_PUP, page, readerFor} from './__fixtures__/cards.mjs';
import {fakeGh, fileAnswer, table} from './__fixtures__/gh.mjs';

const chain = {validateRevealCardForm, buildPreviewCard, insertCardIntoPreviewJson};
const PREVIEW = `{\n  "sets": {},\n  "cards": []\n}\n`;
const STATE = serializeState({sets: {}});
const PUP_ID = REVEAL_ID_BASE + 40;
const APP = 'repos/Doberjohn/inkweave';

/** gh as `write` sees it: both bases unchanged, and `art` already in the app's AVIF folder. */
function github({previewSha = 'preview-blob', art = []} = {}) {
  fakeGh(
    table({
      [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=master`]: fileAnswer(PREVIEW, previewSha),
      'GET repos/Doberjohn/inkweave-admin/contents/scripts/reveal-sync/state.json?ref=main': fileAnswer(STATE, 'state-blob'),
      [`GET ${APP}/contents/apps/web/public?ref=master`]: [{name: 'card-images-preview', type: 'dir', sha: 'avif-tree'}],
      [`GET ${APP}/git/trees/avif-tree`]: {tree: art.map((name) => ({path: name}))},
    }),
  );
}

/** A run at `write`: TEST_PUP read, adjudicated and ready, with its scan in the run. */
async function readyRun() {
  const site = parseCardLines(page(TEST_PUP), {slug: TEST_PUP.slug, imageFile: TEST_PUP.imageFile});
  const run = {
    runId: 'write-test',
    today: '2026-10-01',
    season: {setCode: String(REVEAL_SET_CODE), idBase: REVEAL_ID_BASE},
    appBase: 'master',
    stateBranch: 'main',
    baseBlob: 'preview-blob',
    stateBlob: 'state-blob',
    site: {slugs: [TEST_PUP.slug], total: 1},
    cards: {
      [TEST_PUP.slug]: {
        number: 40,
        title: 'Test Pup - Tiny Troublemaker',
        status: 'ready',
        card: adjudicate(site, [readerFor.testPup()]).card,
        image: 'official.png',
      },
    },
  };
  writeBase(run.runId, {previewText: PREVIEW, stateText: STATE});
  fs.mkdirSync(cardDir(run.runId, TEST_PUP.slug), {recursive: true});
  await sharp({create: {width: 734, height: 1024, channels: 3, background: '#557799'}})
    .png()
    .toFile(path.join(cardDir(run.runId, TEST_PUP.slug), 'official.png'));
  return run;
}

beforeEach(() => vi.stubEnv('REVEAL_SYNC_RUNS', fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-runs-'))));
afterEach(() => {
  vi.unstubAllEnvs();
  setGhRunner();
});

describe('writePhase', () => {
  it('stages the card, its converted art and its state for publishing', async () => {
    github();
    const run = await readyRun();
    const {written, section} = writePhase(run, chain);
    expect(written).toBe(1);
    expect(run.cards[TEST_PUP.slug]).toMatchObject({status: 'written', id: PUP_ID});
    const out = outDir(run.runId);
    const preview = JSON.parse(fs.readFileSync(path.join(out, 'previewCards.json'), 'utf8'));
    expect(preview.cards.map((card) => card.id)).toEqual([PUP_ID]);
    expect(fs.readdirSync(path.join(out, 'avif')).sort()).toEqual([`${PUP_ID}-sm.avif`, `${PUP_ID}.avif`]);
    expect(section.cards[TEST_PUP.slug]).toMatchObject({number: 40, status: 'written'});
    expect(readState(run.runId).sets[run.season.setCode].cards[TEST_PUP.slug].status).toBe('written');
    expect(run.staged).toBe(true);
  }, 60_000);

  it('keeps art the app already has, and converts nothing', async () => {
    github({art: [`${PUP_ID}.avif`, `${PUP_ID}-sm.avif`]});
    const run = await readyRun();
    expect(writePhase(run, chain).written).toBe(1);
    expect(fs.readdirSync(path.join(outDir(run.runId), 'avif'))).toEqual([]);
  }, 60_000);

  it('writes nothing when previewCards.json changed on the base since start', async () => {
    github({previewSha: 'someone-else'});
    const run = await readyRun();
    expect(() => writePhase(run, chain)).toThrow(/changed on Doberjohn\/inkweave@master/);
    expect(fs.existsSync(outDir(run.runId))).toBe(false);
    expect(run.cards[TEST_PUP.slug].status).toBe('ready');
  }, 60_000);
});
```

Run: `pnpm vitest run scripts/reveal-sync/write.test.mjs`
Expected: FAIL. The ported `write.mjs` imports `RAW_DIR`, `AVIF_DIR` and `git`, which are gone.

- [ ] **Step 8: Rewrite `scripts/reveal-sync/write.mjs`**

Keep `STATE_STATUS`, `nameKey`, `writtenForm`, `problemWith` and `acceptReady` exactly as ported. Everything else changes:

```js
/**
 * The write phase: everything a run publishes, staged in the run dir, ordered so the preview
 * data is never ahead of the art.
 *
 *   1. every ready card goes through validateRevealCardForm, and is refused if its name is
 *      already in the set's preview data
 *   2. the accepted cards' scans are converted to AVIFs, unless the app already has their art
 *   3. only the cards whose art is in place are inserted into the base's previewCards.json
 *   4. the run's state takes this run's outcomes
 *
 * Nothing leaves the machine here: publish.mjs pushes out/ and the state afterwards. A card
 * that fails a step becomes a conflict with the reason, and is retried next run.
 */
import fs from 'node:fs';
import path from 'node:path';
import {toRevealForm} from './adjudicate.mjs';
import {UsageError, byNumber, entries, say} from './cli.mjs';
import {VARIANTS, convertScans, removeScratch} from './convert.mjs';
import {ADMIN_REPO, APP_REPO, listDir, readFile} from './github.mjs';
import {markVanished, recordOutcome, setSection} from './state.mjs';
import {comparableName, fullName, unaccentReferences, unaccented} from './text.mjs';
import {
  AVIF_REL,
  PREVIEW_REL,
  STATE_REL,
  cardDir,
  outDir,
  readPreviewText,
  readState,
  writeState,
} from './runstore.mjs';

// STATE_STATUS, as ported

/** The app's previewCards.json and admin's state.json must still be what the run started from. */
export function assertNoRace(run) {
  if (readFile(APP_REPO, PREVIEW_REL, run.appBase).sha !== run.baseBlob) {
    throw new UsageError(
      `previewCards.json changed on ${APP_REPO}@${run.appBase} since this run started, probably a card published through the reveal publisher. Nothing was written. Start a new run.`,
    );
  }
  if (readFile(ADMIN_REPO, STATE_REL, run.stateBranch).sha !== run.stateBlob) {
    throw new UsageError(
      `state.json changed on ${ADMIN_REPO}@${run.stateBranch} since this run started, probably another run. Nothing was written. Start a new run.`,
    );
  }
}

// nameKey, writtenForm, problemWith and acceptReady, as ported

/**
 * Step 2: the accepted cards' art. An id that already has both AVIFs in the app keeps them,
 * never replaced; the rest are converted from their official scans. Returns the cards whose
 * art is in place and the AVIFs made, as [{name, path}].
 */
function stageArt(run, accepted) {
  if (!accepted.length) return {converted: [], avifs: []};
  const inApp = listDir(APP_REPO, AVIF_REL, run.appBase);
  const hasArt = ({id}) => VARIANTS.every((suffix) => inApp.has(`${id}${suffix}.avif`));
  const toConvert = accepted.filter((card) => !hasArt(card));
  const scans = toConvert.map(({id, slug, image}) => ({id, source: path.join(cardDir(run.runId, slug), image)}));
  const {exitCode, made} = convertScans(run.runId, scans);
  if (exitCode !== 0) say(`warning: convert-preview-images exited ${exitCode}; checking each card's AVIFs`);
  const madeIds = new Set(made.map(({id}) => id));
  for (const failed of toConvert.filter(({id}) => !madeIds.has(id))) {
    const detail = `no AVIFs after conversion (converter exit ${exitCode})`;
    Object.assign(run.cards[failed.slug], {status: 'conflict', reason: 'art-failed', detail});
  }
  return {
    converted: accepted.filter((card) => hasArt(card) || madeIds.has(card.id)),
    avifs: made.flatMap(({files}) => files),
  };
}

/** Step 3: the base's preview data with the converted cards inserted, or null for none. */
function insertCards(run, chain, {converted}, previewText) {
  if (!converted.length) return null;
  let text = previewText;
  for (const {form} of converted) text = chain.insertCardIntoPreviewJson(text, chain.buildPreviewCard(form));
  for (const {slug, id} of converted) Object.assign(run.cards[slug], {status: 'written', id});
  return text;
}

/** out/ holds exactly what the app PR commits: previewCards.json and the new AVIFs. */
function stageOutputs(runId, text, avifs) {
  const out = outDir(runId);
  fs.rmSync(out, {recursive: true, force: true});
  fs.mkdirSync(path.join(out, 'avif'), {recursive: true});
  if (text != null) fs.writeFileSync(path.join(out, 'previewCards.json'), text);
  for (const avif of avifs) fs.copyFileSync(avif.path, path.join(out, 'avif', avif.name));
}

/** Step 4: this run's outcomes, in the run's copy of state.json. */
function updateState(run) {
  const state = readState(run.runId);
  const section = setSection(state, run.season.setCode);
  for (const [slug, card] of Object.entries(run.cards)) {
    const status = STATE_STATUS[card.status];
    const outcome = {status, reason: card.reason, detail: card.detail, number: card.number};
    if (status) recordOutcome(section, slug, outcome, run.today);
  }
  run.retired = markVanished(run.site.slugs, section);
  section.indexTotal = run.site.total;
  writeState(run.runId, state);
  return section;
}

/**
 * Stage the run's verified cards and its state. Returns how many cards were written and the
 * updated state section, and marks the run staged so `write` never stages it twice.
 */
export function writePhase(run, chain) {
  assertNoRace(run);
  const previewText = readPreviewText(run.runId);
  const accepted = acceptReady(run, chain, previewText);
  try {
    const staged = stageArt(run, accepted);
    stageOutputs(run.runId, insertCards(run, chain, staged, previewText), staged.avifs);
    const section = updateState(run);
    run.staged = true;
    return {written: staged.converted.length, section};
  } finally {
    removeScratch(run.runId);
  }
}
```

The two `// ... as ported` comments mark code that stays. They are not code to type. Gone from the port:
- `avifPath` and `hasArt` on the checkout;
- `placeRaws` and `warnAboutStrangers`, since a scratch folder holds only this run's scans;
- `runConverter`, `removeProducedArt` and `replaceFile`.

- [ ] **Step 9: Rework `run.mjs` around the base**

1. In the opening comment, replace the `start` line with:

```js
 *   start                              check no reveal PR is open, read the base and the
 *                                      official list, open a run
```

   Replace the `write` line with:

```js
 *   write <run>                        stage verified cards, their art and the state
```

   Replace the last paragraph ("It never commits or pushes...") with:

```js
 * Nothing touches a local app checkout: a run reads its base through gh (base.mjs), and
 * `write` stages what it publishes in the run dir.
```

2. Imports:
   - add `import {assertNoOpenRevealPr, readBase} from './base.mjs';` and `import {APP_REPO} from './github.mjs';`;
   - drop `git` from the `./cli.mjs` import;
   - in the `./runstore.mjs` import, drop `PREVIEW_REL` and add `outDir` and `writeBase`.
3. Delete `PROTECTED_BRANCHES`, `assertCleanBranch` and `assertFreshBase`.
4. Replace `presentCards` with:

```js
/** This set's cards in some preview data, as {id, number, name}. */
function cardsOfSet(previewText, setCode) {
  return JSON.parse(previewText)
    .cards.filter((c) => String(c.setCode) === String(setCode))
    .map((c) => ({id: c.id, number: c.number ?? null, name: c.fullName}));
}

/** This set's cards already in the run's base. */
const presentCards = (run) => cardsOfSet(readPreviewText(run.runId), run.season.setCode);
```

5. Replace `start` with:

```js
async function start() {
  assertNoOpenRevealPr();
  const base = readBase();
  const season = await loadSeason();
  const official = await loadOfficialList(season);
  const run = {
    runId: newRunId(),
    startedAt: new Date().toISOString(),
    today: localDate(),
    season,
    appBase: base.appBase,
    stateBranch: base.stateBranch,
    baseBlob: base.preview.sha,
    stateBlob: base.state.sha,
    official: officialSummary(official, season.setTotal),
    audit: leakAudit(cardsOfSet(base.preview.text, season.setCode), official),
    cards: {},
  };
  writeRun(run);
  writeBase(run.runId, {previewText: base.preview.text, stateText: base.state.text});
  writeOfficial(run.runId, official);
  const discover = {setSlug: season.setSlug, rarities: RARITY_FACET, runId: run.runId};
  const findings = run.audit.length;
  say(
    `Run ${run.runId} opened for Set ${season.setCode} (${season.setName}) against ${APP_REPO}@${run.appBase}.`,
    ...officialLines(run),
    `Leak audit: ${findings} finding${findings === 1 ? '' : 's'}.`,
    ...auditLines(run),
    '',
    'In the lorcanaplayer tab: install the snippet, then discover the set:',
    `  await __revealSync.discover(${JSON.stringify(discover)})`,
    '',
    `Then: node scripts/reveal-sync/run.mjs candidates ${run.runId}`,
  );
}
```

6. The run's own base replaces each checkout read:
   - `refreshWaiting`: `presentCards(run.season.setCode)` becomes `presentCards(run)`.
   - `candidates`: `readState()` becomes `readState(run.runId)`.
   - `ingest`: `presentCards(run.season.setCode)` becomes `presentCards(run)`, and `readState()` becomes `readState(run.runId)`.
   - `summarize`: `readState()` becomes `readState(run.runId)`.
7. Replace `write` with:

```js
async function write([runId]) {
  const run = openRun(runId);
  if (!run.staged) {
    const reading = entries(run, 'reading');
    if (reading.length) throw new UsageError(`${reading.length} card(s) still need readers; run adjudicate first`);
    writePhase(run, await loadWriteChain());
    writeRun(run);
  }
  summarize(run);
  say(`Staged in ${outDir(run.runId)}.`);
}
```

- [ ] **Step 10: Run every reveal-sync test and the gates**

Run: `pnpm vitest run scripts/reveal-sync`, then `pnpm lint`
Expected: every file passes, including `write.test.mjs` (3), `runstore.test.mjs` (3) and `base.test.mjs` (3), and lint is clean. `write.test.mjs` converts real scans, so it takes seconds.

- [ ] **Step 11: CodeScene**

Run `code_health_review` on `write.mjs`, `runstore.mjs`, `base.mjs` and `run.mjs`.
Expected: 10.0 each. If one drops, fix the finding before committing.

- [ ] **Step 12: Commit** (owner approves)

```bash
git add scripts/reveal-sync
USER_APPROVED=1 git commit -m "feat(reveals): start from the app's and admin's bases, and stage the write in the run (#3)"
```

### Task 17: Publish: the app PR, then the state commit

**Files:**
- Create: `scripts/reveal-sync/publish.mjs`, `scripts/reveal-sync/publish.test.mjs`
- Modify: `scripts/reveal-sync/run.mjs` (`write` and its imports)

- [ ] **Step 1: Write the failing tests**

`scripts/reveal-sync/publish.test.mjs`:

```js
// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {setGhRunner} from './github.mjs';
import {gitBlobSha, publishRun} from './publish.mjs';
import {outDir, readRun, stateFile, writeBase, writeRun} from './runstore.mjs';
import {fakeGh, fileAnswer, ghError, table} from './__fixtures__/gh.mjs';

const APP = 'repos/Doberjohn/inkweave';
const ADMIN = 'repos/Doberjohn/inkweave-admin';
const STATE = '{\n  "sets": {}\n}\n';
const STATE_SHA = gitBlobSha(Buffer.from(STATE));
const PR_URL = 'https://github.com/Doberjohn/inkweave/pull/800';
const BRANCH = 'reveals/set14-publish-test';

const ANSWERS = {
  [`GET ${APP}/git/ref/heads/master`]: {object: {sha: 'app-tip'}},
  [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=app-tip`]: fileAnswer('{}', 'preview-blob'),
  [`GET ${APP}/git/commits/app-tip`]: {tree: {sha: 'app-tree'}},
  [`POST ${APP}/git/blobs`]: {sha: 'blob'},
  [`POST ${APP}/git/trees`]: {sha: 'tree'},
  [`POST ${APP}/git/commits`]: {sha: 'app-commit'},
  [`POST ${APP}/git/refs`]: {ref: `refs/heads/${BRANCH}`},
  [`POST ${APP}/pulls`]: {html_url: PR_URL},
  [`GET ${ADMIN}/git/ref/heads/main`]: {object: {sha: 'admin-tip'}},
  [`GET ${ADMIN}/contents/scripts/reveal-sync/state.json?ref=admin-tip`]: fileAnswer(STATE, STATE_SHA),
  [`GET ${ADMIN}/git/commits/admin-tip`]: {tree: {sha: 'admin-tree'}},
  [`POST ${ADMIN}/git/blobs`]: {sha: 'blob'},
  [`POST ${ADMIN}/git/trees`]: {sha: 'tree'},
  [`POST ${ADMIN}/git/commits`]: {sha: 'admin-commit'},
  [`PATCH ${ADMIN}/git/refs/heads/main`]: {object: {sha: 'admin-commit'}},
};

const github = (overrides = {}) => fakeGh(table({...ANSWERS, ...overrides}));
/** The calls that write, in order. */
const writes = (calls) => calls.filter(({method}) => method !== 'GET').map(({method, endpoint}) => `${method} ${endpoint}`);

/** A run `write` staged: one card, its two AVIFs, and a changed state. */
function stagedRun(overrides = {}) {
  const run = {
    runId: 'publish-test',
    today: '2026-10-01',
    season: {setCode: '14'},
    appBase: 'master',
    stateBranch: 'main',
    baseBlob: 'preview-blob',
    stateBlob: STATE_SHA,
    staged: true,
    cards: {'test-pup-tiny-troublemaker': {number: 40, id: 14040, title: 'Test Pup - Tiny Troublemaker', status: 'written'}},
    ...overrides,
  };
  writeBase(run.runId, {previewText: '{}', stateText: '{\n  "sets": {\n    "14": {}\n  }\n}\n'});
  fs.mkdirSync(path.join(outDir(run.runId), 'avif'), {recursive: true});
  fs.writeFileSync(path.join(outDir(run.runId), 'previewCards.json'), '{"cards":[]}\n');
  for (const name of ['14040.avif', '14040-sm.avif']) fs.writeFileSync(path.join(outDir(run.runId), 'avif', name), name);
  writeRun(run);
  return run;
}

beforeEach(() => vi.stubEnv('REVEAL_SYNC_RUNS', fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-runs-'))));
afterEach(() => {
  vi.unstubAllEnvs();
  setGhRunner();
});

describe('publishRun', () => {
  it('opens the app PR from a reveals/ branch, then commits the state straight to main', () => {
    const calls = github();
    const run = stagedRun();
    expect(publishRun(run)).toEqual({url: PR_URL, stateCommit: 'admin-commit'});
    expect(writes(calls)).toEqual([
      `POST ${APP}/git/blobs`,
      `POST ${APP}/git/blobs`,
      `POST ${APP}/git/blobs`,
      `POST ${APP}/git/trees`,
      `POST ${APP}/git/commits`,
      `POST ${APP}/git/refs`,
      `POST ${APP}/pulls`,
      `POST ${ADMIN}/git/blobs`,
      `POST ${ADMIN}/git/trees`,
      `POST ${ADMIN}/git/commits`,
      `PATCH ${ADMIN}/git/refs/heads/main`,
    ]);
    const pr = calls.find(({endpoint}) => endpoint === `${APP}/pulls`).body;
    expect(pr).toMatchObject({head: BRANCH, base: 'master', title: 'Set 14 reveals: 1 card (2026-10-01)'});
    expect(pr.body).toMatch(/^- 14040 Test Pup - Tiny Troublemaker\n/);
    expect(calls.at(-1).body).toEqual({sha: 'admin-commit', force: false});
    expect(readRun(run.runId)).toMatchObject({
      published: {commit: 'app-commit', branch: BRANCH, url: PR_URL},
      stateCommit: 'admin-commit',
    });
  });

  it('resumes after the branch, with no second commit', () => {
    const calls = github();
    publishRun(stagedRun({published: {commit: 'app-commit', branch: BRANCH}}));
    expect(writes(calls)[0]).toBe(`POST ${APP}/pulls`);
  });

  it('takes a branch an interrupted attempt already made at the same commit', () => {
    github({
      [`POST ${APP}/git/refs`]: ghError('gh: Reference already exists (HTTP 422)'),
      [`GET ${APP}/git/ref/heads/${BRANCH}`]: {object: {sha: 'app-commit'}},
    });
    expect(publishRun(stagedRun()).url).toBe(PR_URL);
  });

  it('publishes nothing when previewCards.json moved on the base', () => {
    const calls = github({
      [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=app-tip`]: fileAnswer('{}', 'moved'),
    });
    expect(() => publishRun(stagedRun())).toThrow(/Nothing was published/);
    expect(writes(calls)).toEqual([]);
  });

  it('commits no state when the run left it unchanged', () => {
    const calls = github();
    const run = stagedRun();
    fs.writeFileSync(stateFile(run.runId), STATE);
    expect(publishRun(run).stateCommit).toBe('unchanged');
    expect(writes(calls).some((call) => call.includes('inkweave-admin'))).toBe(false);
  });

  it('opens no PR for a run that wrote no card', () => {
    const calls = github();
    const run = stagedRun();
    fs.rmSync(path.join(outDir(run.runId), 'previewCards.json'));
    expect(publishRun(run).url).toBeNull();
    expect(writes(calls).some((call) => call.endsWith('/pulls'))).toBe(false);
  });
});
```

Run: `pnpm vitest run scripts/reveal-sync/publish.test.mjs`
Expected: FAIL. `./publish.mjs` does not exist yet.

- [ ] **Step 2: Implement `scripts/reveal-sync/publish.mjs`**

```js
/**
 * Publish a staged run (docs/plans/P3-pipelines.md, Task 17): the cards go to the app as a
 * PR, and the state to admin's repo as a commit straight on STATE_BRANCH (P3-6). Each step
 * is recorded in run.json as it lands, so running `write` again after a failure resumes
 * where it stopped instead of opening a second PR.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {UsageError, byNumber, entries} from './cli.mjs';
import {
  ADMIN_REPO,
  APP_REPO,
  PR_PREFIX,
  advanceBranch,
  branchTip,
  createBranch,
  createCommit,
  openPullRequest,
  readFile,
} from './github.mjs';
import {AVIF_REL, PREVIEW_REL, STATE_REL, outDir, stateFile, writeRun} from './runstore.mjs';

const base64 = (file) => fs.readFileSync(file).toString('base64');

/** The sha git gives these bytes: tells an unchanged state.json without asking GitHub. */
export function gitBlobSha(bytes) {
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

/** The app branch a run's PR comes from. */
export const branchName = (run) => `${PR_PREFIX}set${run.season.setCode}-${run.runId}`;

/** The PR's title and body: the cards it adds, and where they came from. */
export function describePr(run) {
  const written = entries(run, 'written').sort(byNumber);
  const count = `${written.length} card${written.length === 1 ? '' : 's'}`;
  return {
    title: `Set ${run.season.setCode} reveals: ${count} (${run.today})`,
    body: [
      ...written.map(([, card]) => `- ${card.id} ${card.title}`),
      '',
      `From \`/fetch-reveals\` run ${run.runId} in Doberjohn/inkweave-admin. Every card is on the official list, passed a blind read of its official scan, and went through the reveal publisher's validation. Its art is that scan.`,
    ].join('\n'),
  };
}

/** What the app PR commits: the staged previewCards.json and each new AVIF. */
function appFiles(runId) {
  const out = outDir(runId);
  const avifs = fs.readdirSync(path.join(out, 'avif'));
  return [
    {path: PREVIEW_REL, base64: base64(path.join(out, 'previewCards.json'))},
    ...avifs.map((name) => ({path: `${AVIF_REL}/${name}`, base64: base64(path.join(out, 'avif', name))})),
  ];
}

/** A new branch at `sha`; one an interrupted attempt already made at `sha` counts. */
function ensureBranch(branch, sha) {
  try {
    createBranch(APP_REPO, branch, sha);
  } catch (error) {
    if (!/Reference already exists/.test(error.message) || branchTip(APP_REPO, branch) !== sha) throw error;
  }
}

/** A step that landed goes into run.json at once. */
function record(run, landed) {
  run.published = {...run.published, ...landed};
  writeRun(run);
}

/** The app PR: a commit on the base, a branch at it, then the PR. Resumes from run.published. */
function publishCards(run) {
  if (!run.published?.commit) {
    const parent = branchTip(APP_REPO, run.appBase);
    if (readFile(APP_REPO, PREVIEW_REL, parent).sha !== run.baseBlob) {
      throw new UsageError(
        `previewCards.json changed on ${APP_REPO}@${run.appBase} since this run started. Nothing was published. Start a new run.`,
      );
    }
    const files = appFiles(run.runId);
    record(run, {commit: createCommit(APP_REPO, {parent, message: describePr(run).title, files})});
  }
  if (!run.published.branch) {
    ensureBranch(branchName(run), run.published.commit);
    record(run, {branch: branchName(run)});
  }
  const pr = {head: run.published.branch, base: run.appBase, ...describePr(run)};
  record(run, {url: openPullRequest(APP_REPO, pr)});
}

/** The run's state.json, committed straight to STATE_BRANCH (P3-6) unless the run changed nothing. */
function publishState(run) {
  const bytes = fs.readFileSync(stateFile(run.runId));
  if (gitBlobSha(bytes) === run.stateBlob) {
    run.stateCommit = 'unchanged';
    writeRun(run);
    return;
  }
  const parent = branchTip(ADMIN_REPO, run.stateBranch);
  if (readFile(ADMIN_REPO, STATE_REL, parent).sha !== run.stateBlob) {
    throw new UsageError(
      `state.json changed on ${ADMIN_REPO}@${run.stateBranch} since this run started, so this run's state was not committed. It is in ${stateFile(run.runId)}; merge it by hand.`,
    );
  }
  const link = run.published?.url ? `\n\n${run.published.url}` : '';
  const files = [{path: STATE_REL, base64: bytes.toString('base64')}];
  const sha = createCommit(ADMIN_REPO, {parent, message: `chore(reveals): record run ${run.runId}${link}`, files});
  advanceBranch(ADMIN_REPO, run.stateBranch, sha);
  run.stateCommit = sha;
  writeRun(run);
}

/** Publish a staged run: the app PR if it wrote cards, then its state. Returns what landed. */
export function publishRun(run) {
  if (!run.staged) throw new UsageError(`run ${run.runId} has nothing staged yet`);
  const hasCards = fs.existsSync(path.join(outDir(run.runId), 'previewCards.json'));
  if (hasCards && !run.published?.url) publishCards(run);
  if (!run.stateCommit) publishState(run);
  return {url: run.published?.url ?? null, stateCommit: run.stateCommit};
}
```

The state commit carries no issue reference: it is data, one commit per run. Its message names the run and links the PR.

- [ ] **Step 3: Run the tests**

Run: `pnpm vitest run scripts/reveal-sync/publish.test.mjs`
Expected: 6 tests pass.

- [ ] **Step 4: `write` publishes**

In `run.mjs`:
- import `publishRun` from `./publish.mjs`;
- import `ADMIN_REPO` beside `APP_REPO`;
- drop `outDir` from the runstore import.

In the opening comment, the `write` line becomes:

```js
 *   write <run>                        stage verified cards, their art and the state, then
 *                                      open the app PR and commit the state (resumable)
```

The last paragraph ends with "...and `write` publishes through it (publish.mjs)." instead of "...stages what it publishes in the run dir."

Replace `write` with:

```js
async function write([runId]) {
  const run = openRun(runId);
  if (run.stateCommit) {
    return say(`Run ${runId} is already written${run.published?.url ? `: ${run.published.url}` : '.'}`);
  }
  if (!run.staged) {
    const reading = entries(run, 'reading');
    if (reading.length) throw new UsageError(`${reading.length} card(s) still need readers; run adjudicate first`);
    writePhase(run, await loadWriteChain());
    writeRun(run);
  }
  const {url, stateCommit} = publishRun(run);
  summarize(run);
  say(
    url ? `Opened ${url}` : 'No card was written, so there is no PR.',
    stateCommit === 'unchanged'
      ? 'state.json: unchanged.'
      : `state.json: committed to ${ADMIN_REPO}@${run.stateBranch} (${stateCommit.slice(0, 7)}).`,
    'Next:',
    ...(url ? ['  review the PR and merge it; the next run refuses to start while it is open'] : []),
    '  git pull in admin brings the committed state.json into your checkout',
  );
}
```

- [ ] **Step 5: Run every reveal-sync test, lint and CodeScene**

Run: `pnpm vitest run scripts/reveal-sync`, then `pnpm lint`. Then run `code_health_review` on `publish.mjs` and `run.mjs`.
Expected: all pass, lint is clean, and both files score 10.0.

- [ ] **Step 6: Commit** (owner approves)

```bash
git add scripts/reveal-sync
USER_APPROVED=1 git commit -m "feat(reveals): publish a run as an app PR and a state commit on main (#3)"
```

### Task 18: Keep state commits out of CI and deploys

**Files:**
- Modify: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Ignore pushes that only change `state.json`**

In both workflows, the `push` trigger becomes:

```yaml
  push:
    branches: [main]
    # write commits reveal-sync's state straight to main (docs/plans/P3-pipelines.md, P3-6).
    # A push that changes only that file needs neither a CI run nor a deploy.
    paths-ignore: ['scripts/reveal-sync/state.json']
```

A push that also changes any other file still runs both. The nightly `schedule` and `workflow_dispatch` are unaffected.

- [ ] **Step 2: Check the YAML parses**

```bash
node -e "for (const f of ['ci', 'deploy']) { const t = require('fs').readFileSync('.github/workflows/' + f + '.yml', 'utf8'); if (!t.includes(\"paths-ignore: ['scripts/reveal-sync/state.json']\")) throw new Error(f); } console.log('ok')"
```

Expected: `ok`. The PR's own CI run parses both files for real.

- [ ] **Step 3: Commit** (owner approves)

```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml
USER_APPROVED=1 git commit -m "ci: skip CI and deploys for state-only pushes from reveal-sync (#3)"
```

### Task 19: Update the skill

**Files:**
- Modify: `.claude/skills/fetch-reveals/SKILL.md`

- [ ] **Step 1: Frontmatter**
  - In `description`, replace "and stage the verified cards into previewCards.json with that scan as their art" with "and publish the verified cards, with that scan as their art, as a PR in the app repo".
  - Add `Bash(gh:*)` to `allowed-tools`, after `Bash(pnpm:*)`.
- [ ] **Step 2: Qualify the app's issue numbers**

Every bare `#571`, `#574`, `#582`, `#635` and `#420` becomes `Doberjohn/inkweave#<n>`: in admin, a bare number names admin's own issues.
- [ ] **Step 3: The introduction**
  - "Turns "new cards dropped" into staged, verified card data in one run. The owner reads one report and approves the commit." becomes "Turns "new cards dropped" into one PR of verified card data in the app repo. The owner reads one report and reviews the PR."
  - "(`pnpm test:scripts`)" becomes "(`pnpm test:run`)".
  - The season paragraph becomes: "The season (set, size, ink blocks) comes from the pinned app through `src/app-bridge.ts`. When the app rotates the season, bump the pin (CLAUDE.md, "Updating the app pin") before the next run. Nothing here needs editing."
- [ ] **Step 4: The first hard rule** becomes:

~~~markdown
- **Never commit or push by hand.** `write` opens the reveal PR in the app and commits
  `state.json` to admin's `main` itself. The owner reviews and merges the PR.
~~~

- [ ] **Step 5: Step 0**

Replace items 2 and 3, and the first paragraph of item 4, with:

~~~markdown
2. `gh auth status` must show the owner logged in to github.com: `start` and `write` read and
   write both repos through `gh`.
3. After a pin bump or on a fresh clone, build the engine: `pnpm build:engine`. The house-style
   rules and the write chain load its build output (Doberjohn/inkweave#635), and a stale build
   fails at import with "does not provide an export named".
4. Open the run:

   ```bash
   node scripts/reveal-sync/run.mjs start
   ```

   It prints the run id (`RUN` below) and the exact `discover` call for Step 2. It refuses to
   start while a reveal PR is still open in the app repo: merge or close that one first. It
   reads the app's `previewCards.json` from `master` and admin's `state.json` from `main`, and
   records both blobs so Step 6 can tell if a card was published through the reveal publisher,
   or another run finished, in the meantime.
~~~

Rename the heading to `## Step 0: Preflight`. Item 1 and the official-list paragraph of item 4 stay.
- [ ] **Step 6: Step 5's last bullet**

"Add it by hand in `/admin/reveal`" becomes "Add it by hand in the reveal publisher (https://inkweave-admin.vercel.app/reveal)".
- [ ] **Step 7: Step 6**

Replace the section's heading, its code block, the paragraph that follows it, and the closing "Show the owner the full report, then stop..." paragraph with:

~~~markdown
## Step 6: Write and publish

```bash
node scripts/reveal-sync/run.mjs write RUN
```

`write` first checks that the app's `previewCards.json` on `master` and admin's `state.json` on
`main` are still what `start` read, and aborts, writing nothing, if either changed. Then, in an
order that never leaves the card data ahead of its art, it:
- validates each verified card through the same chain the reveal publisher uses
  (`validateRevealCardForm`, `buildPreviewCard`, `insertCardIntoPreviewJson`);
- converts the accepted cards' scans to AVIFs with the app's own converter, never replacing art
  the app already has;
- inserts only the cards whose art converted.

A card whose art fails becomes a conflict and is retried next run. Last, `write` records the
run's outcomes in its copy of `state.json`.

Then it publishes, with nothing in a local checkout:
- a `reveals/set<SET>-<RUN>` branch in the app holding `previewCards.json` and the new AVIFs;
- a PR from it to `master`;
- a commit of the new `state.json` straight to admin's `main`.

If publishing stops part-way, run `write RUN` again. It resumes where it stopped, and never opens
a second PR.
~~~

Keep the accents paragraph as it is (with `#582` qualified). After the accents paragraph, add:

~~~markdown
Show the owner the full report and the PR link, then stop. They review the PR and merge it; the
next run refuses to start while it is open. If they close it unmerged instead, its state commit
must be reverted (`docs/REVEAL_RUNBOOK.md`).
~~~

- [ ] **Step 8: Non-English scans**

Replace the section's body with:

~~~markdown
The pipeline never writes these, but the owner can have one added by hand: an official reveal
whose only scan is Japanese, German or Italian, shown with that scan as its art and
lorcanaplayer's English name and text. Its card in `previewCards.json` carries `scanLanguage`
(the scan's two-letter code: `"ja"`, `"de"`, `"it"`), which gives it a "See translation" toggle
in the card modal and the lightbox. When its English scan is out and the card is refreshed to
it, delete `scanLanguage`.

`scanLanguage` is the mark's only record (`docs/plans/P3-pipelines.md`, P3-5): admin's
`state.json` needs no `provisional-translation` entry. Until Doberjohn/inkweave#656 lands, the
app's `reveal-set-integrity.test.ts` still compares the mark with the app's frozen copy of
`scripts/reveal-sync/state.json`. So a card marked by hand before then also needs that entry
there. The reveal publisher gets a field for the mark in Doberjohn/inkweave-admin#14.
~~~

- [ ] **Step 9: "Where things live"**

Replace the table with:

~~~markdown
| What | Where |
|---|---|
| Deterministic pipeline | `scripts/reveal-sync/*.mjs`, tests alongside (`pnpm test:run`) |
| Run-to-run memory | `scripts/reveal-sync/state.json` on admin's `main`, committed by `write`; a run works from its own copy |
| One run's files | `%TEMP%/inkweave-reveal-sync/<RUN>/`: `run.json`; `preview.json` and `state.json` (the base `start` read, then the state as `write` left it); `official.json` (the official list as `start` read it); `cards/<slug>/` (site record, official scan); `blind/<token>/` (one per reader); `out/` (what the PR commits). `REVEAL_SYNC_RUNS` overrides |
| GitHub | `gh`, logged in as the owner: `Doberjohn/inkweave` at `master` (`REVEAL_SYNC_APP_BASE` overrides) and `Doberjohn/inkweave-admin` at `main` (`REVEAL_SYNC_STATE_BRANCH` overrides) |
| Art conversion | the app's `scripts/convert-preview-images.mjs` at the pin, run from a copy in `.reveal-sync-convert/<RUN>/` and removed afterwards |
| Official list | `https://illumineertales.com/cards.json` (`REVEAL_SYNC_OFFICIAL_ORIGIN` overrides the origin) |
| Browser downloads | `~/Downloads`, moved into the run as they land (`REVEAL_SYNC_DOWNLOADS` overrides) |
~~~

- [ ] **Step 10: Read it through once**

Search the skill for `/admin/reveal`, `commit-and-push`, `git switch`, `precompute-synergies`, `apps/web/src` and `test:scripts`.
Expected: none is left.

- [ ] **Step 11: Commit** (owner approves)

```bash
git add .claude/skills/fetch-reveals/SKILL.md
USER_APPROVED=1 git commit -m "docs(reveals): run fetch-reveals from admin and publish through a PR (#3)"
```

### Task 20: Rehearse a reveal PR

**Files:**
- Create: `scripts/reveal-sync/rehearse.mjs`

It runs one fixture card through the real chain, converter and GitHub calls, against throwaway branches. Every step that writes to GitHub needs the owner's approval.

- [ ] **Step 1: Write `scripts/reveal-sync/rehearse.mjs`**

```js
#!/usr/bin/env node
/**
 * Rehearse a reveal PR end to end against throwaway branches (docs/plans/P3-pipelines.md,
 * Task 20): one fixture card with a generated scan, through the real write chain, converter
 * and GitHub calls. Point REVEAL_SYNC_APP_BASE and REVEAL_SYNC_STATE_BRANCH at the
 * throwaways first; it refuses master and main.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {adjudicate} from './adjudicate.mjs';
import {readBase} from './base.mjs';
import {parseCardLines} from './extract-card.mjs';
import {APP_BASE, STATE_BRANCH} from './github.mjs';
import {publishRun} from './publish.mjs';
import {cardDir, localDate, newRunId, writeBase, writeRun} from './runstore.mjs';
import {fullName} from './text.mjs';
import {loadSeason, loadWriteChain} from './web.mjs';
import {writePhase} from './write.mjs';
import {TEST_INVENTOR, TEST_PUP, page, readerFor} from './__fixtures__/cards.mjs';

/** Fixture cards with a scripted reader, tried in order until one's id is free on the base. */
const CANDIDATES = [
  [TEST_PUP, readerFor.testPup],
  [TEST_INVENTOR, readerFor.testInventor],
];

if (APP_BASE === 'master' || STATE_BRANCH === 'main') {
  console.error('Point REVEAL_SYNC_APP_BASE and REVEAL_SYNC_STATE_BRANCH at throwaway branches first.');
  process.exit(1);
}

const season = await loadSeason();
const base = readBase();
const taken = new Set(JSON.parse(base.preview.text).cards.map((card) => card.id));
const pick = CANDIDATES.map(([fixture, reader]) => {
  const site = parseCardLines(page(fixture), {slug: fixture.slug, imageFile: fixture.imageFile});
  return {fixture, site, card: adjudicate(site, [reader()]).card};
}).find(({site}) => !taken.has(season.idBase + site.collector.number));
if (!pick) {
  console.error(`Every rehearsal fixture's id is taken on ${APP_BASE}; add a fixture with a scripted reader.`);
  process.exit(1);
}

const {fixture, site, card} = pick;
const section = JSON.parse(base.state.text).sets[season.setCode] ?? {cards: {}};
const known = Object.keys(section.cards);
const run = {
  runId: newRunId(),
  startedAt: new Date().toISOString(),
  today: localDate(),
  season,
  appBase: base.appBase,
  stateBranch: base.stateBranch,
  baseBlob: base.preview.sha,
  stateBlob: base.state.sha,
  // Every slug the state knows stays "on the site", so the rehearsal retires nothing.
  site: {slugs: [...known, fixture.slug], total: section.indexTotal ?? known.length + 1},
  cards: {
    [fixture.slug]: {
      number: site.collector.number,
      title: fullName(site.name, site.version),
      status: 'ready',
      card,
      image: 'official.png',
    },
  },
};
writeBase(run.runId, {previewText: base.preview.text, stateText: base.state.text});
fs.mkdirSync(cardDir(run.runId, fixture.slug), {recursive: true});
await sharp({create: {width: 734, height: 1024, channels: 3, background: '#557799'}})
  .png()
  .toFile(path.join(cardDir(run.runId, fixture.slug), 'official.png'));
writeRun(run);
writePhase(run, await loadWriteChain());
writeRun(run);
console.log(`Run ${run.runId}:`, publishRun(run));
```

- [ ] **Step 2: Commit, then push** (owner approves each)

```bash
git add scripts/reveal-sync/rehearse.mjs
USER_APPROVED=1 git commit -m "test(reveals): rehearse a reveal PR against throwaway branches (#3)"
USER_APPROVED=1 git push -u origin feature/3-reveal-ingestion
```

The admin throwaway branch starts from this branch, which holds `scripts/reveal-sync/state.json`.
- [ ] **Step 3: Create the two throwaway branches** (owner approves)

```bash
gh api repos/Doberjohn/inkweave/git/refs -f ref=refs/heads/reveals-verify -f sha="$(gh api repos/Doberjohn/inkweave/git/ref/heads/master --jq .object.sha)"
gh api repos/Doberjohn/inkweave-admin/git/refs -f ref=refs/heads/reveals-verify-state -f sha="$(gh api repos/Doberjohn/inkweave-admin/git/ref/heads/feature/3-reveal-ingestion --jq .object.sha)"
```

- [ ] **Step 4: Rehearse** (owner approves: it opens a PR in the app repo)

```bash
REVEAL_SYNC_APP_BASE=reveals-verify REVEAL_SYNC_STATE_BRANCH=reveals-verify-state node scripts/reveal-sync/rehearse.mjs
```

Expected: the converter's lines, then `Run <RUN>: { url: 'https://github.com/Doberjohn/inkweave/pull/<n>', stateCommit: '<sha>' }`.
- [ ] **Step 5: Check what landed**

```bash
gh pr view <url> --json baseRefName,headRefName,files --jq '.baseRefName, .headRefName, (.files[].path)'
gh api repos/Doberjohn/inkweave-admin/commits/reveals-verify-state --jq '.commit.message, (.files[].filename)'
REVEAL_SYNC_APP_BASE=reveals-verify REVEAL_SYNC_STATE_BRANCH=reveals-verify-state node scripts/reveal-sync/run.mjs write <RUN>
```

Expected:
- the PR's base is `reveals-verify`, and its head is `reveals/set<SET>-<RUN>`;
- its files are exactly `apps/web/public/data/previewCards.json` and the card's two AVIFs;
- the admin commit reads `chore(reveals): record run <RUN>`, links the PR, and changes only `scripts/reveal-sync/state.json`;
- the second `write` prints `Run <RUN> is already written: <url>` and opens nothing.

The PR's CI runs the app's tests on the new card. Its Vercel preview shows the card, which is the generated scan.
- [ ] **Step 6: Clean up** (owner approves)

```bash
gh pr close <url> --delete-branch
gh api -X DELETE repos/Doberjohn/inkweave/git/refs/heads/reveals-verify
gh api -X DELETE repos/Doberjohn/inkweave-admin/git/refs/heads/reveals-verify-state
```

The run's folder under `%TEMP%/inkweave-reveal-sync/` can go too.

### Task 21: Runbook, CLAUDE.md, PLAN.md and the user-level skill

**Files:**
- Create: `docs/REVEAL_RUNBOOK.md`
- Modify: `CLAUDE.md`, `docs/PLAN.md`
- Modify, outside the repo (owner approves): `~/.claude/skills/scan-reveal-card/SKILL.md`

- [ ] **Step 1: Write `docs/REVEAL_RUNBOOK.md`**

It holds the operations half of the app's `docs/reveals/START_REVEAL_SEASON.md`. The season switch itself (the flag, the data block, per-season content) stays app work in that file. The runbook opens with:

~~~markdown
# Reveal runbook

How reveals reach Inkweave from admin. The season switch itself (the flag, the data block,
per-season content) is app work: `docs/reveals/START_REVEAL_SEASON.md` in Doberjohn/inkweave.

## After the app rotates the season

reveal-sync reads the season from the pinned app. Bump the pin (CLAUDE.md, "Updating the app
pin") before the next `/fetch-reveals`, or the run targets the old set.

## New reveals in bulk: `/fetch-reveals`

Run `/fetch-reveals` from an admin session. The skill (`.claude/skills/fetch-reveals/SKILL.md`)
drives the owner's Chrome for lorcanaplayer, and `node scripts/reveal-sync/run.mjs` does the
rest. A run ends with one PR in the app repo and one commit of `state.json` on admin's `main`.

- Merge the reveal PR before the next run: `start` refuses while one is open.
- If `write` stops part-way (a network error, GitHub down), run `write RUN` again. It resumes.
- `run.mjs report RUN` reprints a run's report.

## Closing a reveal PR unmerged

The run's state commit on admin's `main` (`chore(reveals): record run <RUN>`) still marks its
cards `written`, so no later run would retry them. Revert it on a `fix/` branch from `main`
(`git revert <sha>`), and merge that as a PR. The next run fetches those cards again.

## One card at a time: the reveal publisher

https://inkweave-admin.vercel.app/reveal commits a card and its raw scan straight to the app's
`master`, where the app's `convert-reveal-images.yml` turns the raw into AVIFs. Use it for a
card the pipeline cannot write, for example a `validation-failed` card or a promo in the
reserved band. A card published there while a run is open makes that run's `write` refuse:
start a new run.
~~~

After that come these sections of `START_REVEAL_SEASON.md`, copied, in order:
- "Ids and filenames", "Ink blocks" and "Record conventions" (from "Adding cards");
- "Variant printings (Epic, Enchanted, Iconic)";
- "Production", "Gotchas" and "Checklist".

In the copies:
- `/admin/reveal` becomes the reveal publisher's link;
- `pnpm test:scripts` becomes `pnpm test:run`;
- a step that runs in the app checkout says "in Doberjohn/inkweave";
- a bare issue number becomes `Doberjohn/inkweave#<n>`.

"First batch, by PR" and "New reveals in bulk" are replaced by the sections above.
- [ ] **Step 2: CLAUDE.md**

Under "## Pipelines", after the Analytics bullet, add:

~~~markdown
- **Reveal ingestion.** `/fetch-reveals` runs from an admin session (`.claude/skills/fetch-reveals/`, `scripts/reveal-sync/`). Its `write` opens a PR in the app from a `reveals/…` branch and commits `scripts/reveal-sync/state.json` straight to `main`; CI and Deploy skip a push that changes only that file. It reads the season through `src/app-bridge.ts`, so bump the pin when the app rotates the season. Runbook: [docs/REVEAL_RUNBOOK.md](docs/REVEAL_RUNBOOK.md).
~~~

- [ ] **Step 3: docs/PLAN.md**

In the P3 section, mark P3 done and name its three PRs: P3a (#15), the pin bump (#16) and P3b (this PR). Point at this plan.
- [ ] **Step 4: The user-level skill** (owner approves: it lives outside the repo)

Read `~/.claude/skills/scan-reveal-card/SKILL.md` whole.
- Each link to the app's reveal tool (`/admin/reveal`, on inkweave.ink or localhost) becomes `https://inkweave-admin.vercel.app/reveal`.
- Each path under `apps/web/src/features/reveal-admin/` becomes admin's `src/tools/reveal/`.

Show the owner the diff before saving.
- [ ] **Step 5: Commit** (owner approves)

```bash
git add docs/REVEAL_RUNBOOK.md CLAUDE.md docs/PLAN.md
USER_APPROVED=1 git commit -m "docs(reveals): the reveal runbook, and P3's place in CLAUDE.md and PLAN.md (#3)"
```

### Task 22: Hand over `state.json`, and open the PR "Closes #3"

- [ ] **Step 1: Take over `state.json` from the app's `master`**

`state.json` changed on every `/fetch-reveals` run in the app, so it comes from the app's `master` at the last moment, not from the pin:

```bash
gh api repos/Doberjohn/inkweave/contents/scripts/reveal-sync/state.json -H "Accept: application/vnd.github.raw+json" > scripts/reveal-sync/state.json
pnpm vitest run scripts/reveal-sync/state.test.mjs
git diff --stat scripts/reveal-sync/state.json
```

Expected: the state test passes (the file is stored as `serializeState` writes it), and the diff shows the entries the app gained since the pin.

```bash
git add scripts/reveal-sync/state.json
USER_APPROVED=1 git commit -m "chore(reveals): take over state.json from the app's master (#3)"
```

From this commit on, the owner runs `/fetch-reveals` only from admin. The app's copy is frozen until P4 deletes it.
- [ ] **Step 2: The gates**

Run `pnpm check:deps`, `pnpm typecheck`, `pnpm lint`, `pnpm test:run` and `pnpm build`.
Then run CodeScene: `analyze_change_set` against `main`, plus `code_health_review` on each new module, since the change set can skip new files.
Expected: everything passes, and the new modules score 10.0.
- [ ] **Step 3: Push and open the PR** (owner approves)

```bash
USER_APPROVED=1 git push
gh pr create --repo Doberjohn/inkweave-admin --base main --title "feat(reveals): reveal ingestion from admin (P3b)" --body-file <body>
```

The body:
- says "Closes #3 (P3b, reveal ingestion). Plan: `docs/plans/P3-pipelines.md`, Part 3.";
- summarizes the write phase's new shape, the #635 port, the CI and Deploy `paths-ignore`, and P3-5 and P3-6;
- lists the verification: gates, test counts, CodeScene, and the rehearsal PR's URL with what it held;
- ends with "After merge": run `/fetch-reveals` only from admin; Doberjohn/inkweave#656 lands before #14.
- [ ] **Step 4: After the merge**
  - Check the merge's CI and Deploy runs pass.
  - Check that the first real `/fetch-reveals` from admin opens its PR, and that its state commit starts no CI run or deploy.
  - Remove the P3b decision memory, which this plan now records.

---

## Rollback

- **Analytics.** Revert the `deploy.yml` commit. Deploys then ship without `/admin-data/`, and the tool shows its "not generated" state. Remove the five secrets with `gh secret delete <NAME> --repo Doberjohn/inkweave-admin`.
- **Pin bump.** Revert its merge. The pin is only a pointer.
- **Reveal ingestion.** Revert the P3b merge. Until P4, the app repo's `/fetch-reveals` still works, as long as its `state.json` is brought back up to date: copy admin's `main` copy over the app's.
- **Rehearsal leftovers.** Close the rehearsal PR together with its branch (`gh pr close <url> --delete-branch`). Then delete the two throwaway bases:
  - `gh api -X DELETE repos/Doberjohn/inkweave/git/refs/heads/reveals-verify`
  - `gh api -X DELETE repos/Doberjohn/inkweave-admin/git/refs/heads/reveals-verify-state`

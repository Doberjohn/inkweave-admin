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
- **P3b, reveal ingestion.** `scripts/reveal-sync/` and the `fetch-reveals` skill are ported from the bumped pin. Their write phase stops writing into a local app checkout. Instead it creates a branch, commits through the Git Data API, and opens a PR in the app repo.

**Tech stack:**
- GitHub Actions (cron, multi-repository checkout)
- pnpm 9 filtered installs
- Node 24 ES modules
- the Supabase JS client
- the Vercel Web Analytics Query API
- Vitest 4

**Tracking:** Doberjohn/inkweave-admin#3. Spec: `docs/PLAN.md` (decisions D7 and D8, sections 4.4 and 4.5, and the "P3: Pipelines" outline). Issue #3 carries the step outline this plan details.

---

## Decisions (owner, 2026-09-29)

| # | Decision | Detail |
|---|---|---|
| P3-1 | Two PRs, one plan | P3a (analytics) says "Part of #3". P3b (reveal ingestion) says "Closes #3". This plan covers both. |
| P3-2 | Bump the pin before P3b | After the pin (`e70249be`), the app's `master` changed reveal-sync: `text.mjs`, `extract-card.mjs`, the `fetch-reveals` skill, `revealSet.ts`, and `state.json` (+141 lines, and growing through the reveal season). P3b ports from a pin bumped in its own PR. P3a doesn't wait: the analytics scripts haven't changed since the pin. |
| P3-3 | Nightly plus manual | A `schedule` cron of `0 4 * * *` plus `workflow_dispatch`, as D8 says. The analytics steps run on every trigger, push included: a deployment built without them would ship with no `/admin-data/`. |
| P3-4 | Quiet logs | The repo was public on 2026-09-29, and the owner plans to make it private around 2026-10-01. A public repo's workflow logs are public. So the precompute scripts log the files they write, never vote, voter or event counts. |

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

**P3b creates:**
- `scripts/reveal-sync/**`
- `.claude/skills/fetch-reveals/SKILL.md`
- `docs/PREVIEW_CARD_PARSER.md` and `docs/REVEAL_RUNBOOK.md`

It also modifies `CLAUDE.md`. Details are in Part 3.

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

The step-level detail of this part is written when it starts, against the bumped pin, and added here. These are the decisions and the task list it follows.

**Where reveal-sync touches the app checkout today** (26 files and about 5,100 lines at `e70249be`):
- `runstore.mjs` writes `state.json`, and points its raw and AVIF folders into the checkout (`apps/web/public/card-images-raw` and `apps/web/public/card-images-preview`).
- `web.mjs` loads app code from `apps/web`.
- `write.mjs` copies the scans into the checkout, runs the app's `convert-preview-images.mjs` there, and rewrites `previewCards.json` in place.
- `cli.mjs` runs `git` to check the checkout before a run.

### Task 11: Port the files from the bumped pin

Copy `scripts/reveal-sync/**`, `.claude/skills/fetch-reveals/` and `docs/PREVIEW_CARD_PARSER.md`. Run the ported tests (9 files) as they are, to prove the copy before any change.

### Task 12: App code through the submodule and the ported write chain

`web.mjs` loads `revealSet.ts` and `theme.ts` from `upstream/inkweave/apps/web/src/shared/constants/`, and the write chain (`insertCardIntoPreviewJson`, `buildPreviewCard`) from `src/tools/reveal/`.

### Task 13: The write phase opens a PR

The write phase stops writing into a local checkout:
1. It converts the scans to AVIF in a temporary directory with `upstream/inkweave/scripts/convert-preview-images.mjs`.
2. It creates branch `reveals/<set>-<date>` in `Doberjohn/inkweave` from `master`.
3. It commits `previewCards.json` and the AVIFs through the Git Data API, reusing `src/github/githubCommit.ts`'s approach: a read at the base commit, then a non-force ref update.
4. It opens the PR with `gh`, under the owner's login.

### Task 14: The start check

`run.mjs start` records `previewCards.json`'s SHA on `master`. The write phase refuses to publish if it has moved. That check replaces the clean-checkout and feature-branch preconditions in `cli.mjs`.

### Task 15: Hand over `state.json`

`state.json` changes on every `/fetch-reveals` run in the app, and it is still changing through the reveal season. So:
- the P3b PR copies it from the app's `master` when the PR is final, not from the pin;
- from the merge on, the owner runs `/fetch-reveals` only from admin.

### Task 16: Decide how the app's integrity test is kept

Since `Doberjohn/inkweave@d279f213`, the app's `reveal-set-integrity.test.ts` requires two things to match: the cards that carry `scanLanguage`, and the entries the app's own `scripts/reveal-sync/state.json` marks `provisional-translation`.

Once admin owns `state.json`, admin's reveal PRs would change `previewCards.json` without the app's copy. For example, refreshing a provisional card to its English scan would then fail the app's test.

The options, for the owner at P3b start:
- **(a) Mirror (recommended).** Each reveal PR also writes admin's `state.json` into the app's `scripts/reveal-sync/state.json` until P4.
- **(b) Move the check.** Change or move the app's test now.

Issue #14 depends on the same answer.

### Task 17: Update `SKILL.md`

The skill runs from an admin session and ends with a PR link instead of a `/commit-and-push` hand-off.

### Task 18: Rehearse a reveal PR

1. Create base branch `reveals-verify` in the app repo from `master`.
2. Run the write phase against it, using a fixture card.
3. Check the PR holds exactly `previewCards.json` plus that card's AVIFs. With option (a), `state.json` is in it too.
4. Close the PR, and delete both branches with `gh api -X DELETE`.

### Task 19: Runbook and the user-level skill

- Write `docs/REVEAL_RUNBOOK.md`, the operations half of `START_REVEAL_SEASON.md`: running `/fetch-reveals`, the reveal publisher, gotchas, and the checklist.
- Point the owner's `~/.claude/skills/scan-reveal-card/SKILL.md` at the admin site.

### Task 20: PR "Closes #3"

- Run the gates and CodeScene.
- Push, and open the PR.
- After the merge, the owner runs `/fetch-reveals` from admin.

---

## Rollback

- **Analytics.** Revert the `deploy.yml` commit. Deploys then ship without `/admin-data/`, and the tool shows its "not generated" state. Remove the five secrets with `gh secret delete <NAME> --repo Doberjohn/inkweave-admin`.
- **Pin bump.** Revert its merge. The pin is only a pointer.
- **Reveal ingestion.** Revert the P3b merge. Until P4, the app repo's `/fetch-reveals` still works, as long as its `state.json` is brought back up to date from admin's.
- **Rehearsal leftovers.** Close the rehearsal PR, then run `gh api -X DELETE repos/Doberjohn/inkweave/git/refs/heads/reveals-verify`, and the same for its head branch.

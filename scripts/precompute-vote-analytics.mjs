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
import {buildAnalytics, buildVoteLog, pairKey, ruleRosterEntry} from './lib/voteAnalytics.mjs';

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

/** Rule roster (labels, zero-vote rules, playstyle ids) from the app's built engine. */
async function loadRuleRoster() {
  const engine = path.join(APP_DIR, 'packages/synergy-engine/dist/index.js');
  const {getAllRules} = await import(pathToFileURL(engine).href);
  return getAllRules().map((rule) => ruleRosterEntry(rule));
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

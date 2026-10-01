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

/** Run status -> state status. Cards still in flight are not recorded; the next run retries them. */
const STATE_STATUS = {
  known: 'written',
  written: 'written',
  deferred: 'deferred',
  conflict: 'conflict',
  skipped: 'skipped',
};

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

const nameKey = (form) => comparableName(fullName(form.name, form.version));

/**
 * A ready card as the reveal form, spelled the way Inkweave spells names: without accents
 * (the owner's rule, issue #582). The name, the version and every "named X" reference in the
 * text lose theirs, so a Shift line names the card as written; the rest stays as printed.
 */
export function writtenForm(card) {
  return toRevealForm({
    ...card,
    name: unaccented(card.name),
    version: unaccented(card.version),
    text: card.text.map(unaccentReferences),
  });
}

/** Why the chain or the preview data refuses this card, or null. `seen` holds ids and names. */
function problemWith(chain, form, image, seen) {
  const check = chain.validateRevealCardForm(form, seen.ids, image);
  if (!check.ok) return Object.values(check.errors).join('; ');
  if (seen.names.has(nameKey(form))) return 'a card with this name is already in the preview data';
  return null;
}

/** Step 1: the ready cards the write chain accepts, in collector-number order. */
function acceptReady(run, chain, previewText) {
  const cards = JSON.parse(previewText).cards;
  const sameSet = cards.filter((c) => String(c.setCode) === String(run.season.setCode));
  const seen = {
    ids: new Set(cards.map((c) => c.id)),
    names: new Set(sameSet.map((c) => comparableName(c.fullName))),
  };
  const accepted = [];
  for (const [slug, entry] of entries(run, 'ready').sort(byNumber)) {
    const form = writtenForm(entry.card);
    const problem = problemWith(chain, form, entry.image, seen);
    if (problem) {
      Object.assign(entry, {status: 'conflict', reason: 'validation-failed', detail: problem});
      continue;
    }
    const id = run.season.idBase + entry.card.number;
    seen.ids.add(id);
    seen.names.add(nameKey(form));
    accepted.push({slug, id, form, image: entry.image});
  }
  return accepted;
}

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
export function stageOutputs(runId, text, avifs) {
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

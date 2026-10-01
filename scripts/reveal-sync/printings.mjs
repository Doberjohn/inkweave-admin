/**
 * Variant printings (issue #22): the Epics, Enchanteds and Iconics numbered after a set's main
 * cards. Each is alternate art for a card that is already in, never a card of its own: it goes
 * into its base card's `variants` in previewCards.json as {id, rarity, number}, with the id
 * REVEAL_ID_BASE + number and its art in card-images-preview/{id}.avif and {id}-sm.avif. That
 * is the shape the app's scripts/lib/fold-variants.mjs writes, and its
 * reveal-set-integrity.test.ts holds every printing to it.
 *
 * Nothing here reads or writes anything: variants.mjs reads the inputs, then stages and
 * publishes what this plans.
 */
import {UsageError} from './cli.mjs';
import {VARIANTS} from './convert.mjs';
import {PR_PREFIX} from './github.mjs';
import {officialFullName} from './official.mjs';
import {comparableName} from './text.mjs';

/** The official list's printing rarities, as the app spells them. */
const RARITY = {EPIC: 'Epic', ENCHANTED: 'Enchanted', ICONIC: 'Iconic'};

/* ---------------------------------------------------------------- planning */

/** Every id the app's data uses, for a card or a printing, with what holds it. */
function idOwners(preview, allCards) {
  const owners = new Map();
  const claim = (id, owner) => {
    if (!owners.has(id)) owners.set(id, owner);
  };
  for (const [file, data] of [
    ['previewCards.json', preview],
    ['allCards.json', allCards],
  ]) {
    for (const card of data.cards) {
      claim(card.id, `${card.fullName} in ${file}`);
      for (const variant of card.variants ?? []) claim(variant.id, `${card.fullName}'s ${variant.rarity} in ${file}`);
    }
  }
  return owners;
}

function notRevealed(official, number) {
  const unreadable = (official.unreadable ?? []).some((entry) => !entry.promo_set && entry.set_number === number);
  return unreadable ? "illumineertales.com's entry for it could not be read" : 'illumineertales.com has not revealed it';
}

/** The slot's official entry, if it is a revealed printing in English, or why it is not. */
function findSlot(official, number, season) {
  if (number <= season.setTotal) {
    return {problem: `in the main set (1-${season.setTotal}); printings are numbered after it`};
  }
  const entry = official.cards.find((slot) => slot.set_number === number);
  if (!entry) return {problem: notRevealed(official, number)};
  if (!RARITY[entry.rarity]) {
    return {problem: `its rarity is ${JSON.stringify(entry.rarity)} on illumineertales.com, not EPIC, ENCHANTED or ICONIC`};
  }
  if (entry.translation_url) return {problem: `the official reveal is not in English (${entry.translation_url})`};
  return {entry};
}

/**
 * The one card of the season's set with the printing's name and version, compared without
 * accents, case or quote style: the list's #215 is "Héctor Rivera", its base #117 "Hector".
 */
function findBase(cards, entry, season) {
  const fullName = officialFullName(entry);
  const key = comparableName(fullName);
  const matches = cards.filter(
    (card) => String(card.setCode) === String(season.setCode) && comparableName(card.fullName) === key,
  );
  if (matches.length === 1) return {card: matches[0]};
  if (!matches.length) return {problem: `no Set ${season.setCode} card named "${fullName}" in previewCards.json`};
  const ids = matches.map((card) => card.id).join(', ');
  return {problem: `${matches.length} Set ${season.setCode} cards are named "${fullName}" (${ids})`};
}

const toPrinting = (entry, card, season) => ({
  number: entry.set_number,
  id: season.idBase + entry.set_number,
  rarity: RARITY[entry.rarity],
  name: entry.name,
  fullName: officialFullName(entry),
  base: {id: card.id, fullName: card.fullName},
  entry,
});

/** Why the printing's id, art or rarity is taken already, or null. `planned`: printings before it. */
function clashOf(printing, card, {ids, avifs, planned}) {
  const owner = ids.get(printing.id);
  if (owner) return `id ${printing.id} is already ${owner}`;
  const art = VARIANTS.map((suffix) => `${printing.id}${suffix}.avif`).filter((name) => avifs.has(name));
  if (art.length) return `card-images-preview already has ${art.join(' and ')}`;
  const onBase = [...(card.variants ?? []), ...planned.filter((other) => other.base.id === card.id)];
  const same = onBase.find((other) => other.rarity === printing.rarity);
  if (same) return `${card.fullName} (${card.id}) already has an ${printing.rarity} (#${same.number})`;
  return null;
}

function planOne(number, base, taken) {
  const slot = findSlot(base.official, number, base.season);
  if (slot.problem) return slot;
  const found = findBase(base.preview.cards, slot.entry, base.season);
  if (found.problem) return found;
  const printing = toPrinting(slot.entry, found.card, base.season);
  const problem = clashOf(printing, found.card, taken);
  return problem ? {problem} : {printing};
}

/**
 * The printings to stage for `numbers`, each once and in collector-number order, and why any
 * cannot be. `base` is what staging read: {official, preview, allCards, avifs, season}, being
 * the season's official list, the app's previewCards.json and allCards.json (parsed), the
 * names in its card-images-preview folder, and the season ({setCode, setTotal, idBase}).
 * A printing is {number, id, rarity, name, fullName, base: {id, fullName}, entry}.
 */
export function planPrintings(numbers, base) {
  const taken = {ids: idOwners(base.preview, base.allCards), avifs: base.avifs, planned: []};
  const problems = [];
  for (const number of [...new Set(numbers)].sort((a, b) => a - b)) {
    const {printing, problem} = planOne(number, base, taken);
    if (problem) problems.push(`#${number}: ${problem}`);
    else taken.planned.push(printing);
  }
  return {printings: taken.planned, problems};
}

/* ----------------------------------------------------------------- writing */

const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * previewCards.json's text with each printing in its base card's `variants`, in
 * collector-number order; a card without the array gets it as its last field. A file the
 * JSON writer would lay out differently is refused, so the diff holds only the new entries.
 */
export function addVariants(previewText, printings) {
  const preview = JSON.parse(previewText);
  if (serialize(preview) !== previewText) {
    throw new UsageError(
      'previewCards.json is not laid out the way JSON.stringify(_, null, 2) writes it, so adding to it would rewrite the whole file. Nothing was staged.',
    );
  }
  for (const {id, rarity, number, base} of printings) {
    const card = preview.cards.find((candidate) => candidate.id === base.id);
    if (!card) throw new Error(`no card ${base.id} in previewCards.json for printing ${id}`);
    card.variants = [...(card.variants ?? []), {id, rarity, number}].sort((a, b) => a.number - b.number);
  }
  return serialize(preview);
}

/* ---------------------------------------------------------------- the PR */

const COUNTS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n) => COUNTS[n] ?? String(n);

/** "a", "a and b", "a, b and c". */
const andList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** Lines of at most `width` characters, as git wants a commit body. */
function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return line ? [...lines, line] : lines;
}

/**
 * Past this a title stops being readable, so a big batch is counted rather than named. The
 * shortest form also keeps well inside GitHub's own limit of 256.
 */
const TITLE_MAX = 120;
/** Git's convention for a commit subject. */
const SUBJECT_MAX = 72;

/** The first text no longer than `max`, else the last. */
const firstWithin = (max, texts) => texts.find((text) => text.length <= max) ?? texts.at(-1);

/** The printings' names under their rarity, or their count: one group per rarity. */
function rarityGroups(printings, phrase) {
  const groups = new Map();
  for (const {rarity, name} of printings) groups.set(rarity, [...(groups.get(rarity) ?? []), name]);
  return andList([...groups].map(([rarity, names]) => phrase(rarity + (names.length > 1 ? 's' : ''), names)));
}

/**
 * "the Epic of Judy Hopps and the Enchanteds of Belle and Baymax (206, 230, 237)", or for a
 * batch too big to name, "seven Epics and three Enchanteds", with the numbers while they fit.
 */
function prTitle(printings, numbers) {
  const named = rarityGroups(printings, (rarities, names) => `the ${rarities} of ${andList(names)}`);
  const counted = rarityGroups(printings, (rarities, names) => `${count(names.length)} ${rarities}`);
  const texts = [`${named} (${numbers})`, `${counted} (${numbers})`, counted];
  return firstWithin(TITLE_MAX, texts.map((text) => `feat(reveals): add ${text}`));
}

function commitMessage(printings, season, numbers) {
  const one = printings.length === 1;
  const plain = `feat(reveals): add ${count(printings.length)} Set ${season.setCode} variant printing${one ? '' : 's'}`;
  const subject = firstWithin(SUBJECT_MAX, [`${plain} (${numbers})`, plain]);
  const folds = printings.map(({base, rarity, id}) => `${base.fullName}'s ${rarity} ${id} into ${base.id}`);
  const paragraph = one
    ? `A variant printing from admin's scripts/reveal-sync/variants.mjs, folded into its base card: ${folds[0]}. The art is its official English scan from illumineertales.com.`
    : `Variant printings from admin's scripts/reveal-sync/variants.mjs, each folded into its base card: ${andList(folds)}. The art is each printing's official English scan from illumineertales.com.`;
  return [subject, '', ...wrap(paragraph, 72)].join('\n');
}

const entryJson = ({id, rarity, number}) => `{"id": ${id}, "rarity": "${rarity}", "number": ${number}}`;

const tableRow = (printing, season) =>
  `| ${printing.fullName}, ${printing.rarity} ${printing.number}/${season.setTotal} | \`${printing.base.id}\` | \`${entryJson(printing)}\` | English |`;

/** A Follow-up for a printing whose name the app spells differently on its base card. */
const spellingNote = ({base, rarity, fullName}) =>
  `- The app spells ${base.id} \`${base.fullName}\`, but illumineertales.com spells the ${rarity} \`${fullName}\`. \`sync-variants\` matches preview cards on set and full name, so if LorcanaJSON keeps that spelling it will list this ${rarity} as unmatched until the two names agree.`;

/** The words that change with how many printings the PR adds. */
function grammar(n) {
  if (n === 1) {
    return {
      intro: 'Adds one newly revealed printing as a variant of its base card. It is not a separate card.',
      each: 'It comes',
      them: 'it',
      scans: 'The scan is used unchanged. `PrintingCarousel` clips it',
      these: 'this printing',
    };
  }
  return {
    intro: `Adds ${count(n)} newly revealed printings as variants of their base cards. ${n === 2 ? 'Neither' : 'None'} is a separate card.`,
    each: 'Each comes',
    them: n === 2 ? 'both' : `all ${count(n)}`,
    scans: 'The scans are used unchanged. `PrintingCarousel` clips them',
    these: 'these printings',
  };
}

/** The PR body, in Doberjohn/inkweave#689's format. */
function prBody(printings, season) {
  const words = grammar(printings.length);
  return [
    words.intro,
    '',
    '| Printing | Base card | Variant entry | Scan |',
    '|---|---|---|---|',
    ...printings.map((printing) => tableRow(printing, season)),
    '',
    `${words.each} with \`card-images-preview/{id}.avif\` and \`{id}-sm.avif\`, converted with the app's own \`convert-preview-images\` script from the printing's official scan. illumineertales.com lists ${words.them} as revealed, in English. Staged and published with admin's \`scripts/reveal-sync/variants.mjs\` (REVEAL_RUNBOOK, "Variant printings from admin").`,
    '',
    `${words.scans} at \`RADIUS.xl\` (14px), which covers an official scan's printed corners at the size the art is shown.`,
    '',
    '**Follow-ups**',
    `- When LorcanaJSON adds ${words.these}, \`pnpm sync-variants\` will report that the preview AVIFs shadow the official art. Delete those files then.`,
    ...printings.filter(({base, fullName}) => base.fullName !== fullName).map(spellingNote),
    "- `pnpm precompute-synergies` wasn't run, because this PR was made through the GitHub API. Variants add no cards, and its output (`data/synergies/`, `featuredCards.json`) is git-ignored, so there is nothing else to commit.",
  ].join('\n');
}

/** The PR that publishes `printings`: {branch, message, title, body}. */
export function describePrintings(printings, season) {
  const numbers = printings.map(({number}) => number);
  return {
    branch: `${PR_PREFIX}set${season.setCode}-variants-${numbers.join('-')}`,
    message: commitMessage(printings, season, numbers.join(', ')),
    title: prTitle(printings, numbers.join(', ')),
    body: prBody(printings, season),
  };
}

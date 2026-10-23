import {collectionPromos, finishesById, mergePromoPrintings, type MergeCard, type MergeReport} from '../../../app-bridge';
import type {PromoCatalog} from './promoCatalog';

/*
 * The app's own promo merge, run over the files of the target branch (#77). An add or an edit changes
 * the owner's catalog, and `pnpm merge-promos --write` makes allCards.json and collection/promos.json
 * follow it. Card studio never edits the entries of those two files itself: it runs the app's merge,
 * bridged from scripts/lib/promo-printings.mjs, and commits the text that comes out. That text is the
 * merge's whole output, so it carries any other change the merge makes to files the branch left out of
 * step: `outOfStep` names every such change, and an empty list means there is none. Both functions
 * here read the texts they are given and nothing else, and neither changes its arguments. Where the
 * catalog can't merge into the cards (a card it names isn't there, an id is already taken) the app's
 * merge throws, and so do they: the error's message says why, and nothing is returned.
 */

/** The texts of the two files the merge writes. */
export interface MergedTexts {
  allCards: string;
  promos: string;
}

/** What the merge reads: the catalog, and the branch's two files as they are. */
export interface MergeInput {
  catalog: PromoCatalog;
  files: MergedTexts;
}

/** allCards.json as the merge reads it: its cards. The rest of the file is written back as it is. */
interface AllCards {
  cards: MergeCard[];
}

/** How `outOfStep` names allCards.json, which it does only where no card shows what changes in it. */
const ALL_CARDS_FILE = 'allCards.json';

/** How `outOfStep` names the promos file: its path under the app's data folder. */
const PROMOS_FILE = 'collection/promos.json';

/** The two files as the merge leaves them, and the app's report of what it did to each card. */
interface Merged {
  texts: MergedTexts;
  report: MergeReport;
}

/** allCards.json as the merge reads it. */
function openAllCards({files}: MergeInput): AllCards {
  return JSON.parse(files.allCards) as AllCards;
}

/**
 * Runs the app's merge in place over the cards of `all`, which holds allCards.json as `files` has it,
 * and lists the promos from the catalog. Each file keeps the versions it holds for a printing the
 * catalog names none for, as the app's merge does, and is written in its own format: allCards.json as
 * `JSON.stringify(x, null, 2)` and a newline, promos.json as `JSON.stringify(x)` and a newline.
 */
function merged({catalog, files}: MergeInput, all: AllCards): Merged {
  const report = mergePromoPrintings(all.cards, catalog);
  const listed = collectionPromos(catalog, finishesById(JSON.parse(files.promos) as object[]));
  return {
    texts: {allCards: `${JSON.stringify(all, null, 2)}\n`, promos: `${JSON.stringify(listed)}\n`},
    report,
  };
}

/** The text of each card's JSON as it stands, to tell afterwards which of them the merge changed. */
function jsonOfEach(cards: readonly MergeCard[]): ReadonlyMap<MergeCard, string> {
  return new Map(cards.map((card): [MergeCard, string] => [card, JSON.stringify(card)]));
}

/**
 * The full name of each card the merge reported on whose JSON text isn't what `before` holds, in the
 * report's order. That is every card the merge changed, where the report itself counts only promo
 * entries added, rewritten or removed: it counts no change in entries put in another order, or in a
 * `finishes` key moved to the end.
 */
function changedCards({report, before}: {report: MergeReport; before: ReadonlyMap<MergeCard, string>}): string[] {
  return report.changes
    .map(({card}) => card)
    .filter((card) => JSON.stringify(card) !== before.get(card))
    .map(({fullName}) => fullName);
}

/**
 * What `pnpm merge-promos --write` writes from `catalog` over `files`, in each file's format. Throws
 * where the catalog can't merge into the cards.
 */
export function mergeOver(opts: MergeInput): MergedTexts {
  return merged(opts, openAllCards(opts)).texts;
}

/**
 * What the merge over the files as they are would change, so that [] means it changes neither file's
 * text. It names, in the merge report's order and each once, the full name of every card whose JSON
 * text changes: a promo entry added, rewritten or removed, but also entries put in another order or a
 * `finishes` key moved, which the report counts as no change. Then 'allCards.json', when its text
 * still differs though no card was named (its formatting), then 'collection/promos.json', when that
 * file's text changes. Throws where the catalog can't merge into the cards.
 */
export function outOfStep(opts: MergeInput): string[] {
  const all = openAllCards(opts);
  const before = jsonOfEach(all.cards);
  const {texts, report} = merged(opts, all);
  const names = changedCards({report, before});
  if (names.length === 0 && texts.allCards !== opts.files.allCards) names.push(ALL_CARDS_FILE);
  if (texts.promos !== opts.files.promos) names.push(PROMOS_FILE);
  return [...new Set(names)];
}

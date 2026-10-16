/**
 * The reveal set's released cards (Doberjohn/inkweave-admin#51). Once a set graduates
 * (Doberjohn/inkweave#780), previewCards.json holds none of its cards: allCards.json holds
 * them, released under official ids (set 14's #21 is 3286, no longer 14021). So `start` keeps
 * each number a released card of the set holds in the run, as `released`:
 * [{number, id, fullName}], by number. Every step that asks what Inkweave already holds counts
 * those cards too: the gates before any reader, and `write`, whose validator refuses such a
 * number as Card studio's New reveal does.
 */
import {UsageError} from './cli.mjs';

/**
 * The run's `released`, from allCards.json's raw cards. `chain` is web.mjs's
 * loadReleasedChain(): the app's loader builds each card (transformRawCards), and Card
 * studio's releasedRevealNumbers maps the numbers, so a run finds the released cards New
 * reveal finds.
 */
export function releasedRecords(rawCards, chain) {
  const released = chain.releasedRevealNumbers(chain.transformRawCards(rawCards));
  return [...released]
    .map(([number, {id, fullName}]) => ({number, id, fullName}))
    .sort((a, b) => a.number - b.number);
}

/**
 * A run opened before this check never counted the set's released cards, so it cannot go on.
 * An empty list is a set with nothing released yet, and goes on.
 */
export function assertReleasedRead(run) {
  if (Array.isArray(run.released)) return;
  throw new UsageError(
    `run ${run.runId} was opened before the released-card check (Doberjohn/inkweave-admin#51), so its cards were never checked against the set's released cards. Start a new run.`,
  );
}

/**
 * The cards of this set that Inkweave holds, as the gates match them ({id, number, name}, the
 * name being the full name): its preview cards, then its released ones.
 */
export const heldCards = (preview, released) => [
  ...preview,
  ...released.map(({id, number, fullName}) => ({id, number, name: fullName})),
];

/** The run's released cards as validateRevealCardForm's `released`: number -> {id, fullName}. */
export const releasedByNumber = (released) =>
  new Map(released.map(({number, id, fullName}) => [number, {id, fullName}]));

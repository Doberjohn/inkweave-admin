/**
 * What a run starts from (docs/plans/P3-pipelines.md, Task 16): no reveal PR still open,
 * then the app's previewCards.json and admin's state.json, read through gh with their blob
 * shas, and the app's allCards.json, whose released cards of the reveal set hold numbers no
 * new card may take (released.mjs, Doberjohn/inkweave-admin#51). This replaces the app's
 * checks on a local checkout (a clean tree on a fresh branch).
 */
import {UsageError} from './cli.mjs';
import {ADMIN_REPO, APP_BASE, APP_REPO, PR_PREFIX, STATE_BRANCH, openPullsFrom, readFile, readRaw} from './github.mjs';
import {ALL_CARDS_REL, PREVIEW_REL, STATE_REL} from './runstore.mjs';

/**
 * One reveal PR at a time: a second would fight the first over previewCards.json. `except`
 * names a branch whose PR does not count: a resumed publish's own.
 */
export function assertNoOpenRevealPr({except} = {}) {
  const open = openPullsFrom(APP_REPO, PR_PREFIX).filter(({branch}) => branch !== except);
  if (open.length) {
    throw new UsageError(
      `a reveal PR is still open (${open.map((pr) => pr.url).join(', ')}). Merge or close it first. Closing a /fetch-reveals PR unmerged also means reverting its state commit (docs/REVEAL_RUNBOOK.md); a variants PR has none.`,
    );
  }
}

/**
 * The app's preview data and admin's state, each with the blob sha it was read at, and the
 * app's card data, parsed. allCards.json is past the contents API's 1 MB limit, so it is read
 * raw, and after previewCards.json: a graduation that lands between the two reads leaves its
 * cards in both, never in neither.
 */
export function readBase() {
  return {
    appBase: APP_BASE,
    stateBranch: STATE_BRANCH,
    preview: readFile(APP_REPO, PREVIEW_REL, APP_BASE),
    allCards: JSON.parse(readRaw(APP_REPO, ALL_CARDS_REL, APP_BASE)),
    state: readFile(ADMIN_REPO, STATE_REL, STATE_BRANCH),
  };
}

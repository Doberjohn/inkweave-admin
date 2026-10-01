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
  openPullsFrom,
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

/**
 * A new branch at `sha`; one an interrupted attempt already made at `sha` counts. One at
 * another commit is the owner's to delete, after which a rerun resumes here.
 */
function ensureBranch(branch, sha) {
  try {
    createBranch(APP_REPO, branch, sha);
  } catch (error) {
    if (!/Reference already exists/.test(error.message)) throw error;
    if (branchTip(APP_REPO, branch) !== sha) {
      throw new UsageError(
        `${APP_REPO} already has a branch ${branch} at another commit. Delete it, then run this again: it resumes from commit ${sha.slice(0, 7)}.`,
      );
    }
  }
}

/** A step that landed goes into run.json at once. */
function record(run, landed) {
  run.published = {...run.published, ...landed};
  writeRun(run);
}

/**
 * A staged run's app PR: a commit of out/ on the base's tip, a branch at it, then the PR. Each
 * step goes into run.json as it lands, so a rerun resumes from run.published. Nothing is
 * written once previewCards.json has moved on the base; `startOver` ends that refusal.
 * `pr`: {branch, message, title, body}.
 */
export function publishAppPr(run, pr, startOver) {
  if (!run.published?.commit) {
    const parent = branchTip(APP_REPO, run.appBase);
    if (readFile(APP_REPO, PREVIEW_REL, parent).sha !== run.baseBlob) {
      throw new UsageError(
        `previewCards.json changed on ${APP_REPO}@${run.appBase} since this run started. Nothing was published. ${startOver}`,
      );
    }
    const files = appFiles(run.runId);
    record(run, {commit: createCommit(APP_REPO, {parent, message: pr.message, files})});
  }
  if (!run.published.branch) {
    ensureBranch(pr.branch, run.published.commit);
    record(run, {branch: pr.branch});
  }
  // An attempt whose answer never arrived may have opened the PR already; GitHub refuses a second.
  const opened = openPullsFrom(APP_REPO, PR_PREFIX).find(({branch}) => branch === run.published.branch);
  const request = {head: run.published.branch, base: run.appBase, title: pr.title, body: pr.body};
  record(run, {url: opened?.url ?? openPullRequest(APP_REPO, request)});
}

/** The cards' PR, from a reveals/ branch named for the run. */
function publishCards(run) {
  const {title, body} = describePr(run);
  publishAppPr(run, {branch: branchName(run), message: title, title, body}, 'Start a new run.');
}

/** Record where the run's state landed, and keep it in run.json. */
function recordState(run, commit) {
  run.stateCommit = commit;
  writeRun(run);
}

/** The run's state.json, committed straight to STATE_BRANCH (P3-6) unless the run changed nothing. */
function publishState(run) {
  const bytes = fs.readFileSync(stateFile(run.runId));
  const staged = gitBlobSha(bytes);
  if (staged === run.stateBlob) return recordState(run, 'unchanged');
  const parent = branchTip(ADMIN_REPO, run.stateBranch);
  const onTip = readFile(ADMIN_REPO, STATE_REL, parent).sha;
  // An attempt whose answer never arrived may have moved the branch already: the tip holds this state.
  if (onTip === staged) return recordState(run, parent);
  if (onTip !== run.stateBlob) {
    throw new UsageError(
      `state.json changed on ${ADMIN_REPO}@${run.stateBranch} since this run started, so this run's state was not committed. It is in ${stateFile(run.runId)}; merge it by hand.`,
    );
  }
  const link = run.published?.url ? `\n\n${run.published.url}` : '';
  const files = [{path: STATE_REL, base64: bytes.toString('base64')}];
  const sha = createCommit(ADMIN_REPO, {parent, message: `chore(reveals): record run ${run.runId}${link}`, files});
  advanceBranch(ADMIN_REPO, run.stateBranch, sha);
  recordState(run, sha);
}

/** Publish a staged run: the app PR if it wrote cards, then its state. Returns what landed. */
export function publishRun(run) {
  if (!run.staged) throw new UsageError(`run ${run.runId} has nothing staged yet`);
  const hasCards = fs.existsSync(path.join(outDir(run.runId), 'previewCards.json'));
  if (hasCards && !run.published?.url) publishCards(run);
  if (!run.stateCommit) publishState(run);
  return {url: run.published?.url ?? null, stateCommit: run.stateCommit};
}

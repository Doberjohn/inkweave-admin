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

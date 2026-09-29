import type {TuningConfig} from 'inkweave-synergy-engine';
import {
  commitFiles,
  readRepoFile,
  utf8ToBase64,
  type CommitResult,
} from '../../github/githubCommit';

const TUNING_PATH = 'packages/synergy-engine/src/data/tuning.json';

export interface TuningEdit {
  path: (string | number)[];
  value: string | number;
}

/**
 * Pure JSON edit: applies a list of path/value edits to the parsed tuning
 * document and re-serializes it. Sibling fields at each edited node are left
 * untouched. Kept side-effect-free so it can be unit tested without network
 * access; `commitTuning` below is the network-touching wrapper.
 */
export function applyTuningEdits(text: string, edits: TuningEdit[]): string {
  const obj = JSON.parse(text) as Record<string, unknown>;
  for (const {path, value} of edits) {
    let node = obj as Record<string, unknown>;
    for (const key of path.slice(0, -1)) {
      node = node[key] as Record<string, unknown>;
    }
    node[path[path.length - 1]] = value;
  }
  return JSON.stringify(obj, null, 2) + '\n';
}

/**
 * The live tuning.json on the target branch. The tool edits what the engine
 * reads now, not the copy bundled into admin's build (docs/PLAN.md, 4.4).
 */
export async function readTuning(token: string): Promise<TuningConfig> {
  return JSON.parse(await readRepoFile(token, TUNING_PATH)) as TuningConfig;
}

/**
 * Reads the live tuning.json from the target branch, applies the edits, and
 * commits the result back to it in one atomic commit.
 */
export async function commitTuning(opts: {
  token: string;
  edits: TuningEdit[];
}): Promise<CommitResult> {
  const {token, edits} = opts;
  const current = await readRepoFile(token, TUNING_PATH);
  const next = applyTuningEdits(current, edits);
  return commitFiles({
    token,
    message: 'chore(engine): tune scoring copy + scores',
    files: [{path: TUNING_PATH, contentBase64: utf8ToBase64(next)}],
  });
}

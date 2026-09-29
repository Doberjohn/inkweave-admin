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

const isObject = (value: unknown) => typeof value === 'object' && value !== null;

// The parts of tuning.json the editor walks. The file is also edited by hand,
// so a read checks them rather than trusting the TuningConfig cast.
const REQUIRED_PARTS: [string, (config: TuningConfig) => unknown][] = [
  ['playstyles', (c) => c.playstyles],
  ['directRules', (c) => c.directRules],
  ['ruleTexts.shift-targets', (c) => c.ruleTexts?.['shift-targets']],
  ['ruleTexts.ramp.scores', (c) => c.ruleTexts?.ramp?.scores],
  ['ruleTexts.ramp.templates', (c) => c.ruleTexts?.ramp?.templates],
];

/**
 * The live tuning.json on the target branch. The tool edits what the engine
 * reads now, not the copy bundled into admin's build (docs/PLAN.md, 4.4).
 */
export async function readTuning(token: string): Promise<TuningConfig> {
  const parsed: unknown = JSON.parse(await readRepoFile(token, TUNING_PATH));
  if (!isObject(parsed)) throw new Error('tuning.json is not a JSON object');
  const config = parsed as TuningConfig;
  const missing = REQUIRED_PARTS.filter(([, part]) => !isObject(part(config))).map(([name]) => name);
  if (missing.length > 0) throw new Error(`tuning.json is missing ${missing.join(', ')}`);
  return config;
}

/**
 * Applies the edits to tuning.json as it is at the commit this one builds on,
 * in one atomic commit on the target branch. If the branch moves meanwhile, the
 * commit is refused instead of undoing the other change.
 */
export async function commitTuning(opts: {
  token: string;
  edits: TuningEdit[];
}): Promise<CommitResult> {
  const {token, edits} = opts;
  return commitFiles({
    token,
    message: 'chore(engine): tune scoring copy + scores',
    files: async (baseCommitSha) => {
      const current = await readRepoFile(token, TUNING_PATH, baseCommitSha);
      return [{path: TUNING_PATH, contentBase64: utf8ToBase64(applyTuningEdits(current, edits))}];
    },
  });
}

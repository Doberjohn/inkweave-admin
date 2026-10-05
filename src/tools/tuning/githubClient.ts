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
  /** The value the editor showed. The edit is refused if tuning.json no longer holds it. */
  expected: string | number;
}

type JsonObject = Record<string | number, unknown>;

const isObject = (value: unknown) => typeof value === 'object' && value !== null;

/**
 * The object holding the value at `path`, or undefined once the path leads
 * nowhere: the app renamed or removed the entry, or dropped the tier.
 * Inherited keys don't count, as in useTuningAdmin's valueAt.
 */
function parentOf(obj: JsonObject, path: (string | number)[]): JsonObject | undefined {
  let node: unknown = obj;
  for (const key of path.slice(0, -1)) {
    if (!isObject(node) || !Object.hasOwn(node as JsonObject, key)) return undefined;
    node = (node as JsonObject)[key];
  }
  return isObject(node) ? (node as JsonObject) : undefined;
}

/** The refusal tuningFailureKind reads as 'stale-value', so the tray offers Reload, which drops the edit (R-18). */
function staleValue(path: (string | number)[], now: unknown): Error {
  return new Error(
    `${path.join('.')} changed since the editor loaded it (now ${now === undefined ? 'missing' : JSON.stringify(now)}). Reload tuning.json and make the edit again.`,
  );
}

/**
 * Pure JSON edit: applies a list of path/value edits to the parsed tuning
 * document and re-serializes it. Sibling fields at each edited node are left
 * untouched. An edit whose value changed since the editor loaded it, or whose
 * value is gone, is refused: writing it would silently undo that other change.
 * Kept side-effect-free so it can be unit tested without network access;
 * `commitTuning` below is the network-touching wrapper.
 */
export function applyTuningEdits(text: string, edits: TuningEdit[]): string {
  const obj = JSON.parse(text) as JsonObject;
  for (const {path, value, expected} of edits) {
    const node = parentOf(obj, path);
    const key = path[path.length - 1];
    const now = node && Object.hasOwn(node, key) ? node[key] : undefined;
    if (!node || now !== expected) throw staleValue(path, now);
    node[key] = value;
  }
  return JSON.stringify(obj, null, 2) + '\n';
}

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

import {useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {validateScore, validateText} from './validate';
import {commitTuning} from './githubClient';

export interface PendingEdit {
  pathKey: string; // JSON.stringify(path) — the dedupe key
  path: (string | number)[];
  value: string | number; // the new (validated) value
  oldValue: string | number;
  label: string; // human diff label, e.g. "Shift Targets · Wide 3-turn gap · score"
  valid: boolean;
  error?: string;
}

export interface StageArgs {
  path: (string | number)[];
  rawValue: string; // raw input string
  kind: 'score' | 'text';
  oldValue: string | number;
  label: string;
}

/** Validate rawValue by kind and shape it into a pending edit ready to upsert. */
function toPendingEdit(args: StageArgs): PendingEdit {
  const {path, rawValue, kind, oldValue, label} = args;
  const pathKey = JSON.stringify(path);
  const validated = kind === 'score' ? validateScore(rawValue) : validateText(rawValue);
  if (!validated.ok) {
    return {pathKey, path, value: rawValue, oldValue, label, valid: false, error: validated.error};
  }
  return {pathKey, path, value: validated.value, oldValue, label, valid: true};
}

/** The value at `path`, or undefined once the path leads nowhere. Inherited keys don't count. */
function valueAt(config: TuningConfig, path: readonly (string | number)[]): unknown {
  let node: unknown = config;
  for (const key of path) {
    if (typeof node !== 'object' || node === null || !Object.hasOwn(node, key)) return undefined;
    node = (node as Record<string | number, unknown>)[key];
  }
  return node;
}

/**
 * Whether `config` still holds the edit's old value at its path: the check
 * applyTuningEdits makes with `expected` before it writes. A reload keeps the
 * pending edits that pass it and drops the rest (R-18).
 */
export function stillApplies(edit: Pick<PendingEdit, 'path' | 'oldValue'>, config: TuningConfig): boolean {
  return valueAt(config, edit.path) === edit.oldValue;
}

export interface UseTuningAdminResult {
  pending: PendingEdit[];
  stageEdit: (args: StageArgs) => void;
  revertEdit: (pathKey: string) => void;
  clear: () => void;
  /**
   * Takes tuning.json as a reload read it: keeps the pending edits that still
   * apply, drops the rest, clears the last publish's outcome, and returns how
   * many it dropped (R-18).
   */
  dropStale: (config: TuningConfig) => number;
  publish: () => Promise<{commitUrl: string}>;
  publishDisabled: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  error: string | null;
}

export function useTuningAdmin(token: string): UseTuningAdminResult {
  const [pending, setPending] = useState<PendingEdit[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{commitUrl: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publishDisabled = publishing || pending.length === 0 || pending.some((edit) => !edit.valid);

  function stageEdit(args: StageArgs) {
    const edit = toPendingEdit(args);
    // New work makes the last publish's outcome stale.
    setResult(null);
    setError(null);
    setPending((prev) => {
      const withoutExisting = prev.filter((e) => e.pathKey !== edit.pathKey);
      // No-op guard: editing back to the original value clears any pending edit.
      if (edit.valid && edit.value === edit.oldValue) return withoutExisting;
      return [...withoutExisting, edit];
    });
  }

  function revertEdit(pathKey: string) {
    setPending((prev) => prev.filter((e) => e.pathKey !== pathKey));
  }

  function clear() {
    setPending([]);
  }

  function dropStale(config: TuningConfig): number {
    // Like publish, this settles the paths this render knew of. A stale path
    // typed again while the reload ran carries the same stale oldValue, so it
    // goes too; an edit at another path stays pending, and the next publish checks it.
    const stale = new Set(pending.filter((edit) => !stillApplies(edit, config)).map((edit) => edit.pathKey));
    setPending((prev) => prev.filter((edit) => !stale.has(edit.pathKey)));
    setResult(null);
    setError(null);
    return stale.size;
  }

  async function publish(): Promise<{commitUrl: string}> {
    if (publishDisabled) throw new Error('Nothing valid to publish');
    setPublishing(true);
    setError(null);
    try {
      const sent = pending.filter((edit) => edit.valid);
      const res = await commitTuning({
        token,
        // Text is trimmed here, not as it is typed: the fields show the staged
        // text, so trimming that would swallow a space before the next word.
        // `expected` lets the commit refuse a value someone changed meanwhile.
        edits: sent.map(({path, value, oldValue}) => ({
          path,
          value: typeof value === 'string' ? value.trim() : value,
          expected: oldValue,
        })),
      });
      setResult(res);
      // Only what was published: an edit staged while the request ran stays pending.
      setPending((prev) => prev.filter((edit) => !sent.includes(edit)));
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Publish failed';
      setError(message);
      throw e;
    } finally {
      setPublishing(false);
    }
  }

  return {
    pending,
    stageEdit,
    revertEdit,
    clear,
    dropStale,
    publish,
    publishDisabled,
    publishing,
    result,
    error,
  };
}

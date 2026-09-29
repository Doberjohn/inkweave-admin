import {useState} from 'react';
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

export interface UseTuningAdminResult {
  pending: PendingEdit[];
  stageEdit: (args: StageArgs) => void;
  revertEdit: (pathKey: string) => void;
  clear: () => void;
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
        edits: sent.map(({path, value}) => ({path, value: typeof value === 'string' ? value.trim() : value})),
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
    publish,
    publishDisabled,
    publishing,
    result,
    error,
  };
}

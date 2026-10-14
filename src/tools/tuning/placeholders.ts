import type {Validated} from './validate';

/** A tuning.json path, as the editor's rows carry it. */
type TuningPath = readonly (string | number)[];

/**
 * The placeholders the text at `path` must keep. The engine swaps each one for a card's chip, so
 * a text without one gives a synergy line that names only one of its cards. A Shift tier names
 * the base and the Shift card. A Ramp template names its two roles ({RAMP}, {TRIGGER}, {COST}),
 * or {A} and {B} when both cards share one (`ramp-ramp`). Other texts need none.
 */
export function requiredPlaceholders(path: TuningPath): string[] {
  const [root, rule, section, key] = path;
  if (root !== 'ruleTexts') return [];
  if (rule === 'shift-targets') return ['<BASE>', '<SHIFT>'];
  if (rule !== 'ramp' || section !== 'templates') return [];
  const [first, second] = String(key).split('-');
  if (first === second) return ['{A}', '{B}'];
  return [first, second].map((role) => `{${role.toUpperCase()}}`);
}

/** Refuses a valid text that drops a placeholder its path needs (see requiredPlaceholders). */
export function requirePlaceholders(text: Validated<string>, path: TuningPath): Validated<string> {
  if (!text.ok) return text;
  const {value} = text;
  const missing = requiredPlaceholders(path).filter((placeholder) => !value.includes(placeholder));
  if (missing.length === 0) return text;
  const error =
    missing.length === 1
      ? `Keep the ${missing[0]} placeholder: it names a card in the synergy line`
      : `Keep the ${missing.join(' and ')} placeholders: they name the cards in the synergy line`;
  return {ok: false, error};
}

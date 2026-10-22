import type {PrintingFinishes} from 'inkweave-synergy-engine';
import type {Finish} from '../../../app-bridge';

/*
 * The versions a printing comes in, in the words Edit card's Printings panel and its
 * Version changes tray use (#68): Both, Foil only or Normal only, as the binder says them,
 * and Normal, never "standard". Which versions a printing has when its data says nothing
 * is the app's rule, `finishesOf`, which the bridge re-exports; nothing here repeats it.
 */

/** What the owner picks for a printing. */
export type FinishChoice = 'both' | 'foil' | 'normal';

const CHOICE_LABELS: Readonly<Record<FinishChoice, string>> = {
  both: 'Both',
  foil: 'Foil only',
  normal: 'Normal only',
};

const FINISH_TITLES: Readonly<Record<Finish, string>> = {
  normal: 'Normal',
  foil: 'Foil',
};

/** The choices, in the order the Printings panel lists them, each with its label. */
export const CHOICE_OPTIONS: ReadonlyArray<{value: FinishChoice; label: string}> = (
  ['both', 'foil', 'normal'] as const
).map((value) => ({value, label: CHOICE_LABELS[value]}));

/** The choice that shows these versions: Both when it holds both, else the one it holds. */
export function choiceOf(shown: readonly Finish[]): FinishChoice {
  const normal = shown.includes('normal');
  const foil = shown.includes('foil');
  if (normal && foil) return 'both';
  return foil ? 'foil' : 'normal';
}

/**
 * The `finishes` a choice writes, in the data's order (normal, then foil). Each call
 * builds a new array, so a caller that edits its copy changes no other choice's.
 */
export function finishesOfChoice(choice: FinishChoice): PrintingFinishes {
  switch (choice) {
    case 'both':
      return ['normal', 'foil'];
    case 'foil':
      return ['foil'];
    case 'normal':
      return ['normal'];
  }
}

/**
 * Whether two `finishes` values are the same: both null (no field), or the same
 * versions in the same order. A field and the rarity's default it matches differ here;
 * compare what each shows (`finishesOf`) to see whether the binder would change.
 */
export function sameFinishes(a: readonly Finish[] | null, b: readonly Finish[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((finish, i) => finish === b[i]);
}

/** The label of the choice that shows these versions: "Both", "Foil only" or "Normal only". */
export function choiceLabel(shown: readonly Finish[]): string {
  return CHOICE_LABELS[choiceOf(shown)];
}

/** A version's name on a row: "Normal" or "Foil". */
export function finishTitle(finish: Finish): string {
  return FINISH_TITLES[finish];
}

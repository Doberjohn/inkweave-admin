import type {RevealCardForm} from '../reveal/buildPreviewCard';
import type {StatField} from '../reveal/constants';
import {intField} from '../reveal/validateForm';
import type {SectionId} from './readiness';
import type {StudioLayout} from './studioLayout';

/*
 * The studio form's four sections (handoff README §7), and the pure parts of
 * their controls: what a closed accordion header sums up, the cost slider's
 * state, and the Dual-ink switch over ink2. The section ids and the keys each
 * holds are readiness.ts's, so a header's dot and its fields agree.
 */

/** The sections in the form's order. Wide lays them out two by two, down each column. */
export const SECTIONS: readonly {id: SectionId; title: string}[] = [
  {id: 'identity', title: 'Identity'},
  {id: 'ink', title: 'Ink & rarity'},
  {id: 'type', title: 'Type & stats'},
  {id: 'text', title: 'Card text'},
];

/** Why Edit's collector number is read-only (R-91): a new number is a new id, which goes in by PR. */
export const LOCKED_NUMBER_HINT = "Locked: a new number would change the card's id, which goes in by PR.";

/** The note under the scan language (README §7). */
export const SCAN_LANGUAGE_HINT = 'Anything but English adds “See translation”.';

/** Under the Dual-ink switch while it is on with no second ink picked. */
export const SINGLE_INK_HINT = 'Pick the second ink. With none, the card publishes as single-ink.';

/** The form's plain text inputs: what TextField edits. */
export type TextKey = 'collectorNumber' | 'name' | 'version' | 'franchise' | 'subtypes' | StatField;

/**
 * The Dual-ink switch, a view over ink2 (the reveal-sync contract keeps the
 * form's shape). It is on while the operator holds it on or a second ink is
 * picked; turning it off clears the second ink.
 */
export interface DualInk {
  on: boolean;
  toggle: () => void;
}

/** What every section's body takes from StudioForm. */
export interface SectionProps {
  form: RevealCardForm;
  /** The errors to show: visibleErrors' (R-72), never the validator's whole set. */
  errors: Readonly<Record<string, string>>;
  onChange: (patch: Partial<RevealCardForm>) => void;
  layout: StudioLayout;
  /** The text fields that are read-only: the collector number in Edit (R-91). */
  locked: ReadonlySet<keyof RevealCardForm>;
  dual: DualInk;
}

interface DualInkState {
  /** Held on by the switch: StudioForm's state, so a closed accordion section can't drop it. */
  open: boolean;
  setOpen: (open: boolean) => void;
  form: RevealCardForm;
  onChange: (patch: Partial<RevealCardForm>) => void;
}

/**
 * The switch's state, from the state StudioForm lifts. Turning it on with no
 * second ink keeps it on: derived from ink2 alone, it would flip straight back.
 */
export function dualInk({open, setOpen, form, onChange}: DualInkState): DualInk {
  const on = open || form.ink2 !== '';
  return {
    on,
    toggle: () => {
      setOpen(!on);
      if (on) onChange({ink2: ''});
    },
  };
}

/** The handoff's longest summary of the card text, before it cuts. */
const TEXT_SUMMARY_MAX = 40;

/**
 * What a closed accordion header says about its section (dc.html:996-999).
 * An error replaces it: FormSection shows the section's message instead.
 */
export const SECTION_SUMMARY: Readonly<Record<SectionId, (form: RevealCardForm) => string>> = {
  identity: ({name, version, collectorNumber}) => {
    const number = collectorNumber.trim();
    return [name.trim() || 'Unnamed', version.trim(), number && `#${number}`].filter(Boolean).join(' · ');
  },
  ink: ({ink, ink2, rarity}) => [[ink, ink2].filter(Boolean).join(' / '), rarity || 'no rarity'].join(' · '),
  type: ({type, inkwell, cost}) => {
    const trimmed = cost.trim();
    return [type, inkwell ? 'inkable' : 'uninkable', trimmed === '' ? 'no cost' : `cost ${trimmed}`].join(' · ');
  },
  text: ({keywords, fullText}) => {
    const line = [keywords, fullText]
      .map((text) => text.trim().split('\n')[0])
      .filter(Boolean)
      .join(' · ');
    if (line === '') return 'Not filled yet';
    return line.length > TEXT_SUMMARY_MAX ? `${line.slice(0, TEXT_SUMMARY_MAX)}…` : line;
  },
};

/** The slider's end: a cost above it keeps the slider there (README §7). */
export const COST_SLIDER_MAX = 10;

export interface CostSlider {
  value: number;
  /** No thumb (adm-range's data-unset): the cost is blank, or not a cost at all. */
  unset: boolean;
  /** What the slider reads out in place of its value, when that would mislead. */
  valueText: string | undefined;
}

/**
 * The cost slider's state, read from the Cost box. A blank cost shows no thumb
 * and reads "Not set", never 0, so 0 is a value the operator chose. A cost
 * above the end keeps the slider there and reads the real cost.
 */
export function costSlider({cost}: Pick<RevealCardForm, 'cost'>): CostSlider {
  const value = intField(cost);
  if (value === null || value < 0) {
    return {value: 0, unset: true, valueText: cost.trim() === '' ? 'Not set' : 'Not a valid cost'};
  }
  if (value > COST_SLIDER_MAX) return {value: COST_SLIDER_MAX, unset: false, valueText: String(value)};
  return {value, unset: false, valueText: undefined};
}

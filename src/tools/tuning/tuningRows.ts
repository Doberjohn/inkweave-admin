import type {TuningConfig} from 'inkweave-synergy-engine';

/** One editable row: a text field, a score field or both, with the tuning.json paths they write. */
export interface RowSpec {
  label: string;
  textPath?: (string | number)[];
  textValue?: string;
  scorePath?: (string | number)[];
  scoreValue?: number;
}

/** Rows for the Shift Targets tier list — text plus an optional score per tier. */
function shiftTierRows(config: TuningConfig): RowSpec[] {
  return Object.entries(config.ruleTexts['shift-targets']).map(([tierKey, entry]) => ({
    label: tierKey,
    textPath: ['ruleTexts', 'shift-targets', tierKey, 'text'],
    textValue: entry.text,
    scorePath: entry.score !== undefined ? ['ruleTexts', 'shift-targets', tierKey, 'score'] : undefined,
    scoreValue: entry.score,
  }));
}

/** Rows for the Ramp rule — score-only rows plus template-text rows. */
function rampRows(config: TuningConfig): RowSpec[] {
  const scores = Object.entries(config.ruleTexts.ramp.scores).map(([k, v]) => ({
    label: `score · ${k}`,
    scorePath: ['ruleTexts', 'ramp', 'scores', k],
    scoreValue: v,
  }));
  const templates = Object.entries(config.ruleTexts.ramp.templates).map(([k, t]) => ({
    label: `template · ${k}`,
    textPath: ['ruleTexts', 'ramp', 'templates', k],
    textValue: t,
  }));
  return [...scores, ...templates];
}

/** Build the editable rows for a selected rule id. */
export function rowsForSelection(config: TuningConfig, selectedId: string): RowSpec[] {
  const rows: RowSpec[] = [];
  const playstyle = config.playstyles[selectedId];
  if (playstyle) {
    rows.push({label: 'Title', textPath: ['playstyles', selectedId, 'name'], textValue: playstyle.name});
    rows.push({label: 'Tagline', textPath: ['playstyles', selectedId, 'tagline'], textValue: playstyle.tagline});
  }
  const direct = config.directRules[selectedId];
  if (direct) {
    rows.push({label: 'Label', textPath: ['directRules', selectedId, 'name'], textValue: direct.name});
    rows.push({label: 'Description', textPath: ['directRules', selectedId, 'description'], textValue: direct.description});
  }
  if (selectedId === 'shift-targets') rows.push(...shiftTierRows(config));
  if (selectedId === 'ramp') rows.push(...rampRows(config));
  return rows;
}

/**
 * The display name of a tuning.json entry: its playstyle title or direct-rule
 * label, else the key. Inherited keys (`constructor`) don't count.
 */
export function tuningName(config: TuningConfig, key: string): string {
  if (Object.hasOwn(config.playstyles, key)) return config.playstyles[key].name;
  if (Object.hasOwn(config.directRules, key)) return config.directRules[key].name;
  return key;
}

/** The tuning.json section an entry lives in; a key in both reads as a playstyle, as rowsForSelection lists it first. */
export function tuningKind(config: TuningConfig, key: string): 'playstyle' | 'direct' {
  return Object.hasOwn(config.playstyles, key) ? 'playstyle' : 'direct';
}

/** A pending edit's label in the tray: "Shift Targets · curve.gap3 · score". */
export function pendingLabel(ruleName: string, rowLabel: string, field: 'text' | 'score'): string {
  return `${ruleName} · ${rowLabel} · ${field}`;
}

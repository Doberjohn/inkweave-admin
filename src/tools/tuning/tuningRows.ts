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

/**
 * A tuning.json entry: the section it lives in and its key there. A rule's
 * section is its category (calibrationModel's tuningSlot), so a key in both
 * sections still names one entry.
 */
export interface EntryRef {
  section: 'playstyle' | 'direct';
  key: string;
}

/** The entry's own rows: a playstyle's title and tagline, or a direct rule's label and description. */
function sectionRows(config: TuningConfig, {section, key}: EntryRef): RowSpec[] {
  if (section === 'playstyle') {
    if (!Object.hasOwn(config.playstyles, key)) return [];
    const {name, tagline} = config.playstyles[key];
    return [
      {label: 'Title', textPath: ['playstyles', key, 'name'], textValue: name},
      {label: 'Tagline', textPath: ['playstyles', key, 'tagline'], textValue: tagline},
    ];
  }
  if (!Object.hasOwn(config.directRules, key)) return [];
  const {name, description} = config.directRules[key];
  return [
    {label: 'Label', textPath: ['directRules', key, 'name'], textValue: name},
    {label: 'Description', textPath: ['directRules', key, 'description'], textValue: description},
  ];
}

/**
 * Build the editable rows for an entry: its section's rows, then its key's
 * ruleTexts rows (Shift Targets' tiers, Ramp's scores and templates), which
 * belong to it whichever section it is in.
 */
export function rowsForSelection(config: TuningConfig, entry: EntryRef): RowSpec[] {
  const rows = sectionRows(config, entry);
  if (entry.key === 'shift-targets') rows.push(...shiftTierRows(config));
  if (entry.key === 'ramp') rows.push(...rampRows(config));
  return rows;
}

/**
 * The display name of a tuning.json entry: its playstyle title or direct-rule
 * label, from its own section, else the key. Inherited keys (`constructor`) don't count.
 */
export function tuningName(config: TuningConfig, {section, key}: EntryRef): string {
  const entries = section === 'playstyle' ? config.playstyles : config.directRules;
  return Object.hasOwn(entries, key) ? entries[key].name : key;
}

/** A pending edit's label in the tray: "Shift Targets · curve.gap3 · score". */
export function pendingLabel(ruleName: string, rowLabel: string, field: 'text' | 'score'): string {
  return `${ruleName} · ${rowLabel} · ${field}`;
}

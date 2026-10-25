import type {CSSProperties} from 'react';
import {COLORS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SR_ONLY} from '../../../ui/layout';

/** New card's steps, in order: the set, then the card's details. */
const STEPS = ['Set', 'Card details'] as const;

/** One of New card's steps, counted from 1. */
export type NewCardStep = 1 | 2;

/** A step before the current one, the current one, or one still to come. */
type StepState = 'done' | 'current' | 'next';

const MARK_SIZE = 22;
const RULE_WIDTH = 40;

const LIST: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: SPACING.md,
  margin: 0,
  padding: 0,
  listStyle: 'none',
};
const ITEM: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md};
const STEP: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm};
const RULE: CSSProperties = {width: RULE_WIDTH, height: ADMIN_LAYOUT.hairline, backgroundColor: ADMIN_COLORS.strongBorder};
const MARK: CSSProperties = {
  boxSizing: 'border-box',
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: MARK_SIZE,
  height: MARK_SIZE,
  borderRadius: ADMIN_RADIUS.pill,
  fontSize: ADMIN_TYPE.small,
  fontWeight: 700,
};
// The current step is the gold, a finished one the success green, each with the page's dark ink on it.
const MARKS: Readonly<Record<StepState, CSSProperties>> = {
  done: {...MARK, backgroundColor: COLORS.success, color: ADMIN_COLORS.page},
  current: {...MARK, backgroundColor: ADMIN_COLORS.accent, color: ADMIN_COLORS.page},
  next: {...MARK, border: `1px solid ${ADMIN_COLORS.strongBorder}`, color: ADMIN_COLORS.muted},
};
const LABEL: CSSProperties = {fontSize: ADMIN_TYPE.body, fontWeight: 500, color: ADMIN_COLORS.muted};
const CURRENT_LABEL: CSSProperties = {...LABEL, fontWeight: 700, color: ADMIN_COLORS.text};

function stateOf(step: number, current: NewCardStep): StepState {
  if (step < current) return 'done';
  return step === current ? 'current' : 'next';
}

/**
 * Where New card is: "1 Set", a rule, "2 Card details". An ordered list, so a
 * screen reader counts the steps, with aria-current="step" on the current one;
 * the marks are drawn only, and a finished step says so in words.
 */
export function StepStrip({current}: {current: NewCardStep}) {
  return (
    <ol aria-label="New card steps" style={LIST}>
      {STEPS.map((label, i) => {
        const step = i + 1;
        const state = stateOf(step, current);
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined} style={ITEM}>
            {i > 0 && <span aria-hidden="true" style={RULE} />}
            <span style={STEP}>
              <span aria-hidden="true" style={MARKS[state]}>
                {state === 'done' ? '✓' : step}
              </span>
              <span style={state === 'current' ? CURRENT_LABEL : LABEL}>
                {label}
                {state === 'done' && <span style={SR_ONLY}>, done</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

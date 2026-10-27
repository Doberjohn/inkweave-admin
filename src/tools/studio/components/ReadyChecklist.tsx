import type {ReactNode} from 'react';
import {COLORS, Panel, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {MeterBar} from '../../../ui/MeterBar';
import type {ChecklistId, ChecklistItem} from '../readiness';

/** A control under an item's message: the way out of what it names. */
export type ChecklistActions = Partial<Record<ChecklistId, ReactNode>>;

interface ReadyChecklistProps {
  /** revealChecklist's items (R4-3a), in the form's order. An open item carries its message. */
  items: readonly ChecklistItem[];
  /** New card's "Load the card list again", under Collector number while the list has failed (R4-8f). */
  actions?: ChecklistActions;
}

// The handoff's 16px round mark and 4px bar (dc.html:256-257).
const MARK_SIZE = 16;
const BAR_HEIGHT = 4;

const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
};
const ROW: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: SPACING.sm, fontSize: ADMIN_TYPE.body};
const MARK: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
  width: MARK_SIZE,
  height: MARK_SIZE,
  // Centred on the label's first line.
  marginTop: SPACING.xxs,
  borderRadius: ADMIN_RADIUS.pill,
  fontSize: ADMIN_TYPE.micro,
  lineHeight: 1,
};
const TEXT: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xxs, minWidth: 0};
// Muted, never red (R-72): an open item is work left to do, not a mistake.
const MESSAGE: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted, overflowWrap: 'anywhere'};

/**
 * How a done and an open item look. The mark says it in words too (its
 * accessible name), so the state never rests on colour alone. The open
 * mark's ring is barNeutral, which keeps 3:1 on the panel (1.4.11).
 */
const LOOK = {
  done: {
    name: 'Done',
    glyph: '✓',
    mark: {...MARK, backgroundColor: COLORS.success, border: `1px solid ${COLORS.success}`, color: ADMIN_COLORS.page},
    label: ADMIN_COLORS.muted,
  },
  open: {
    name: 'To do',
    glyph: '',
    mark: {...MARK, border: `1px solid ${ADMIN_COLORS.barNeutral}`},
    label: ADMIN_COLORS.text,
  },
} as const;

function ChecklistRow({item, action}: {item: ChecklistItem; action: ReactNode}) {
  const look = item.done ? LOOK.done : LOOK.open;
  return (
    <li style={ROW}>
      <span role="img" aria-label={look.name} style={look.mark}>
        {look.glyph}
      </span>
      <span style={TEXT}>
        <span style={{color: look.label}}>{item.label}</span>
        {item.message && <span style={MESSAGE}>{item.message}</span>}
        {action}
      </span>
    </li>
  );
}

/**
 * New card's "Ready to publish N/7" (R4-3a's checklist): the count, a bar,
 * then each item with its message while it is open, so the list names what
 * is left. Every item is done exactly when Publish can run. The count prints
 * beside the bar, so the bar is decoration (MeterBar with no label). An item
 * may carry a control under its message (`actions`).
 */
export function ReadyChecklist({items, actions = {}}: ReadyChecklistProps) {
  const done = items.filter((item) => item.done).length;
  return (
    <Panel title="Ready to publish" action={`${done}/${items.length}`}>
      <MeterBar fraction={done / items.length} color={ADMIN_COLORS.accent} height={BAR_HEIGHT} />
      <ul style={LIST}>
        {items.map((item) => (
          <ChecklistRow key={item.id} item={item} action={actions[item.id]} />
        ))}
      </ul>
    </Panel>
  );
}

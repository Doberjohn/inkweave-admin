import type {CSSProperties} from 'react';
import {LETTER_SPACING, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';

/*
 * The styles the card page's panels share (R3-6a to R3-6c): its two tables'
 * cells, its links and its captions. RulesTable and VoteDetailTable keep their
 * own copies; these match them.
 */

/** A muted line under a chart or a list: a caveat, a count left out, where the data comes from. */
export const CAPTION: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** A column head, as RulesTable and VoteDetailTable set theirs. */
export const HEAD_CELL: CSSProperties = {
  padding: `${SPACING.sm}px`,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};

export const CELL: CSSProperties = {
  padding: `${SPACING.sm}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  verticalAlign: 'middle',
};

/** A number column: right-aligned, in figures that line up row to row. */
export const NUMBER: CSSProperties = {textAlign: 'right', fontVariantNumeric: 'tabular-nums'};

/**
 * A link on the card page: a card or a rule, in the accent, as PanelLink sets
 * the Overview's. The app's global :focus-visible ring draws 4px outside it,
 * so nothing that clips may sit within 4px of a link's edge.
 */
export const LINK: CSSProperties = {color: ADMIN_COLORS.accent, textDecoration: 'none'};

/** A link that fills its cell or flex slot and cuts a long name with an ellipsis. */
export const CELL_LINK: CSSProperties = {...LINK, ...TRUNCATE, display: 'block', minWidth: 0};

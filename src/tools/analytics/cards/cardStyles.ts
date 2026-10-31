import type {CSSProperties} from 'react';
import {LETTER_SPACING, SPACING, TABULAR, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';

/*
 * The styles the card page's panels share: its two tables' cells, its links,
 * its captions and its one opaque fill. The head cells set their type as
 * RulesTable's and VoteDetailTable's do; the body cells pad 8px all round,
 * closer than either table's rows. The Collectors page's start-week table
 * builds on the cells too, padding them wider.
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
export const NUMBER: CSSProperties = {...TABULAR, textAlign: 'right'};

/** A count beside the number a row is about: muted, never dim (R-6). */
export const MUTED_NUMBER: CSSProperties = {...NUMBER, color: ADMIN_COLORS.muted};

/**
 * The card fill laid over the page, for what must hide what is under it: the
 * switcher's list and Voted pairs' sticky head (adminTheme.ts's note on fills).
 */
export const OPAQUE_CARD = `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`;

/**
 * A link on the card page, to a card or a rule, that fills its cell or flex
 * slot and cuts a long name with an ellipsis. It takes className="adm-link"
 * too: a name inside data keeps the text colour and a muted underline, golds
 * on hover and takes the accent ring, as CardName's names do on the other
 * pages (R3-8). The ring reaches 4px outside the link (2px wide, 2px out), so
 * nothing that clips may sit within 4px of a link's edge.
 */
export const CELL_LINK: CSSProperties = {...TRUNCATE, display: 'block', minWidth: 0};

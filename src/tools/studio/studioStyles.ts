import type {CSSProperties} from 'react';
import {COLORS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import type {FrameState} from './cardPanel';
import {STUDIO_PADDING, type StudioLayout, type StudioSlot} from './studioLayout';

/*
 * The styles Card studio's parts share (R4): the page's layout, its panels, the
 * frame round a card's picture and the text its fields and notes print.
 * Inline, as cardStyles.ts is for the card page: hover, focus and selected
 * states are adm-* classes in AdminStyles (R-41). The layout follows the
 * handoff (README §7).
 */

/** The gap between the studio's panels, across and down (12px). */
export const STUDIO_GAP = SPACING.md;

/** The handoff's widest studio, padding included. */
export const STUDIO_MAX_WIDTH = 1600;

// The same box in both layouts, so a layout switch never moves the measured
// width across STUDIO_WIDE_MIN and back.
const ROOT_BOX: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: STUDIO_MAX_WIDTH,
  margin: '0 auto',
  padding: STUDIO_PADDING,
  gap: STUDIO_GAP,
};

/**
 * StudioWorkspace's root, the element useContainerWidth measures. Wide: the
 * card panel's column, two equal columns for the form and the aside's, each
 * slot as tall as the tallest. Narrow: the slots wrap, each at its own height.
 */
export const STUDIO_GRID: Readonly<Record<StudioLayout, CSSProperties>> = {
  wide: {
    ...ROOT_BOX,
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 400px) minmax(0, 1fr) minmax(0, 1fr) 280px',
  },
  narrow: {...ROOT_BOX, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start'},
};

/**
 * A row of its own across the studio's root, in either layout: grid-column spans the wide grid's
 * columns and flex fills a line of the narrow layout's wrapping row. Each property applies in its own
 * layout only, so a part that takes it needs to know neither: the Version changes tray, and New
 * card's set step and set bar.
 */
export const STUDIO_OWN_ROW: CSSProperties = {gridColumn: '1 / -1', flex: '1 1 100%', minWidth: 0};

/**
 * Where each slot sits. Wide: the form spans the two middle columns. Narrow:
 * the form keeps 300-400px, the card panel takes the free width, and the aside
 * wraps under them when it doesn't fit. On a phone the root's content box is
 * the viewport less the 64px rail and 32px of padding, under 300px below a
 * 396px screen, so there the form takes the whole line, and no slot holds a
 * minimum the line can't give (WCAG 1.4.10, down to 320px).
 */
export const STUDIO_SLOT: Readonly<Record<StudioLayout, Readonly<Record<StudioSlot, CSSProperties>>>> = {
  wide: {
    card: {gridColumn: '1', minWidth: 0},
    form: {gridColumn: '2 / span 2', minWidth: 0},
    aside: {gridColumn: '4', minWidth: 0},
  },
  narrow: {
    form: {flex: '0 1 400px', minWidth: 'min(300px, 100%)'},
    card: {flex: '999 1 240px', minWidth: 0},
    aside: {flex: '1 1 280px', minWidth: 0},
  },
};

/**
 * StudioForm's root, inside the form slot. Wide: two by two, filled down each
 * column (Identity over Ink & rarity, Type & stats over Card text), on the
 * same gap as the page, so its columns are the page's middle two and each row
 * is as tall as its taller section. Narrow: the accordion's sections in a stack.
 */
export const STUDIO_FORM: Readonly<Record<StudioLayout, CSSProperties>> = {
  wide: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: 'auto auto',
    gridAutoFlow: 'column',
    gap: STUDIO_GAP,
  },
  narrow: {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP},
};

/**
 * A studio panel: a form section, the card panel, an aside box. The surface is
 * Panel's (src/ui), so these sit beside the aside's Panels as one set; the
 * translucent fill stops at the border (R1-2).
 */
export const STUDIO_PANEL: CSSProperties = {
  minWidth: 0,
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.panel,
};

/** CardTile's own proportions, so a card, the placeholder stripes and a scan's frame take the same box. */
export const CARD_ASPECT = '0.72';

/**
 * The border of a card picture's frame, by what the picture shows: nothing yet
 * (dashed), the art as it stands (solid), or the file the owner chose (gold).
 * The card panel's preview and the printing form's scan frame both wear it.
 */
export const FRAME_BORDER: Readonly<Record<FrameState, string>> = {
  empty: `1px dashed ${ADMIN_COLORS.strongBorder}`,
  current: `1px solid ${ADMIN_COLORS.inputBorder}`,
  staged: `1px solid ${ADMIN_COLORS.accentStrong}`,
};

/**
 * A pick button's least width in a grid: the handoff's rarity grid (README
 * §7). The Inkwell pair takes it too, as Uninkable needs about 103px (its 20px
 * icon, an 8px gap, 57px of text, 16px of padding and 2px of border).
 */
export const PICK_MIN_WIDTH = 112;

/** A field's or a picker's label, over its control. */
export const FIELD_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** A hint under a control, or a note under the preview: muted, never dim (R-6). */
export const HINT: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** A validator message beside its control (the spec's "next to its control"), as PendingTray prints one. */
export const ERROR_TEXT: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: COLORS.error};

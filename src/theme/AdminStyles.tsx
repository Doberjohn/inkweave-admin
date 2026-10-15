import {EASING, SPACING} from '../app-bridge';
import {ADMIN_COLORS as C, ADMIN_RADIUS as R, ADMIN_TYPE as T} from './adminTheme';

// Control heights from the handoff. Heights have no token in the app's scales,
// so they live here, beside the only rules that use them.
const NAV_ITEM_HEIGHT = 36;
const NAV_MARK_SIZE = 24;
const INPUT_HEIGHT = 38;
// 32 + the track's 2px padding and 1px border on each side = INPUT_HEIGHT, so a
// segmented control lines up with the inputs beside it in a filter row.
const SEG_BUTTON_HEIGHT = 32;
// Card studio's controls (R4), sized as the handoff draws them (README §7).
const CHEVRON_SIZE = 6;
/** An ink tile's widest, which the primary ink row's grid columns cap too (PickerGroup's `inks` layout). */
export const INK_TILE_SIZE = 48;
const INK_TILE_SIZE_SM = 40;
const PICK_HEIGHT = 34;
const FILE_BUTTON_HEIGHT = 36;
const SWITCH_WIDTH = 34;
const SWITCH_HEIGHT = 20;
const SWITCH_INSET = 2;
const SWITCH_KNOB = SWITCH_HEIGHT - 2 * SWITCH_INSET;
const RANGE_HEIGHT = 20;
const RANGE_MIN_WIDTH = 60;
const RANGE_TRACK = 4;
const RANGE_THUMB = 16;

const FAST = `.2s ${EASING.snappy}`;
// Chart motion (R1-3b): the smooth curve, on transform and opacity only, so
// SVG marks animate alike in every browser. GLIDE moves the cursor, tooltip and
// mark states; ENTER brings bars, lines and labels in when they mount.
const GLIDE = `.2s ${EASING.smooth}`;
const ENTER = `.5s ${EASING.smooth}`;
const FOCUS_RING = `outline:2px solid ${C.accent};`;
// Hover rules skip disabled controls. :where() adds no specificity, so the
// [aria-pressed] rules after them still win.
const ENABLED = ':where(:not(:disabled))';

/**
 * Admin's one scoped stylesheet: every adm-* class the shell, the primitives
 * and the pages share. Inline styles stay the default (the app's house style);
 * these classes exist for what inline styles can't express: :hover,
 * :focus-visible and state selectors. Selection is read from ARIA state
 * (aria-current="page", aria-pressed="true", aria-selected="true"), never from
 * a class, so the styling and what assistive tech hears can't disagree.
 *
 * The focus ring is the one gold (ADMIN_COLORS.accent), replacing the app's
 * global legacy-gold ring. Rows draw theirs inside the box (offset -2px): they
 * sit flush in panels that clip overflow, where an outer ring would lose its
 * sides. A focused row also takes the hover fill. A selected row keeps one
 * fill (rowSelected), hovered or not: red gap text on the next step up would
 * drop under 4.5:1.
 *
 * A table row can be a row button too (<tr role="button" className="adm-row-btn">,
 * the rules table on /calibration). Its first cell draws the selected bar as
 * well: browsers differ on painting a box-shadow on a <tr> in a collapsed
 * table, and a cell's always paints, so the two coincide where both do.
 *
 * A listbox option (adm-option, the card switcher's) never takes focus: focus
 * stays in its field, which points at the active option (aria-activedescendant).
 * So the option draws no ring. aria-selected marks the active one with the
 * row fill and the selected bar, the 3:1 cue. The app's useAutocomplete moves
 * aria-selected on hover too, so one rule serves the pointer and the keys.
 *
 * <button> takes no style prop here (inkweave/no-adhoc-buttons), so the button
 * classes are complete on their own. Lay out a row's or a card's content with
 * an inner <span style={...}>.
 *
 * A translucent fill shows through its own border, so the classes that have
 * both (adm-seg, adm-card-btn, adm-input, adm-select) clip the fill to the
 * padding box. They set background-color, never the background shorthand,
 * which would reset the clip.
 *
 * Nav items pad 8px, not the handoff's 6 (off the spacing scale): in the 64px
 * rail, 12px gutters leave 40px, and 8 + 24 + 8 centres the mark exactly.
 *
 * A segmented control is as wide as its options. With data-fill="true"
 * (SegmentedControl's fill, Card studio's Type) it fills its row instead, as
 * the handoff's Type tabs do: the buttons share the width from a 4px pad,
 * and wrap onto another line where even that doesn't fit (a 320px phone).
 *
 * adm-scroll-region is a box that scrolls a table sideways. It takes
 * tabIndex 0 and role="region" with a name, so the keyboard can reach it and
 * scroll it (WCAG 2.1.1), and it rings 2px out, as a chart plot does.
 *
 * A text link inside data (adm-link: a card name in a log row, a list or a
 * heading) keeps its text colour and takes a muted underline: gold sits at
 * 1.41:1 against the text beside it, under the 3:1 that colour alone would
 * need (WCAG 1.4.1), so the underline is what tells a linked name from a
 * plain one. Hover golds it. Its ring sits 2px out, as a control's does, and
 * a line that clips keeps room for it (CardName's PairLine).
 *
 * Card studio's controls (R4):
 * - adm-acc-head is an accordion section's header, the button inside its h2.
 *   aria-expanded turns its chevron, which ::after draws from two borders, so
 *   it adds nothing to the button's name. It rings inside, as a row does.
 * - adm-pick-btn is a compact pressable: a rarity, Inkable or Uninkable, full
 *   width so the parent's grid sizes it, or, with adm-ink-tile, an ink's
 *   square tile: 48px, or its grid column's width where that is less, so the
 *   six primary tiles shrink to fit a narrow section rather than wrap (a
 *   percentage width would wrap a row that sizes to its content). data-size="sm"
 *   is the second-ink row's fixed 40px. Its pressed fill and border are
 *   adm-card-btn's, admin's one selected look (R-75).
 * - adm-switch is a native checkbox with role="switch" (Dual-ink card):
 *   :checked golds the track and moves the knob, its ::before.
 * - A file control is a <label> round a visually hidden file input
 *   (useHiddenFileInput). The input takes the focus, so the label rings on
 *   data-focused="true", from the hook's `focused`. adm-file-btn is a bordered
 *   button (Replace card image); adm-file-cover lies over the card preview.
 * - adm-range is the cost slider. data-unset="true" hides its thumb, so a
 *   blank cost never reads as 0. The track alone then shows the slider, so it
 *   is barNeutral, 3.3:1 on a card (WCAG 1.4.11), not the meters' barTrack.
 *   Its track and thumb rules repeat per engine: a selector list with a
 *   pseudo-element the browser doesn't know is dropped whole.
 */
const CSS = `
.adm-nav-item{display:flex;align-items:center;gap:${SPACING.md}px;height:${NAV_ITEM_HEIGHT}px;padding:0 ${SPACING.sm}px;border-radius:${R.control}px;color:${C.muted};font-size:${T.body}px;font-weight:500;text-decoration:none;white-space:nowrap;overflow:hidden;transition:background-color ${FAST},color ${FAST};}
.adm-nav-item:hover{background:${C.navHover};color:${C.text};}
.adm-nav-item[aria-current="page"]{background:${C.accentTint};color:${C.text};font-weight:600;box-shadow:inset 2px 0 0 ${C.accent};}
.adm-nav-mark{display:inline-flex;align-items:center;justify-content:center;flex:none;width:${NAV_MARK_SIZE}px;height:${NAV_MARK_SIZE}px;border:1px solid ${C.strongBorder};border-radius:${R.control}px;color:${C.muted};font-size:${T.micro}px;font-weight:700;transition:border-color ${FAST},color ${FAST};}
.adm-nav-item:hover .adm-nav-mark{color:${C.text};}
.adm-nav-item[aria-current="page"] .adm-nav-mark{border-color:${C.accentStrong};color:${C.accent};}

.adm-seg{display:inline-flex;align-items:stretch;gap:${SPACING.xxs}px;padding:${SPACING.xxs}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.border};border-radius:${R.control}px;}
.adm-seg-btn{display:inline-flex;align-items:center;justify-content:center;min-height:${SEG_BUTTON_HEIGHT}px;margin:0;padding:0 ${SPACING.md}px;border:none;border-radius:${R.control}px;background:transparent;color:${C.muted};font-family:inherit;font-size:${T.small}px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background-color ${FAST},color ${FAST};}
.adm-seg-btn:hover${ENABLED}{background:${C.navHover};color:${C.text};}
.adm-seg-btn[aria-pressed="true"]{background:${C.navHover};color:${C.accent};box-shadow:inset 0 0 0 1px ${C.accentStrong};}
.adm-seg[data-fill="true"]{display:flex;flex-wrap:wrap;}
.adm-seg[data-fill="true"]>.adm-seg-btn{flex:1 1 0;padding:0 ${SPACING.xs}px;}

.adm-row-btn{background:transparent;color:${C.text};cursor:pointer;transition:background-color ${FAST};}
button.adm-row-btn{display:block;width:100%;margin:0;padding:0;border:none;border-radius:0;font:inherit;text-align:left;}
.adm-row-btn:hover${ENABLED}{background:${C.rowHover};}
.adm-row-btn:focus-visible{background:${C.rowHover};}
.adm-row-btn[aria-pressed="true"]{background:${C.rowSelected};box-shadow:inset 2px 0 0 ${C.accent};}
tr.adm-row-btn[aria-pressed="true"]>td:first-child{box-shadow:inset 2px 0 0 ${C.accent};}
.adm-row-btn[aria-pressed="true"]:hover${ENABLED}{background:${C.rowSelected};}

.adm-card-btn{display:flex;flex-direction:column;align-items:stretch;gap:${SPACING.xs}px;width:100%;min-width:0;margin:0;padding:${SPACING.lg}px ${SPACING.xl}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.border};border-radius:${R.panel}px;color:${C.text};font:inherit;font-size:${T.body}px;text-align:left;cursor:pointer;transition:background-color ${FAST},border-color ${FAST};}
.adm-card-btn:hover${ENABLED}{border-color:${C.accentBorder};}
.adm-card-btn[aria-pressed="true"]{background-color:${C.accentTintSoft};border-color:${C.accentStrong};}

.adm-input,.adm-select{box-sizing:border-box;height:${INPUT_HEIGHT}px;margin:0;padding:0 ${SPACING.md}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.inputBorder};border-radius:${R.control}px;color:${C.text};font-family:inherit;font-size:${T.body}px;transition:border-color ${FAST};}
textarea.adm-input{height:auto;min-height:${INPUT_HEIGHT * 2}px;padding:${SPACING.sm}px ${SPACING.md}px;line-height:1.5;resize:vertical;}
.adm-select{padding:0 ${SPACING.sm}px;cursor:pointer;}
.adm-input::placeholder{color:${C.muted};opacity:1;}
.adm-input:hover${ENABLED},.adm-select:hover${ENABLED}{border-color:${C.strongBorder};}

.adm-hover-row{transition:background-color ${FAST};}
.adm-hover-row:hover,.adm-hover-row:focus-within{background:${C.rowHover};}
.adm-scroll-region:focus-visible{${FOCUS_RING}outline-offset:2px;}

.adm-option{display:flex;align-items:center;gap:${SPACING.sm}px;padding:${SPACING.sm}px ${SPACING.md}px;color:${C.text};font-size:${T.body}px;cursor:pointer;transition:background-color ${FAST};}
.adm-option[aria-selected="true"]{background:${C.rowHover};box-shadow:inset 2px 0 0 ${C.accent};}

.adm-link{color:inherit;text-decoration:underline;text-decoration-color:${C.muted};transition:color ${FAST},text-decoration-color ${FAST};}
.adm-link:hover{color:${C.accent};text-decoration-color:${C.accent};}
.adm-link:focus-visible{${FOCUS_RING}outline-offset:2px;}

.adm-acc-head{display:flex;align-items:center;gap:${SPACING.md}px;width:100%;margin:0;padding:${SPACING.section}px ${SPACING.lg}px;border:none;border-radius:0;background:transparent;color:${C.text};font:inherit;font-size:${T.body}px;font-weight:700;text-align:left;cursor:pointer;transition:background-color ${FAST};}
.adm-acc-head::after{content:"";flex:none;width:${CHEVRON_SIZE}px;height:${CHEVRON_SIZE}px;margin-left:auto;border-right:2px solid ${C.muted};border-bottom:2px solid ${C.muted};transform:rotate(-45deg);transition:transform ${FAST};}
.adm-acc-head[aria-expanded="true"]::after{transform:rotate(45deg);}
.adm-acc-head:hover${ENABLED}{background:${C.rowHover};}

.adm-pick-btn{display:flex;align-items:center;gap:${SPACING.sm}px;width:100%;min-width:0;min-height:${PICK_HEIGHT}px;margin:0;padding:0 ${SPACING.sm}px;background-color:transparent;background-clip:padding-box;border:1px solid ${C.inputBorder};border-radius:${R.control}px;color:${C.muted};font:inherit;font-size:${T.small}px;text-align:left;white-space:nowrap;cursor:pointer;transition:background-color ${FAST},border-color ${FAST},color ${FAST};}
.adm-pick-btn.adm-ink-tile{flex:none;justify-content:center;width:${INK_TILE_SIZE}px;max-width:100%;aspect-ratio:1 / 1;padding:0;border-radius:${R.panel}px;}
.adm-pick-btn.adm-ink-tile[data-size="sm"]{width:${INK_TILE_SIZE_SM}px;height:${INK_TILE_SIZE_SM}px;border-radius:${R.box}px;}
.adm-pick-btn:hover${ENABLED}{border-color:${C.accentBorder};color:${C.text};}
.adm-pick-btn[aria-pressed="true"]{background-color:${C.accentTintSoft};border-color:${C.accentStrong};color:${C.text};}

.adm-switch{appearance:none;position:relative;flex:none;width:${SWITCH_WIDTH}px;height:${SWITCH_HEIGHT}px;margin:0;border:none;border-radius:${R.pill}px;background-color:${C.barNeutral};cursor:pointer;transition:background-color ${FAST},box-shadow ${FAST};}
.adm-switch::before{content:"";position:absolute;top:${SWITCH_INSET}px;left:${SWITCH_INSET}px;width:${SWITCH_KNOB}px;height:${SWITCH_KNOB}px;border-radius:${R.pill}px;background:${C.page};transition:transform ${FAST};}
.adm-switch:checked{background-color:${C.accent};}
.adm-switch:checked::before{transform:translateX(${SWITCH_WIDTH - SWITCH_HEIGHT}px);}
.adm-switch:hover${ENABLED}{box-shadow:0 0 0 1px ${C.accentBorder};}

.adm-file-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:${SPACING.sm}px;min-height:${FILE_BUTTON_HEIGHT}px;padding:0 ${SPACING.section}px;border:1px solid ${C.strongBorder};border-radius:${R.control}px;color:${C.text};font-size:${T.body}px;font-weight:600;white-space:nowrap;cursor:pointer;transition:border-color ${FAST},color ${FAST};}
.adm-file-btn:hover{border-color:${C.accentStrong};color:${C.accent};}
.adm-file-cover{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;border-radius:${R.preview}px;cursor:pointer;transition:box-shadow ${FAST};}
.adm-file-cover:hover{box-shadow:inset 0 0 0 1px ${C.accentStrong};}
.adm-file-btn[data-focused="true"],.adm-file-cover[data-focused="true"]{${FOCUS_RING}outline-offset:2px;}

.adm-range{appearance:none;display:block;flex:1 1 auto;min-width:${RANGE_MIN_WIDTH}px;height:${RANGE_HEIGHT}px;margin:0;background:transparent;cursor:pointer;}
.adm-range::-webkit-slider-runnable-track{height:${RANGE_TRACK}px;border-radius:${R.tag}px;background:${C.barNeutral};}
.adm-range::-moz-range-track{height:${RANGE_TRACK}px;border-radius:${R.tag}px;background:${C.barNeutral};}
.adm-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:${RANGE_THUMB}px;height:${RANGE_THUMB}px;margin-top:${(RANGE_TRACK - RANGE_THUMB) / 2}px;border:none;border-radius:${R.pill}px;background:${C.accent};}
.adm-range::-moz-range-thumb{width:${RANGE_THUMB}px;height:${RANGE_THUMB}px;border:none;border-radius:${R.pill}px;background:${C.accent};}
.adm-range:hover${ENABLED}::-webkit-slider-thumb{background:${C.accentHover};}
.adm-range:hover${ENABLED}::-moz-range-thumb{background:${C.accentHover};}
.adm-range[data-unset="true"]::-webkit-slider-thumb{opacity:0;}
.adm-range[data-unset="true"]::-moz-range-thumb{opacity:0;}
.adm-nav-item:focus-visible,.adm-seg-btn:focus-visible,.adm-card-btn:focus-visible,.adm-input:focus-visible,.adm-select:focus-visible,.adm-net-link:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-pick-btn:focus-visible,.adm-switch:focus-visible,.adm-range:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-row-btn:focus-visible,.adm-acc-head:focus-visible{${FOCUS_RING}outline-offset:-2px;}

.adm-seg-btn:disabled,.adm-row-btn:disabled,.adm-card-btn:disabled,.adm-input:disabled,.adm-select:disabled{opacity:.4;cursor:not-allowed;}
.adm-acc-head:disabled,.adm-pick-btn:disabled,.adm-switch:disabled,.adm-range:disabled{opacity:.4;cursor:not-allowed;}

.adm-chart-plot{border-radius:${R.control}px;outline:none;touch-action:pan-y;}
.adm-chart-plot:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-chart-hit{flex:1 1 0;min-width:0;margin:0;padding:0;border:none;border-radius:${R.control}px;background:transparent;cursor:pointer;transition:background-color ${FAST};}
.adm-chart-hit:hover${ENABLED}{background:${C.rowHover};}
.adm-chart-hit[aria-pressed="true"]{background:${C.accentTintSoft};}
.adm-chart-hit:focus-visible{${FOCUS_RING}outline-offset:-2px;}
.adm-chart-mark{transition:opacity ${GLIDE},filter ${GLIDE};}
.adm-chart-mark[data-active="true"]{filter:brightness(1.2);}
.adm-chart-mark[data-dim="true"]{opacity:.4;}
.adm-net-link{display:block;width:100%;height:100%;border-radius:${R.control}px;}
.adm-chart-bar{transform-box:fill-box;transform-origin:50% 100%;animation:adm-chart-rise ${ENTER} both;}
.adm-chart-line{stroke-dasharray:1;animation:adm-chart-draw ${ENTER} both;}
.adm-chart-area,.adm-chart-label{animation:adm-chart-fade ${ENTER} both;}
.adm-chart-cursor{transition:transform ${GLIDE};}
.adm-chart-tip{transition:transform ${GLIDE};animation:adm-chart-fade ${GLIDE} both;}
@keyframes adm-chart-rise{from{transform:scaleY(0);}to{transform:scaleY(1);}}
@keyframes adm-chart-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}
@keyframes adm-chart-fade{from{opacity:0;}to{opacity:1;}}

@media (prefers-reduced-motion: reduce){
.adm-link{transition:none;}
.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-input,.adm-select,.adm-hover-row,.adm-option{transition:none;}
.adm-acc-head,.adm-acc-head::after,.adm-pick-btn,.adm-switch,.adm-switch::before,.adm-file-btn,.adm-file-cover{transition:none;}
.adm-chart-hit,.adm-chart-mark,.adm-chart-cursor,.adm-chart-tip{transition:none;}
.adm-chart-bar,.adm-chart-line,.adm-chart-area,.adm-chart-label,.adm-chart-tip{animation:none;}
}
`;

/** Mounted once, by AdminShell (and by Storybook's preview for every story). */
export function AdminStyles() {
  return <style>{CSS}</style>;
}

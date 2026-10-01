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

const FAST = `.2s ${EASING.snappy}`;
const FOCUS_RING = `outline:2px solid ${C.accent};`;
// Hover rules skip disabled controls. :where() adds no specificity, so the
// [aria-pressed] rules after them still win.
const ENABLED = ':where(:not(:disabled))';

/**
 * Admin's one scoped stylesheet: every adm-* class the shell, the primitives
 * and the pages share. Inline styles stay the default (the app's house style);
 * these classes exist for what inline styles can't express: :hover,
 * :focus-visible and state selectors. Selection is read from ARIA state
 * (aria-current="page", aria-pressed="true"), never from a class, so the
 * styling and what assistive tech hears can't disagree.
 *
 * The focus ring is the one gold (ADMIN_COLORS.accent), replacing the app's
 * global legacy-gold ring. Rows draw theirs inside the box (offset -2px): they
 * sit flush in panels that clip overflow, where an outer ring would lose its
 * sides. A focused row also takes the hover fill, as RuleRow does today.
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

.adm-row-btn{background:transparent;color:${C.text};cursor:pointer;transition:background-color ${FAST};}
button.adm-row-btn{display:block;width:100%;margin:0;padding:0;border:none;border-radius:0;font:inherit;text-align:left;}
.adm-row-btn:hover${ENABLED}{background:${C.rowHover};}
.adm-row-btn:focus-visible{background:${C.rowHover};}
.adm-row-btn[aria-pressed="true"]{background:${C.accentTintSoft};box-shadow:inset 2px 0 0 ${C.accent};}
.adm-row-btn[aria-pressed="true"]:hover${ENABLED}{background:${C.accentTint};}

.adm-card-btn{display:flex;flex-direction:column;align-items:stretch;gap:${SPACING.xs}px;width:100%;min-width:0;margin:0;padding:${SPACING.lg}px ${SPACING.xl}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.border};border-radius:${R.panel}px;color:${C.text};font:inherit;font-size:${T.body}px;text-align:left;cursor:pointer;transition:background-color ${FAST},border-color ${FAST};}
.adm-card-btn:hover${ENABLED}{border-color:${C.accentBorder};}
.adm-card-btn[aria-pressed="true"]{background-color:${C.accentTintSoft};border-color:${C.accentStrong};}

.adm-bar-btn{flex:1 1 0;min-width:0;align-self:stretch;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:${SPACING.xs}px;margin:0;padding:${SPACING.xs}px 0 0;border:none;border-radius:${R.control}px;background:transparent;color:${C.muted};font:inherit;font-size:${T.label}px;cursor:pointer;transition:background-color ${FAST},opacity ${FAST};}
.adm-bar-btn:hover${ENABLED}{background:${C.rowHover};}
.adm-bar-btn[aria-pressed="true"]{background:${C.accentTintSoft};color:${C.accent};}
:has(> .adm-bar-btn[aria-pressed="true"]) > .adm-bar-btn:not([aria-pressed="true"]){opacity:.4;}

.adm-input,.adm-select{box-sizing:border-box;height:${INPUT_HEIGHT}px;margin:0;padding:0 ${SPACING.md}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.inputBorder};border-radius:${R.control}px;color:${C.text};font-family:inherit;font-size:${T.body}px;transition:border-color ${FAST};}
textarea.adm-input{height:auto;min-height:${INPUT_HEIGHT * 2}px;padding:${SPACING.sm}px ${SPACING.md}px;line-height:1.5;resize:vertical;}
.adm-select{padding:0 ${SPACING.sm}px;cursor:pointer;}
.adm-input::placeholder{color:${C.muted};opacity:1;}
.adm-input:hover${ENABLED},.adm-select:hover${ENABLED}{border-color:${C.strongBorder};}

.adm-hover-row{transition:background-color ${FAST};}
.adm-hover-row:hover,.adm-hover-row:focus-within{background:${C.rowHover};}

.adm-nav-item:focus-visible,.adm-seg-btn:focus-visible,.adm-card-btn:focus-visible,.adm-bar-btn:focus-visible,.adm-input:focus-visible,.adm-select:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-row-btn:focus-visible{${FOCUS_RING}outline-offset:-2px;}

.adm-seg-btn:disabled,.adm-row-btn:disabled,.adm-card-btn:disabled,.adm-bar-btn:disabled,.adm-input:disabled,.adm-select:disabled{opacity:.4;cursor:not-allowed;}

@media (prefers-reduced-motion: reduce){
.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-bar-btn,.adm-input,.adm-select,.adm-hover-row{transition:none;}
}
`;

/** Mounted once, by AdminShell (and by Storybook's preview for every story). */
export function AdminStyles() {
  return <style>{CSS}</style>;
}

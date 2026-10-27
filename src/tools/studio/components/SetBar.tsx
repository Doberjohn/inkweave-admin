import type {CSSProperties} from 'react';
import {LETTER_SPACING, LinkButton, SPACING, Tag} from '../../../app-bridge';
import {baseName} from '../../../components/fileName';
import {targetBranch} from '../../../github/githubCommit';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_TYPE} from '../../../theme/adminTheme';
import {RAW_DIR} from '../../image/githubClient';
import {PREVIEW_PATH} from '../../reveal/githubClient';
import {previewIdText, type NewCardSet} from '../newCardSets';
import type {StudioLayout} from '../studioLayout';
import {STUDIO_OWN_ROW, STUDIO_PANEL} from '../studioStyles';
import {SetLogo} from './SetLogo';
import {StepStrip} from './StepStrip';

// A studio panel on a row of its own over step 2's slots. Wide, its three parts sit in a line, ruled
// apart; narrow, they stack, and the rules go.
const BAR: CSSProperties = {...STUDIO_PANEL, ...STUDIO_OWN_ROW, boxSizing: 'border-box', display: 'flex'};
const BARS: Readonly<Record<StudioLayout, CSSProperties>> = {
  wide: {...BAR, alignItems: 'center', gap: SPACING.xl, padding: `${SPACING.md}px ${SPACING.lg}px`},
  narrow: {...BAR, flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.md, padding: SPACING.lg},
};
const RULE: CSSProperties = {flex: 'none', width: ADMIN_LAYOUT.hairline, alignSelf: 'stretch', backgroundColor: ADMIN_COLORS.border};
const SET: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md, minWidth: 0};
const STACK: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xxs, minWidth: 0};
const EYEBROW_LINE: CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm};
const EYEBROW: CSSProperties = {
  fontSize: ADMIN_TYPE.micro,
  fontWeight: 600,
  letterSpacing: LETTER_SPACING.eyebrow,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};
const NAME: CSSProperties = {fontSize: ADMIN_TYPE.emphasis, fontWeight: 700, color: ADMIN_COLORS.text};
// In the line's size, as ForgetTokenOffer sets its LinkButton.
const CHANGE: CSSProperties = {alignSelf: 'flex-start', fontSize: ADMIN_TYPE.small};
// Wide, the rest of the bar's line. Narrow, as tall as its lines: in the column a flex basis would be a height.
const WHERES: Readonly<Record<StudioLayout, CSSProperties>> = {wide: {...STACK, flex: '1 1 320px'}, narrow: STACK};
const LINE: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, lineHeight: 1.5, color: ADMIN_COLORS.text};
const NOTE: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, lineHeight: 1.5, color: ADMIN_COLORS.muted};

export interface SetBarProps {
  /** The set step 1 chose. */
  set: NewCardSet;
  /** The form's collector number, as typed: the bar names the id it gives the card. */
  collectorNumber: string;
  /** Back to step 1, keeping the draft. */
  onChangeSet: () => void;
  /** A publish is running: Change set waits for it, since step 1 would hide how it went. */
  publishing: boolean;
  layout: StudioLayout;
}

/**
 * New card's step 2, over the reveal form: the steps, the set chosen with
 * Change set, and where the card is written. The set decides the file, so the
 * bar states it and offers no choice: previewCards.json under the id the
 * collector number gives (previewIdText), its scan in card-images-raw/, in one
 * commit to the target branch. It names them by the paths the commit writes
 * (PREVIEW_PATH, RAW_DIR).
 */
export function SetBar({set, collectorNumber, onChangeSet, publishing, layout}: SetBarProps) {
  const wide = layout === 'wide';
  return (
    <div style={BARS[layout]}>
      <StepStrip current={2} />
      {wide && <span aria-hidden="true" style={RULE} />}
      <div style={SET}>
        <SetLogo set={set} size="bar" />
        <div style={STACK}>
          <span style={EYEBROW_LINE}>
            <span style={EYEBROW}>Set {set.code}</span> <Tag>reveal</Tag>
          </span>
          {set.name !== undefined && <span style={NAME}>{set.name}</span>}
          <LinkButton type="button" onClick={onChangeSet} disabled={publishing} style={CHANGE}>
            Change set
          </LinkButton>
        </div>
      </div>
      {wide && <span aria-hidden="true" style={RULE} />}
      <div style={WHERES[layout]}>
        <span style={EYEBROW}>Written to</span>
        <p style={LINE}>
          <code>{PREVIEW_PATH}</code> as {previewIdText(collectorNumber)}, with its scan in{' '}
          <code>{baseName(RAW_DIR)}/</code>
        </p>
        <p style={NOTE}>
          One commit to {targetBranch()}. Graduation later swaps it for LorcanaJSON’s card and moves its votes.
        </p>
      </div>
    </div>
  );
}

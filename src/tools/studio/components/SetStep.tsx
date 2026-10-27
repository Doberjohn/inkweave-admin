import {useId, useRef, type CSSProperties} from 'react';
import {CtaButton, FONTS, LETTER_SPACING, REVEAL_ID_BASE, SPACING, Tag} from '../../../app-bridge';
import {baseName} from '../../../components/fileName';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {PREVIEW_PATH} from '../../reveal/githubClient';
import {closedReason, closedSets, setLabel, type NewCardSet, type NewCardSets, type RevealSetState} from '../newCardSets';
import {STUDIO_OWN_ROW, STUDIO_PANEL} from '../studioStyles';
import {FailedCardList} from './FailedCardList';
import {SetLogo} from './SetLogo';
import {StepStrip} from './StepStrip';

// The longest line's measure: the intro and the notes stay readable on a wide studio.
const MEASURE = 760;
// The one open set's tile: as wide as its facts need, never the studio's width.
const TILE_WIDTH = 560;

const PANEL: CSSProperties = {
  ...STUDIO_PANEL,
  ...STUDIO_OWN_ROW,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xl,
  padding: SPACING.xl,
};
const STACK: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const TITLE: CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  color: ADMIN_COLORS.text,
};
const NOTE: CSSProperties = {margin: 0, maxWidth: MEASURE, fontSize: ADMIN_TYPE.body, lineHeight: 1.5, color: ADMIN_COLORS.muted};
const EYEBROW: CSSProperties = {
  margin: 0,
  fontSize: ADMIN_TYPE.micro,
  fontWeight: 600,
  letterSpacing: LETTER_SPACING.eyebrow,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};
const TILE_BOX: CSSProperties = {width: '100%', maxWidth: TILE_WIDTH};
// Inside the tile's <button> (adm-card-btn, which takes no inline style): its logo beside its words.
const TILE: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.lg, minWidth: 0};
const TILE_TEXT: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs, minWidth: 0};
const EYEBROW_LINE: CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm};
const NAME: CSSProperties = {fontSize: ADMIN_TYPE.emphasis, fontWeight: 700, color: ADMIN_COLORS.text};
const FACTS: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xxs};
const FACT: CSSProperties = {fontSize: ADMIN_TYPE.small, lineHeight: 1.5, color: ADMIN_COLORS.muted};
const CLOSED: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: SPACING.lg,
  padding: SPACING.xl,
  border: `1px dashed ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
};
const CLOSED_TEXT: CSSProperties = {...STACK, flex: '1 1 320px', minWidth: 0};
const CLOSED_TITLE: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.emphasis, fontWeight: 700, color: ADMIN_COLORS.text};
const ROWS: CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.sm, margin: 0, padding: 0, listStyle: 'none'};
const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.sm,
  padding: `${SPACING.xs}px ${SPACING.md}px ${SPACING.xs}px ${SPACING.xs}px`,
  border: `1px dashed ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.box,
};
const ROW_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.small, fontWeight: 600, color: ADMIN_COLORS.muted};

const INTRO =
  'A card of the set in reveal season is a reveal: it joins the preview cards until LorcanaJSON publishes the set, then graduation swaps it for the official card and moves its votes.';

export interface SetStepProps {
  /** The sets, from the card list, or null while it loads or after it fails. */
  sets: NewCardSets | null;
  /** The card list's error: every set depends on the list, so it takes the sets' place. */
  listError: Error | null;
  /** The card list's retryLoad, which keeps New card's draft. */
  onRetryList: () => void;
  /** The open set's tile, pressed: its code. */
  onChoose: (code: string) => void;
  /** Edit a card instead, offered while no set takes a new card. */
  onEditInstead: () => void;
  /**
   * The page's (R-59), taken into the step's first button once the card list
   * has loaded or failed: Save token's, and Retry's once it lands.
   */
  handoff: FocusHandoff;
  /** New card's step's (useNewCardStep): Change set's, taken as the page's is. */
  stepHandoff: FocusHandoff;
}

/**
 * The set that takes new cards: the reveal set while one of its numbers is
 * free. Its name is the set's ("Set 14 Hyperia City"); its tag and facts
 * describe it. The count is inkweave.ink's, as the number check's is: a card
 * published since its last deploy isn't in it yet, and the commit refuses a
 * number the branch already holds.
 */
function OpenSetTile({set, onChoose}: {set: RevealSetState; onChoose: (code: string) => void}) {
  const id = useId();
  return (
    <div style={TILE_BOX}>
      <button
        type="button"
        className="adm-card-btn"
        aria-labelledby={`${id}-code ${id}-name`}
        aria-describedby={`${id}-tag ${id}-facts`}
        onClick={() => onChoose(set.code)}>
        <span style={TILE}>
          <SetLogo set={set} size="tile" />
          <span style={TILE_TEXT}>
            <span style={EYEBROW_LINE}>
              <span id={`${id}-code`} style={EYEBROW}>
                Set {set.code}
              </span>
              <span id={`${id}-tag`}>
                <Tag>reveal season</Tag>
              </span>
            </span>
            <span id={`${id}-name`} style={NAME}>
              {set.name}
            </span>
            <span id={`${id}-facts`} style={FACTS}>
              <span style={FACT}>
                {set.taken} of {set.total} numbers taken on inkweave.ink.
              </span>{' '}
              <span style={FACT}>
                New cards go to <code>{baseName(PREVIEW_PATH)}</code> as {REVEAL_ID_BASE} + collector number.
              </span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

/** No set takes a new card: why, when one will (closedReason), and the way to Edit card meanwhile. */
function ClosedNotice({reveal, onEditInstead}: {reveal: RevealSetState; onEditInstead: () => void}) {
  return (
    <div style={CLOSED}>
      <div style={CLOSED_TEXT}>
        <p style={CLOSED_TITLE}>No set takes new cards right now</p>
        <p style={NOTE}>{closedReason(reveal)}</p>
      </div>
      <CtaButton type="button" variant="neutral" onClick={onEditInstead}>
        Edit a card instead
      </CtaButton>
    </div>
  );
}

/** The sets that take no new card, each by its logo and name, with no control. */
function ClosedSets({sets}: {sets: readonly NewCardSet[]}) {
  const headingId = useId();
  if (sets.length === 0) return null;
  return (
    <div style={STACK}>
      <h3 id={headingId} style={EYEBROW}>
        Released sets
      </h3>
      <p style={NOTE}>Their cards come from LorcanaJSON. Edit card changes their images and printings.</p>
      <ul aria-labelledby={headingId} style={ROWS}>
        {sets.map((set) => (
          <li key={set.code} style={ROW}>
            <SetLogo set={set} size="row" faded />
            <span style={ROW_LABEL}>{setLabel(set)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ChoiceProps = Omit<SetStepProps, 'handoff' | 'stepHandoff'>;

/** What the step offers: the card list's failure, its load, the open set, or why none is open. */
function SetChoice({sets, listError, onRetryList, onChoose, onEditInstead}: ChoiceProps) {
  if (listError !== null) return <FailedCardList error={listError} onRetry={onRetryList} />;
  if (sets === null) return <Notice>Checking which sets take new cards…</Notice>;
  if (sets.reveal.status === 'open') return <OpenSetTile set={sets.reveal} onChoose={onChoose} />;
  return <ClosedNotice reveal={sets.reveal} onEditInstead={onEditInstead} />;
}

/**
 * New card's step 1: which set the card is in. The set decides where the card
 * is written, so the step never asks for a file: the reveal set, in its
 * season, is the one set that takes a new card, and the Core sets before it
 * are LorcanaJSON's. The sets come from the card list, so the step waits for
 * it, as Publish does. Its first button takes a pending handoff, the page's or
 * the step's, once the list has loaded or failed (R-48).
 */
export function SetStep({handoff, stepHandoff, ...choice}: SetStepProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const settled = choice.sets !== null || choice.listError !== null;
  useTakeHandoff(handoff, ref, 'button', settled);
  useTakeHandoff(stepHandoff, ref, 'button', settled);
  return (
    <section ref={ref} aria-labelledby={titleId} style={PANEL}>
      <StepStrip current={1} />
      <div style={STACK}>
        <h2 id={titleId} style={TITLE}>
          Which set is the card in?
        </h2>
        <p style={NOTE}>{INTRO}</p>
      </div>
      <SetChoice {...choice} />
      {choice.sets !== null && <ClosedSets sets={closedSets(choice.sets)} />}
    </section>
  );
}

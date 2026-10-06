import {useRef, useState, type RefObject} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {CtaButton, FONTS, LETTER_SPACING, SPACING} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {GithubTokenGate} from '../../../github/GithubTokenGate';
import {targetBranch} from '../../../github/githubCommit';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {PendingTray} from '../../tuning/components/PendingTray';
import {TierRow} from '../../tuning/components/TierRow';
import {tuningFailureKind} from '../../tuning/tuningFailure';
import {pendingLabel, rowsForSelection, tuningKind, tuningName, type RowSpec} from '../../tuning/tuningRows';
import type {UseLiveTuningResult} from '../../tuning/useLiveTuning';
import type {PendingEdit, StageArgs, UseTuningAdminResult} from '../../tuning/useTuningAdmin';
import {biasCopy} from '../biasCopy';
import {gapColor} from '../gapColor';
import type {CalibrationRow} from './calibrationModel';
import {focusUnmoved, useTakeHandoff, type FocusHandoff} from './focusHandoff';
import {reloadNote} from './reloadNote';

/** Both tuning hooks. They need a token, so R2-6's TunedWorkspace calls them and hands them down. */
export interface TuningState {
  live: UseLiveTuningResult;
  admin: UseTuningAdminResult;
}

interface TuningAsideProps {
  /** null without a token: the aside asks for one. */
  tuning: TuningState | null;
  onSaveToken: (token: string) => void;
  /** Forgets the saved token (the shared store's clearToken). The aside asks first when edits are pending. */
  onForgetToken: () => void;
  /** The rules table's selection, resolved from ?rule= (findRow), or null on "All pairs". */
  selected: CalibrationRow | null;
  /** The rows whose tuningKey is the selected row's (rowsSharingKey): two or more is a shared entry (R-21). */
  sharedWith: CalibrationRow[];
  /**
   * Focus waiting for the aside's next view (CalibrationPage's): the token
   * gate's field takes it, the first heading of the loaded editor, or a failed
   * first read's way out (F2). Without it, nothing moves focus.
   */
  handoff?: FocusHandoff;
}

type Path = (string | number)[];

const PADDED: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.md, padding: SPACING.xxl};
// A failed reload's error, over the tray it keeps on screen (C1).
const READ_ERROR: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
  marginBottom: SPACING.md,
};

// R2-6's <aside> stretches to the row, and this column fills it, so the tray sits at
// the foot of a short aside and sticks to the bottom of the view on a long page.
const COLUMN: React.CSSProperties = {display: 'flex', flexDirection: 'column', minHeight: '100%'};
const BODY: React.CSSProperties = {flex: 1, display: 'flex', flexDirection: 'column', gap: SPACING.xl, padding: SPACING.xxl};
const FOOT: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  padding: `${SPACING.lg}px ${SPACING.xxl}px`,
  borderTop: `1px solid ${ADMIN_COLORS.border}`,
  // The rows scroll under the pinned tray, so its fill hides them: the aside's tint over the page (adminTheme.ts).
  background: `linear-gradient(${ADMIN_COLORS.aside}, ${ADMIN_COLORS.aside}), ${ADMIN_COLORS.page}`,
};

const TEXT: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, lineHeight: 1.5, color: ADMIN_COLORS.muted};
const EYEBROW: React.CSSProperties = {
  margin: 0,
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.eyebrow,
  textTransform: 'uppercase',
  // Muted, not dim: it says what the aside holds (R-6).
  color: ADMIN_COLORS.muted,
};
const TITLE_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: SPACING.md,
};
// The handoff's 28px Tinos pair, the entry's name and the gap (R-14: Tinos on headline numbers).
const TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.pageTitle,
  fontWeight: 400,
  lineHeight: 1.1,
  color: ADMIN_COLORS.text,
};
const GAP: React.CSSProperties = {margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end'};
const GAP_LABEL: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const GAP_VALUE: React.CSSProperties = {fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi, lineHeight: 1.1};

const kindLabel = (kind: 'playstyle' | 'direct') => (kind === 'playstyle' ? 'Playstyle' : 'Direct synergy');

/**
 * R-26's "Forget token", which asks first when edits are pending: R2-6 keys
 * the workspace by the token, so forgetting it drops them, and a new token
 * could have published them (a publish checks each edit's old value, never
 * the token).
 */
function confirmForget(pending: number, onForgetToken: () => void): () => void {
  return () => {
    if (pending === 0 || window.confirm(`Forget the token and drop ${pending} unpublished edit${pending === 1 ? '' : 's'}?`)) {
      onForgetToken();
    }
  };
}

/**
 * The entry's name over the selected rule's gap and read line. A shared entry
 * (Locations: nine location-* rules) names the rules that share it, and a
 * rule whose entry goes by another name (Location Boost under Locations, Lore
 * Loss under Lore Denial) labels its gap and read line with its own name, so
 * the number never reads as the entry's (R-21).
 */
function EntryHeader({
  eyebrow,
  title,
  row,
  sharedWith,
}: {
  eyebrow: string;
  title: string;
  row: CalibrationRow;
  sharedWith: CalibrationRow[];
}) {
  const gap = row.stat?.meanGap ?? null;
  const own = row.name === title;
  const {read} = biasCopy(gap);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <p style={EYEBROW}>{eyebrow}</p>
      <div style={TITLE_ROW}>
        {/* Takes focus when the editor arrives after the button that asked for it unmounted (F2). */}
        <h2 tabIndex={-1} style={TITLE}>
          {title}
        </h2>
        <p style={GAP}>
          <span style={GAP_LABEL}>{own ? 'Gap' : `${row.name} gap`}</span>{' '}
          <span style={{...GAP_VALUE, color: gapColor(gap)}}>{fmtGap(gap)}</span>
        </p>
      </div>
      {sharedWith.length > 1 && (
        <p style={{...TEXT, fontSize: ADMIN_TYPE.small}}>
          Shared by {sharedWith.length} rules: {sharedWith.map((shared) => shared.name).join(', ')}
        </p>
      )}
      <p style={TEXT}>{own ? read : `${row.name}: ${read}`}</p>
    </div>
  );
}

/**
 * One editable row, copied from TuningEditor (which R2-7 deleted). It shows
 * the pending value when there is one and the saved value otherwise, so
 * switching rules, reverting and clearing always show what Publish would
 * commit. Its pending edits are labelled with the entry's name.
 */
function EditableRow({
  row,
  name,
  pendingFor,
  stageEdit,
}: {
  row: RowSpec;
  name: string;
  pendingFor: (path: Path | undefined) => PendingEdit | undefined;
  stageEdit: (args: StageArgs) => void;
}) {
  const text = pendingFor(row.textPath);
  const score = pendingFor(row.scorePath);
  return (
    <TierRow
      label={row.label}
      text={String(text?.value ?? row.textValue ?? '')}
      score={score?.value ?? row.scoreValue ?? ''}
      showText={row.textPath !== undefined}
      showScore={row.scorePath !== undefined}
      textError={text?.error}
      scoreError={score?.error}
      onTextChange={(raw) =>
        row.textPath &&
        stageEdit({
          path: row.textPath,
          rawValue: raw,
          kind: 'text',
          oldValue: row.textValue ?? '',
          label: pendingLabel(name, row.label, 'text'),
        })
      }
      onScoreChange={(raw) =>
        row.scorePath &&
        stageEdit({
          path: row.scorePath,
          rawValue: raw,
          kind: 'score',
          oldValue: row.scoreValue ?? 0,
          label: pendingLabel(name, row.label, 'score'),
        })
      }
    />
  );
}

/** The aside's body: a prompt, the "no copy" state (R-20), or the selected entry's rows. */
function SelectedEntry({
  config,
  pending,
  selected,
  sharedWith,
  stageEdit,
}: {
  config: TuningConfig;
  pending: PendingEdit[];
  selected: CalibrationRow | null;
  sharedWith: CalibrationRow[];
  stageEdit: (args: StageArgs) => void;
}) {
  if (!selected) return <p style={TEXT}>Pick a playstyle or direct synergy to edit its copy and scores.</p>;
  const key = selected.tuningKey;
  const rows = key ? rowsForSelection(config, key) : [];
  if (!key || rows.length === 0) {
    return (
      <>
        <EntryHeader eyebrow={kindLabel(selected.category)} title={selected.name} row={selected} sharedWith={[]} />
        <p style={TEXT}>No copy in tuning.json, so {selected.name} has nothing to tune here.</p>
      </>
    );
  }
  const name = tuningName(config, key);
  const pendingFor = (path: Path | undefined) =>
    path ? pending.find((edit) => edit.pathKey === JSON.stringify(path)) : undefined;
  return (
    <>
      <EntryHeader
        eyebrow={`${kindLabel(tuningKind(config, key))} · tuning.json`}
        title={name}
        row={selected}
        sharedWith={sharedWith}
      />
      {rows.map((row) => (
        <EditableRow key={row.label} row={row} name={name} pendingFor={pendingFor} stageEdit={stageEdit} />
      ))}
    </>
  );
}

/**
 * A failed read of tuning.json, and its way out: Forget token when GitHub
 * rejected the token (R-26), else reading it again, when that is offered.
 */
function ReadError({error, onForget, onReadAgain}: {error: string; onForget: () => void; onReadAgain?: () => void}) {
  return (
    <>
      <Notice tone="error">Could not read tuning.json: {error}</Notice>
      {tuningFailureKind(error) === 'rejected-token' ? (
        <ForgetTokenOffer onForget={onForget} />
      ) : (
        onReadAgain && (
          <CtaButton type="button" variant="neutral" onClick={onReadAgain} style={{alignSelf: 'flex-start'}}>
            Read tuning.json again
          </CtaButton>
        )
      )}
    </>
  );
}

/**
 * "Read tuning.json again". Its button goes once a read lands, so only then
 * does it ask for the handoff, which the editor's first heading takes (F2). A
 * failed read keeps the button and asks for nothing, so no later read takes a
 * stale request.
 */
function readAgainWith(reload: () => Promise<TuningConfig | null>, handoff: FocusHandoff | undefined) {
  return () => {
    void reload().then((next) => {
      if (next) handoff?.request();
    });
  };
}

/** No token: the gate. Its field takes a pending handoff, after Forget token unmounted the button pressed (F2). */
function TokenGate({onSave, handoff}: {onSave: (token: string) => void; handoff?: FocusHandoff}) {
  const gateRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, gateRef, 'input');
  return (
    <div ref={gateRef} style={PADDED}>
      {/* The gate's own h2 is "GitHub token"; this line says what the token opens. */}
      <p style={EYEBROW}>Tuning editor</p>
      <GithubTokenGate onSave={onSave} />
    </div>
  );
}

type FailedLive = Extract<UseLiveTuningResult, {status: 'error'}>;
type ReadyLive = Extract<UseLiveTuningResult, {status: 'ready'}>;

/**
 * No read has landed, so there is no editor yet. A handoff still pending from
 * Save token goes to the error's way out: "Read tuning.json again", or Forget
 * token for a 401 (F2).
 */
function FailedRead({live, onForget, handoff}: {live: FailedLive; onForget: () => void; handoff?: FocusHandoff}) {
  const errorRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, errorRef, 'button');
  return (
    <div ref={errorRef} style={PADDED}>
      <ReadError error={live.error} onForget={onForget} onReadAgain={readAgainWith(live.reload, handoff)} />
    </div>
  );
}

/**
 * A failed reload, over the tray it keeps on screen (C1), or nothing. While
 * the tray shows a stale refusal, its Reload reads tuning.json again and
 * settles the edits, so the read error offers no second button that does the
 * same (R2-5 M5).
 */
function FailedReload({
  live,
  publishError,
  onForget,
  handoff,
}: {
  live: ReadyLive;
  publishError: string | null;
  onForget: () => void;
  handoff?: FocusHandoff;
}) {
  if (live.reloadError === undefined) return null;
  const staleRefusal = publishError !== null && tuningFailureKind(publishError) === 'stale-value';
  return (
    <div style={READ_ERROR}>
      <ReadError
        error={live.reloadError}
        onForget={onForget}
        onReadAgain={staleRefusal ? undefined : readAgainWith(live.reload, handoff)}
      />
    </div>
  );
}

/**
 * What the last "Reload tuning.json" did, once one runs (R-18). It is mounted
 * with the tray, so its text is announced when it arrives, and Reload hands it
 * focus.
 */
function DroppedNote({dropped, noteRef}: {dropped: number | null; noteRef: RefObject<HTMLDivElement | null>}) {
  return (
    <div
      ref={noteRef}
      role="status"
      tabIndex={-1}
      style={{...TEXT, fontSize: ADMIN_TYPE.small, marginBottom: dropped === null ? 0 : SPACING.sm}}>
      {dropped === null ? null : reloadNote(dropped)}
    </div>
  );
}

/**
 * tuning.json is loaded: the selected entry over the pinned tray. A failed
 * reload keeps both, with its error above the tray (C1), so a publish's commit
 * link and the pending edits stay in view.
 */
function ReadyAside({
  live,
  admin,
  selected,
  sharedWith,
  onForgetToken,
  handoff,
}: {
  live: ReadyLive;
  admin: UseTuningAdminResult;
  selected: CalibrationRow | null;
  sharedWith: CalibrationRow[];
  onForgetToken: () => void;
  handoff?: FocusHandoff;
}) {
  const {config, reloadError, reload} = live;
  // How many edits the last "Reload tuning.json" dropped (R-18); null until one runs, and again once a publish starts.
  const [dropped, setDropped] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  // A pending handoff goes to the first heading, the entry's or else the tray's, once no read error is up.
  useTakeHandoff(handoff, columnRef, 'h2', reloadError === undefined);

  // The tray shows a failed publish (useTuningAdmin keeps the error); only a success asks for fresh values.
  const publish = () => {
    setDropped(null);
    void admin.publish().then(
      () => reload(),
      () => undefined,
    );
  };
  // R-18: read tuning.json again, then keep the edits that still apply to it. The admin
  // captured at the click is right: dropStale settles the paths this render knew of. The
  // Reload button goes with the error it answered, so focus moves to the line that says
  // what the reload did, unless the user moved it while the read ran (F19).
  const reloadKeepingEdits = () => {
    const from = document.activeElement;
    void reload().then((next) => {
      if (!next) return; // The read failed (its error shows above the tray), or a newer read replaced it.
      setDropped(admin.dropStale(next));
      if (focusUnmoved(from)) noteRef.current?.focus();
    });
  };
  // The rows scroll under the pinned tray, which hides them: a field that takes
  // focus there scrolls up into view (WCAG 2.4.11).
  const keepClearOfTray = (event: React.FocusEvent<HTMLDivElement>) => {
    const trayTop = footRef.current?.getBoundingClientRect().top;
    if (trayTop !== undefined && event.target.getBoundingClientRect().bottom > trayTop) {
      event.target.scrollIntoView({block: 'center'});
    }
  };

  return (
    <div ref={columnRef} style={COLUMN}>
      <div style={BODY} onFocus={keepClearOfTray}>
        <SelectedEntry
          config={config}
          pending={admin.pending}
          selected={selected}
          sharedWith={sharedWith}
          stageEdit={admin.stageEdit}
        />
      </div>
      <div ref={footRef} style={FOOT}>
        <FailedReload live={live} publishError={admin.error} onForget={onForgetToken} handoff={handoff} />
        <DroppedNote dropped={dropped} noteRef={noteRef} />
        <PendingTray
          pending={admin.pending}
          publishDisabled={admin.publishDisabled}
          publishing={admin.publishing}
          result={admin.result}
          error={admin.error}
          onRevert={admin.revertEdit}
          onClear={admin.clear}
          onPublish={publish}
          onReload={reloadKeepingEdits}
          onForgetToken={onForgetToken}
        />
      </div>
    </div>
  );
}

/**
 * The tuning editor beside the calibration analytics: the token gate, the
 * tuning.json read (loading, or failed before any read landed), then the
 * selected rule's entry over the pinned pending tray. A read or a publish
 * GitHub refused for the token offers "Forget token" (R-26), which asks first
 * when edits are pending. Any other failed read offers to read tuning.json
 * again, or leaves that to the tray's Reload while a stale refusal is up.
 */
export function TuningAside({tuning, onSaveToken, onForgetToken, selected, sharedWith, handoff}: TuningAsideProps) {
  if (!tuning) return <TokenGate onSave={onSaveToken} handoff={handoff} />;
  const {live, admin} = tuning;
  const forget = confirmForget(admin.pending.length, onForgetToken);
  if (live.status === 'loading') {
    return (
      <div style={PADDED}>
        <p style={TEXT}>Reading tuning.json from {targetBranch()}…</p>
      </div>
    );
  }
  if (live.status === 'error') return <FailedRead live={live} onForget={forget} handoff={handoff} />;
  return (
    <ReadyAside
      live={live}
      admin={admin}
      selected={selected}
      sharedWith={sharedWith}
      onForgetToken={forget}
      handoff={handoff}
    />
  );
}

import {useRef, useState} from 'react';
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
import type {useLiveTuning} from '../../tuning/useLiveTuning';
import type {PendingEdit, StageArgs, UseTuningAdminResult} from '../../tuning/useTuningAdmin';
import {biasCopy} from '../biasCopy';
import {gapColor} from '../gapColor';
import type {CalibrationRow} from './calibrationModel';
import {reloadNote} from './reloadNote';

/** Both tuning hooks. They need a token, so R2-6's TunedWorkspace calls them and hands them down. */
export interface TuningState {
  live: ReturnType<typeof useLiveTuning>;
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
}

type Path = (string | number)[];

const PADDED: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.md, padding: SPACING.xxl};

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
        <h2 style={TITLE}>{title}</h2>
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
 * One editable row, copied from TuningEditor (which R2-7 deletes). It shows
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

/** tuning.json is loaded: the selected entry over the pinned tray. */
function ReadyAside({
  config,
  reload,
  admin,
  selected,
  sharedWith,
  onForgetToken,
}: {
  config: TuningConfig;
  reload: TuningState['live']['reload'];
  admin: UseTuningAdminResult;
  selected: CalibrationRow | null;
  sharedWith: CalibrationRow[];
  onForgetToken: () => void;
}) {
  // How many edits the last "Reload tuning.json" dropped (R-18); null until one runs, and again once a publish starts.
  const [dropped, setDropped] = useState<number | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

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
  // what the reload did.
  const reloadKeepingEdits = () => {
    void reload().then((next) => {
      if (!next) return; // The read failed (the aside now says why), or a newer read replaced it.
      setDropped(admin.dropStale(next));
      noteRef.current?.focus();
    });
  };

  return (
    <div style={COLUMN}>
      <div style={BODY}>
        <SelectedEntry
          config={config}
          pending={admin.pending}
          selected={selected}
          sharedWith={sharedWith}
          stageEdit={admin.stageEdit}
        />
      </div>
      <div style={FOOT}>
        {/* Mounted with the tray, so its text is announced when it arrives. */}
        <div
          ref={noteRef}
          role="status"
          tabIndex={-1}
          style={{...TEXT, fontSize: ADMIN_TYPE.small, marginBottom: dropped === null ? 0 : SPACING.sm}}>
          {dropped === null ? null : reloadNote(dropped)}
        </div>
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
 * tuning.json read (loading or failed), then the selected rule's entry over
 * the pinned pending tray. A read or a publish GitHub refused for the token
 * offers "Forget token" (R-26), which asks first when edits are pending; any
 * other failed read offers to read tuning.json again.
 */
export function TuningAside({tuning, onSaveToken, onForgetToken, selected, sharedWith}: TuningAsideProps) {
  if (!tuning) {
    return (
      <div style={PADDED}>
        {/* The gate's own h2 is "GitHub token"; this line says what the token opens. */}
        <p style={EYEBROW}>Tuning editor</p>
        <GithubTokenGate onSave={onSaveToken} />
      </div>
    );
  }
  const {live, admin} = tuning;
  const forget = confirmForget(admin.pending.length, onForgetToken);
  if (live.status === 'loading') {
    return (
      <div style={PADDED}>
        <p style={TEXT}>Reading tuning.json from {targetBranch()}…</p>
      </div>
    );
  }
  if (live.status === 'error') {
    return (
      <div style={PADDED}>
        {/* The aside's one alert (Notice's error tone): R2-6 finds it with within(aside).findByRole('alert'). */}
        <Notice tone="error">Could not read tuning.json: {live.error}</Notice>
        {tuningFailureKind(live.error) === 'rejected-token' ? (
          <ForgetTokenOffer onForget={forget} />
        ) : (
          // A failed reload keeps the pending edits (TunedWorkspace holds them): reading again brings them back.
          <CtaButton
            type="button"
            variant="neutral"
            onClick={() => void live.reload()}
            style={{alignSelf: 'flex-start'}}>
            Read tuning.json again
          </CtaButton>
        )}
      </div>
    );
  }
  return (
    <ReadyAside
      config={live.config}
      reload={live.reload}
      admin={admin}
      selected={selected}
      sharedWith={sharedWith}
      onForgetToken={forget}
    />
  );
}

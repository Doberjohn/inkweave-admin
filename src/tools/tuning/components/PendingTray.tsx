import type {PendingEdit} from '../useTuningAdmin';
import {COLORS, SPACING, CtaButton, LinkButton} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {targetBranch} from '../../../github/githubCommit';
import {goLiveNote} from '../../../github/goLiveNote';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {tuningFailureKind} from '../tuningFailure';

interface PendingTrayProps {
  pending: PendingEdit[];
  publishDisabled: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  error: string | null;
  onRevert: (pathKey: string) => void;
  onClear: () => void;
  onPublish: () => void;
  /** Reads tuning.json again. Offered for a stale-value refusal only, and only when given. */
  onReload?: () => void;
  /** Forgets the saved token. Offered when GitHub rejected it (a 401) only, and only when given. */
  onForgetToken?: () => void;
}

const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: SPACING.md,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
  fontSize: ADMIN_TYPE.small,
};

// The edits scroll inside the tray past a third of the view, so the aside's pinned foot never
// outgrows the view and hides the rows above it, or its own heading.
const EDITS: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
  maxHeight: '30vh',
  overflowY: 'auto',
};

// The whole diff, wrapped: a long tagline is the edit under review, so it is never cut short.
const DIFF: React.CSSProperties = {
  display: 'block',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.muted,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

function PendingEditRow({edit, onRevert}: {edit: PendingEdit; onRevert: (pathKey: string) => void}) {
  return (
    <div style={ROW}>
      <div style={{minWidth: 0}}>
        <div style={{color: ADMIN_COLORS.text}}>{edit.label}</div>
        {edit.valid ? (
          // <code> gives the diff the UA monospace with no font declaration (R-7).
          <code style={DIFF}>{`${String(edit.oldValue)} → ${String(edit.value)}`}</code>
        ) : (
          <div style={{fontSize: ADMIN_TYPE.label, color: COLORS.error}}>{edit.error}</div>
        )}
      </div>
      <LinkButton
        type="button"
        tone="muted"
        onClick={() => onRevert(edit.pathKey)}
        style={{flexShrink: 0, fontSize: ADMIN_TYPE.small}}>
        revert
      </LinkButton>
    </div>
  );
}

/**
 * A failed publish, and the way out its kind needs (tuningFailureKind): a
 * reload after a stale value (R-18), a new token after GitHub rejects this
 * one (R-26). Notice's error tone is the alert (R1-3), so nothing here wraps
 * it in another.
 */
function PublishError({
  error,
  onReload,
  onForgetToken,
}: {
  error: string;
  onReload?: () => void;
  onForgetToken?: () => void;
}) {
  const kind = tuningFailureKind(error);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <Notice tone="error">{error}</Notice>
      {onReload && kind === 'stale-value' && (
        <CtaButton type="button" variant="neutral" onClick={onReload} style={{alignSelf: 'flex-start'}}>
          Reload tuning.json
        </CtaButton>
      )}
      {onForgetToken && kind === 'rejected-token' && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}

/** The staged edits as diff rows, then a failed publish's error, the Publish button and the last publish's commit. */
export function PendingTray({
  pending,
  publishDisabled,
  publishing,
  result,
  error,
  onRevert,
  onClear,
  onPublish,
  onReload,
  onForgetToken,
}: PendingTrayProps) {
  return (
    <section aria-label="Pending changes" style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.md}}>
        <h2 style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
          Pending changes · {pending.length}
        </h2>
        {pending.length > 0 && (
          <LinkButton type="button" tone="muted" onClick={onClear} style={{fontSize: ADMIN_TYPE.small}}>
            Clear all
          </LinkButton>
        )}
      </div>

      {pending.length === 0 ? (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>No pending changes</p>
      ) : (
        <div style={EDITS}>
          {pending.map((edit) => (
            <PendingEditRow key={edit.pathKey} edit={edit} onRevert={onRevert} />
          ))}
        </div>
      )}

      {error && <PublishError error={error} onReload={onReload} onForgetToken={onForgetToken} />}

      <CtaButton type="button" onClick={onPublish} disabled={publishDisabled} style={{width: '100%'}}>
        {publishing ? 'Publishing…' : `Publish to ${targetBranch()}`}
      </CtaButton>

      {/* Mounted with the tray, so "Published." is announced when it arrives:
          a live region mounted with its text often isn't. */}
      <p role="status" style={{margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.success}}>
        {result && (
          <>
            Published.{' '}
            <a href={result.commitUrl} target="_blank" rel="noreferrer" style={{color: ADMIN_COLORS.accent}}>
              View commit
            </a>
            . {goLiveNote('Changes go live on the next Vercel redeploy.')}
          </>
        )}
      </p>
    </section>
  );
}

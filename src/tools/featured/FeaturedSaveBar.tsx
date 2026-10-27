import {useRef} from 'react';
import {COLORS, CtaButton, LinkButton, Notice, SPACING} from '../../app-bridge';
import {ForgetTokenOffer} from '../../github/ForgetTokenOffer';
import {targetBranch} from '../../github/githubCommit';
import {goLiveNote} from '../../github/goLiveNote';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import type {FeaturedFailureKind} from './featuredFailure';
import type {FeaturedSave} from './useFeaturedEditor';

const BAR: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  padding: SPACING.lg,
  backgroundColor: ADMIN_COLORS.panel,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.panel,
};
const ROW: React.CSSProperties = {display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md};
const COUNT: React.CSSProperties = {margin: 0, outline: 'none', fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text};
const LINE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** A commit's short sha, from its page's URL. */
const shortSha = (commitUrl: string) => commitUrl.slice(commitUrl.lastIndexOf('/') + 1, commitUrl.lastIndexOf('/') + 8);

interface FeaturedSaveBarProps {
  /** How many slots have a staged pick. */
  count: number;
  /** Why Save is off, or null (useFeaturedEditor's blocked). */
  blocked: string | null;
  save: FeaturedSave;
  onSave: () => void;
  onDiscard: () => void;
  /** Reads the file again, keeping the picks that still change a slot: offered after a stale refusal. */
  onReload: () => void;
  /** Forgets the saved token: offered when GitHub rejected it. */
  onForgetToken: () => void;
}

/** A failed save, and the way out its kind needs: Reload after a stale refusal, a new token after a 401. */
interface SaveErrorProps {
  error: string;
  kind: FeaturedFailureKind;
  onReload: () => void;
  onForgetToken: () => void;
}

function SaveError({error, kind, onReload, onForgetToken}: SaveErrorProps) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm}}>
      <Notice tone="error">{error}</Notice>
      {kind === 'stale' && (
        <CtaButton type="button" variant="neutral" onClick={onReload}>
          Reload featuredCardIds.json
        </CtaButton>
      )}
      {kind === 'rejected-token' && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}

/** The last save's commit, and when inkweave.ink shows it. */
function SavedLine({commitUrl}: {commitUrl: string}) {
  return (
    <>
      Saved in{' '}
      <a href={commitUrl} target="_blank" rel="noreferrer" className="adm-link">
        <code>{shortSha(commitUrl)}</code>
      </a>
      . {goLiveNote('inkweave.ink shows it once that commit’s deploy finishes, about 7 to 12 minutes.')}
    </>
  );
}

const changesLabel = (count: number) => (count === 0 ? 'No changes' : `${count} change${count === 1 ? '' : 's'}`);

interface SaveRowProps {
  count: number;
  blocked: string | null;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * The count, Save, Discard and why Save is off. Discard unmounts its own
 * button, so the count, which stays, takes focus first, never <body>.
 */
function SaveRow({count, blocked, saving, onSave, onDiscard}: SaveRowProps) {
  const countRef = useRef<HTMLHeadingElement>(null);
  const discard = () => {
    countRef.current?.focus();
    onDiscard();
  };
  // A reason beside a staged pick is a refusal; with no pick, only a hint.
  const reason = saving ? null : blocked;
  const reasonStyle = count > 0 ? {...LINE, color: COLORS.error} : LINE;
  return (
    <div style={ROW}>
      <h2 ref={countRef} tabIndex={-1} style={COUNT}>
        {changesLabel(count)}
      </h2>
      <CtaButton type="button" onClick={onSave} disabled={blocked !== null}>
        {saving ? 'Saving…' : `Save to ${targetBranch()}`}
      </CtaButton>
      {count > 0 && !saving && (
        <LinkButton type="button" tone="muted" onClick={discard} style={{fontSize: ADMIN_TYPE.small}}>
          Discard
        </LinkButton>
      )}
      {reason && <p style={reasonStyle}>{reason}</p>}
    </div>
  );
}

/**
 * The page's foot: how many slots change, Save (off, with its reason, while
 * useFeaturedEditor blocks it) and Discard, then a failed save's error and way
 * out, or the last save's commit.
 */
export function FeaturedSaveBar({count, blocked, save, onSave, onDiscard, onReload, onForgetToken}: FeaturedSaveBarProps) {
  return (
    <section aria-label="Save" style={BAR}>
      <SaveRow count={count} blocked={blocked} saving={save.status === 'saving'} onSave={onSave} onDiscard={onDiscard} />
      {save.status === 'failed' && <SaveError error={save.error} kind={save.kind} onReload={onReload} onForgetToken={onForgetToken} />}
      {/* Mounted with the bar, so "Saved" is announced when it arrives: a live region mounted with its text often isn't. */}
      <p role="status" style={{...LINE, color: COLORS.success}}>
        {save.status === 'saved' && <SavedLine commitUrl={save.commitUrl} />}
      </p>
    </section>
  );
}

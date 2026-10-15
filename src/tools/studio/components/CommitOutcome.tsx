import {useRef} from 'react';
import {COLORS, SPACING, CtaButton} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {isRejectedToken} from '../../../github/rejectedToken';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {loadAgainNote} from '../loadAgainNote';

interface CommitOutcomeProps {
  /** The last commit that landed, or null. */
  result: {commitUrl: string} | null;
  /**
   * The last commit's failure, or null. It shows as given: New reveal's race
   * refusal says "Publish again.", and Edit's controller words its own as a
   * save before it gets here (R4-4c).
   */
  error: string | null;
  /** What happens after the commit, under "Committed.": the go-live note the page picks (goLiveNote). */
  note: string;
  /** How many edits the last "Load it again" dropped (R-68); null or absent before one lands. */
  dropped?: number | null;
  /**
   * Whether the card still opens with its fields once "Load it again" lands
   * (default true). Edit passes false while it shows no form: the entry read
   * can't be held by the form (R-65), so the note says the edits went with it.
   */
  editable?: boolean;
  /** Reads the card again after a stale refusal (R-68). The page passes it for that failure only. */
  onLoadAgain?: () => void;
  /** Forgets the saved token: offered when GitHub rejected it (a 401) only, and only when given (R-26). */
  onForgetToken?: () => void;
  /**
   * The page's focus handoff, when the outcome is its target: a Publish or a
   * Save that settled, or a "Load it again" that landed (R-59). Taken once
   * there is something to show: the failure, else the status line.
   */
  handoff?: FocusHandoff;
}

const COLUMN: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const LINE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, lineHeight: 1.5};
const SUCCESS: React.CSSProperties = {...LINE, color: COLORS.success};
const NOTE: React.CSSProperties = {...LINE, color: ADMIN_COLORS.muted};

/**
 * The first element that can take the handoff, in DOM order: the failure
 * when there is one, else the status line. Both have tabIndex -1, and nothing
 * else here does.
 */
const FOCUS_TARGET = '[tabindex="-1"]';

/** "Committed.", the commit (in a new tab, as R2's tray opens it) and the go-live note. */
function Committed({commitUrl, note}: {commitUrl: string; note: string}) {
  return (
    <>
      Committed.{' '}
      <a href={commitUrl} target="_blank" rel="noreferrer" style={{color: ADMIN_COLORS.accent}}>
        View commit
      </a>
      . {note}
    </>
  );
}

type StatusLineProps = Pick<CommitOutcomeProps, 'result' | 'note' | 'editable'> & {dropped: number | null};

/**
 * The live region, mounted with the outcome so its text is announced when it
 * arrives: a live region mounted with its text often isn't (R2's tray). It
 * holds a landed commit, else what the last "Load it again" kept.
 */
function StatusLine({result, note, dropped, editable}: StatusLineProps) {
  const kept = dropped === null ? null : loadAgainNote({dropped, editable});
  return (
    <p role="status" tabIndex={-1} style={result ? SUCCESS : NOTE}>
      {result ? <Committed commitUrl={result.commitUrl} note={note} /> : kept}
    </p>
  );
}

/**
 * A failed commit, and the way out its kind needs: Load it again after a
 * stale refusal (R-68), Forget token after GitHub rejected the token (R-26).
 * Notice's error tone is the alert (R1-3), so nothing here wraps it in another.
 */
function CommitFailure({
  error,
  onLoadAgain,
  onForgetToken,
}: {
  error: string;
  onLoadAgain?: () => void;
  onForgetToken?: () => void;
}) {
  return (
    <div tabIndex={-1} style={COLUMN}>
      <Notice tone="error">{error}</Notice>
      {onLoadAgain && (
        <CtaButton type="button" variant="neutral" onClick={onLoadAgain} style={{alignSelf: 'flex-start'}}>
          Load it again
        </CtaButton>
      )}
      {onForgetToken && isRejectedToken(error) && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}

/**
 * Under Publish or Save: a failure as an alert with its way out, and the
 * status line, which says "Committed." with the commit's link and the note,
 * or what "Load it again" kept. The status line is always mounted, empty
 * until there is something to say.
 */
export function CommitOutcome({
  result,
  error,
  note,
  dropped = null,
  editable,
  onLoadAgain,
  onForgetToken,
  handoff,
}: CommitOutcomeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const showing = [result, error, dropped].some((value) => value !== null);
  useTakeHandoff(handoff, rootRef, FOCUS_TARGET, showing);
  return (
    <div ref={rootRef} style={COLUMN}>
      {error !== null && <CommitFailure error={error} onLoadAgain={onLoadAgain} onForgetToken={onForgetToken} />}
      <StatusLine result={result} note={note} dropped={dropped} editable={editable} />
    </div>
  );
}

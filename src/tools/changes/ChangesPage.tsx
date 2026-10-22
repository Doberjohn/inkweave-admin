import {useRef} from 'react';
import {SPACING} from '../../app-bridge';
import {targetBranch} from '../../github/githubCommit';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {useGithubToken} from '../../github/useGithubToken';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {PageLayout} from '../../shell/PageLayout';
import {githubSource} from './changeSource';
import {ChangesView} from './ChangesView';
import {useChangeHistory} from './useChangeHistory';

const TITLE = 'Change history';

/** What the page lists, and from which branch: the one admin's tools write to. */
function Subtitle() {
  return (
    <>
      Every change to the app&rsquo;s preview cards, scans, card data and tuning on <code>{targetBranch()}</code>, newest
      first.
    </>
  );
}

/** No token: the gate, under the page's title. Its field takes a pending handoff, after Forget token unmounted the button pressed. */
function ChangesGate({onSave, handoff}: {onSave: (token: string) => void; handoff: FocusHandoff}) {
  const gateRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, gateRef, 'input');
  return (
    <PageLayout title={TITLE} subtitle={<Subtitle />}>
      <div ref={gateRef}>
        <GithubTokenGate onSave={onSave} />
      </div>
    </PageLayout>
  );
}

interface ChangesWorkspaceProps {
  token: string;
  handoff: FocusHandoff;
  onForgetToken: () => void;
}

/**
 * The history, read with the token. After Save token or Try again, its first control takes
 * focus once the read lands (R-48): the filter, or Try again if it failed again.
 */
function ChangesWorkspace({token, handoff, onForgetToken}: ChangesWorkspaceProps) {
  const history = useChangeHistory(token);
  const viewRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, viewRef, 'button', history.state.status !== 'loading');
  return (
    <PageLayout title={TITLE} subtitle={<Subtitle />}>
      {/* One column no wider than the body, as PageLayout's own grid is, so a long line wraps instead of widening the page. */}
      <div ref={viewRef} style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl}}>
        <ChangesView history={history} source={githubSource(token)} onForgetToken={onForgetToken} handoff={handoff} />
      </div>
    </PageLayout>
  );
}

/**
 * Change history (/changes): every commit on the target branch that changed the app's
 * preview cards, raw scans, card data or tuning.json, newest first, each opening onto what
 * it changed. It only reads, but the app repo is private, so it sits behind the token
 * gate, and shares the token the write pages use (useGithubToken).
 */
export function ChangesPage() {
  const {token, setToken, clearToken} = useGithubToken();
  const handoff = useFocusHandoff();
  if (!token) {
    const onSave = (next: string) => {
      setToken(next);
      handoff.request();
    };
    return <ChangesGate onSave={onSave} handoff={handoff} />;
  }
  const onForgetToken = () => {
    clearToken();
    handoff.request();
  };
  // Keyed by the token, as the studio's workspace is (R-84): a new token reads the history afresh.
  return <ChangesWorkspace key={token} token={token} handoff={handoff} onForgetToken={onForgetToken} />;
}

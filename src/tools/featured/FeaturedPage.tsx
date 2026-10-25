import {useRef} from 'react';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {useGithubToken} from '../../github/useGithubToken';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {PageLayout} from '../../shell/PageLayout';
import {FEATURED_SUBTITLE, FEATURED_TITLE} from './featuredCopy';
import {FeaturedWorkspace} from './FeaturedWorkspace';

/** No token: the gate, under the page's own title and branch notice. Its field takes a pending handoff, after Forget token. */
function FeaturedGate({onSave, handoff}: {onSave: (token: string) => void; handoff: FocusHandoff}) {
  const gateRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, gateRef, 'input');
  return (
    <PageLayout title={FEATURED_TITLE} subtitle={FEATURED_SUBTITLE} writes>
      <div ref={gateRef}>
        <GithubTokenGate onSave={onSave} />
      </div>
    </PageLayout>
  );
}

/**
 * Featured cards (/featured): the homepage's six featured cards, committed to
 * the app's featuredCardIds.json (Doberjohn/inkweave-admin#95). Everything on
 * it commits, so all of it sits behind the token gate, as Card studio does.
 * The page holds the focus handoff, since Save token and Forget token swap the
 * gate and the workspace, each taking the button pressed with it.
 */
export function FeaturedPage() {
  const {token, setToken, clearToken} = useGithubToken();
  const handoff = useFocusHandoff();
  if (!token) {
    const onSave = (next: string) => {
      setToken(next);
      handoff.request();
    };
    return <FeaturedGate onSave={onSave} handoff={handoff} />;
  }
  // Keyed by the token: a new token is a new workspace, with no picks, as the studio's is.
  return <FeaturedWorkspace key={token} token={token} onForgetToken={clearToken} handoff={handoff} />;
}

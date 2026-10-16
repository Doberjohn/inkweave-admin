import {useRef} from 'react';
import {useFileDropGuard} from '../../components/useFileDrop';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {useGithubToken} from '../../github/useGithubToken';
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {PageLayout} from '../../shell/PageLayout';
import {StudioWorkspace} from './StudioWorkspace';
import {STUDIO_SUBTITLE, STUDIO_TITLE} from './studioCopy';
import {useStudioHandoff} from './useStudioHandoff';

interface StudioGateProps {
  onSave: (token: string) => void;
  handoff: FocusHandoff;
}

/**
 * No token: the gate, under the studio's own title and branch notice (R1-7,
 * R-4). Its field takes a pending handoff: after the in-page Forget token
 * (R-84), the button pressed is gone with the workspace.
 */
function StudioGate({onSave, handoff}: StudioGateProps) {
  const gateRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, gateRef, 'input');
  return (
    <PageLayout title={STUDIO_TITLE} subtitle={STUDIO_SUBTITLE} writes>
      <div ref={gateRef}>
        <GithubTokenGate onSave={onSave} />
      </div>
    </PageLayout>
  );
}

/**
 * Card studio (/studio): New reveal and Edit card on one page (R-2, R-57),
 * replacing the reveal publisher and Card images. Everything in it commits,
 * so all of it sits behind the token gate. The page holds the focus handoff
 * (R-59), since Save token swaps the gate for the workspace and takes its own
 * button with it: the workspace's next view takes focus. The handoff also
 * asks when the URL's card changes, and when the card list's Retry lands
 * (useStudioHandoff). While the page is open, a file dropped beside the card
 * panel's two file controls doesn't open in the tab, which would leave the
 * studio and its drafts (useFileDropGuard, Doberjohn/inkweave-admin#54).
 */
export function StudioPage() {
  const {token, setToken} = useGithubToken();
  const handoff = useStudioHandoff();
  useFileDropGuard();
  if (!token) {
    const onSave = (next: string) => {
      setToken(next);
      handoff.request();
    };
    return <StudioGate onSave={onSave} handoff={handoff} />;
  }
  // Keyed by the token (R-84): a new token is a new workspace, with empty drafts, as /calibration's tray is.
  return <StudioWorkspace key={token} token={token} handoff={handoff} />;
}

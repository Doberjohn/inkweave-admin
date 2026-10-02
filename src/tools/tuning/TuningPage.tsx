import {COLORS, FONT_SIZES} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {useGithubToken} from '../../github/useGithubToken';
import {PageLayout} from '../../shell/PageLayout';
import {TuningEditor} from './index';
import {useLiveTuning} from './useLiveTuning';

/** Loads the live tuning.json, then hands it to the editor. */
function LiveTuningEditor({token}: {token: string}) {
  const tuning = useLiveTuning(token);
  if (tuning.status === 'loading') {
    return <p style={{color: COLORS.textMuted}}>Reading tuning.json from {targetBranch()}…</p>;
  }
  if (tuning.status === 'error') {
    return (
      <div role="alert" style={{color: COLORS.error, fontSize: FONT_SIZES.sm}}>
        Could not read tuning.json: {tuning.error}
      </div>
    );
  }
  return <TuningEditor token={token} config={tuning.config} onPublished={tuning.reload} />;
}

/**
 * Engine tuning, inside the page layout that names the branch it writes to. The
 * sidebar's token box forgets the token; the gate then takes the editor's place
 * under the same header.
 */
export function TuningPage() {
  const {token, setToken} = useGithubToken();
  return (
    <PageLayout title="Engine tuning" subtitle="Edit playstyle copy and the Shift and Ramp scores." writes>
      {token ? <LiveTuningEditor token={token} /> : <GithubTokenGate onSave={setToken} />}
    </PageLayout>
  );
}

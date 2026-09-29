import {COLORS, SPACING, FONT_SIZES, CtaButton} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {useGithubToken} from '../../github/useGithubToken';
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
  return <TuningEditor token={token} config={tuning.config} />;
}

export function TuningPage() {
  const {token, setToken, clearToken} = useGithubToken();

  if (!token) {
    return <GithubTokenGate title="Tuning admin" onSave={setToken} />;
  }

  return (
    <main style={{maxWidth: 1000, margin: '0 auto', padding: SPACING.lg, color: COLORS.text}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: FONT_SIZES.xxl}}>Tuning editor</h1>
        <CtaButton
          variant="neutral"
          onClick={clearToken}
          style={{minHeight: 0, padding: '6px 10px', fontSize: FONT_SIZES.sm}}>
          Forget token
        </CtaButton>
      </div>

      <LiveTuningEditor token={token} />
    </main>
  );
}

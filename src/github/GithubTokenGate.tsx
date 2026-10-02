import {useState} from 'react';
import {validateToken} from './githubCommit';
import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../app-bridge';

interface GithubTokenGateProps {
  onSave: (token: string) => void;
}

/**
 * Asks for a token before a write tool opens. It renders in the page body, under
 * the page's own title and branch notice, so its heading is an h2.
 */
export function GithubTokenGate({onSave}: GithubTokenGateProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setError(null);
    const info = await validateToken(value.trim());
    setBusy(false);
    if (info.ok && info.canPush) onSave(value.trim());
    else setError(info.error ?? 'Token validation failed');
  }

  return (
    <div style={{maxWidth: 460}}>
      <h2 style={{fontSize: FONT_SIZES.xl, margin: 0}}>GitHub token</h2>
      <p style={{color: COLORS.gray600, fontSize: FONT_SIZES.sm}}>
        Paste a GitHub fine-grained token scoped to <code>Doberjohn/inkweave</code> with Contents:
        read and write.
      </p>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="github_pat_..."
        aria-label="GitHub token"
        style={{
          width: '100%',
          padding: '10px',
          background: COLORS.surfaceAlt,
          color: COLORS.text,
          border: `1px solid ${COLORS.surfaceHover}`,
          borderRadius: RADIUS.sm,
        }}
      />
      {error && (
        <div role="alert" style={{color: COLORS.error, fontSize: FONT_SIZES.sm, marginTop: SPACING.xs}}>
          {error}
        </div>
      )}
      <CtaButton onClick={check} disabled={busy || !value.trim()} style={{marginTop: SPACING.sm}}>
        {busy ? 'Checking…' : 'Save token'}
      </CtaButton>
    </div>
  );
}

import {SPACING} from '../app-bridge';
import {targetBranch} from '../github/githubCommit';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

const PILL: React.CSSProperties = {
  margin: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: SPACING.sm,
  minHeight: 32,
  padding: `0 ${SPACING.md}px`,
  borderRadius: ADMIN_RADIUS.pill,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.accentTintSoft,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.accentBorder}`,
  color: ADMIN_COLORS.text,
  fontSize: ADMIN_TYPE.small,
  whiteSpace: 'nowrap',
};

const DOT: React.CSSProperties = {
  width: 6,
  height: 6,
  flex: 'none',
  borderRadius: ADMIN_RADIUS.pill,
  background: ADMIN_COLORS.accent,
};

/**
 * The pill that names the app branch a page commits to. Only pages that write
 * show it (decision R-4). The branch comes from targetBranch(), so a rehearsal
 * (VITE_ADMIN_TARGET_BRANCH) shows its own branch here, not master.
 */
export function BranchNotice({label = 'Writes to Doberjohn/inkweave'}: {label?: string}) {
  return (
    <p style={PILL}>
      <span aria-hidden="true" style={DOT} />
      {/* <code> gives the branch the UA monospace with no font declaration (R-7). */}
      <span>
        {label} <code style={{color: ADMIN_COLORS.accent}}>{targetBranch()}</code>
      </span>
    </p>
  );
}

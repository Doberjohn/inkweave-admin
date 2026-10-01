import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT} from '../theme/adminTheme';
import {BranchNotice} from './BranchNotice';

/**
 * Frames a write tool that still renders its own page (RevealPage, ImagePage,
 * TuningPage: each renders its own h1, and its own <main> once a token is
 * saved; the token gate has none): a header strip with the branch notice, and
 * the page scrolling under it. Interim: R1-7 moves all three pages into
 * PageLayout and deletes this file.
 */
export function WriteToolFrame({children}: {children: React.ReactNode}) {
  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          minHeight: ADMIN_LAYOUT.headerMinHeight,
          // PageLayout's header padding, so the notice sits where it will on the rebuilt pages.
          padding: `${SPACING.md}px clamp(${SPACING.lg}px, 4vw, ${SPACING.xxxl}px)`,
          borderBottom: `1px solid ${ADMIN_COLORS.border}`,
        }}>
        <BranchNotice />
      </div>
      <div style={{flex: 1, minHeight: 0, overflowY: 'auto'}}>{children}</div>
    </div>
  );
}

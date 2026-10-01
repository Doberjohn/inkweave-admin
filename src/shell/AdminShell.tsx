import {Outlet} from 'react-router-dom';
import {SkeletonTheme} from 'react-loading-skeleton';
import {CardDataProvider, COLORS, FONTS} from '../app-bridge';
import {useGithubToken} from '../github/useGithubToken';
import {AdminStyles} from '../theme/AdminStyles';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {Sidebar} from './Sidebar';

/**
 * The layout every admin route renders in: the sidebar beside the page, the
 * app's card data and admin's scoped styles. Unlike the public app's layout it
 * has no public nav, Vercel Analytics or Speed Insights (docs/PLAN.md, 4.1).
 */
export function AdminShell() {
  // The token store is shared, so Forget token in the sidebar also sends the
  // page beside it back to its token gate.
  const {token, clearToken} = useGithubToken();
  return (
    // The app mounts one SkeletonTheme for all of its skeletons (AppLayout.tsx); admin does the same here.
    <SkeletonTheme baseColor={COLORS.surfaceAlt} highlightColor={COLORS.surfaceHover}>
      <CardDataProvider>
        <AdminStyles />
        <div
          style={{
            display: 'flex',
            height: '100dvh',
            overflow: 'hidden',
            background: ADMIN_COLORS.page,
            color: ADMIN_COLORS.text,
            fontFamily: FONTS.body,
          }}>
          <Sidebar tokenSaved={Boolean(token)} onForgetToken={clearToken} />
          {/* PageLayout fills this column and scrolls its own body. A page that
              isn't in PageLayout yet (AnalyticsPage) scrolls the column. */}
          <div style={{flex: 1, minWidth: 0, overflowY: 'auto'}}>
            <Outlet />
          </div>
        </div>
      </CardDataProvider>
    </SkeletonTheme>
  );
}

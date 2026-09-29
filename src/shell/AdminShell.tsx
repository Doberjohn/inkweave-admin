import {NavLink, Outlet} from 'react-router-dom';
import {SkeletonTheme} from 'react-loading-skeleton';
import {CardDataProvider, COLORS, FONTS, FONT_SIZES, SPACING} from '../app-bridge';
import {ADMIN_TOOLS} from './tools';

function navLinkStyle({isActive}: {isActive: boolean}) {
  return {
    color: isActive ? COLORS.primary : COLORS.textMuted,
    fontSize: FONT_SIZES.lg,
    fontWeight: isActive ? 700 : 500,
    textDecoration: 'none',
  };
}

/**
 * The layout every admin route renders in: tool navigation and the app's card
 * data. Unlike the public app's layout it has no public nav, Vercel Analytics or
 * Speed Insights (docs/PLAN.md, 4.1).
 */
export function AdminShell() {
  return (
    // The app mounts one SkeletonTheme for all of its skeletons (AppLayout.tsx); admin does the same here.
    <SkeletonTheme baseColor={COLORS.surfaceAlt} highlightColor={COLORS.surfaceHover}>
      <CardDataProvider>
        <div style={{fontFamily: FONTS.body, color: COLORS.text}}>
          <header
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACING.md,
              padding: `${SPACING.md}px ${SPACING.xxl}px`,
              borderBottom: `1px solid ${COLORS.surfaceBorder}`,
            }}>
            <nav aria-label="Admin tools" style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.lg}}>
              <NavLink to="/" end style={navLinkStyle}>
                Tools
              </NavLink>
              {ADMIN_TOOLS.map((tool) => (
                <NavLink key={tool.id} to={tool.path} style={navLinkStyle}>
                  {tool.name}
                </NavLink>
              ))}
            </nav>
          </header>
          <Outlet />
        </div>
      </CardDataProvider>
    </SkeletonTheme>
  );
}

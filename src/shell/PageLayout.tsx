import {useEffect} from 'react';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_TYPE} from '../theme/adminTheme';
import {BranchNotice} from './BranchNotice';

// Side padding: 32px on a desktop, easing to 16px on a phone.
const GUTTER = `clamp(${SPACING.lg}px, 4vw, ${SPACING.xxxl}px)`;

// The page fills the shell's main column, so only the body scrolls and the header stays put.
const MAIN: React.CSSProperties = {height: '100%', display: 'flex', flexDirection: 'column'};

const HEADER: React.CSSProperties = {
  flex: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: `${SPACING.md}px ${SPACING.lg}px`,
  minHeight: ADMIN_LAYOUT.headerMinHeight,
  padding: `${SPACING.md}px ${GUTTER}`,
  borderBottom: `1px solid ${ADMIN_COLORS.border}`,
};

const TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.pageTitle,
  fontWeight: 400,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
};

const SUBTITLE: React.CSSProperties = {
  margin: `${SPACING.xxs}px 0 0`,
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};

const SIDE: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.md};

const META: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

// A single-column grid, not a column flexbox: flex children with overflow:hidden
// collapse to nothing there (handoff README, section 1).
const BODY: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignContent: 'start',
  gap: SPACING.xxl,
  padding: `${SPACING.xxl}px ${GUTTER}`,
};

interface PageLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Right of the title, before any actions; phrasing content only (it renders in a <p>), e.g. "Data as of <code>2026-09-30</code>". */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** The page commits to the app repo: its header shows the BranchNotice. */
  writes?: boolean;
  /** BranchNotice's label when the default doesn't fit, e.g. "Tuning writes to". */
  branchLabel?: string;
  children: React.ReactNode;
}

/**
 * Every admin page's frame: a header with the page's h1, subtitle, meta,
 * actions and (on pages that write) the branch notice, over a scrolling body
 * that stacks the page's sections. It renders the page's only <main>, and
 * names the browser tab after the page ("Vote activity · Inkweave admin").
 * Nothing restores the old title on unmount: the next page sets its own.
 */
export function PageLayout({title, subtitle, meta, actions, writes = false, branchLabel, children}: PageLayoutProps) {
  useEffect(() => {
    document.title = `${title} · Inkweave admin`;
  }, [title]);
  const hasSide = meta != null || actions != null || writes;
  return (
    <main style={MAIN}>
      <header style={HEADER}>
        <div>
          <h1 style={TITLE}>{title}</h1>
          {subtitle != null && <p style={SUBTITLE}>{subtitle}</p>}
        </div>
        {hasSide && (
          <div style={SIDE}>
            {meta != null && <p style={META}>{meta}</p>}
            {actions}
            {writes && <BranchNotice label={branchLabel} />}
          </div>
        )}
      </header>
      <div style={BODY}>{children}</div>
    </main>
  );
}

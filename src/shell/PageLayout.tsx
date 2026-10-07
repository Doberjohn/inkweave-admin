import {useEffect, useLayoutEffect, useRef} from 'react';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_TYPE} from '../theme/adminTheme';
import {BranchNotice} from './BranchNotice';

// Side padding: 32px on a desktop, easing to 16px on a phone. Exported for a
// flush page, which pads its own columns (R2's calibration workspace).
export const PAGE_GUTTER = `clamp(${SPACING.lg}px, 4vw, ${SPACING.xxxl}px)`;

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
  padding: `${SPACING.md}px ${PAGE_GUTTER}`,
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
  padding: `${SPACING.xxl}px ${PAGE_GUTTER}`,
};

// `flush`: the same scroller with no padding and no grid, for a page that lays
// out its own columns edge to edge (R2's tuning aside, R4's studio).
const FLUSH_BODY: React.CSSProperties = {flex: 1, minHeight: 0, overflowY: 'auto'};

interface PageLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Right of the title, before any actions; phrasing content only (it renders in a <p>), e.g. "Data as of <code>2026-09-30</code>". */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** The page commits to the app repo: its header shows the BranchNotice. */
  writes?: boolean;
  /** BranchNotice's label when the default doesn't fit, e.g. "Tuning writes to Doberjohn/inkweave". */
  branchLabel?: string;
  /** Children go straight into the scrolling body, with no padding and no grid. */
  flush?: boolean;
  /**
   * The tab's name before " · Inkweave admin", when it should say more than the
   * title: a card page names its card ("Elsa - Snow Queen · Card analytics", R-51).
   */
  documentTitle?: string;
  /**
   * What the body is showing, for a page whose one route element serves many
   * things: when it changes, the body scrolls back to the top. The header stays
   * mounted, so focus stays where it was (a card page passes its card id: R-48).
   */
  scrollKey?: string;
  children: React.ReactNode;
}

/**
 * Names the browser tab "{name} · Inkweave admin": the page's documentTitle
 * when it gives one, else its title. Nothing restores the old name on
 * unmount: the next page sets its own.
 */
function useTabTitle({title, documentTitle}: Pick<PageLayoutProps, 'title' | 'documentTitle'>) {
  const name = documentTitle ?? title;
  useEffect(() => {
    document.title = `${name} · Inkweave admin`;
  }, [name]);
}

/**
 * The body's ref, scrolled back to the top when `scrollKey` changes after the
 * first render, before the next paint. A page that passes none never scrolls.
 */
function useScrollReset({scrollKey}: Pick<PageLayoutProps, 'scrollKey'>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(scrollKey);
  useLayoutEffect(() => {
    if (shownRef.current === scrollKey) return;
    shownRef.current = scrollKey;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [scrollKey]);
  return bodyRef;
}

/**
 * Every admin page's frame: a header with the page's h1, subtitle, meta,
 * actions and (on pages that write) the branch notice, over a scrolling body
 * that stacks the page's sections. It renders the page's only <main>, and
 * names the browser tab after the page ("Vote activity · Inkweave admin"), or
 * after `documentTitle` when that says more. The body scrolls back to the top
 * when `scrollKey` changes.
 */
export function PageLayout({
  title,
  subtitle,
  meta,
  actions,
  writes = false,
  branchLabel,
  flush = false,
  documentTitle,
  scrollKey,
  children,
}: PageLayoutProps) {
  useTabTitle({title, documentTitle});
  const bodyRef = useScrollReset({scrollKey});
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
      <div ref={bodyRef} style={flush ? FLUSH_BODY : BODY}>
        {children}
      </div>
    </main>
  );
}

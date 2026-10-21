import {useRef} from 'react';
import {Link} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {LETTER_SPACING, SPACING} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {cardsHref, studioHref} from '../../../shell/nav';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {isPrintingsOnly} from '../branchCards';
import type {CardTag} from '../editSearch';
import {CardTags} from './CardMarks';

// A strip across the page under its header, in the panels' fill (README §7),
// its text in line with the page title's. The fill is translucent, so it stops
// at the bottom border, or the line lands lighter than the ladder (adminTheme.ts).
const BANNER: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: `${SPACING.sm}px ${SPACING.xl}px`,
  padding: `${SPACING.md}px ${PAGE_GUTTER}`,
  backgroundColor: ADMIN_COLORS.panel,
  backgroundClip: 'padding-box',
  borderBottom: `1px solid ${ADMIN_COLORS.border}`,
};
const IDENTITY: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.md, minWidth: 0};
const TITLE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 600, color: ADMIN_COLORS.text};
const EYEBROW: React.CSSProperties = {
  marginRight: SPACING.sm,
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.eyebrow,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.accent,
};
const VERSION: React.CSSProperties = {fontWeight: 400, color: ADMIN_COLORS.muted};
const NUMBER: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const LINKS: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.lg, fontSize: ADMIN_TYPE.small};

interface EditingBannerProps {
  card: LorcanaCard;
  /** cardTag's: whose data the card shows. */
  tag: CardTag;
  /** False for a card only the branch file holds (R-66): it has no Card analytics page yet (R-33). */
  deployed: boolean;
  /** The page's (R-59): it asks when the URL names a new card, and this h2 takes it. */
  handoff?: FocusHandoff;
}

/**
 * The strip over an open card in Edit card (README §7): "Editing", the card's
 * name and version in the h2 the focus handoff lands on, its collector number
 * and tags, then the links out. "View card analytics" shows only for a card the
 * card list holds (R-33), which a card of Sets 1 to 8 isn't (#68), and "Load a
 * different card" goes back to the search. Both are router Links, so the page
 * moves focus from the URL, never on a click (R-59).
 */
export function EditingBanner({card, tag, deployed, handoff}: EditingBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'h2');
  const analytics = deployed && !isPrintingsOnly(card);
  return (
    <div ref={ref} style={BANNER}>
      <div style={IDENTITY}>
        <h2 tabIndex={-1} style={TITLE}>
          {/* Each space is a text node of its own, so the h2's name reads "Editing Mei Red Panda". */}
          <span style={EYEBROW}>Editing</span> {card.name}
          {card.version && (
            <>
              {' '}
              <span style={VERSION}>{card.version}</span>
            </>
          )}
        </h2>
        {card.setNumber != null && <code style={NUMBER}>#{card.setNumber}</code>}
        <CardTags tag={tag} deployed={deployed} />
      </div>
      <div style={LINKS}>
        {analytics && (
          <Link to={cardsHref(card.id)} className="adm-link">
            View card analytics
          </Link>
        )}
        <Link to={studioHref('edit')} className="adm-link">
          Load a different card
        </Link>
      </div>
    </div>
  );
}

import {useRef, useState} from 'react';
import type {Ink, LorcanaCard} from 'inkweave-synergy-engine';
import {DialogShell, FONTS, SPACING, TRUNCATE, smallImageUrl} from '../../app-bridge';
import {PICK_ROW_THUMB} from '../../theme/AdminStyles';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import {SEARCH_LIMIT, candidatesFor} from './featuredSlots';

/** A row's thumbnail: a card's own proportions, as Edit card's search draws it. */
const THUMB_HEIGHT = 48;
/** How wide the dialog grows: room for a long full name beside its thumbnail and id. */
const PANEL_WIDTH = 560;

// The guard's dialog panel (UnsavedChangesGuard): admin's card fill over the page, so it hides what is under it.
const PANEL: React.CSSProperties = {
  maxWidth: PANEL_WIDTH,
  padding: SPACING.xl,
  background: `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
  color: ADMIN_COLORS.text,
  fontFamily: FONTS.body,
};
const HEADING: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  lineHeight: 1.2,
};
const HINT: React.CSSProperties = {margin: `${SPACING.xs}px 0 ${SPACING.lg}px`, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const STATUS: React.CSSProperties = {margin: `${SPACING.sm}px 0`, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
// The rows scroll inside the dialog, which stays on screen at any height.
const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  maxHeight: '50vh',
  overflowY: 'auto',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
};
const RULED: React.CSSProperties = {borderTop: `1px solid ${ADMIN_COLORS.divider}`};
const THUMB: React.CSSProperties = {
  display: 'block',
  width: PICK_ROW_THUMB,
  height: THUMB_HEIGHT,
  overflow: 'hidden',
  borderRadius: ADMIN_RADIUS.tag,
  backgroundColor: ADMIN_COLORS.card,
};
const THUMB_IMAGE: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};
const NAME: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.body};
const SUB: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** "Set 12 · #45", or what of it the card has. */
function printedAt(card: LorcanaCard): string {
  const parts = [card.setCode === undefined ? null : `Set ${card.setCode}`, card.setNumber === undefined ? null : `#${card.setNumber}`];
  return parts.filter(Boolean).join(' · ');
}

/** One card the slot may take: its thumbnail, full name, set and number, and id. */
function CandidateRow({card, current, onPick}: {card: LorcanaCard; current: boolean; onPick: () => void}) {
  const src = smallImageUrl(card);
  return (
    <button type="button" className="adm-row-btn adm-pick-row" aria-pressed={current} onClick={onPick}>
      <span style={THUMB}>{src && <img src={src} alt="" loading="lazy" style={THUMB_IMAGE} />}</span>
      <span style={{display: 'grid', gap: SPACING.xxs, minWidth: 0}}>
        <span style={NAME}>{card.fullName}</span>
        <span style={SUB}>{printedAt(card)}</span>
      </span>
      <code style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{card.id}</code>
    </button>
  );
}

/** The status line over the rows: how many match, or that none do. */
function matchLine(shown: number, query: string): string {
  if (shown === 0) return query.trim() ? 'No card of this ink with art matches.' : 'No card of this ink has art.';
  return `${shown} card${shown === 1 ? '' : 's'}${shown === SEARCH_LIMIT ? ' shown: type to narrow them' : ''}.`;
}

interface FeaturedSearchProps {
  /** The slot being changed, or null while the dialog is closed. */
  ink: Ink | null;
  /** The card the slot holds now, marked in the list. */
  currentId: string | null;
  cards: readonly LorcanaCard[];
  onPick: (card: LorcanaCard) => void;
  onClose: () => void;
}

/**
 * A slot's search, in the app's DialogShell (the overlay contract: focus trap,
 * Escape, focus back to Change card, a scrim that closes): the cards that carry
 * the slot's ink and have art (candidatesFor), by name, version or id. Picking
 * one stages it and closes the dialog.
 */
export function FeaturedSearch({ink, currentId, cards, onPick, onClose}: FeaturedSearchProps) {
  const [query, setQuery] = useState('');
  const fieldRef = useRef<HTMLInputElement>(null);
  const rows = ink ? candidatesFor(ink, cards, query) : [];
  const close = () => {
    setQuery('');
    onClose();
  };
  const pick = (card: LorcanaCard) => {
    onPick(card);
    close();
  };
  const title = `Pick the ${ink ?? ''} card`;
  return (
    <DialogShell isOpen={ink !== null} onClose={close} ariaLabel={title} size="md" initialFocusRef={fieldRef} panelStyle={PANEL}>
      <h2 style={HEADING}>{title}</h2>
      <p style={HINT}>Cards that carry {ink} and have art, dual-ink cards included. Search by name, version or id.</p>
      <input
        ref={fieldRef}
        type="search"
        className="adm-input"
        aria-label={`Search ${ink ?? ''} cards`}
        placeholder="e.g. Elsa or 3328"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{width: '100%'}}
      />
      <p role="status" style={STATUS}>
        {matchLine(rows.length, query)}
      </p>
      {rows.length > 0 && (
        <ul style={LIST} aria-label={`${ink ?? ''} cards`}>
          {rows.map((card, i) => (
            <li key={card.id} style={i === 0 ? undefined : RULED}>
              <CandidateRow card={card} current={card.id === currentId} onPick={() => pick(card)} />
            </li>
          ))}
        </ul>
      )}
    </DialogShell>
  );
}

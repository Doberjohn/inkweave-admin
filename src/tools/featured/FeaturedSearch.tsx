import {useRef, useState} from 'react';
import type {Ink, LorcanaCard} from 'inkweave-synergy-engine';
import {DialogShell, SPACING, TRUNCATE} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import {CardThumb} from '../../ui/CardThumb';
import {DIALOG_HEADING, DIALOG_PANEL} from '../../ui/dialogFrame';
import {candidatesFor} from './featuredSlots';

/** How wide the dialog grows: room for a long full name beside its thumbnail and id. */
const PANEL: React.CSSProperties = {...DIALOG_PANEL, maxWidth: 560};
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
const NAME: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.body};
const SUB: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** "Set 12 · #45", or what of it the card has. */
function printedAt(card: LorcanaCard): string {
  const parts = [card.setCode === undefined ? null : `Set ${card.setCode}`, card.setNumber === undefined ? null : `#${card.setNumber}`];
  return parts.filter(Boolean).join(' · ');
}

/** One card the slot may take: its thumbnail, full name, set and number, and id. */
function CandidateRow({card, current, onPick}: {card: LorcanaCard; current: boolean; onPick: () => void}) {
  return (
    <button type="button" className="adm-row-btn adm-pick-row" aria-pressed={current} onClick={onPick}>
      <CardThumb card={card} />
      <span style={{display: 'grid', gap: SPACING.xxs, minWidth: 0}}>
        <span style={NAME}>{card.fullName}</span>
        <span style={SUB}>{printedAt(card)}</span>
      </span>
      <code style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{card.id}</code>
    </button>
  );
}

/** The status line over the rows: how many match, or that none do, and whether more match than show. */
function matchLine({shown, more, query}: {shown: number; more: boolean; query: string}): string {
  if (shown === 0) return query.trim() ? 'No card of this ink with art matches.' : 'No card of this ink has art.';
  return `${shown} card${shown === 1 ? '' : 's'}${more ? ' shown: type to narrow them' : ''}.`;
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
  const {rows, more} = ink ? candidatesFor(ink, cards, query) : {rows: [], more: false};
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
      <h2 style={DIALOG_HEADING}>{title}</h2>
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
        {matchLine({shown: rows.length, more, query})}
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

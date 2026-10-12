import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {InkIcon, SPACING, TRUNCATE, Z_INDEX, useAutocomplete, type UseAutocompleteReturn} from '../../../app-bridge';
import {cardsHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SR_ONLY} from '../../../ui/layout';
import {MIN_QUERY, cardLabel, openedStatus, switcherStatus} from './cardSearch';
import {OPAQUE_CARD} from './cardStyles';

/** The handoff's "up to 6 results" (the hook's default is 10). */
const MAX_RESULTS = 6;
/** The handoff's ink icon size, in px. */
const INK_SIZE = 18;

// The handoff's 320px field, narrower when the header is. The list and the
// status float under it, over the page body.
const WRAP: React.CSSProperties = {position: 'relative', width: 320, maxWidth: '100%'};
const INPUT: React.CSSProperties = {width: '100%'};

// Under the field. Z_INDEX.autocomplete puts it over the page body and under the
// app's modal layers (the unsaved-changes dialog).
const FLOAT: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  margin: `${SPACING.xs}px 0 0`,
  zIndex: Z_INDEX.autocomplete,
};

// Opaque, as anything that hides what is under it (UnsavedChangesGuard's panel is too).
const SURFACE: React.CSSProperties = {
  background: OPAQUE_CARD,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.box,
};

const LIST: React.CSSProperties = {...FLOAT, ...SURFACE, padding: 0, listStyle: 'none', overflow: 'hidden'};
const NOTE: React.CSSProperties = {
  ...SURFACE,
  margin: 0,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.muted,
};
const INKS: React.CSSProperties = {display: 'flex', flex: 'none', gap: SPACING.xxs};
const LABEL: React.CSSProperties = {flex: 1, minWidth: 0, ...TRUNCATE};
// Muted, never dim: the number tells two printings apart (R-6).
const NUMBER: React.CSSProperties = {flex: 'none', fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

type OptionProps = ReturnType<UseAutocompleteReturn['getOptionProps']>;

/**
 * One result: the card's ink (both, for a dual-ink card), "name · version" and
 * its collector number. The highlight comes from aria-selected (adm-option).
 */
function CardOption({card, optionProps}: {card: LorcanaCard; optionProps: OptionProps}) {
  return (
    <li {...optionProps} className="adm-option">
      <span style={INKS}>
        <InkIcon ink={card.ink} size={INK_SIZE} />
        {card.ink2 && <InkIcon ink={card.ink2} size={INK_SIZE} />}
      </span>
      <span style={LABEL}>{cardLabel(card)}</span>
      {/* The space parts the number from the name in the option's accessible name; a flex row doesn't draw it. */}
      {card.setNumber != null && (
        <>
          {' '}
          <code style={NUMBER}>#{card.setNumber}</code>
        </>
      )}
    </li>
  );
}

/**
 * The switcher's polite status, always mounted so a screen reader hears the
 * text when it appears. "No cards match." shows under the field; the card a
 * pick opened is for screen readers alone, since the page already shows it.
 */
function SwitcherStatus({note, opened}: {note: string; opened: LorcanaCard | null}) {
  return (
    <div role="status" style={FLOAT}>
      {note && <p style={NOTE}>{note}</p>}
      {opened && <span style={SR_ONLY}>{openedStatus(opened)}</span>}
    </div>
  );
}

interface CardSwitcherProps {
  /**
   * Every card the switcher can open: the card list's Core cards, preview
   * cards included (useCardDataContext().cards). Empty while it loads.
   */
  cards: LorcanaCard[];
}

/**
 * The Card analytics header's "Switch card" field (R-30): the app's
 * useAutocomplete as it is, so it searches names, from two letters, newest set
 * first, 150 ms after the last key, and handles the arrow keys, Enter, Escape
 * and the mouse. Picking a card opens its page and empties the field, which
 * keeps focus (R-48). A polite status says which card a pick opened, until the
 * user types again or leaves the field (#34), and when a query finds no card.
 */
export function CardSwitcher({cards}: CardSwitcherProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState<LorcanaCard | null>(null);
  const {inputProps, listboxProps, getOptionProps, suggestions, isOpen, isFocused} = useAutocomplete({
    cards,
    query,
    onQueryChange: setQuery,
    onSelect: (card) => {
      setOpened(card);
      navigate(cardsHref(card.id));
    },
    minChars: MIN_QUERY,
    maxResults: MAX_RESULTS,
  });
  // Old news once the user types again or leaves the field: back in it, nothing repeats.
  if (opened && (query !== '' || !isFocused)) setOpened(null);
  const note = switcherStatus({cards, query, listOpen: isOpen, focused: isFocused});
  return (
    <div style={WRAP}>
      {/* type="text", not search: a search field's own Escape would empty it as the hook closes the list. */}
      <input
        {...inputProps}
        type="text"
        className="adm-input"
        aria-label="Switch card"
        placeholder="Switch card…"
        autoComplete="off"
        spellCheck={false}
        style={INPUT}
      />
      {isOpen && (
        <ul {...listboxProps} aria-label="Cards" style={LIST}>
          {suggestions.map((card, index) => (
            <CardOption key={card.id} card={card} optionProps={getOptionProps(index)} />
          ))}
        </ul>
      )}
      <SwitcherStatus note={note} opened={opened} />
    </div>
  );
}

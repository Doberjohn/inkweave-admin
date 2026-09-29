import {useState} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {smallImageUrl, COLORS, CtaButton, SPACING, FONT_SIZES, RADIUS} from '../../../app-bridge';
import {filterCards} from '../filterCards';

interface CardImagePickerProps {
  cards: LorcanaCard[];
  selectedId: string | null;
  onSelect: (card: LorcanaCard) => void;
}

const searchStyle = {
  width: '100%',
  padding: '8px 10px',
  background: COLORS.surfaceAlt,
  color: COLORS.text,
  border: `1px solid ${COLORS.surfaceHover}`,
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.md,
};

// Kit button (#509) laid out as a list row: ghost marks the selection, neutral the rest.
const rowStyle = {
  justifyContent: 'flex-start',
  gap: SPACING.sm,
  width: '100%',
  minHeight: 0,
  padding: SPACING.xs,
  borderRadius: RADIUS.sm,
  textAlign: 'left' as const,
};

function CardPickerRow({card, selected, onSelect}: {card: LorcanaCard; selected: boolean; onSelect: (card: LorcanaCard) => void}) {
  return (
    <CtaButton
      type="button"
      variant={selected ? 'ghost' : 'neutral'}
      aria-pressed={selected}
      onClick={() => onSelect(card)}
      style={rowStyle}>
      <img
        src={smallImageUrl(card)}
        alt=""
        width={32}
        height={45}
        style={{borderRadius: RADIUS.sm, flexShrink: 0, objectFit: 'cover'}}
      />
      <span style={{fontSize: FONT_SIZES.sm, color: COLORS.text}}>{card.fullName}</span>
    </CtaButton>
  );
}

export function CardImagePicker({cards, selectedId, onSelect}: CardImagePickerProps) {
  const [query, setQuery] = useState('');
  const results = filterCards(cards, query);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cards..."
        aria-label="Search cards"
        style={searchStyle}
      />
      <ul
        style={{
          listStyle: 'none',
          margin: `${SPACING.sm}px 0 0`,
          padding: 0,
          maxHeight: 340,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.xs,
        }}>
        {results.map((card) => (
          <li key={card.id}>
            <CardPickerRow card={card} selected={card.id === selectedId} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}

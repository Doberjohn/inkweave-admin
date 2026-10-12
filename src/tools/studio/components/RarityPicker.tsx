import {RaritySymbol} from '../../../app-bridge';
import type {SectionProps} from '../formSections';
import {rarityChoices} from '../inkPicks';
import {PickerGroup} from './PickerGroup';

/** The handoff's 18px glyph in a 34px button. */
const SYMBOL_SIZE = 18;

/**
 * The rarity: None first, which clears it (rarity stays optional), then the
 * studio's rarities (R-74), each with its glyph through RaritySymbol (R-83).
 * RaritySymbol is aria-hidden, so a button's name is its text. The validator
 * checks no rarity, so errors never holds one.
 */
export function RarityPicker({form, errors, onChange}: Pick<SectionProps, 'form' | 'errors' | 'onChange'>) {
  return (
    <PickerGroup name="rarity" label="Rarity" layout="grid" errors={errors}>
      <button type="button" className="adm-pick-btn" aria-pressed={form.rarity === ''} onClick={() => onChange({rarity: ''})}>
        None
      </button>
      {rarityChoices(form).map((rarity) => (
        <button
          key={rarity}
          type="button"
          className="adm-pick-btn"
          aria-pressed={form.rarity === rarity}
          onClick={() => onChange({rarity})}>
          <RaritySymbol rarity={rarity.toLowerCase()} size={SYMBOL_SIZE} />
          {rarity}
        </button>
      ))}
    </PickerGroup>
  );
}

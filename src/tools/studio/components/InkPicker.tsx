import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS, InkIcon} from '../../../app-bridge';
import type {SectionProps} from '../formSections';
import {inkName, primaryInkPatch, secondInks} from '../inkPicks';
import {PickerGroup} from './PickerGroup';

/**
 * The handoff's icon sizes: 28px in an ink tile (48px, or less in a narrow
 * section), 22px in a 40px second-ink tile (data-size="sm").
 */
const ICON_SIZE = {full: 28, small: 22} as const;

type InkPickerProps = Pick<SectionProps, 'form' | 'errors' | 'onChange'>;

interface InkTilesProps {
  inks: readonly Ink[];
  /** The picked ink: '' (no second ink yet) presses no tile. */
  value: Ink | '';
  size: keyof typeof ICON_SIZE;
  onPick: (ink: Ink) => void;
}

/**
 * One aria-pressed tile per ink (R-75). The InkIcon names the ink (decorative
 * false), so the tile's name is the ink's. adm-ink-tile sizes an adm-pick-btn,
 * whose pressed look is admin's one gold (adm-card-btn's), never the ink's
 * colour.
 */
function InkTiles({inks, value, size, onPick}: InkTilesProps) {
  return inks.map((ink) => (
    <button
      key={ink}
      type="button"
      className="adm-pick-btn adm-ink-tile"
      data-size={size === 'small' ? 'sm' : undefined}
      aria-pressed={ink === value}
      onClick={() => onPick(ink)}>
      <InkIcon ink={ink} size={ICON_SIZE[size]} decorative={false} />
    </button>
  ));
}

/**
 * The card's ink (R-75): six tiles on one line under "Ink · {name}", which
 * shrink rather than wrap in a narrow section (PickerGroup's `inks` layout).
 * The group's name is "Ink" alone; the name after the dot follows the picks. A
 * primary equal to the second ink clears the second. The ink error (an
 * ink-block clash) describes the group.
 */
export function InkPicker({form, errors, onChange}: InkPickerProps) {
  return (
    <PickerGroup name="ink" label="Ink" detail={inkName(form)} layout="inks" errors={errors}>
      <InkTiles inks={ALL_INKS} value={form.ink} size="full" onPick={(ink) => onChange(primaryInkPatch({form, ink}))} />
    </PickerGroup>
  );
}

/** The second ink, while the Dual-ink switch is on: smaller tiles, every ink but the primary (R-75). */
export function SecondInkPicker({form, errors, onChange}: InkPickerProps) {
  return (
    <PickerGroup name="ink2" label="Second ink" layout="tiles" errors={errors}>
      <InkTiles inks={secondInks(form)} value={form.ink2} size="small" onPick={(ink2) => onChange({ink2})} />
    </PickerGroup>
  );
}

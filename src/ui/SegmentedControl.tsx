interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<{value: T; label: string}>;
  value: T;
  onChange: (v: T) => void;
  /** Names the group for assistive tech: "Sort rules", "Score band". */
  ariaLabel: string;
}

/**
 * A row of mutually exclusive options: sort keys, score bands, the studio
 * mode. Native buttons in a named group, so each is a Tab stop that fires on
 * Enter or Space; aria-pressed carries the selection, and AdminStyles draws it
 * (`.adm-seg-btn[aria-pressed="true"]`). Pressing the selected option again
 * does nothing, so a parent that resets state on change (Card studio's mode)
 * can't lose work to a stray click.
 */
export function SegmentedControl<T extends string>({options, value, onChange, ariaLabel}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="adm-seg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="adm-seg-btn"
          aria-pressed={option.value === value}
          onClick={() => {
            if (option.value !== value) onChange(option.value);
          }}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<{value: T; label: string}>;
  value: T;
  onChange: (v: T) => void;
  /** Names the group for assistive tech: "Sort rules", "Score band". */
  ariaLabel: string;
  /**
   * Stretch the options across the width the control is given, as the
   * handoff's Type tabs do, padded 4px at the least. They sit two by two
   * (inPairs), so where one line can't hold them all a whole pair moves to
   * the next (`.adm-seg[data-fill="true"]`, `.adm-seg-pair`). On a line they
   * share, every button takes the same width, an odd count's lone last one
   * too; a lone button alone on the last line fills that line. Card studio's
   * Type sets it: its column can be narrower than the four labels.
   * Default false: the control is as wide as its options.
   */
  fill?: boolean;
}

/**
 * Fill's buttons, two to a pair: a row that wraps them goes two and two, never
 * three and one. A pair of one, an odd count's last, says so (data-lone): on
 * a line it shares, AdminStyles gives it one button's width, and alone on the
 * last line it fills that line.
 */
function inPairs(buttons: React.ReactElement[]) {
  const pairs: React.ReactElement[] = [];
  for (let start = 0; start < buttons.length; start += 2) {
    const pair = buttons.slice(start, start + 2);
    pairs.push(
      <span key={start} className="adm-seg-pair" data-lone={pair.length === 1 || undefined}>
        {pair}
      </span>,
    );
  }
  return pairs;
}

/**
 * A row of mutually exclusive options: sort keys, score bands, the studio
 * mode. Native buttons in a named group, so each is a Tab stop that fires on
 * Enter or Space; aria-pressed carries the selection, and AdminStyles draws it
 * (`.adm-seg-btn[aria-pressed="true"]`). Pressing the selected option again
 * does nothing, so onChange fires only for a real change: Card studio's mode
 * switch keeps both drafts and pushes a URL (R-57), and a stray click on the
 * current mode adds no history entry.
 */
export function SegmentedControl<T extends string>({options, value, onChange, ariaLabel, fill}: SegmentedControlProps<T>) {
  const buttons = options.map((option) => (
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
  ));
  return (
    <div role="group" aria-label={ariaLabel} className="adm-seg" data-fill={fill || undefined}>
      {fill ? inPairs(buttons) : buttons}
    </div>
  );
}

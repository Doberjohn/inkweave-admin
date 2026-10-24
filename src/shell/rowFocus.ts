interface NearRow {
  /** The rows the list has left once the row goes, in order. */
  rows: readonly Element[];
  /** The place the gone row had: `rows[index]` is the row that follows it, `rows[index - 1]` the one before. */
  index: number;
  /** Takes the focus when no row left has a button: the list's heading (tabIndex -1), or null for none. */
  fallback: HTMLElement | null;
}

/** The first button in a row, if there is a row and it has one. */
const buttonIn = (row: Element | undefined) => row?.querySelector<HTMLElement>('button');

/**
 * Where focus goes once a row of a list goes, or loses the button that was pressed, since the press
 * would drop it to <body> (R-48): the first button of the row that takes its place, else of the row
 * before it, else `fallback`. It runs before the change renders: the caller says which rows are left.
 * A row with no button is passed over, so the focus only ever lands on one that is there to take it.
 * Used by every list whose rows go: PendingTray, the Version changes tray and Edit card's ChangeList.
 */
export function focusNearRow({rows, index, fallback}: NearRow): void {
  (buttonIn(rows[index]) ?? buttonIn(rows[index - 1]) ?? fallback)?.focus();
}

/**
 * The rows `list` has left once its row at `index` goes, in order, as focusNearRow takes them: every
 * child of the list but that one. None where there is no list.
 */
export function rowsWithout(list: Element | null | undefined, index: number): Element[] {
  return Array.from(list?.children ?? []).filter((_row, at) => at !== index);
}

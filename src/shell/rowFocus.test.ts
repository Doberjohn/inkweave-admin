import {afterEach, describe, expect, it} from 'vitest';
import {within} from '@testing-library/react';
import {focusNearRow, rowsWithout} from './rowFocus';

afterEach(() => document.body.replaceChildren());

/** A list in the document, so its buttons can take focus: one row for each list of button names given. */
function rowsOf(...rows: string[][]): HTMLElement[] {
  const list = document.body.appendChild(document.createElement('ul'));
  return rows.map((names) => {
    const item = list.appendChild(document.createElement('li'));
    for (const name of names) item.appendChild(document.createElement('button')).textContent = name;
    return item;
  });
}

/** A heading in the document that takes focus, as a list's does (tabIndex -1). */
function heading(): HTMLElement {
  const h2 = document.body.appendChild(document.createElement('h2'));
  h2.tabIndex = -1;
  return h2;
}

const buttonOf = (row: HTMLElement, name: string) => within(row).getByRole('button', {name});

/*
 * `rows` are the rows a list has left once one goes, and `index` is the place the gone row had: so
 * `rows[index]` is the row that follows it, and `rows[index - 1]` the one before.
 */
describe('focusNearRow', () => {
  it('focuses the first button of the next row: the row at the gone row’s place', () => {
    const rows = rowsOf(['Revert A'], ['Keep B', 'Drop B'], ['Revert C']);
    focusNearRow({rows, index: 1, fallback: heading()});
    // The first of that row's buttons, not its others, and nothing of the row before or after it.
    expect(buttonOf(rows[1], 'Keep B')).toHaveFocus();
  });

  it('focuses the next row when the first row went, as there is no row before it', () => {
    const rows = rowsOf(['Revert A'], ['Revert B']);
    focusNearRow({rows, index: 0, fallback: heading()});
    expect(buttonOf(rows[0], 'Revert A')).toHaveFocus();
  });

  it('focuses the first button of the previous row when the last row went, as there is no row after it', () => {
    const rows = rowsOf(['Revert A'], ['Keep B', 'Drop B']);
    focusNearRow({rows, index: 2, fallback: heading()});
    expect(buttonOf(rows[1], 'Keep B')).toHaveFocus();
  });

  it('focuses the fallback when no row is left', () => {
    const fallback = heading();
    focusNearRow({rows: [], index: 0, fallback});
    expect(fallback).toHaveFocus();
  });

  it('passes a row without a button over: the previous row’s takes the focus, else the fallback', () => {
    const [before, plain] = rowsOf(['Revert A'], []);
    focusNearRow({rows: [before, plain], index: 1, fallback: heading()});
    expect(buttonOf(before, 'Revert A')).toHaveFocus();

    const fallback = heading();
    focusNearRow({rows: [plain], index: 0, fallback});
    expect(fallback).toHaveFocus();
  });

  it('moves focus nowhere when no row is left and there is no fallback', () => {
    const [row] = rowsOf(['Revert A']);
    buttonOf(row, 'Revert A').focus();
    focusNearRow({rows: [], index: 0, fallback: null});
    expect(buttonOf(row, 'Revert A')).toHaveFocus();
  });
});

describe('rowsWithout', () => {
  it('leaves out the row at the place given, and keeps the others in order', () => {
    const [a, b, c] = rowsOf(['Revert A'], ['Revert B'], ['Revert C']);
    const list = a.parentElement;
    expect(rowsWithout(list, 1)).toEqual([a, c]);
    expect(rowsWithout(list, 0)).toEqual([b, c]);
    // A place past the rows leaves them all.
    expect(rowsWithout(list, 3)).toEqual([a, b, c]);
  });

  it('gives no rows where there is no list', () => {
    expect(rowsWithout(null, 0)).toEqual([]);
    expect(rowsWithout(undefined, 0)).toEqual([]);
  });

  it('hands focusNearRow the rows a list has left, so the next row takes the focus', () => {
    const [a, , c] = rowsOf(['Revert A'], ['Revert B'], ['Revert C']);
    focusNearRow({rows: rowsWithout(a.parentElement, 1), index: 1, fallback: heading()});
    expect(buttonOf(c, 'Revert C')).toHaveFocus();
  });
});

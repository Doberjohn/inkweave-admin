import {describe, expect, it} from 'vitest';
import type {RevealCardForm} from '../buildPreviewCard';
import {EMPTY_FORM, sameForm} from '../emptyForm';

describe('sameForm', () => {
  it('reads a form patched back to its start as unchanged, whatever order its keys were set in', () => {
    const {collectorNumber, ...rest} = EMPTY_FORM;
    const reordered: RevealCardForm = {...rest, collectorNumber};
    // A JSON comparison would call it changed.
    expect({json: JSON.stringify(reordered) === JSON.stringify(EMPTY_FORM), same: sameForm(reordered, EMPTY_FORM)}).toEqual({
      json: false,
      same: true,
    });
  });

  it.each<[string, Partial<RevealCardForm>]>([
    ['a text field', {name: 'Mei'}],
    ['the ink', {ink: 'Ruby'}],
    ['the second ink', {ink2: 'Steel'}],
    ['inkable', {inkwell: false}],
    ['the type', {type: 'Item'}],
    ['the scan language', {scanLanguage: 'ja'}],
  ])('tells a change to %s', (_, patch) => {
    expect(sameForm({...EMPTY_FORM, ...patch}, EMPTY_FORM)).toBe(false);
  });
});

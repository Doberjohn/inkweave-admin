import {describe, expect, it} from 'vitest';
import {controlProps, fieldIds, type ControlProps, type FieldSpec} from '../fieldWiring';

const NAME_ERROR = {name: 'Name is required'};

describe('fieldIds', () => {
  it("keeps the old reveal form's ids, and adds the label's and the hint's", () => {
    expect(fieldIds({name: 'ink'})).toEqual({
      control: 'field-ink',
      label: 'field-ink-label',
      hint: 'field-ink-hint',
      error: 'field-ink-error',
    });
  });
});

describe('controlProps', () => {
  it.each<{title: string; spec: FieldSpec; wired: ControlProps}>([
    {
      title: 'leaves a valid field with no hint undescribed',
      spec: {name: 'name', errors: {}},
      wired: {id: 'field-name', 'aria-invalid': undefined, 'aria-describedby': undefined},
    },
    {
      title: 'marks a field with an error and points at the message',
      spec: {name: 'name', errors: NAME_ERROR},
      wired: {id: 'field-name', 'aria-invalid': true, 'aria-describedby': 'field-name-error'},
    },
    {
      title: 'points a valid field at its hint',
      spec: {name: 'franchise', errors: NAME_ERROR, hint: true},
      wired: {id: 'field-franchise', 'aria-invalid': undefined, 'aria-describedby': 'field-franchise-hint'},
    },
    {
      title: 'reads the hint before the error',
      spec: {name: 'name', errors: NAME_ERROR, hint: true},
      wired: {id: 'field-name', 'aria-invalid': true, 'aria-describedby': 'field-name-hint field-name-error'},
    },
  ])('$title', ({spec, wired}) => {
    expect(controlProps(spec)).toEqual(wired);
  });
});

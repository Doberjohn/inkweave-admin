import {describe, it, expect, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {RevealAdminForm} from '../components/RevealAdminForm';
import type {RevealCardForm} from '../buildPreviewCard';

const FORM: RevealCardForm = {
  collectorNumber: '',
  name: '',
  version: '',
  rarity: '',
  franchise: '',
  cost: '',
  ink: 'Amber',
  ink2: '',
  inkwell: true,
  type: 'Character',
  strength: '',
  willpower: '',
  lore: '',
  moveCost: '',
  subtypes: '',
  keywords: '',
  fullText: '',
  scanLanguage: 'en',
};

describe('RevealAdminForm', () => {
  it('ties each error to its control', () => {
    render(<RevealAdminForm form={FORM} errors={{name: 'Name is required'}} onChange={vi.fn()} />);

    const name = screen.getByLabelText('Name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Name is required');
    expect(screen.getByLabelText('Version (subtitle)')).not.toHaveAttribute('aria-invalid');
  });

  it("shows the stats the card's type prints", () => {
    const {rerender} = render(<RevealAdminForm form={FORM} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Strength')).toBeInTheDocument();
    expect(screen.queryByLabelText('Move cost')).toBeNull();

    rerender(<RevealAdminForm form={{...FORM, type: 'Location'}} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Move cost')).toBeInTheDocument();
    expect(screen.getByLabelText('Willpower')).toBeInTheDocument();
    expect(screen.getByLabelText('Lore')).toBeInTheDocument();
    expect(screen.queryByLabelText('Strength')).toBeNull();

    rerender(<RevealAdminForm form={{...FORM, type: 'Item'}} errors={{}} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Willpower')).toBeNull();
  });

  it('picks the scan language, English unless changed', () => {
    const onChange = vi.fn();
    render(<RevealAdminForm form={FORM} errors={{}} onChange={onChange} />);

    const language = screen.getByLabelText(/^Scan language/);
    expect(language).toHaveValue('en');
    fireEvent.change(language, {target: {value: 'ja'}});
    expect(onChange).toHaveBeenCalledWith({scanLanguage: 'ja'});
  });
});

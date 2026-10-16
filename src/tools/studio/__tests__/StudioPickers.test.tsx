import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ALL_INKS, InkwellIcon, RaritySymbol} from '../../../app-bridge';
import {revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {StudioForm} from '../components/StudioForm';
import {SINGLE_INK_HINT} from '../formSections';
import {STUDIO_RARITIES} from '../inkPicks';

interface HarnessProps {
  initial?: Partial<RevealCardForm>;
  /** Sees every patch the form sends. */
  onPatch?: (patch: Partial<RevealCardForm>) => void;
}

/** StudioForm, wide and controlled, validated on every render as the page does: the pickers' real home. */
function Harness({initial = {}, onPatch = () => {}}: HarnessProps) {
  const [form, setForm] = useState<RevealCardForm>({...EMPTY_FORM, ...initial});
  const onChange = (patch: Partial<RevealCardForm>) => {
    onPatch(patch);
    setForm((f) => ({...f, ...patch}));
  };
  const errors = validateRevealCardForm(form, new Set(), 'scan.png').errors;
  return <StudioForm form={form} errors={errors} onChange={onChange} layout="wide" />;
}

/** Queries inside the group its label names: "Ink", "Second ink", "Rarity", "Inkwell". */
const inGroup = (name: string) => within(screen.getByRole('group', {name}));
const PRESSED = {pressed: true} as const;
/** Buttons by name: a tile's is its InkIcon's alt text, a pick button's its text. */
const names = (buttons: HTMLElement[]) => buttons.map((button) => button.textContent || button.querySelector('img')?.alt);
const inkLabel = () => screen.getByText('Ink').parentElement;
const dualSwitch = () => screen.getByRole('switch', {name: 'Dual-ink card'});
/** The src RaritySymbol or InkwellIcon draws on its own, so no test names an asset path. */
const srcOf = (icon: React.ReactElement) => render(icon).container.querySelector('img')?.getAttribute('src');

describe('the ink picker (R-75)', () => {
  it('presses the chosen ink, each tile named by its icon, under "Ink · {name}"', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(names(inGroup('Ink').getAllByRole('button'))).toEqual(ALL_INKS);
    expect(names(inGroup('Ink').queryAllByRole('button', PRESSED))).toEqual(['Amber']);
    expect(inkLabel()).toHaveTextContent('Ink · Amber');

    await user.click(inGroup('Ink').getByRole('button', {name: 'Ruby'}));
    expect(names(inGroup('Ink').queryAllByRole('button', PRESSED))).toEqual(['Ruby']);
    expect(inkLabel()).toHaveTextContent('Ink · Ruby');
  });

  it('leaves the primary out of the second-ink row, and names both inks once one is picked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm()} />);
    await user.click(dualSwitch());
    expect(names(inGroup('Second ink').getAllByRole('button'))).toEqual(ALL_INKS.filter((ink) => ink !== 'Ruby'));
    expect(names(inGroup('Second ink').queryAllByRole('button', PRESSED))).toEqual([]);

    await user.click(inGroup('Second ink').getByRole('button', {name: 'Sapphire'}));
    expect(names(inGroup('Second ink').queryAllByRole('button', PRESSED))).toEqual(['Sapphire']);
    expect(inkLabel()).toHaveTextContent('Ink · Ruby / Sapphire');
  });

  it('clears the second ink when the primary takes it, and keeps the switch on for the next (R-75)', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(<Harness initial={revealForm({ink2: 'Steel'})} onPatch={onPatch} />);
    expect(dualSwitch()).toBeChecked();

    await user.click(inGroup('Ink').getByRole('button', {name: 'Steel'}));
    expect(onPatch).toHaveBeenLastCalledWith({ink: 'Steel', ink2: ''});
    expect(names(inGroup('Ink').queryAllByRole('button', PRESSED))).toEqual(['Steel']);
    expect(inkLabel()).toHaveTextContent('Ink · Steel');
    expect(dualSwitch()).toBeChecked();
    expect(dualSwitch()).toHaveAccessibleDescription(SINGLE_INK_HINT);
    expect(names(inGroup('Second ink').getAllByRole('button'))).not.toContain('Steel');
    expect(names(inGroup('Second ink').queryAllByRole('button', PRESSED))).toEqual([]);
  });

  it('keeps the six primary tiles on one line, each column at most a tile wide, and lets the second row wrap', async () => {
    // jsdom lays nothing out, so the row's style is pinned: six 48px tiles and their gaps need 308px,
    // and the wide form's section gives them about 272px, where each column takes about 42px.
    const user = userEvent.setup();
    render(<Harness initial={revealForm()} />);
    await user.click(dualSwitch());
    const rows = ['Ink', 'Second ink'].map((name) => {
      const {display, gridTemplateColumns} = screen.getByRole('group', {name}).style;
      return {display, gridTemplateColumns};
    });
    expect(rows).toEqual([
      {display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 48px))'},
      {display: 'flex', gridTemplateColumns: ''},
    ]);
  });

  it('ties the second ink’s error to its group', () => {
    // Only a hand edit of the file can hold this: the tiles never offer the primary twice.
    render(<Harness initial={revealForm({ink2: 'Ruby'})} />);
    const secondInk = screen.getByRole('group', {name: 'Second ink'});
    expect(secondInk).toHaveAccessibleDescription('Second ink must differ from the first');
  });
});

describe('the rarity picker (R-74, R-83)', () => {
  it('offers None, then the five base rarities: no Enchanted, Epic or Iconic', () => {
    render(<Harness />);
    expect(names(inGroup('Rarity').getAllByRole('button'))).toEqual(['None', ...STUDIO_RARITIES]);
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['None']);
    expect(screen.getByRole('group', {name: 'Rarity'})).not.toHaveAttribute('aria-describedby');
  });

  it.each(STUDIO_RARITIES)('draws %s through RaritySymbol, hidden from the button’s name', (rarity) => {
    const glyph = srcOf(<RaritySymbol rarity={rarity.toLowerCase()} size={18} />);
    render(<Harness />);
    const img = inGroup('Rarity').getByRole('button', {name: rarity}).querySelector('img');
    expect(glyph).toBeTruthy();
    expect(img).toHaveAttribute('src', glyph);
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('picks a rarity, and None clears it', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(<Harness onPatch={onPatch} />);

    await user.click(inGroup('Rarity').getByRole('button', {name: 'Super Rare'}));
    expect(onPatch).toHaveBeenLastCalledWith({rarity: 'Super Rare'});
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['Super Rare']);

    await user.click(inGroup('Rarity').getByRole('button', {name: 'None'}));
    expect(onPatch).toHaveBeenLastCalledWith({rarity: ''});
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['None']);
  });

  it("keeps a card's unlisted rarity in view, pressed, until another is picked", async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm({rarity: 'Enchanted'})} />);
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['Enchanted']);

    await user.click(inGroup('Rarity').getByRole('button', {name: 'Legendary'}));
    expect(inGroup('Rarity').queryByRole('button', {name: 'Enchanted'})).toBeNull();
  });
});

describe('the Inkable buttons', () => {
  it('sit in Type & stats between the type and the cost, each with its InkwellIcon', () => {
    render(<Harness />);
    const section = within(screen.getByRole('region', {name: 'Type & stats'}));
    const type = section.getByRole('group', {name: 'Type'});
    const inkwell = section.getByRole('group', {name: 'Inkwell'});
    const cost = section.getByLabelText('Cost');
    // The handoff's order (dc.html:224-226): the type, then the inkwell, then the cost.
    expect(type.compareDocumentPosition(inkwell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(inkwell.compareDocumentPosition(cost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const uninkable = srcOf(<InkwellIcon value="uninkable" />);
    expect(inGroup('Inkwell').getByRole('button', {name: 'Uninkable'}).querySelector('img')).toHaveAttribute('src', uninkable);
  });

  it("press the form's inkwell, and set it", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(<Harness onPatch={onPatch} />);
    expect(names(inGroup('Inkwell').queryAllByRole('button', PRESSED))).toEqual(['Inkable']);

    await user.click(inGroup('Inkwell').getByRole('button', {name: 'Uninkable'}));
    expect(onPatch).toHaveBeenLastCalledWith({inkwell: false});
    expect(names(inGroup('Inkwell').queryAllByRole('button', PRESSED))).toEqual(['Uninkable']);
  });

  it("stacks the two where they can't sit side by side at the rarity grid's least width, so Uninkable stays inside its button", () => {
    // jsdom lays nothing out, so the templates are pinned. Uninkable needs about 103px. A 320px phone with the
    // rail leaves a 190px section, where two equal columns would be 93px each: 112px columns stack there instead,
    // and sit side by side from a 228px section, as at 360px (113px each).
    render(<Harness />);
    const template = (name: string) => screen.getByRole('group', {name}).style.gridTemplateColumns;
    expect(template('Inkwell')).toBe('repeat(auto-fit, minmax(min(100%, 112px), 1fr))');
    expect(template('Rarity')).toBe('repeat(auto-fill, minmax(112px, 1fr))');
  });
});

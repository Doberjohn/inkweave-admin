import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, it, expect} from 'vitest';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {StudioForm} from '../components/StudioForm';

// Kit Cloudkicker - Sure Shot (14192) as it was typed into the reveal publisher (#635).
const SPELLED_OUT =
  'Shift 3 (You may pay 3 Ink to play this on top of one of your characters named Kit Cloudkicker.)';

const KIT: RevealCardForm = {
  collectorNumber: '192',
  name: 'Kit Cloudkicker',
  version: 'Sure Shot',
  rarity: 'Rare',
  franchise: '',
  cost: '5',
  ink: 'Steel',
  ink2: '',
  inkwell: true,
  type: 'Character',
  strength: '3',
  willpower: '4',
  lore: '2',
  moveCost: '',
  subtypes: '',
  keywords: '',
  fullText: '',
  scanLanguage: 'en',
};

/** The form with real state, beside a Publish button, as the studio lays them out. Wide: every field shows. */
function Harness({fullText}: {fullText: string}) {
  const [form, setForm] = useState<RevealCardForm>(() => ({...KIT, fullText}));
  return (
    <>
      <StudioForm form={form} errors={{}} layout="wide" onChange={(patch) => setForm((f) => ({...f, ...patch}))} />
      <button type="button">Publish</button>
    </>
  );
}

const cardText = () => screen.getByLabelText('Full card text (one ability per line)');

describe('StudioForm Card Text', () => {
  it('shows the house-style rewrite when the owner moves on to another control', async () => {
    const user = userEvent.setup();
    render(<Harness fullText={SPELLED_OUT} />);
    await user.click(cardText());
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    expect(cardText()).toHaveValue(
      'Shift 3 ⬡ (You may pay 3 ⬡ to play this on top of one of your characters named Kit Cloudkicker.)',
    );
  });

  // Alt-tab to copy the next ability blurs the field but leaves it the active element. A
  // rewrite then would trim the trailing newline and glue the next paste onto this line.
  it('leaves the text exactly as typed when the window loses focus', async () => {
    const user = userEvent.setup();
    const typed = `${SPELLED_OUT}\n`;
    render(<Harness fullText={typed} />);
    await user.click(cardText());
    fireEvent.blur(cardText());
    expect(cardText()).toHaveValue(typed);
  });
});

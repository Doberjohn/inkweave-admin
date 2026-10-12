import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {inkBlock} from '../../../app-bridge';
import {RUBY_NUMBER, revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {SCAN_LANGUAGES} from '../../reveal/constants';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {StudioForm} from '../components/StudioForm';
import {LOCKED_NUMBER_HINT, SCAN_LANGUAGE_HINT, SINGLE_INK_HINT} from '../formSections';
import type {StudioLayout} from '../studioLayout';

/** The validator's errors, every one, blank fields' included: what the page passes (R-72 filters them). */
function errorsOf(form: RevealCardForm): Record<string, string> {
  return validateRevealCardForm(form, new Set(), 'scan.png').errors;
}

interface HarnessProps {
  layout?: StudioLayout;
  initial?: Partial<RevealCardForm>;
  locked?: ReadonlySet<keyof RevealCardForm>;
}

/** StudioForm is controlled: the harness holds the form and validates it on every render, as the page does. */
function Harness({layout = 'wide', initial = {}, locked}: HarnessProps) {
  const [form, setForm] = useState<RevealCardForm>({...EMPTY_FORM, ...initial});
  return (
    <StudioForm
      form={form}
      errors={errorsOf(form)}
      layout={layout}
      locked={locked}
      onChange={(patch) => setForm((f) => ({...f, ...patch}))}
    />
  );
}

/** A narrow section's toggle, by the start of its name: its title. */
const toggle = (title: RegExp) => screen.getByRole('button', {name: title});

describe('StudioForm, ported from RevealAdminForm', () => {
  // The old test passed a blank name's "Name is required". Under R-72 a blank
  // field shows no error, so the port fills a value that fails instead.
  it("ties a filled value's error to its control", () => {
    render(<Harness initial={revealForm({cost: '1.5'})} />);

    const cost = screen.getByLabelText('Cost');
    expect(cost).toHaveAttribute('aria-invalid', 'true');
    expect(cost).toHaveAccessibleDescription('Enter a cost (0 or more)');
    expect(screen.getByLabelText('Version (subtitle)')).not.toHaveAttribute('aria-invalid');
  });

  it("shows the stats the card's type prints", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByLabelText('Strength')).toBeInTheDocument();
    expect(screen.queryByLabelText('Move cost')).toBeNull();

    const type = screen.getByRole('group', {name: 'Type'});
    await user.click(within(type).getByRole('button', {name: 'Location'}));
    expect(screen.getByLabelText('Move cost')).toBeInTheDocument();
    expect(screen.getByLabelText('Willpower')).toBeInTheDocument();
    expect(screen.getByLabelText('Lore')).toBeInTheDocument();
    expect(screen.queryByLabelText('Strength')).toBeNull();

    await user.click(within(type).getByRole('button', {name: 'Item'}));
    expect(screen.queryByLabelText('Willpower')).toBeNull();
  });

  it('picks the scan language, English unless changed', () => {
    const onChange = vi.fn();
    render(<StudioForm form={EMPTY_FORM} errors={{}} onChange={onChange} layout="wide" />);

    const language = screen.getByLabelText(/^Scan language/);
    expect(language).toHaveValue('en');
    fireEvent.change(language, {target: {value: 'ja'}});
    expect(onChange).toHaveBeenCalledWith({scanLanguage: 'ja'});
  });
});

describe('StudioForm: what shows red (R-72)', () => {
  it('opens a fresh New reveal form with nothing marked invalid, and every section neutral but Card text', () => {
    // The validator does report the blank number, name, cost and stats: they stay hidden.
    expect(Object.keys(errorsOf(EMPTY_FORM))).toEqual(
      expect.arrayContaining(['collectorNumber', 'name', 'cost', 'strength', 'willpower', 'lore']),
    );
    const {container} = render(<Harness />);

    expect(container.querySelectorAll('[aria-invalid]')).toHaveLength(0);
    expect(screen.getByLabelText('Name')).not.toHaveAccessibleDescription();
    expect(screen.getAllByRole('heading', {level: 2}).map((heading) => heading.textContent)).toEqual([
      'Identity, incomplete',
      'Ink & rarity, incomplete',
      'Type & stats, incomplete',
      'Card text, complete',
    ]);
  });

  it("marks a filled value that fails, names its section's error, and still hides a blank field's", () => {
    const amber = inkBlock('Amber').first;
    render(<Harness initial={revealForm({collectorNumber: String(amber), name: ''})} />);

    const ink = screen.getByLabelText('Ink');
    expect(ink).toHaveAttribute('aria-invalid', 'true');
    expect(ink).toHaveAccessibleDescription(expect.stringMatching(new RegExp(`^#${amber} is in the Amber block`)));
    expect(screen.getByRole('heading', {name: 'Ink & rarity, has an error'})).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('heading', {name: 'Identity, incomplete'})).toBeInTheDocument();
  });
});

describe('StudioForm: the cost', () => {
  it('keeps the Cost box and the slider apart, and holds what was typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const box = screen.getByLabelText('Cost');
    expect(box).toHaveRole('textbox');
    await user.type(box, '1.5');
    expect(box).toHaveValue('1.5');
    expect(box).toHaveAccessibleDescription('Enter a cost (0 or more)');
    expect(screen.getByRole('slider', {name: 'Cost slider'})).toHaveAttribute('aria-valuetext', 'Not a valid cost');
  });

  it('reads a blank cost as Not set, with no thumb', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Cost slider'});
    expect(slider).toHaveAttribute('aria-valuetext', 'Not set');
    expect(slider).toHaveAttribute('data-unset', 'true');
  });

  it.each<{title: string; press: (slider: HTMLElement) => void}>([
    {title: 'press', press: (slider) => fireEvent.pointerDown(slider)},
    {title: 'key that moves it', press: (slider) => fireEvent.keyDown(slider, {key: 'ArrowLeft'})},
  ])("sets a blank cost to 0 on the slider's first $title", ({press}) => {
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Cost slider'});
    press(slider);
    expect(screen.getByLabelText('Cost')).toHaveValue('0');
    expect(slider).not.toHaveAttribute('aria-valuetext');
    expect(slider).not.toHaveAttribute('data-unset');
  });

  it('leaves a blank cost blank when Tab passes over the slider', () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole('slider', {name: 'Cost slider'}), {key: 'Tab'});
    expect(screen.getByLabelText('Cost')).toHaveValue('');
  });

  it('moves the box with the slider, and holds a cost above 10 at the end', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Cost slider'});
    const box = screen.getByLabelText('Cost');

    fireEvent.change(slider, {target: {value: '7'}});
    expect(box).toHaveValue('7');

    await user.clear(box);
    await user.type(box, '12');
    expect(slider).toHaveValue('10');
    expect(slider).toHaveAttribute('aria-valuetext', '12');
  });
});

describe('StudioForm: narrow, an accordion', () => {
  it('opens Identity first, and one section at a time', async () => {
    const user = userEvent.setup();
    render(<Harness layout="narrow" />);
    expect(toggle(/^Identity/)).toHaveAttribute('aria-expanded', 'true');
    expect(toggle(/^Type & stats/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Strength')).toBeNull();

    await user.click(toggle(/^Type & stats/));
    expect(toggle(/^Type & stats/)).toHaveAttribute('aria-expanded', 'true');
    expect(toggle(/^Identity/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Strength')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).toBeNull();

    await user.click(toggle(/^Type & stats/));
    expect(screen.queryAllByRole('button', {expanded: true})).toHaveLength(0);
  });

  it('points the open toggle at its fields, and a closed one at nothing', () => {
    render(<Harness layout="narrow" />);
    const controls = toggle(/^Identity/).getAttribute('aria-controls');
    expect(document.getElementById(controls ?? '')).toContainElement(screen.getByLabelText('Name'));
    expect(toggle(/^Card text/)).not.toHaveAttribute('aria-controls');
  });

  it("sums up a closed section, and shows a section's error in its place", () => {
    render(<Harness layout="narrow" initial={revealForm({cost: '1.5'})} />);
    expect(toggle(/^Ink & rarity/)).toHaveAccessibleName('Ink & rarity, complete Ruby · Rare');
    expect(toggle(/^Type & stats/)).toHaveAccessibleName('Type & stats, has an error Enter a cost (0 or more)');
    expect(toggle(/^Card text/)).toHaveAccessibleName('Card text, complete Not filled yet');
    // The open section sums nothing up: its fields show.
    expect(toggle(/^Identity/)).toHaveAccessibleName('Identity, complete');
  });
});

describe('StudioForm: wide', () => {
  it('shows every section open, under plain headings with no toggles', () => {
    render(<Harness initial={revealForm()} />);
    expect(screen.getAllByRole('heading', {level: 2})).toHaveLength(4);
    expect(screen.queryAllByRole('button', {expanded: false})).toHaveLength(0);
    expect(screen.queryAllByRole('button', {expanded: true})).toHaveLength(0);
    for (const label of ['Name', 'Ink', 'Cost', 'Full card text (one ability per line)']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('region', {name: 'Type & stats'})).toBeInTheDocument();
  });
});

describe('StudioForm: Dual-ink, the state it lifts', () => {
  it('shows Second ink only while the switch is on, and turning it off clears the second ink', async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm()} />);
    const dual = screen.getByRole('switch', {name: 'Dual-ink card'});
    expect(dual).not.toBeChecked();
    expect(screen.queryByLabelText('Second ink')).toBeNull();

    await user.click(dual);
    expect(dual).toBeChecked();
    expect(dual).toHaveAccessibleDescription(SINGLE_INK_HINT);
    await user.selectOptions(screen.getByLabelText('Second ink'), 'Steel');
    expect(dual).not.toHaveAccessibleDescription();

    await user.click(dual);
    expect(screen.queryByLabelText('Second ink')).toBeNull();
    await user.click(dual);
    expect(screen.getByLabelText('Second ink')).toHaveValue('');
  });

  it('stays on while the narrow accordion closes its section', async () => {
    const user = userEvent.setup();
    render(<Harness layout="narrow" initial={revealForm()} />);
    await user.click(toggle(/^Ink & rarity/));
    await user.click(screen.getByRole('switch', {name: 'Dual-ink card'}));

    await user.click(toggle(/^Identity/));
    expect(screen.queryByRole('switch')).toBeNull();
    await user.click(toggle(/^Ink & rarity/));
    expect(screen.getByRole('switch', {name: 'Dual-ink card'})).toBeChecked();
  });
});

describe('StudioForm: Edit and the scan language', () => {
  it('makes a locked collector number read-only, and says why (R-91)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm()} locked={new Set(['collectorNumber'])} />);
    const number = screen.getByLabelText('Collector number');
    expect(number).toHaveAttribute('readonly');
    expect(number).toHaveAccessibleDescription(LOCKED_NUMBER_HINT);

    await user.type(number, '9');
    expect(number).toHaveValue(String(RUBY_NUMBER));
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('readonly');
  });

  it('describes the scan language by its note', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Scan language')).toHaveAccessibleDescription(SCAN_LANGUAGE_HINT);
  });

  it('lists a language the list lacks as its own option, by its English name (R-60)', () => {
    render(<Harness initial={{scanLanguage: 'zh'}} />);
    const language = screen.getByLabelText('Scan language');
    expect(language).toHaveValue('zh');
    expect(within(language).getAllByRole('option').map((option) => option.textContent)).toEqual([
      ...SCAN_LANGUAGES.map(({label}) => label),
      'Chinese',
    ]);
  });
});

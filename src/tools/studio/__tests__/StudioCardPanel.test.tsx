import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StudioMode} from '../../../shell/nav';
import {pngFile} from '../../../test/images';
import {NO_IMAGE, type StagedImage} from '../cardPanel';
import {StudioCardPanel, type StudioCardPanelProps} from '../components/StudioCardPanel';
import {CURRENT_ART, PANEL_CARD, STAGED_ART} from '../studioFixtures';

const FORMATS = 'JPEG, PNG or WebP.';
const BAD_BYTES = 'mei.png holds a JPEG image; rename it to end in .jpg.';
const STAGED: StagedImage = {name: 'mei.png', error: null};
const FAILED: StagedImage = {name: 'mei.png', error: BAD_BYTES};
/** Mei as she stands in Edit: her art now. */
const CURRENT: LorcanaCard = {...PANEL_CARD, imageUrl: CURRENT_ART};
/** Mei as the draft previews her once a new image is staged. */
const STAGED_CARD: LorcanaCard = {...PANEL_CARD, imageUrl: STAGED_ART};

/** The panel as a page renders it: New reveal, Mei with no art, nothing staged, unless a case says otherwise. */
function renderPanel(overrides: Partial<StudioCardPanelProps> = {}) {
  const props: StudioCardPanelProps = {
    card: PANEL_CARD,
    mode: 'new',
    layout: 'wide',
    staged: NO_IMAGE,
    onImageChange: vi.fn(),
    ...overrides,
  };
  return {props, ...render(<StudioCardPanel {...props} />)};
}

/** What the panel shows round the image, as one value per case. */
function shown() {
  return {
    note: screen.queryByText(/ staged \(/)?.textContent ?? null,
    revert: screen.queryByRole('button', {name: 'Revert image'}) !== null,
    replace: screen.queryByLabelText('Replace card image') !== null,
    current: screen.queryByRole('img', {name: /^Current art for/})?.getAttribute('src') ?? null,
  };
}

/** Which file controls show their ring: each label's data-focused, in DOM order (the cover first). */
function rings() {
  return Array.from(document.querySelectorAll('label'), (label) => label.dataset.focused ?? null);
}

/** Which file controls show the drop target: each label's data-dragging, in DOM order. */
function dropTargets() {
  return Array.from(document.querySelectorAll('label'), (label) => label.dataset.dragging ?? null);
}

/** A drag of `files` from the desktop, as fireEvent hands it over: jsdom has no DataTransfer. */
const fileDrag = (...files: File[]) => ({types: ['Files'], files, dropEffect: 'none'});

/** The <label> a file control's name belongs to: drops land on it, round its hidden input. */
const labelOf = (control: string) => screen.getByLabelText(control).closest('label') as HTMLLabelElement;

/** Holds the staged image as the controllers do, so Revert image unmounts itself. Edit passes its own revert. */
function Harness({mode}: {mode: StudioMode}) {
  const [staged, setStaged] = useState<StagedImage>(STAGED);
  const onRevertImage = mode === 'edit' ? () => setStaged(NO_IMAGE) : undefined;
  return (
    <StudioCardPanel
      card={STAGED_CARD}
      mode={mode}
      layout="wide"
      staged={staged}
      current={CURRENT}
      onImageChange={(file) => setStaged({name: file?.name ?? null, error: null})}
      onRevertImage={onRevertImage}
    />
  );
}

describe('StudioCardPanel', () => {
  it('keeps the preview out of the Tab order: its file control is the one stop', async () => {
    const user = userEvent.setup();
    const {container} = renderPanel();
    // CardTile renders a button: no Tab stop, inside an aria-hidden wrapper.
    expect(container.querySelector('[data-testid="card-tile"]')).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByRole('button')).toBeNull();

    await user.tab();
    expect(screen.getByLabelText('Click or drop to upload scan')).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('rings the file control that has the focus, on its label (the input itself is hidden)', async () => {
    const user = userEvent.setup();
    renderPanel({mode: 'edit', card: CURRENT, current: CURRENT});
    expect(rings()).toEqual([null, null]);
    await user.tab();
    expect(rings()).toEqual(['true', null]);
    await user.tab();
    expect(rings()).toEqual([null, 'true']);
  });

  it.each<{label: string; mode: StudioMode; staged: StagedImage; caption: string}>([
    {label: 'New, nothing chosen', mode: 'new', staged: NO_IMAGE, caption: 'Click or drop to upload scan'},
    {label: 'New, a scan staged', mode: 'new', staged: STAGED, caption: 'Click or drop to change scan'},
    {label: 'Edit', mode: 'edit', staged: NO_IMAGE, caption: 'Click or drop to replace image'},
    {label: 'Edit, an image staged', mode: 'edit', staged: STAGED, caption: 'Click or drop to replace image'},
  ])('$label: the pill "$caption" names the preview control, which takes JPEG, PNG and WebP', ({mode, staged, caption}) => {
    renderPanel({mode, staged});
    const input = screen.getByLabelText(caption);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(input).toHaveAccessibleDescription(FORMATS);
  });

  it.each<{mode: StudioMode; control: string}>([
    {mode: 'new', control: 'Click or drop to upload scan'},
    {mode: 'edit', control: 'Click or drop to replace image'},
    {mode: 'edit', control: 'Replace card image'},
  ])('$mode: "$control" hands the chosen file over', async ({mode, control}) => {
    const user = userEvent.setup();
    const onImageChange = vi.fn();
    renderPanel({mode, onImageChange});
    const file = pngFile('mei.png');
    await user.upload(screen.getByLabelText(control), file);
    expect(onImageChange).toHaveBeenCalledExactlyOnceWith(file);
  });

  // Doberjohn/inkweave-admin#54: the same handover as a pick, so useImageUpload's checks run on a dropped file too.
  it.each<{mode: StudioMode; control: string}>([
    {mode: 'new', control: 'Click or drop to upload scan'},
    {mode: 'edit', control: 'Click or drop to replace image'},
    {mode: 'edit', control: 'Replace card image'},
  ])('$mode: "$control" takes a dropped file, the first of several', ({mode, control}) => {
    const onImageChange = vi.fn();
    renderPanel({mode, onImageChange});
    const files = [pngFile('mei.png'), pngFile('ming.png')];
    fireEvent.drop(labelOf(control), {dataTransfer: fileDrag(...files)});
    expect(onImageChange).toHaveBeenCalledExactlyOnceWith(files[0]);
  });

  it('shows the file control a file is dragged over as the drop target, and only that one', () => {
    renderPanel({mode: 'edit', card: CURRENT, current: CURRENT});
    expect(dropTargets()).toEqual([null, null]);
    fireEvent.dragEnter(labelOf('Click or drop to replace image'), {dataTransfer: fileDrag()});
    expect(dropTargets()).toEqual(['true', null]);
    fireEvent.dragLeave(labelOf('Click or drop to replace image'), {dataTransfer: fileDrag()});
    fireEvent.dragEnter(labelOf('Replace card image'), {dataTransfer: fileDrag()});
    expect(dropTargets()).toEqual([null, 'true']);
    fireEvent.drop(labelOf('Replace card image'), {dataTransfer: fileDrag(pngFile('mei.png'))});
    expect(dropTargets()).toEqual([null, null]);
  });

  it('leaves a drag that carries no file alone: no target, and nothing handed over', () => {
    const onImageChange = vi.fn();
    renderPanel({mode: 'edit', card: CURRENT, current: CURRENT, onImageChange});
    const link = {types: ['text/uri-list', 'text/plain'], files: [], dropEffect: 'none'};
    fireEvent.dragEnter(labelOf('Replace card image'), {dataTransfer: link});
    fireEvent.drop(labelOf('Replace card image'), {dataTransfer: link});
    expect(dropTargets()).toEqual([null, null]);
    expect(onImageChange).not.toHaveBeenCalled();
  });

  it.each([{control: 'Click or drop to replace image'}, {control: 'Replace card image'}])(
    'ties a file error to "$control", ahead of the formats, and marks it invalid',
    ({control}) => {
      renderPanel({mode: 'edit', card: CURRENT, current: CURRENT, staged: FAILED});
      const input = screen.getByLabelText(control);
      expect(input).toHaveAccessibleDescription(`${BAD_BYTES} ${FORMATS}`);
      expect(input).toBeInvalid();
    },
  );

  it('shows the file error next to the controls, in a polite live region', () => {
    renderPanel({staged: FAILED});
    expect(screen.getByText(BAD_BYTES).parentElement).toHaveAttribute('aria-live', 'polite');
  });

  // R4-8c: the file input empties itself after a pick, and its name doesn't change, so only the region speaks.
  it.each<{mode: StudioMode; note: string}>([
    {mode: 'edit', note: 'New image staged (mei.png). It replaces the current art when you save.'},
    {mode: 'new', note: "Scan staged (mei.png). It's published with the card."},
  ])('$mode: announces the staged note through the polite region mounted before the pick', ({mode, note}) => {
    const {props, rerender} = renderPanel({mode, card: CURRENT, current: mode === 'edit' ? CURRENT : null});
    // The panel's one region: the preview's art draws a skeleton with a polite region of its own, inside aria-hidden.
    const [region, ...more] = [...document.querySelectorAll('[aria-live="polite"]')].filter(
      (element) => !element.closest('[aria-hidden="true"]'),
    );
    expect(more).toEqual([]);
    expect(region).toBeEmptyDOMElement();

    rerender(<StudioCardPanel {...props} card={STAGED_CARD} staged={STAGED} />);
    expect(screen.getByText(note).closest('[aria-live="polite"]')).toBe(region);
    // The thumbnail beside it isn't read out with it: the note says what changed.
    expect(region).not.toContainElement(screen.queryByRole('img', {name: /^Current art for/}));
  });

  it.each<{label: string; props: Partial<StudioCardPanelProps>; expected: ReturnType<typeof shown>}>([
    {label: 'New, nothing chosen', props: {}, expected: {note: null, revert: false, replace: false, current: null}},
    {
      label: 'New, a scan staged: its own note, and no current art',
      props: {card: STAGED_CARD, staged: STAGED},
      expected: {note: "Scan staged (mei.png). It's published with the card.", revert: true, replace: false, current: null},
    },
    {
      label: 'Edit, the art as it stands',
      props: {mode: 'edit', card: CURRENT, current: CURRENT},
      expected: {note: null, revert: false, replace: true, current: null},
    },
    {
      label: 'Edit, an image staged: the current art beside the note',
      props: {mode: 'edit', card: STAGED_CARD, current: CURRENT, staged: STAGED},
      expected: {
        note: 'New image staged (mei.png). It replaces the current art when you save.',
        revert: true,
        replace: true,
        current: CURRENT_ART,
      },
    },
    {
      label: 'Edit, a file that failed its check: its error, and no note',
      props: {mode: 'edit', card: CURRENT, current: CURRENT, staged: FAILED},
      expected: {note: null, revert: true, replace: true, current: null},
    },
  ])('$label', ({props, expected}) => {
    renderPanel(props);
    expect(shown()).toEqual(expected);
  });

  it('names the current art for the card as it stands, not as the draft renames it', () => {
    const renamed = {...STAGED_CARD, version: 'Bold Red Panda', fullName: 'Mei - Bold Red Panda'};
    renderPanel({mode: 'edit', card: renamed, current: CURRENT, staged: STAGED});
    expect(screen.getByRole('img', {name: 'Current art for Mei - Red Panda'})).toBeInTheDocument();
  });

  it.each<{mode: StudioMode; next: string}>([
    {mode: 'new', next: 'Click or drop to upload scan'},
    {mode: 'edit', next: 'Replace card image'},
  ])('$mode: Revert image hands focus to "$next" before it goes, then clears the file', async ({mode, next}) => {
    const user = userEvent.setup();
    render(<Harness mode={mode} />);
    await user.click(screen.getByRole('button', {name: 'Revert image'}));
    expect(screen.queryByRole('button', {name: 'Revert image'})).toBeNull();
    expect(screen.getByLabelText(next)).toHaveFocus();
  });

  it.each<{label: string; withRevert: boolean; expected: {revert: number; change: unknown[][]}}>([
    {label: "Edit's onRevertImage", withRevert: true, expected: {revert: 1, change: []}},
    {label: 'onImageChange(null) where there is none', withRevert: false, expected: {revert: 0, change: [[null]]}},
  ])('Revert image calls $label', async ({withRevert, expected}) => {
    const user = userEvent.setup();
    const onRevertImage = vi.fn();
    const onImageChange = vi.fn();
    renderPanel({staged: STAGED, onImageChange, onRevertImage: withRevert ? onRevertImage : undefined});
    await user.click(screen.getByRole('button', {name: 'Revert image'}));
    expect({revert: onRevertImage.mock.calls.length, change: onImageChange.mock.calls}).toEqual(expected);
  });

  it('captions the preview with the name, the version and every ink, named', () => {
    renderPanel({card: {...PANEL_CARD, ink2: 'Sapphire'}});
    expect(screen.getByText('Mei')).toBeInTheDocument();
    expect(screen.getByText('Red Panda')).toBeInTheDocument();
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual(['Ruby', 'Sapphire']);
  });

  it("shows the stripes and a prompt for a fresh form's card, which has no name and no art", () => {
    const {container} = renderPanel({card: {...PANEL_CARD, name: '', fullName: '', version: undefined}});
    expect(container.querySelector('[data-testid="card-tile"]')).toBeNull();
    expect(screen.getByText('Fill in the name to preview the card.')).toBeInTheDocument();
  });

  it.each([
    {scanLanguage: 'ja', language: 'Japanese'},
    {scanLanguage: 'fr', language: 'French'},
  ])('shows what "See translation" will show for a $scanLanguage scan, and nothing for English', ({scanLanguage, language}) => {
    const {rerender, props} = renderPanel({card: {...PANEL_CARD, scanLanguage}});
    const translation = screen.getByRole('region', {name: 'English translation of Mei - Red Panda'});
    expect(translation).toHaveTextContent('PANDA POWER');
    expect(translation).toHaveTextContent(`Translated from the ${language} card`);

    rerender(<StudioCardPanel {...props} card={PANEL_CARD} />);
    expect(screen.queryByRole('region', {name: /English translation/})).toBeNull();
  });

  it('draws a staged image even after the art before it failed to load', () => {
    const {container, rerender, props} = renderPanel({mode: 'edit', card: CURRENT, current: CURRENT});
    fireEvent.error(container.querySelector('img.card-tile-img')!);
    expect(container.querySelector('img.card-tile-img')).toBeNull();

    rerender(<StudioCardPanel {...props} card={STAGED_CARD} staged={STAGED} />);
    expect(container.querySelector('img.card-tile-img')).toHaveAttribute('src', STAGED_ART);
  });

  it.each([
    {layout: 'wide', maxWidth: '320px'},
    {layout: 'narrow', maxWidth: '280px'},
  ] as const)('sizes the preview for the $layout layout: $maxWidth at most', ({layout, maxWidth}) => {
    renderPanel({layout});
    expect(screen.getByLabelText('Click or drop to upload scan').closest('label')?.parentElement).toHaveStyle({maxWidth});
  });

  // A Sets 1 to 8 card's art is Ravensburger's, so Edit card draws it and offers no way to replace it (#68).
  describe('without an image control', () => {
    const noControl: Partial<StudioCardPanelProps> = {mode: 'edit', card: CURRENT, current: CURRENT, imageControl: false};

    it('draws the card and its caption, with the pill, Replace card image and the formats hint gone', () => {
      const {container} = renderPanel(noControl);
      expect(container.querySelector('[data-testid="card-tile"]')).toBeInTheDocument();
      expect(screen.getByText('Mei')).toBeInTheDocument();
      expect(screen.getByText('Red Panda')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Click or drop to/)).toBeNull();
      expect(screen.queryByLabelText('Replace card image')).toBeNull();
      expect(screen.queryByText(FORMATS)).toBeNull();
    });

    it('has no file input and no drop target: a drop target is the label round a file input', () => {
      const {container} = renderPanel(noControl);
      expect(container.querySelector('input[type="file"]')).toBeNull();
      expect(container.querySelectorAll('label')).toHaveLength(0);
      expect(dropTargets()).toEqual([]);
    });

    it('is not a Tab stop at all', async () => {
      const user = userEvent.setup();
      renderPanel(noControl);
      await user.tab();
      expect(document.body).toHaveFocus();
    });

    it('still shows the translation of a scan that is not English', () => {
      renderPanel({...noControl, card: {...CURRENT, scanLanguage: 'ja'}});
      expect(screen.getByRole('region', {name: 'English translation of Mei - Red Panda'})).toBeInTheDocument();
    });

    it('keeps both file controls by default, and when it is asked for', () => {
      for (const imageControl of [undefined, true]) {
        const {unmount} = renderPanel({mode: 'edit', card: CURRENT, current: CURRENT, imageControl});
        expect(screen.getByLabelText('Replace card image')).toBeInTheDocument();
        expect(screen.getByLabelText('Click or drop to replace image')).toBeInTheDocument();
        unmount();
      }
    });
  });
});

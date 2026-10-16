import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {inkBlock} from '../../../app-bridge';
import {revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import type {StudioLayout} from '../studioLayout';
import {StudioForm} from './StudioForm';

/** Mei, as New reveal would hold her: the tests' complete Ruby character, with a franchise, subtypes and card text. */
const MEI = revealForm({
  franchise: 'Turning Red',
  subtypes: 'Hero, Red Panda',
  keywords: 'Singer 5',
  fullText: 'PANDA POWER When you play this character, draw a card.',
});

// The form's column at narrow widths (README §7: flex 0 1 400px).
const NARROW_COLUMN = 400;
// The form slot at the narrowest wide layout (R-64): the page's two middle columns and the gap between them,
// (1328 - 400 - 280 - 2 × 12) px.
const WIDE_COLUMNS = 624;

interface HarnessProps {
  start?: RevealCardForm;
  layout?: StudioLayout;
  locked?: ReadonlySet<keyof RevealCardForm>;
}

/** The form with real state, validated on every change as the page validates it, so every story is live. */
function Harness({start = EMPTY_FORM, layout = 'wide', locked}: HarnessProps) {
  const [form, setForm] = useState<RevealCardForm>(start);
  const {errors} = validateRevealCardForm(form, new Set(), 'scan.png');
  return (
    <div style={{maxWidth: layout === 'wide' ? WIDE_COLUMNS : NARROW_COLUMN}}>
      <StudioForm
        form={form}
        errors={errors}
        layout={layout}
        locked={locked}
        onChange={(patch) => setForm((f) => ({...f, ...patch}))}
      />
    </div>
  );
}

const meta: Meta<typeof StudioForm> = {
  title: 'Admin/Publish/Card studio/Form',
  component: StudioForm,
};
export default meta;
type Story = StoryObj<typeof StudioForm>;

/** A fresh New reveal form: no red anywhere (R-72), every section neutral but Card text. */
export const NewReveal: Story = {render: () => <Harness />};

/** The same form in the narrow accordion: Identity open, the rest summed up. */
export const NewRevealNarrow: Story = {render: () => <Harness layout="narrow" />};

/** A complete card: four green dots. */
export const Complete: Story = {render: () => <Harness start={MEI} />};

/**
 * Filled values that fail: a cost of 1.5, an Amber number on a Ruby card, and
 * a spelled-out glyph word. A blank name stays neutral beside them.
 */
export const FilledErrors: Story = {
  render: () => (
    <Harness
      layout="narrow"
      start={{
        ...MEI,
        name: '',
        cost: '1.5',
        collectorNumber: String(inkBlock('Amber').first),
        fullText: 'PANDA POWER Your Strength wins every challenge.',
      }}
    />
  ),
};

/** Edit card: the collector number is locked (R-91). */
export const EditLocked: Story = {render: () => <Harness start={MEI} locked={new Set(['collectorNumber'])} />};

/**
 * A dual-ink card, Ruby and Steel: the switch is on. Turn it off and the
 * second ink clears; turn it on again and the hint says the card publishes as
 * single-ink until one is picked.
 */
export const DualInk: Story = {render: () => <Harness start={{...MEI, ink2: 'Steel'}} />};

/**
 * Kit Cloudkicker - Sure Shot (14192) as it was typed in. Click into the full
 * card text and out again: the words become glyphs (#635).
 */
export const SpelledOutCardText: Story = {
  render: () => (
    <Harness
      start={{
        ...MEI,
        fullText: 'Shift 3 (You may pay 3 Ink to play this on top of one of your characters named Kit Cloudkicker.)',
      }}
    />
  ),
};

/** A card marked by hand with a language the list lacks: it keeps its own option, by its English name (R-60). */
export const UnlistedScanLanguage: Story = {render: () => <Harness start={{...MEI, scanLanguage: 'zh'}} />};

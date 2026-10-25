import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {dualInk, type SectionProps} from '../formSections';
import {visibleErrors} from '../readiness';
import {STUDIO_PANEL} from '../studioStyles';
import {InkRaritySection} from './InkRaritySection';
import {InkwellPicker} from './InkwellPicker';

// The narrow form column (README §7: 300 to 400px), on a studio panel.
const FRAME: React.CSSProperties = {
  ...STUDIO_PANEL,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  maxWidth: 400,
  padding: SPACING.lg,
};

/**
 * The Ink & rarity section's body, then the Inkable buttons, with real state
 * wired as StudioForm wires it: the shown errors are the validator's through
 * R-72, and the Dual-ink switch's state is held here.
 */
function Pickers({start}: {start: RevealCardForm}) {
  const [form, setForm] = useState(start);
  const [open, setOpen] = useState(() => start.ink2 !== '');
  const onChange = (patch: Partial<RevealCardForm>) => setForm((f) => ({...f, ...patch}));
  const section: SectionProps = {
    form,
    errors: visibleErrors(form, validateRevealCardForm(form, new Set(), 'scan.png').errors),
    onChange,
    layout: 'narrow',
    locked: new Set(),
    dual: dualInk({open, setOpen, form, onChange}),
  };
  return (
    <div style={FRAME}>
      <InkRaritySection {...section} />
      <InkwellPicker form={form} onChange={onChange} />
    </div>
  );
}

const meta: Meta<typeof Pickers> = {
  title: 'Admin/Publish/Card studio/Pickers',
  component: Pickers,
};
export default meta;
type Story = StoryObj<typeof Pickers>;

/** A fresh New card form: Amber, no rarity, inkable. Turn Dual-ink on for the second-ink row and its hint. */
export const Fresh: Story = {args: {start: EMPTY_FORM}};

/** A dual-ink card: the switch starts on. Pick Sapphire as the primary: the second ink clears and the switch stays on (R-75). */
export const DualInk: Story = {args: {start: revealForm({ink2: 'Sapphire', rarity: 'Super Rare'})}};

/** The Amber default on a Ruby number: the ink-block clash describes the Ink group. Pick Ruby to clear it. */
export const InkBlockClash: Story = {args: {start: revealForm({ink: 'Amber'})}};

/** An Edit card holding a rarity the studio doesn't offer (R-74): it stays in view, pressed, until another is picked. */
export const UnlistedRarity: Story = {args: {start: revealForm({rarity: 'Enchanted', inkwell: false})}};

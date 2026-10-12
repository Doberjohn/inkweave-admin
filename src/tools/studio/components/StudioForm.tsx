import {useState} from 'react';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {SECTION_SUMMARY, SECTIONS, dualInk, type SectionProps} from '../formSections';
import {sectionStatuses, visibleErrors, type SectionId} from '../readiness';
import type {StudioLayout} from '../studioLayout';
import {STUDIO_FORM} from '../studioStyles';
import {CardTextSection} from './CardTextSection';
import {FormSection} from './FormSection';
import {IdentitySection} from './IdentitySection';
import {InkRaritySection} from './InkRaritySection';
import {TypeStatsSection} from './TypeStatsSection';

/** Each section's fields. */
const BODIES: Readonly<Record<SectionId, (props: SectionProps) => React.JSX.Element>> = {
  identity: IdentitySection,
  ink: InkRaritySection,
  type: TypeStatsSection,
  text: CardTextSection,
};

const NO_LOCKS: ReadonlySet<keyof RevealCardForm> = new Set();

interface StudioFormProps {
  form: RevealCardForm;
  /** The validator's errors, all of them: the form shows them through visibleErrors (R-72). */
  errors: Readonly<Record<string, string>>;
  onChange: (patch: Partial<RevealCardForm>) => void;
  layout: StudioLayout;
  /** Text fields shown read-only: Edit locks the collector number (R-91). */
  locked?: ReadonlySet<keyof RevealCardForm>;
}

/**
 * Card studio's form: four sections over one RevealCardForm (README §7). Wide,
 * they sit two by two across the page's middle columns, every one open. Narrow,
 * they are an accordion with one section open at a time, Identity first. A
 * blank required field is incomplete, not wrong (R-72): it shows no error and
 * leaves its section's dot neutral.
 *
 * It holds the view state the sections share: which section is open, and the
 * Dual-ink switch, lifted here so closing the Ink & rarity section can't drop
 * it. Edit keys the form by card (R-46), which resets both; New keeps them.
 */
export function StudioForm({form, errors, onChange, layout, locked = NO_LOCKS}: StudioFormProps) {
  const [openId, setOpenId] = useState<SectionId | null>('identity');
  // Open from the start for a card that has a second ink (R-75): a primary pick
  // that takes the second ink clears it, and the switch stays on for the next.
  const [dualOpen, setDualOpen] = useState(() => form.ink2 !== '');
  const statuses = sectionStatuses(form, errors);
  const section: SectionProps = {
    form,
    errors: visibleErrors(form, errors),
    onChange,
    layout,
    locked,
    dual: dualInk({open: dualOpen, setOpen: setDualOpen, form, onChange}),
  };
  return (
    <div style={STUDIO_FORM[layout]}>
      {SECTIONS.map(({id, title}) => {
        const Body = BODIES[id];
        return (
          <FormSection
            key={id}
            title={title}
            layout={layout}
            status={statuses[id]}
            summary={SECTION_SUMMARY[id](form)}
            open={layout === 'wide' || openId === id}
            onToggle={() => setOpenId(openId === id ? null : id)}>
            <Body {...section} />
          </FormSection>
        );
      })}
    </div>
  );
}

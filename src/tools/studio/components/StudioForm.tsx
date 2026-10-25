import {useState} from 'react';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {SECTION_SUMMARY, SECTIONS, dualInk, type SectionProps} from '../formSections';
import {sectionStatuses, visibleErrors, type CardListStatus, type SectionId} from '../readiness';
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
  /**
   * The card list New card checks the number against: Identity's dot waits
   * for it, as the checklist does (sectionStatuses, R4-8f). Edit passes none.
   */
  list?: CardListStatus;
  /**
   * Edit's count of Reverts that put the inks back (the Ink row's): each one
   * makes the Dual-ink switch follow the form's ink2 again, as a form opened
   * fresh does, while the open section stays (Doberjohn/inkweave-admin#52).
   * New card passes none.
   */
  inksRestored?: number;
}

/**
 * The Dual-ink switch's state: open from the start for a card that has a
 * second ink (R-75), and again from the form whenever `inksRestored` moves
 * on. A primary pick that takes the second ink clears it, and the switch stays
 * on for the next.
 */
function useDualOpen({form, inksRestored}: Pick<StudioFormProps, 'form' | 'inksRestored'>) {
  const [dualOpen, setDualOpen] = useState(() => form.ink2 !== '');
  const [restored, setRestored] = useState(inksRestored);
  if (restored !== inksRestored) {
    setRestored(inksRestored);
    setDualOpen(form.ink2 !== '');
  }
  return [dualOpen, setDualOpen] as const;
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
 * it. Edit keys the form by card (R-46), which resets both, and an Ink row's
 * Revert resets the switch alone (inksRestored); New keeps them.
 */
export function StudioForm({form, errors, onChange, layout, locked = NO_LOCKS, list, inksRestored}: StudioFormProps) {
  const [openId, setOpenId] = useState<SectionId | null>('identity');
  const [dualOpen, setDualOpen] = useDualOpen({form, inksRestored});
  const statuses = sectionStatuses(form, errors, list);
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

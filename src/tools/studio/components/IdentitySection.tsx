import {SPACING} from '../../../app-bridge';
import {FEATURED_FRANCHISE_HINT} from '../../reveal/constants';
import {LOCKED_NUMBER_HINT, type SectionProps} from '../formSections';
import type {StudioLayout} from '../studioLayout';
import {TextField} from './Field';

const ROW_GAP = SPACING.sm;
/** The collector number's column (README §7: 100px), then the name. */
const NUMBER_ROW: React.CSSProperties = {display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: ROW_GAP};
/** Version beside Franchise when wide, stacked in the narrow column. */
const PAIR_ROW: Readonly<Record<StudioLayout, React.CSSProperties>> = {
  wide: {display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: ROW_GAP, alignItems: 'start'},
  narrow: {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: ROW_GAP},
};

/** Collector number and name, version and franchise, then subtypes. */
export function IdentitySection(section: SectionProps) {
  const locked = section.locked.has('collectorNumber');
  return (
    <>
      <div style={NUMBER_ROW}>
        <TextField
          name="collectorNumber"
          label="Collector number"
          section={section}
          hint={locked ? LOCKED_NUMBER_HINT : undefined}
          input={{inputMode: 'numeric'}}
        />
        <TextField name="name" label="Name" section={section} />
      </div>
      <div style={PAIR_ROW[section.layout]}>
        <TextField name="version" label="Version (subtitle)" section={section} />
        <TextField
          name="franchise"
          label="Franchise"
          section={section}
          hint={`Featured franchise: ${FEATURED_FRANCHISE_HINT}`}
        />
      </div>
      <TextField
        name="subtypes"
        label="Subtypes / classifications (comma separated)"
        section={section}
        input={{placeholder: 'Hero, Red Panda'}}
      />
    </>
  );
}

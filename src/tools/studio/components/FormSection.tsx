import {useId, type ReactNode} from 'react';
import {COLORS, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SR_ONLY} from '../../../ui/layout';
import type {SectionState, SectionStatus} from '../readiness';
import type {StudioLayout} from '../studioLayout';
import {STUDIO_PANEL} from '../studioStyles';

/** The word each status adds to its section's heading: the dot is never the only cue (WCAG 1.4.1). */
const STATUS_WORD: Readonly<Record<SectionState, string>> = {
  error: 'has an error',
  complete: 'complete',
  incomplete: 'incomplete',
};

const DOT_SIZE = 8;
const DOT: React.CSSProperties = {
  flex: 'none',
  boxSizing: 'border-box',
  width: DOT_SIZE,
  height: DOT_SIZE,
  borderRadius: ADMIN_RADIUS.pill,
};

/**
 * The header's status dot (README §7): red for an error, green once complete,
 * and a hollow ring while incomplete, so complete and incomplete differ in
 * shape as well as colour.
 */
const STATUS_DOT: Readonly<Record<SectionState, React.CSSProperties>> = {
  error: {...DOT, background: COLORS.error},
  complete: {...DOT, background: COLORS.success},
  incomplete: {...DOT, border: `2px solid ${ADMIN_COLORS.barNeutral}`},
};

const SUMMARY_LINE: React.CSSProperties = {...TRUNCATE, display: 'block', fontSize: ADMIN_TYPE.small, fontWeight: 400};
/** A closed header's summary, or its section's error message in the error colour. */
const SUMMARY: Readonly<Record<SectionState, React.CSSProperties>> = {
  error: {...SUMMARY_LINE, color: COLORS.error},
  complete: {...SUMMARY_LINE, color: ADMIN_COLORS.muted},
  incomplete: {...SUMMARY_LINE, color: ADMIN_COLORS.muted},
};

const SECTION: React.CSSProperties = {...STUDIO_PANEL, display: 'flex', flexDirection: 'column'};
const HEADING: React.CSSProperties = {margin: 0};
// The wide header: the accordion header's padding and type, with no button.
const PLAIN_HEADING: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.md,
  margin: 0,
  padding: `${SPACING.section}px ${SPACING.lg}px`,
  fontSize: ADMIN_TYPE.body,
  fontWeight: 700,
  color: ADMIN_COLORS.text,
};
const HEAD_TEXT: React.CSSProperties = {display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0};
const BODY: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  flex: '1 1 auto',
  padding: `0 ${SPACING.lg}px ${SPACING.lg}px`,
};

interface HeadingProps {
  titleId: string;
  title: string;
  status: SectionStatus;
}

/** The title, then its status in words, for screen readers. */
function TitleWithStatus({titleId, title, status}: HeadingProps) {
  return (
    <span>
      <span id={titleId}>{title}</span>
      <span style={SR_ONLY}>, {STATUS_WORD[status.state]}</span>
    </span>
  );
}

/** Wide: a plain heading. Every section is open, so there is nothing to toggle. */
function PlainHeading(props: HeadingProps) {
  return (
    <h2 style={PLAIN_HEADING}>
      <span aria-hidden="true" style={STATUS_DOT[props.status.state]} />
      <TitleWithStatus {...props} />
    </h2>
  );
}

interface AccordionHeadingProps extends HeadingProps {
  bodyId: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
}

/**
 * Narrow: the heading holds the accordion's button (h2 > button, as the APG
 * accordion has it). Closed, it sums up the section, or shows the section's
 * error message in its place.
 */
function AccordionHeading({bodyId, summary, open, onToggle, ...heading}: AccordionHeadingProps) {
  const {status} = heading;
  return (
    <h2 style={HEADING}>
      <button
        type="button"
        className="adm-acc-head"
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={onToggle}>
        <span aria-hidden="true" style={STATUS_DOT[status.state]} />
        <span style={HEAD_TEXT}>
          <TitleWithStatus {...heading} />
          {!open && <span style={SUMMARY[status.state]}>{status.message ?? summary}</span>}
        </span>
      </button>
    </h2>
  );
}

interface FormSectionProps {
  title: string;
  layout: StudioLayout;
  /** sectionStatuses' entry for the section (R-72): red only for an error the form shows. */
  status: SectionStatus;
  /** What the header says while closed (SECTION_SUMMARY); an error's message replaces it. */
  summary: string;
  /** Wide: always. Narrow: the one open section. */
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * One of the studio form's four sections, a region named by its title. Wide,
 * its heading is plain and its body always shows. Narrow, the heading is the
 * accordion's toggle, and a closed section's fields unmount.
 */
export function FormSection({title, layout, status, summary, open, onToggle, children}: FormSectionProps) {
  const titleId = useId();
  const bodyId = useId();
  const heading = {titleId, title, status};
  return (
    <section
      aria-labelledby={titleId}
      style={{...SECTION, border: `1px solid ${open ? ADMIN_COLORS.strongBorder : ADMIN_COLORS.border}`}}>
      {layout === 'wide' ? (
        <PlainHeading {...heading} />
      ) : (
        <AccordionHeading {...heading} bodyId={bodyId} summary={summary} open={open} onToggle={onToggle} />
      )}
      {open && (
        <div id={bodyId} style={BODY}>
          {children}
        </div>
      )}
    </section>
  );
}

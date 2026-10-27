import {useRef} from 'react';
import {COLORS, CtaButton, InkIcon, LinkButton, SPACING, Tag} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import {CardId} from '../../ui/CardId';
import {entryName} from './githubClient';
import type {FeaturedSlot} from './featuredSlots';

const SLOT: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  minWidth: 0,
  padding: SPACING.lg,
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  // Longhands, so STAGED's borderColor never meets a border shorthand React would leave behind on Undo.
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: ADMIN_COLORS.border,
  borderRadius: ADMIN_RADIUS.panel,
};
// A staged pick's slot wears the accent edge, as a selected card button does (adm-card-btn).
const STAGED: React.CSSProperties = {backgroundColor: ADMIN_COLORS.accentTintSoft, borderColor: ADMIN_COLORS.accentStrong};
const INK_LINE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.sm,
  margin: 0,
  fontSize: ADMIN_TYPE.emphasis,
  fontWeight: 700,
  color: ADMIN_COLORS.text,
};
// The card's own proportions; the box shows until the art loads, and stays for a card with none.
const ART: React.CSSProperties = {
  display: 'block',
  width: '100%',
  aspectRatio: '5 / 7',
  overflow: 'hidden',
  borderRadius: ADMIN_RADIUS.box,
  backgroundColor: ADMIN_COLORS.card,
  border: `1px solid ${ADMIN_COLORS.divider}`,
};
const ART_IMAGE: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};
const NAME_LINE: React.CSSProperties = {display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm, minWidth: 0};
// The whole name, wrapped: on a phone's two columns a cut name would hide which version is featured.
const NAME: React.CSSProperties = {fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.text, overflowWrap: 'anywhere'};
const META: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted, overflowWrap: 'anywhere'};
const PROBLEM: React.CSSProperties = {...META, color: COLORS.error};

interface FeaturedSlotCardProps {
  slot: FeaturedSlot;
  /** The slot as the branch's file has it: differs from `slot` while a pick is staged. */
  saved: FeaturedSlot;
  /** Why this slot's card can't be featured, or null (slotProblem). */
  problem: string | null;
  /** Opens the slot's search. */
  onChange: () => void;
  /** Drops the slot's staged pick. */
  onUndo: () => void;
}

/** The slot's card name: the card list's full name, else the file's own line for it. */
const nameOf = (slot: FeaturedSlot) => slot.card?.fullName ?? entryName({id: slot.id, card: slot.label});

/** A staged pick's line: what the slot held before, and Undo. */
function WasLine({saved, onUndo}: {saved: FeaturedSlot; onUndo: () => void}) {
  const was = nameOf(saved);
  return (
    <p style={META}>
      Was {was}.{' '}
      {/* Named by its slot, so the six Undo buttons tell apart; the name starts with the visible word (2.5.3). */}
      <LinkButton type="button" tone="muted" aria-label={`Undo ${saved.ink}`} onClick={onUndo} style={{fontSize: ADMIN_TYPE.small}}>
        Undo
      </LinkButton>
    </p>
  );
}

/**
 * One of the homepage's six places: its ink, the card's art, full name and
 * id, what is wrong with it, and Change card. A staged pick shows "New", what
 * the slot held, and Undo.
 */
export function FeaturedSlotCard({slot, saved, problem, onChange, onUndo}: FeaturedSlotCardProps) {
  const staged = slot.id !== saved.id;
  const name = nameOf(slot);
  const ref = useRef<HTMLElement>(null);
  // Undo unmounts its own button: Change card, which stays, takes focus first, never <body>.
  const undo = () => {
    ref.current?.querySelector<HTMLElement>('[data-change-card]')?.focus();
    onUndo();
  };
  return (
    <section ref={ref} aria-label={`${slot.ink} slot`} style={staged ? {...SLOT, ...STAGED} : SLOT}>
      <h3 style={INK_LINE}>
        <InkIcon ink={slot.ink} size={20} />
        {slot.ink}
      </h3>
      <div style={ART}>{slot.card?.imageUrl && <img src={slot.card.imageUrl} alt="" style={ART_IMAGE} />}</div>
      <div style={{display: 'grid', gap: SPACING.xxs, minWidth: 0}}>
        <span style={NAME_LINE}>
          <span style={NAME}>{name}</span>
          {staged && <Tag>new</Tag>}
        </span>
        <p style={META}>
          <CardId id={slot.id} />
        </p>
      </div>
      {staged && <WasLine saved={saved} onUndo={undo} />}
      {problem && <p style={PROBLEM}>{problem}</p>}
      {/* Named by its slot (2.5.3), so the six buttons tell apart. */}
      <CtaButton
        type="button"
        variant="neutral"
        data-change-card
        aria-label={`Change card ${slot.ink}`} onClick={onChange} style={{marginTop: 'auto'}}>
        Change card
      </CtaButton>
    </section>
  );
}

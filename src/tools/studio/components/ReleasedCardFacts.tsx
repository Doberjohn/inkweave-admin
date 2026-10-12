import type {Ink, LorcanaCard} from 'inkweave-synergy-engine';
import {InkIcon, RaritySymbol, SPACING, rarityConfigOf} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {cardFacts} from '../../../ui/cardFacts';
import {Panel} from '../../../ui/Panel';

/** A glyph beside its name. */
const ICON_SIZE = 18;
/** What a missing value reads, as the change list prints one (changeRows). */
const MISSING = '—';

const FACTS: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'max-content minmax(0, 1fr)',
  gap: `${SPACING.sm}px ${SPACING.xl}px`,
  margin: 0,
  fontSize: ADMIN_TYPE.body,
};
const TERM: React.CSSProperties = {color: ADMIN_COLORS.muted};
const DETAIL: React.CSSProperties = {margin: 0, color: ADMIN_COLORS.text};
const MARKS: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.md};
const MARK: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: SPACING.xs};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

interface ReleasedCardFactsProps {
  card: LorcanaCard;
  /** Why the card opens image-only: IMAGE_ONLY_NOTES' line for its reason (R-61, R-65). */
  note: string;
}

/** A term and its value: the list's two columns. */
function Fact({term, children}: {term: string; children: React.ReactNode}) {
  return (
    <>
      <dt style={TERM}>{term}</dt>
      <dd style={DETAIL}>{children}</dd>
    </>
  );
}

/** One ink: its icon, and its name in words beside it. */
function InkName({ink}: {ink: Ink}) {
  return (
    <span style={MARK}>
      <InkIcon ink={ink} size={ICON_SIZE} />
      {ink}
    </span>
  );
}

/** The card's ink, or both for a dual-ink card, read "Ruby Sapphire": a flex row draws no space of its own. */
function InkNames({card}: {card: LorcanaCard}) {
  return (
    <span style={MARKS}>
      <InkName ink={card.ink} />
      {card.ink2 && (
        <>
          {' '}
          <InkName ink={card.ink2} />
        </>
      )}
    </span>
  );
}

/** The base rarity's glyph and name, as R3's header shows it (R-49), or — for a card with none. */
function RarityName({rarity}: {rarity: string | undefined}) {
  const config = rarityConfigOf(rarity);
  if (!config) return MISSING;
  return (
    <span style={MARK}>
      <RaritySymbol rarity={config.key} size={ICON_SIZE} />
      {config.name}
    </span>
  );
}

/**
 * What Edit card shows in place of the form for a card it can only give a new
 * image (R-61): a short read-only list of the card's facts, worded as Card
 * analytics words them (cardFacts), then why its fields can't change here. A
 * read-only list, not a disabled form: disabled controls would fail R-6's
 * contrast, and would suggest the card can be edited.
 */
export function ReleasedCardFacts({card, note}: ReleasedCardFactsProps) {
  return (
    <Panel title="Card data" action="read only">
      <dl style={FACTS}>
        <Fact term="Name">{card.name}</Fact>
        <Fact term="Version">{card.version ?? MISSING}</Fact>
        <Fact term="Set">{card.setCode ?? MISSING}</Fact>
        <Fact term="Collector number">{card.setNumber == null ? MISSING : `#${card.setNumber}`}</Fact>
        <Fact term="Ink">
          <InkNames card={card} />
        </Fact>
        <Fact term="Type">{cardFacts(card)}</Fact>
        <Fact term="Rarity">
          <RarityName rarity={card.rarity} />
        </Fact>
      </dl>
      <p style={NOTE}>{note}</p>
    </Panel>
  );
}

import {Link} from 'react-router-dom';
import {SPACING, TRUNCATE} from '../../app-bridge';
import {useIsKnownCard} from '../../shell/knownCards';
import {cardsHref} from '../../shell/nav';

/** The two cards a pair, a vote or a vote-log pair names. */
interface PairCards {
  a: string;
  b: string;
  aName: string;
  bName: string;
}

/**
 * Room round a line that clips, for a focused link's ring: adm-link's outline
 * is 2px wide and 2px out. The line pads by it and takes it back as a negative
 * margin, so the ring stays inside the clip and the line keeps its place.
 */
const RING_ROOM = SPACING.xs;

const LINE: React.CSSProperties = {...TRUNCATE, padding: RING_ROOM, margin: -RING_ROOM};

/**
 * A card's name: a link to its Card analytics page when the card list holds
 * the id (R-33), plain text otherwise. Most logged votes name a card outside
 * the list (rotated out of Core, or a preview id since released), and /cards
 * could only say it has no such card.
 */
export function CardName({id, name}: {id: string; name: string}) {
  const isKnownCard = useIsKnownCard();
  if (!isKnownCard(id)) return name;
  return (
    <Link to={cardsHref(id)} className="adm-link">
      {name}
    </Link>
  );
}

/** "Elsa × Anna", each name a CardName. Inline, so a heading or a cell lays it out. */
export function PairNames({pair}: {pair: PairCards}) {
  return (
    <>
      <CardName id={pair.a} name={pair.aName} />
      {' × '}
      <CardName id={pair.b} name={pair.bName} />
    </>
  );
}

/** PairNames on one line that ends in an ellipsis when it runs out of room: a log row, a list item. */
export function PairLine({pair}: {pair: PairCards}) {
  return (
    <div style={LINE}>
      <PairNames pair={pair} />
    </div>
  );
}

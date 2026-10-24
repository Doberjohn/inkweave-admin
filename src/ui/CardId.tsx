/** One click on the id selects all of it, ready to copy. */
const ID: React.CSSProperties = {userSelect: 'all'};

/**
 * A card's id as the app's card data holds it (allCards.json's `id`), read
 * "ID 3328": what the synergy files, the card pages and
 * VITE_FEATURED_CARD_IDS name a card by. It takes the type of the line it
 * sits in.
 */
export function CardId({id}: {id: string}) {
  return (
    <span>
      ID <code style={ID}>{id}</code>
    </span>
  );
}

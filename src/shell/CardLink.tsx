import type {CSSProperties, ReactNode} from 'react';
import {ArtLink} from '../ui/ArtLink';
import {useCardArt} from './knownCards';

interface CardLinkProps {
  /** Whose art the link previews: a card's id, or a printing's for that printing's art. */
  cardId: string;
  /** Where it goes: the card's analytics page, or Edit card. */
  to: string;
  /** The native tooltip: the whole name, for a link that cuts it short. */
  title?: string;
  style?: CSSProperties;
  /** The card's name, as the page prints it. */
  children: ReactNode;
}

/**
 * A card's name as a link inside data (adm-link) that shows the card's art
 * while a mouse rests on it or the keyboard focuses it (ArtLink). The art is
 * the card list's (CardArtContext): a card the list holds no art for is a
 * plain link, as is every card in a view rendered without the shell.
 */
export function CardLink({cardId, ...link}: CardLinkProps) {
  const artOf = useCardArt();
  return <ArtLink {...link} art={artOf(cardId)} />;
}

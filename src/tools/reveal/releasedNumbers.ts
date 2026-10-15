import type {LorcanaCard} from 'inkweave-synergy-engine';
import {hasPreviewId} from '../studio/branchCards';
import {REVEAL_SET_CODE} from './constants';
import type {ReleasedNumbers} from './validateForm';

/**
 * A reveal-set card with a collector number, under its official id rather than
 * a preview one (the deployed previewCards.json's, which existingIds covers).
 */
function isReleasedRevealCard(card: LorcanaCard): card is LorcanaCard & {setNumber: number} {
  if (card.setCode !== REVEAL_SET_CODE) return false;
  if (card.setNumber == null) return false;
  return !hasPreviewId(card);
}

/**
 * Each collector number a released card of the reveal set holds in the card
 * list, with that card: validateRevealCardForm's `released`. Once a set
 * graduates (Doberjohn/inkweave#780), its cards leave previewCards.json for
 * their official ids (14021 became 3286), so no preview id shows the number is
 * taken. The same map catches a new set's card published while the pin still
 * names the old set.
 */
export function releasedRevealNumbers(cards: readonly LorcanaCard[]): ReleasedNumbers {
  return new Map(
    cards.filter(isReleasedRevealCard).map((card) => [card.setNumber, {id: Number(card.id), fullName: card.fullName}]),
  );
}

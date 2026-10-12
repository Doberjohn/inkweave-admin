import type {LorcanaCard} from 'inkweave-synergy-engine';

/**
 * A card's type, cost and inkwell in one line: "Character · cost 3 · inkable".
 * Card analytics' header prints it (R3-6a), and so does Card studio's facts
 * list for a card it can only give a new image (R-61), so the two pages word a
 * card alike. Moved from analytics/cards/cardView.ts (R4-5f).
 */
export function cardFacts({type, cost, inkwell}: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string {
  return `${type} · cost ${cost} · ${inkwell ? 'inkable' : 'uninkable'}`;
}

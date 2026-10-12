import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS} from '../../app-bridge';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {RARITIES} from '../reveal/constants';

/*
 * The rules behind the studio's ink and rarity pickers (R4-5c): what each one
 * offers, and what a pick changes. The components are wiring over these.
 */

type InkFields = Pick<RevealCardForm, 'ink' | 'ink2'>;

/**
 * The rarities the studio offers (R-74): RARITIES less Enchanted, which is a
 * printing and never a card (variants.mjs stages printings). Epic and Iconic
 * were never in it (R-3). RARITIES itself is reveal-sync's (constants.ts, a
 * contract file), so it stays as it is.
 */
export const STUDIO_RARITIES: readonly string[] = RARITIES.filter((rarity) => rarity !== 'Enchanted');

/**
 * The rarity buttons after None: the studio's, plus the form's own rarity when
 * it is another one, so Edit never hides what a card holds. Picking any other
 * button drops the extra one, as an unlisted scan language's option does.
 */
export function rarityChoices(form: Pick<RevealCardForm, 'rarity'>): readonly string[] {
  const unlisted = form.rarity !== '' && !STUDIO_RARITIES.includes(form.rarity);
  return unlisted ? [...STUDIO_RARITIES, form.rarity] : STUDIO_RARITIES;
}

/** The Second ink row (R-75): every ink but the primary. */
export function secondInks(form: Pick<RevealCardForm, 'ink'>): readonly Ink[] {
  return ALL_INKS.filter((ink) => ink !== form.ink);
}

/** A primary ink pick (R-75). A primary equal to the second ink clears the second, so no card holds one ink twice. */
export function primaryInkPatch(pick: {form: InkFields; ink: Ink}): Partial<RevealCardForm> {
  return pick.form.ink2 === pick.ink ? {ink: pick.ink, ink2: ''} : {ink: pick.ink};
}

/** What follows "Ink ·" (R-75): "Amber", or "Amber / Ruby" for a dual-ink card. */
export function inkName(form: InkFields): string {
  return form.ink2 === '' ? form.ink : `${form.ink} / ${form.ink2}`;
}

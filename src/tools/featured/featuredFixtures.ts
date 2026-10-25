import type {LorcanaCard} from 'inkweave-synergy-engine';
import {featuredIdsJson, type FeaturedEntry} from '../../app-bridge';
import {lorcanaCard} from '../analytics/cards/cardFixtures';

/*
 * Featured cards fixtures, shared by the page's tests and its story. They live
 * in a plain module: Storybook reads every named export of a .stories.tsx file
 * as a story, and a story can't import a test file. The six are the
 * homepage's as Doberjohn/inkweave#957 left them.
 */

/** A card with art: imageUrl is what the homepage's pickFeatured and the slot search check. */
const withArt = (seed: Parameters<typeof lorcanaCard>[0]): LorcanaCard =>
  lorcanaCard({imageUrl: `/card-images/${seed.id}.avif`, ...seed});

export const MIGUEL = withArt({id: '3286', name: 'Miguel Rivera', version: 'Street Musician', ink: 'Amber', setCode: '14', setNumber: 21});
export const UN_POCO_LOCO = withArt({id: '3328', name: 'Un Poco Loco', ink: 'Amethyst', type: 'Action', setCode: '14', setNumber: 63});
export const MAX = withArt({id: '3354', name: 'Max Goof', version: 'Karaoke Star', ink: 'Emerald', setCode: '14', setNumber: 89});
export const HECTOR = withArt({id: '3386', name: 'Héctor Rivera', version: 'Gone to Pieces', ink: 'Ruby', setCode: '14', setNumber: 121});
export const BAYMAX = withArt({id: '3423', name: 'Baymax', version: 'Amped Up', ink: 'Sapphire', setCode: '14', setNumber: 158});
export const TIANA = withArt({id: '3461', name: 'Tiana', version: 'Party Hostess', ink: 'Steel', setCode: '14', setNumber: 196});

/** Another Amethyst card: the swap the issue rehearses. */
export const GOLIATH = withArt({id: '3318', name: 'Goliath', version: 'Transformed Warrior', ink: 'Amethyst', setCode: '14', setNumber: 53});
/** A dual-ink card, offered under Amethyst and under Sapphire. */
export const DUAL = withArt({id: '3032', name: 'Christopher Robin', version: 'Hunny Sage', ink: 'Amethyst', ink2: 'Sapphire', setCode: '13', setNumber: 61});
/** An Amethyst card with no art: never offered, and refused if the file names it. */
export const NO_ART = lorcanaCard({id: '3601', name: 'Madam Mim', version: 'Snake', ink: 'Amethyst', setCode: '13', setNumber: 71});

/** The homepage's six, Amber to Steel. */
export const SIX: readonly LorcanaCard[] = [MIGUEL, UN_POCO_LOCO, MAX, HECTOR, BAYMAX, TIANA];

/** Every card the fixtures' card list holds. */
export const FEATURED_CARDS: readonly LorcanaCard[] = [...SIX, GOLIATH, DUAL, NO_ART];

/** featuredCardIds.json's entries for `cards`, as the app writes them. */
export const entriesFor = (cards: readonly LorcanaCard[]): FeaturedEntry[] =>
  cards.map((card) => ({id: card.id, card: `${card.ink2 ? `${card.ink}-${card.ink2}` : card.ink}: ${card.fullName}`}));

/** The file as the app keeps it, listing `cards`. */
export const featuredFileText = (cards: readonly LorcanaCard[] = SIX): string => featuredIdsJson(entriesFor(cards));

/** The card list's lookup, over FEATURED_CARDS. */
export const cardByIdIn =
  (cards: readonly LorcanaCard[] = FEATURED_CARDS) =>
  (id: string): LorcanaCard | undefined =>
    cards.find((card) => card.id === id);

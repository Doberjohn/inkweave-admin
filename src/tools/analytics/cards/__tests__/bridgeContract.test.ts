import {afterEach, describe, expect, it, vi} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {
  TIER_COLORS,
  fetchCardSynergies,
  getStrengthTier,
  searchCardsByName,
  type StrengthTierLabel,
} from '../../../../app-bridge';

// What R3's card pages count on in the app code R3-1 bridges. A pin bump that
// changes any of it fails here first.

afterEach(() => vi.unstubAllGlobals());

const JSON_TYPE = {headers: {'content-type': 'application/json'}};
const NO_SYNERGIES = {groups: [], pairs: {}};
const SYNERGIES = {groups: [], pairs: {'2': {connections: [], aggregateScore: 8}}};

/** A fresh response per call: a body can only be read once. */
const json = () => new Response(JSON.stringify(SYNERGIES), JSON_TYPE);

describe('getStrengthTier', () => {
  it.each<{score: number; label: StrengthTierLabel; color: string}>([
    {score: 9.5, label: 'Perfect', color: TIER_COLORS.perfect.color},
    {score: 9.49, label: 'Strong', color: TIER_COLORS.strong.color},
    {score: 7, label: 'Strong', color: TIER_COLORS.strong.color},
    {score: 6.99, label: 'Moderate', color: TIER_COLORS.moderate.color},
    {score: 4, label: 'Moderate', color: TIER_COLORS.moderate.color},
    {score: 3.99, label: 'Weak', color: TIER_COLORS.weak.color},
  ])("reads $score as $label, in that tier's TIER_COLORS colour", ({score, label, color}) => {
    expect(getStrengthTier(score)).toMatchObject({label, color});
  });
});

// The app keeps each id's result in module state for the session, and no test
// can empty it, so every case below asks for an id of its own.
describe('fetchCardSynergies', () => {
  it("passes the card's synergy file through, and reads it once", async () => {
    const fetchMock = vi.fn(async () => json());
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCardSynergies('read-once')).resolves.toEqual(SYNERGIES);
    await expect(fetchCardSynergies('read-once')).resolves.toEqual(SYNERGIES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/data/synergies/read-once.json');
  });

  it.each([
    {name: 'a 404', id: 'empty-404', response: () => new Response('', {status: 404})},
    {name: 'a 500', id: 'empty-500', response: () => new Response('', {status: 500})},
    {
      name: "an HTML 200 (the dev server's fallback page)",
      id: 'empty-html',
      response: () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}}),
    },
  ])('reads $name as no synergies, and keeps that for the session', async ({id, response}) => {
    const fetchMock = vi.fn(async () => response());
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCardSynergies(id)).resolves.toEqual(NO_SYNERGIES);
    await expect(fetchCardSynergies(id)).resolves.toEqual(NO_SYNERGIES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: 'a network failure',
      id: 'reject-network',
      failure: async (): Promise<Response> => {
        throw new TypeError('Failed to fetch');
      },
    },
    {name: 'malformed JSON', id: 'reject-json', failure: async () => new Response('{', JSON_TYPE)},
  ])('rejects on $name and keeps nothing, so the next call fetches again', async ({id, failure}) => {
    const fetchMock = vi.fn().mockImplementationOnce(failure).mockImplementationOnce(async () => json());
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCardSynergies(id)).rejects.toThrow();
    await expect(fetchCardSynergies(id)).resolves.toEqual(SYNERGIES);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// R3-5's switcher says "No cards match." when this finds nothing (R-30).
describe('searchCardsByName', () => {
  const ELSA: LorcanaCard = {
    id: '2983',
    name: 'Elsa',
    version: 'Snow Queen',
    fullName: 'Elsa - Snow Queen',
    cost: 1,
    ink: 'Amber',
    inkwell: true,
    type: 'Character',
  };
  const ANNA: LorcanaCard = {
    ...ELSA,
    id: '17',
    name: 'Anna',
    version: 'Heir to Arendelle',
    fullName: 'Anna - Heir to Arendelle',
  };

  it("matches a card's name or version in any case, never its id", () => {
    expect(searchCardsByName([ELSA, ANNA], 'elsa')).toEqual([ELSA]);
    expect(searchCardsByName([ELSA, ANNA], 'HEIR')).toEqual([ANNA]);
    expect(searchCardsByName([ELSA, ANNA], '2983')).toEqual([]);
  });
});

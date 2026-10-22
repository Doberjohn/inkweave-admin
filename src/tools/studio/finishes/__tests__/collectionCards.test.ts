import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {isCoreSet, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import {
  COLLECTION_ONLY_SETS,
  fetchCollectionOnlyCards,
  resetCollectionOnlyCards,
  useCollectionOnlyCards,
} from '../collectionCards';
import {deferredResponse} from './branchHarness';
import {chunksOf, stubChunks} from './collectionHarness';
import {MICKEY_ENTRY, SET_4_ENTRIES} from './finishFixtures';

/** A card of Set 7 (a Mickey Mouse in disguise), to tell the chunks' order from the order they answer in. */
const SET_7_ENTRY: LorcanaJSONCard = {...MICKEY_ENTRY, id: 1500, setCode: '7', number: 1};

/** Where the app serves a set's chunk. */
const urlOf = (set: string) => `/data/collection/${set}.json`;
const ids = (cards: readonly {id: string}[]) => cards.map((card) => card.id);
/** The addresses a stubbed fetch was asked for, in order. */
const askedOf = (fetchMock: {mock: {calls: unknown[][]}}) => fetchMock.mock.calls.map(([url]) => url);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('COLLECTION_ONLY_SETS', () => {
  // The app's card list holds the Core sets; these are the ones it leaves out. When a rotation moves the
  // floor, this fails first, and the copy that says "Sets 1 to 8" (studioCopy.ts, EditPane.tsx) wants a look.
  it('is every set below the Core floor, and no other', () => {
    const floor = COLLECTION_ONLY_SETS.length + 1;
    expect(COLLECTION_ONLY_SETS).toEqual(Array.from({length: floor - 1}, (_, i) => String(i + 1)));
    expect(isCoreSet(floor - 1)).toBe(false);
    expect(isCoreSet(floor)).toBe(true);
  });
});

describe('fetchCollectionOnlyCards', () => {
  it('loads Sets 1 to 8 once and keeps their cards only', async () => {
    const fetchMock = vi.fn(async (url: string) => Response.json(url.endsWith('/4.json') ? SET_4_ENTRIES : []));
    vi.stubGlobal('fetch', fetchMock);
    const cards = await fetchCollectionOnlyCards();
    expect(askedOf(fetchMock)).toEqual(COLLECTION_ONLY_SETS.map(urlOf));
    // Her Enchanted (900) and her alt foil (946) name her as their base: printings, not cards.
    expect(ids(cards)).toEqual(['750']);
    await fetchCollectionOnlyCards();
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it("builds each card as the app's loader does: its art's URL comes with it", async () => {
    stubChunks(chunksOf({'4': SET_4_ENTRIES}));
    const [yenSid] = await fetchCollectionOnlyCards();
    expect(yenSid).toMatchObject({
      id: '750',
      fullName: 'Yen Sid - Powerful Sorcerer',
      setCode: '4',
      setNumber: 59,
      imageUrl: '/card-images/en/set4/59_76659fe23e04491738b6dd45a0cea0f9ee249b8b.jpg',
    });
  });

  it('keeps the cards in the order of their sets, whichever chunk answers first', async () => {
    const first = deferredResponse();
    const answer = chunksOf({'1': [MICKEY_ENTRY], '7': [SET_7_ENTRY]});
    stubChunks((set) => (set === '1' ? first.response : answer(set)));
    const read = fetchCollectionOnlyCards();
    // Set 7's chunk is in before Set 1's.
    await act(async () => {});
    first.respond(Response.json([MICKEY_ENTRY]));
    expect(ids(await read)).toEqual(['115', '1500']);
  });

  it('shares a read that is under way', async () => {
    const fetchMock = stubChunks();
    const [first, second] = await Promise.all([fetchCollectionOnlyCards(), fetchCollectionOnlyCards()]);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('does not keep a read that failed: the next ask reads every chunk again', async () => {
    let served = false;
    const answer = chunksOf({'4': SET_4_ENTRIES});
    const fetchMock = stubChunks((set) => (!served && set === '6' ? new Response('Server Error', {status: 500}) : answer(set)));
    await expect(fetchCollectionOnlyCards()).rejects.toThrow('/data/collection/6.json: HTTP 500');

    served = true;
    expect(ids(await fetchCollectionOnlyCards())).toEqual(['750']);
    expect(fetchMock).toHaveBeenCalledTimes(16);
  });

  // inkweave.ink answers an address it has no file for with its page, and a 200 (the SPA rewrite).
  it('reads a chunk that comes back as the app’s page, not JSON, as a failure', async () => {
    stubChunks((set) =>
      set === '2' ? new Response('<!doctype html><title>Inkweave</title>', {headers: {'content-type': 'text/html'}}) : Response.json([]),
    );
    await expect(fetchCollectionOnlyCards()).rejects.toMatchObject({name: 'SyntaxError'});
  });
});

describe('resetCollectionOnlyCards', () => {
  it('forgets what was read, so the next ask reads again', async () => {
    const fetchMock = stubChunks();
    await fetchCollectionOnlyCards();
    resetCollectionOnlyCards();
    await fetchCollectionOnlyCards();
    expect(fetchMock).toHaveBeenCalledTimes(16);
  });
});

describe('useCollectionOnlyCards', () => {
  it('reads Sets 1 to 8 when it mounts: loading, then their cards', async () => {
    const fetchMock = stubChunks(chunksOf({'4': SET_4_ENTRIES}));
    const {result} = renderHook(() => useCollectionOnlyCards());
    expect({status: result.current.status, cards: result.current.cards}).toEqual({status: 'loading', cards: []});

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(ids(result.current.cards)).toEqual(['750']);
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('starts with the cards in when a read has already landed, with no loading frame in between', async () => {
    const fetchMock = stubChunks(chunksOf({'4': SET_4_ENTRIES}));
    await fetchCollectionOnlyCards();
    const {result} = renderHook(() => useCollectionOnlyCards());
    expect(result.current.status).toBe('ready');
    expect(ids(result.current.cards)).toEqual(['750']);
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('shares one read between everything that mounts it', async () => {
    const fetchMock = stubChunks(chunksOf({'4': SET_4_ENTRIES}));
    const first = renderHook(() => useCollectionOnlyCards());
    const second = renderHook(() => useCollectionOnlyCards());
    await waitFor(() => expect([first.result.current.status, second.result.current.status]).toEqual(['ready', 'ready']));
    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(second.result.current.cards).toBe(first.result.current.cards);
  });

  it('says error when a chunk fails, and retry reads them again', async () => {
    let failing = true;
    const answer = chunksOf({'4': SET_4_ENTRIES});
    const fetchMock = stubChunks((set) => (failing && set === '3' ? new Response('Unavailable', {status: 503}) : answer(set)));
    const {result} = renderHook(() => useCollectionOnlyCards());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.cards).toEqual([]);

    failing = false;
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(ids(result.current.cards)).toEqual(['750']);
    expect(fetchMock).toHaveBeenCalledTimes(16);
  });

  it('says error again when the retry fails too', async () => {
    const fetchMock = stubChunks(() => new Response('Unavailable', {status: 503}));
    const {result} = renderHook(() => useCollectionOnlyCards());
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(16));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('reads nothing again when it is asked to retry while the cards are in, or on their way', async () => {
    const held = deferredResponse();
    const answer = chunksOf({'4': SET_4_ENTRIES});
    const fetchMock = stubChunks((set) => (set === '4' ? held.response : answer(set)));
    const {result} = renderHook(() => useCollectionOnlyCards());
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');

    held.respond(Response.json(SET_4_ENTRIES));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.retry());
    expect(result.current.status).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});

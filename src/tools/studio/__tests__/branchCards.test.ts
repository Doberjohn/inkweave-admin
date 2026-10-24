import {afterEach, describe, expect, it, vi} from 'vitest';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON, REVEAL_ID_BASE, REVEAL_SET_CODE, transformRawCards} from '../../../app-bridge';
import {
  branchLookup,
  deployedOf,
  editSources,
  goneNote,
  hasPreviewId,
  isPrintingsOnly,
  isRevealPreview,
  withCollectionCards,
  type CardListView,
} from '../branchCards';
import {editLookup, type EditLookup} from '../editorState';
import type {CollectionOnlyCards} from '../finishes/collectionCards';
import {URSULA_SET_3, YEN_SID} from '../finishes/__tests__/finishFixtures';
import type {PreviewCardsFile} from '../previewCardsFile';
import {
  BRANCH_ONLY_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  RELEASED_REVEAL_CARD,
  cardOf,
  previewEntry,
  studioCard,
} from '../studioFixtures';

/** The card list as the shell holds it, loaded by default. */
function listOf({cards = [], isLoading = false, error = null}: Partial<CardListView> = {}): CardListView {
  return {cards, isLoading, error, getCardById: (id) => cards.find((card) => card.id === id)};
}

/** previewCards.json once a read of it has landed. */
function readFile(cards: LorcanaJSONCard[]): Extract<PreviewCardsFile, {status: 'ready'}> {
  return {status: 'ready', cards, ids: new Set(cards.map((entry) => entry.id)), read: 1};
}

/** A ready lookup, as editLookup gives one: the card, and its entry in the read file (null when the file lacks it). */
function ready({card, entry = null}: {card: LorcanaCard; entry?: LorcanaJSONCard | null}): EditLookup {
  return {kind: 'ready', card, entry, imageOnly: entry === null ? 'released' : null};
}

const ids = (cards: readonly LorcanaCard[]) => cards.map((card) => card.id);

const LISTED_PREVIEW = cardOf(PREVIEW_ENTRY);
const BRANCH_ONLY_ID = String(BRANCH_ONLY_ENTRY.id);
/** Mei after graduation: the reveal set's card under its allCards.json id, outside the reveal band. */
const RELEASED_MEI = studioCard({id: '1936', name: 'Mei', version: 'Red Panda', setCode: REVEAL_SET_CODE});

describe('editSources', () => {
  it('puts each branch-file entry the card list lacks first, and finds it by id', () => {
    const {list} = editSources({
      list: listOf({cards: [LISTED_PREVIEW, RELEASED_CARD]}),
      file: readFile([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]),
    });
    expect(ids(list.cards)).toEqual([BRANCH_ONLY_ID, LISTED_PREVIEW.id, RELEASED_CARD.id]);
    expect(list.branchOnlyIds).toEqual(new Set([BRANCH_ONLY_ENTRY.id]));
    expect(list.getCardById(BRANCH_ONLY_ID)?.fullName).toBe('Wren - Night Busker');
    expect(list.getCardById(RELEASED_CARD.id)).toBe(RELEASED_CARD);
  });

  it.each<{name: string; listed: CardListView; file: PreviewCardsFile}>([
    {name: 'the card list is loading', listed: listOf({isLoading: true}), file: readFile([BRANCH_ONLY_ENTRY])},
    {
      name: 'the card list failed',
      listed: listOf({error: new Error('Failed to fetch local cards: 500')}),
      file: readFile([BRANCH_ONLY_ENTRY]),
    },
    {name: 'the file is loading', listed: listOf({cards: [RELEASED_CARD]}), file: {status: 'loading'}},
    {name: 'the file failed', listed: listOf({cards: [RELEASED_CARD]}), file: {status: 'error', error: 'GitHub 500 on previewCards.json'}},
  ])('adds nothing while $name', ({listed, file}) => {
    const {list} = editSources({list: listed, file});
    expect(list.cards).toBe(listed.cards);
    expect(list.branchOnlyIds.size).toBe(0);
  });

  it("builds a branch-only card as the app's loader does: its art's URL, its scan language and its printings", () => {
    const printing = {id: REVEAL_ID_BASE + 213, rarity: 'Epic' as const, number: 213, scanLanguage: 'it'};
    const entry = {...BRANCH_ONLY_ENTRY, scanLanguage: 'ja', variants: [printing]};
    const card = editSources({list: listOf(), file: readFile([entry])}).list.getCardById(BRANCH_ONLY_ID);
    expect(card).toMatchObject({imageUrl: `/card-images-preview/${entry.id}.avif`, scanLanguage: 'ja'});
    expect(card?.variants).toEqual([
      {id: String(printing.id), rarity: 'Epic', number: 213, imageUrl: `/card-images-preview/${printing.id}.avif`, scanLanguage: 'it'},
    ]);
  });

  it('passes through what the sources carry besides, such as retryLoad and reload', () => {
    const list = {...listOf(), retryLoad: vi.fn()};
    const file = {...readFile([BRANCH_ONLY_ENTRY]), reload: vi.fn()};
    const sources = editSources({list, file});
    expect(sources.list.retryLoad).toBe(list.retryLoad);
    expect(sources.file.reload).toBe(file.reload);
  });

  it('drops an entry whose id the card list holds as a released card, so it reads Released (allCards wins)', () => {
    const shadow = previewEntry({id: Number(RELEASED_MEI.id)});
    const {list, file} = editSources({
      list: listOf({cards: [RELEASED_MEI, LISTED_PREVIEW]}),
      file: readFile([shadow, PREVIEW_ENTRY]),
    });
    expect(file).toMatchObject({cards: [PREVIEW_ENTRY], ids: new Set([PREVIEW_ENTRY.id])});
    expect(ids(list.cards)).toEqual([RELEASED_MEI.id, LISTED_PREVIEW.id]);
  });

  it('hands the file on as it is when it drops nothing', () => {
    const file = readFile([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);
    expect(editSources({list: listOf({cards: [LISTED_PREVIEW]}), file}).file).toBe(file);
  });
});

/** A failed read of Sets 1 to 8, in the words the collection hook hands it over in. */
const CHUNK_FAILED = '/data/collection/3.json: HTTP 500';

/** Sets 1 to 8 as the collection hook hands them over: `status` says whether `cards` are in, and a failed read alone says why. */
function collectionOf({
  cards = [],
  status = 'ready',
}: {cards?: readonly LorcanaCard[]; status?: CollectionOnlyCards['status']} = {}): CollectionOnlyCards {
  const read = status === 'error' ? {status, error: CHUNK_FAILED} : {status, error: null};
  return {cards, ...read, retry: vi.fn()};
}

describe('withCollectionCards', () => {
  it('puts the cards of Sets 1 to 8 after the card list’s, and finds them by id', () => {
    const list = withCollectionCards({
      list: listOf({cards: [LISTED_PREVIEW, RELEASED_CARD]}),
      collection: collectionOf({cards: [YEN_SID]}),
    });
    expect(ids(list.cards)).toEqual([LISTED_PREVIEW.id, RELEASED_CARD.id, YEN_SID.id]);
    expect(list.getCardById(YEN_SID.id)).toBe(YEN_SID);
    expect(list.getCardById(RELEASED_CARD.id)).toBe(RELEASED_CARD);
    expect(list.getCardById('999999')).toBeUndefined();
  });

  it('comes after editSources’ branch-only cards, which still lead', () => {
    const sources = editSources({
      list: listOf({cards: [LISTED_PREVIEW, RELEASED_CARD]}),
      file: readFile([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]),
    });
    const list = withCollectionCards({list: sources.list, collection: collectionOf({cards: [YEN_SID]})});
    expect(ids(list.cards)).toEqual([BRANCH_ONLY_ID, LISTED_PREVIEW.id, RELEASED_CARD.id, YEN_SID.id]);
    // What editSources adds passes through: the branch-only card is still not deployed (R-66).
    expect(list.branchOnlyIds).toEqual(new Set([BRANCH_ONLY_ENTRY.id]));
    expect(list.getCardById(BRANCH_ONLY_ID)?.fullName).toBe('Wren - Night Busker');
  });

  it('lets the card list win an id both hold', () => {
    const impostor = {...YEN_SID, name: 'Not Yen Sid'};
    const list = withCollectionCards({list: listOf({cards: [impostor]}), collection: collectionOf({cards: [YEN_SID]})});
    expect(list.getCardById(YEN_SID.id)).toBe(impostor);
  });

  it('lists a card both hold once, as the card list’s, and the other cards of Sets 1 to 8 after it', () => {
    const impostor = {...YEN_SID, name: 'Not Yen Sid'};
    const list = withCollectionCards({
      list: listOf({cards: [impostor, RELEASED_CARD]}),
      collection: collectionOf({cards: [YEN_SID, URSULA_SET_3]}),
    });
    expect(ids(list.cards)).toEqual([YEN_SID.id, RELEASED_CARD.id, URSULA_SET_3.id]);
    expect(list.cards[0]).toBe(impostor);
  });

  // #74: a card the list holds opens without waiting for Sets 1 to 8, so only the list's own load is loading. An id
  // the list lacks may be one of theirs, so setsLoading has it wait for them (branchLookup).
  it.each<{
    name: string;
    listed: Partial<CardListView>;
    status: CollectionOnlyCards['status'];
    isLoading: boolean;
    setsLoading: boolean;
  }>([
    {name: 'both are in', listed: {}, status: 'ready', isLoading: false, setsLoading: false},
    {name: 'Sets 1 to 8 are loading', listed: {}, status: 'loading', isLoading: false, setsLoading: true},
    {name: 'the card list is loading', listed: {isLoading: true}, status: 'ready', isLoading: true, setsLoading: false},
    {name: 'both are loading', listed: {isLoading: true}, status: 'loading', isLoading: true, setsLoading: true},
    {
      name: 'Sets 1 to 8 failed, so the search goes on without them',
      listed: {},
      status: 'error',
      isLoading: false,
      setsLoading: false,
    },
  ])(
    'is loading while the card list loads, and setsLoading until Sets 1 to 8 are in: $name',
    ({listed, status, isLoading, setsLoading}) => {
      const list = withCollectionCards({list: listOf(listed), collection: collectionOf({status})});
      expect({isLoading: list.isLoading, setsLoading: list.setsLoading}).toEqual({isLoading, setsLoading});
    },
  );

  it('leaves the card list’s error as it is, and takes none from a failure of Sets 1 to 8', () => {
    const failed = new Error('Failed to fetch local cards: 500');
    expect(withCollectionCards({list: listOf({error: failed}), collection: collectionOf()}).error).toBe(failed);
    expect(withCollectionCards({list: listOf(), collection: collectionOf({status: 'error'})}).error).toBeNull();
  });

  it.each<CollectionOnlyCards['status']>(['loading', 'error'])('holds the card list’s cards alone while Sets 1 to 8 are %s', (status) => {
    const list = withCollectionCards({list: listOf({cards: [RELEASED_CARD]}), collection: collectionOf({status})});
    expect(ids(list.cards)).toEqual([RELEASED_CARD.id]);
    expect(list.getCardById(YEN_SID.id)).toBeUndefined();
  });

  it('passes through what the card list carries besides, such as retryLoad', () => {
    const list = {...listOf(), retryLoad: vi.fn()};
    expect(withCollectionCards({list, collection: collectionOf()}).retryLoad).toBe(list.retryLoad);
  });
});

// Sets 1 to 8 rotated out of Core, so allCards.json no longer holds them: only their printings' versions change here.
describe('isPrintingsOnly', () => {
  it.each<{name: string; card: Pick<LorcanaCard, 'setCode'> | null; expected: boolean}>([
    {name: 'a card of Set 4', card: YEN_SID, expected: true},
    {name: 'a card of Set 1', card: {setCode: '1'}, expected: true},
    {name: 'a card of Set 8, the last below Core', card: {setCode: '8'}, expected: true},
    {name: 'a card with no set code, which the engine does not call Core either', card: {}, expected: true},
    {name: 'a card of Set 9, the first Core set', card: RELEASED_CARD, expected: false},
    {name: 'a card of the reveal set', card: LISTED_PREVIEW, expected: false},
    {name: 'no card open', card: null, expected: false},
  ])('$name: $expected', ({card, expected}) => {
    expect(isPrintingsOnly(card)).toBe(expected);
  });
});

describe('hasPreviewId', () => {
  it.each<{name: string; card: Pick<LorcanaCard, 'id' | 'setCode'>; expected: boolean}>([
    {name: 'a numbered card of the reveal set', card: {id: String(REVEAL_ID_BASE + 21), setCode: REVEAL_SET_CODE}, expected: true},
    {name: 'an unnumbered one, in the +900 band', card: {id: String(REVEAL_ID_BASE + 901), setCode: REVEAL_SET_CODE}, expected: true},
    {name: "the next set's preview, while the pin lags a season (R-65)", card: {id: '15001', setCode: '15'}, expected: true},
    {name: 'the reveal set released, under its allCards.json id', card: {id: RELEASED_MEI.id, setCode: REVEAL_SET_CODE}, expected: false},
    {name: "another set's released card", card: {id: RELEASED_CARD.id, setCode: '9'}, expected: false},
    {name: 'an id past the band', card: {id: String(REVEAL_ID_BASE + 1000), setCode: REVEAL_SET_CODE}, expected: false},
    {name: 'a card with no set', card: {id: String(REVEAL_ID_BASE + 21)}, expected: false},
  ])('$name: $expected', ({card, expected}) => {
    expect(hasPreviewId(card)).toBe(expected);
  });
});

// Only such a card waits for the branch file (R-71). Any card under a preview id reads gone once a read lacks it.
describe('isRevealPreview', () => {
  it.each<{name: string; card: Pick<LorcanaCard, 'id' | 'setCode'>; expected: boolean}>([
    {name: 'a numbered card of the reveal set', card: {id: String(REVEAL_ID_BASE + 21), setCode: REVEAL_SET_CODE}, expected: true},
    {name: 'an unnumbered one, in the +900 band', card: {id: String(REVEAL_ID_BASE + 901), setCode: REVEAL_SET_CODE}, expected: true},
    {name: 'the reveal set released, under its official id', card: RELEASED_REVEAL_CARD, expected: false},
    {name: "the next set's preview, while the pin lags a season (R-65)", card: {id: '15001', setCode: '15'}, expected: false},
    {name: "another set's released card", card: RELEASED_CARD, expected: false},
  ])('$name: $expected', ({card, expected}) => {
    expect(isRevealPreview(card)).toBe(expected);
  });
});

describe('branchLookup', () => {
  const FILE_ERROR = 'GitHub 500 on apps/web/public/data/previewCards.json: Server error';
  const MISSING: EditLookup = {kind: 'missing', cardId: '14999'};
  /** The next set's preview card, while admin's pin still names this set (R-65). */
  const NEXT_SET_PREVIEW = studioCard({id: '15001', name: 'Stitch', setCode: '15'});

  it.each<{name: string; lookup: EditLookup; file: PreviewCardsFile; expected: EditLookup}>([
    {name: 'an id neither source holds waits for the file', lookup: MISSING, file: {status: 'loading'}, expected: {kind: 'loading'}},
    {
      name: "a failed read is the file's error, not missing",
      lookup: MISSING,
      file: {status: 'error', error: FILE_ERROR},
      expected: {kind: 'fileFailed', error: FILE_ERROR},
    },
    {name: 'an id neither holds is missing once the file is read', lookup: MISSING, file: readFile([]), expected: MISSING},
    {
      name: 'a reveal-set card the file no longer holds is gone',
      lookup: ready({card: LISTED_PREVIEW}),
      file: readFile([]),
      expected: {kind: 'gone', card: LISTED_PREVIEW},
    },
    {
      name: 'a reveal-set card the file holds stays ready',
      lookup: ready({card: LISTED_PREVIEW, entry: PREVIEW_ENTRY}),
      file: readFile([PREVIEW_ENTRY]),
      expected: ready({card: LISTED_PREVIEW, entry: PREVIEW_ENTRY}),
    },
    {
      name: "a released card stays ready, and doesn't wait for the file (R-71)",
      lookup: ready({card: RELEASED_CARD}),
      file: {status: 'loading'},
      expected: ready({card: RELEASED_CARD}),
    },
    {
      name: 'the reveal set released under its allCards.json id is never gone',
      lookup: ready({card: RELEASED_MEI}),
      file: readFile([]),
      expected: ready({card: RELEASED_MEI}),
    },
    {
      name: "another set's preview card the read file no longer holds is gone too (R-65)",
      lookup: ready({card: NEXT_SET_PREVIEW}),
      file: readFile([]),
      expected: {kind: 'gone', card: NEXT_SET_PREVIEW},
    },
    // It opens straight from the card list (R-71), so its entry is null before a read lands as well.
    {
      name: "another set's preview card stays ready while the file loads",
      lookup: ready({card: NEXT_SET_PREVIEW}),
      file: {status: 'loading'},
      expected: ready({card: NEXT_SET_PREVIEW}),
    },
    {
      name: "another set's preview card stays ready after a failed read",
      lookup: ready({card: NEXT_SET_PREVIEW}),
      file: {status: 'error', error: FILE_ERROR},
      expected: ready({card: NEXT_SET_PREVIEW}),
    },
    // A failed reload keeps the cards an earlier read gave, beside its error (C1): that read lacked the card.
    {
      name: "another set's preview card stays gone while a reload fails",
      lookup: ready({card: NEXT_SET_PREVIEW}),
      file: {...readFile([]), reloadError: FILE_ERROR},
      expected: {kind: 'gone', card: NEXT_SET_PREVIEW},
    },
    {name: 'no card stays no card', lookup: {kind: 'none'}, file: readFile([]), expected: {kind: 'none'}},
  ])('$name', ({lookup, file, expected}) => {
    expect(branchLookup({lookup, file, setsLoading: false})).toEqual(expected);
  });
});

/*
 * #74: Edit's lookup over the card list with Sets 1 to 8 after it, as useCardEditor wires it. A card the list holds
 * opens without them; an id it lacks may be one of theirs, so it waits for them, then for the branch file, before it
 * reads missing.
 */
describe('the lookup while Sets 1 to 8 are read (#74)', () => {
  const FILE_ERROR = 'GitHub 500 on apps/web/public/data/previewCards.json: Server error';

  /** Edit's lookup for `cardId` over a card list that holds RELEASED_CARD, with Sets 1 to 8 as `collection` has them. */
  function lookupOf({cardId, collection, file = readFile([])}: {cardId: string; collection: CollectionOnlyCards; file?: PreviewCardsFile}) {
    const list = withCollectionCards({list: listOf({cards: [RELEASED_CARD]}), collection});
    return branchLookup({lookup: editLookup({cardId, list, file}), file, setsLoading: list.setsLoading});
  }

  it('opens a Core card the list holds while Sets 1 to 8 still load', () => {
    expect(lookupOf({cardId: RELEASED_CARD.id, collection: collectionOf({status: 'loading'})})).toEqual(ready({card: RELEASED_CARD}));
  });

  it('reads an id the list lacks as loading while Sets 1 to 8 load, and as missing once they failed', () => {
    expect(lookupOf({cardId: YEN_SID.id, collection: collectionOf({status: 'loading'})})).toEqual({kind: 'loading'});
    expect(lookupOf({cardId: YEN_SID.id, collection: collectionOf({status: 'error'})})).toEqual({kind: 'missing', cardId: YEN_SID.id});
  });

  it('waits for Sets 1 to 8 before the branch file has its say on an id the list lacks', () => {
    const file: PreviewCardsFile = {status: 'error', error: FILE_ERROR};
    expect(lookupOf({cardId: YEN_SID.id, collection: collectionOf({status: 'loading'}), file})).toEqual({kind: 'loading'});
    expect(lookupOf({cardId: YEN_SID.id, collection: collectionOf({status: 'error'}), file})).toEqual({kind: 'fileFailed', error: FILE_ERROR});
  });
});

describe('deployedOf', () => {
  const branchOnlyIds = new Set([BRANCH_ONLY_ENTRY.id]);

  it.each<{name: string; lookup: EditLookup; expected: boolean}>([
    {
      name: 'a card only the branch file holds is not deployed yet',
      lookup: ready({card: cardOf(BRANCH_ONLY_ENTRY), entry: BRANCH_ONLY_ENTRY}),
      expected: false,
    },
    {name: 'a card the card list holds is deployed', lookup: ready({card: LISTED_PREVIEW, entry: PREVIEW_ENTRY}), expected: true},
    {name: 'with no card open, nothing is waiting', lookup: {kind: 'none'}, expected: true},
  ])('$name', ({lookup, expected}) => {
    expect(deployedOf({lookup, branchOnlyIds})).toBe(expected);
  });
});

describe('goneNote', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Gone is graduation's, or a rehearsal branch's: a preview card published to master after the branch was cut (R-86).
  it('names the card and the branch, says nothing can be saved, and leaves the cause open', () => {
    expect(goneNote(LISTED_PREVIEW)).toBe(
      "Mei - Red Panda is no longer in previewCards.json on master, so it can't be saved here. " +
        'If its set was released, inkweave.ink lists the card under a new id once the release deploys: reload admin then, and find it by name.',
    );
  });

  it('names the target branch, not master, while the tools rehearse on another', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearsal');
    expect(goneNote(LISTED_PREVIEW)).toMatch(/^Mei - Red Panda is no longer in previewCards\.json on rehearsal, /);
  });
});

// What R-66 counts on in the app's transformRawCards at the pin: a pin bump that
// changes how a preview entry's art resolves fails here first.
describe('transformRawCards, through the bridge', () => {
  it('builds every pinned entry, and a local one, with its art under /card-images-preview/', () => {
    // The local entry keeps the case meaningful once graduation empties the file.
    const pinned = (JSON.parse(PINNED_PREVIEW_CARDS_JSON) as {cards: LorcanaJSONCard[]}).cards;
    const entries = [...pinned, BRANCH_ONLY_ENTRY];
    expect(transformRawCards(entries).map((card) => [card.id, card.imageUrl])).toEqual(
      entries.map((entry) => [String(entry.id), `/card-images-preview/${entry.id}.avif`]),
    );
  });
});

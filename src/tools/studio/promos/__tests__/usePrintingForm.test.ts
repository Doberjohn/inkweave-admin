import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {pngFile} from '../../../../test/images';
import {deferredResponse, type Served} from '../../finishes/__tests__/branchHarness';
import {COMMIT_URL, moved, notAFastForward, stubRepo} from '../../finishes/__tests__/repoHarness';
import {useBranchFilesGeneration} from '../../finishes/branchFiles';
import {CATALOG_PATH, PROMOS_PATH} from '../../finishes/finishFiles';
import {withEditedPrinting} from '../catalogEdits';
import {EMPTY_PRINTING_FORM} from '../printingForm';
import {parseCatalog, type CatalogPrinting} from '../promoCatalog';
import {type RefusalKind} from '../publishPrinting';
import {usePrintingForm} from '../usePrintingForm';
import {
  BALOO_BASE,
  FIXTURE_CATALOG,
  FIXTURE_FILES,
  HIRO_BASE,
  MKB_BASE,
  PRINCE,
  SNOW_WHITE_BASE,
  filesFor,
  printingOf,
  withSet3Chunk,
} from './promoFixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** A printing the branch doesn't have: 13/C3 under an id nobody issued, for an edit that finds it gone. */
const GHOST: CatalogPrinting = {id: 80099, rarity: 'Special', number: 13, promoGrouping: 'C3', finishes: ['foil']};

/** The files of a branch that has moved Snow White's 42/P2 to 43/P2 since a form opened on it. */
const SNOW_WHITE_MOVED = filesFor(withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80049, edit: {promoGrouping: 'P2', number: 43, scanLanguage: 'zh'}, note: null}));

/** The controller for a card, which `rerender` moves to another. */
const renderFor = (cardId: string) => renderHook((props: {cardId: string}) => usePrintingForm({token: 't', cardId: props.cardId}), {initialProps: {cardId}});
type Rendered = ReturnType<typeof renderFor>['result'];

/** The controller for a card, with the branch-files generation it renders beside: `generations.at(-1)` counts the times the kept reads were dropped. */
function renderWithGenerations(cardId: string) {
  const generations: number[] = [];
  const rendered = renderHook((props: {cardId: string}) => {
    generations.push(useBranchFilesGeneration());
    return usePrintingForm({token: 't', cardId: props.cardId});
  }, {initialProps: {cardId}});
  return {...rendered, generations};
}

/** Opens an edit of Mother Knows Best's 13/C3 with a note on it, so the form has something to publish. */
function startNoteOnMkb(result: Rendered): void {
  act(() => result.current.openEdit({card: MKB_BASE, printing: printingOf(80024)}));
  act(() => result.current.patch({note: 'x'}));
}

/** A branch whose ref update waits for `held.respond`: a publish made on it stays in flight until the test says. */
function holdingTheRefUpdate() {
  const repo = stubRepo({files: FIXTURE_FILES});
  const held = deferredResponse();
  const answer = repo.fetch.getMockImplementation()!;
  repo.fetch.mockImplementation((...call) => (call[1]?.method === 'PATCH' ? held.response : answer(...call)));
  return {repo, held};
}

/** Starts the open form's publish without waiting for it. */
function startPublish(result: Rendered): Promise<boolean> {
  let started: Promise<boolean> = Promise.resolve(false);
  act(() => {
    started = result.current.publish();
  });
  return started;
}

describe('opening a form', () => {
  it('opens an empty add form that is clean until something is entered', () => {
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    expect(result.current.form).toMatchObject({kind: 'add', values: EMPTY_PRINTING_FORM});
    expect(result.current.dirty).toBe(false);
    act(() => result.current.patch({note: 'x'}));
    expect(result.current.dirty).toBe(true);
  });
  it('opens an edit form filled in from the printing', () => {
    const snow = printingOf(80049);
    const {result} = renderFor('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: snow}));
    expect(result.current.form?.values).toEqual({promoGrouping: 'P2', number: '42', versions: null, scanLanguage: 'zh', note: ''});
    expect(result.current.form?.initial).toEqual(result.current.form?.values);
    expect(result.current.form).toMatchObject({kind: 'edit', card: SNOW_WHITE_BASE, printing: snow, error: null});
    expect(result.current.dirty).toBe(false);
  });
  it('lets the open form give way to another, and clears the last outcome', async () => {
    stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2035');
    startNoteOnMkb(result);
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
    expect(result.current.outcome.result).toEqual({commitUrl: COMMIT_URL});

    act(() => result.current.openAdd(MKB_BASE));
    expect(result.current.outcome).toEqual({result: null, error: null, note: ''});
    expect(result.current.form).toMatchObject({kind: 'add', printing: null});
    act(() => result.current.openEdit({card: MKB_BASE, printing: printingOf(80017)}));
    expect(result.current.form).toMatchObject({kind: 'edit', printing: {id: 80017}});
  });
  it('starts every form without the scan an earlier one held', async () => {
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    await act(() => result.current.chooseScan(pngFile('scan.png')));
    expect(result.current.form?.scan.name).toBe('scan.png');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printingOf(80049)}));
    expect(result.current.form?.scan).toEqual({name: null, dataUrl: null, error: null});
    expect(result.current.dirty).toBe(false);
  });
});

describe('what counts as unsaved', () => {
  it('counts a chosen scan from the moment it is chosen, and takes it back when the scan is cleared', async () => {
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    let reading: Promise<void> = Promise.resolve();
    act(() => {
      reading = result.current.chooseScan(pngFile('scan.png'));
    });
    expect(result.current.form?.scan).toEqual({name: 'scan.png', dataUrl: null, error: null});
    expect(result.current.dirty).toBe(true);
    await act(() => reading);
    expect(result.current.form?.scan.dataUrl).toMatch(/^data:image\/png;base64,/);
    await act(() => result.current.chooseScan(null));
    expect(result.current.form?.scan.name).toBeNull();
    expect(result.current.dirty).toBe(false);
  });
  it("counts what would be published, so a number retyped with spaces or a note of spaces is nothing, and an entry taken back is clean again", () => {
    const {result} = renderFor('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printingOf(80049)}));
    act(() => result.current.patch({number: ' 042 ', note: '   '}));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.patch({number: '43'}));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.patch({number: '42'}));
    expect(result.current.dirty).toBe(false);
  });
});

describe('the scan', () => {
  it("reports the file's own error, with no bytes", async () => {
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    await act(() => result.current.chooseScan(new File(['just some text'], 'card.png', {type: 'image/png'})));
    expect(result.current.form?.scan).toEqual({name: 'card.png', dataUrl: null, error: 'card.png is not a JPEG, PNG or WebP image.'});
  });
  it("takes none for a printing with Ravensburger's art, whose art an edit doesn't replace", async () => {
    const {result} = renderFor('1529');
    act(() => result.current.openEdit({card: HIRO_BASE, printing: printingOf(1661)}));
    await act(() => result.current.chooseScan(pngFile('scan.png')));
    expect(result.current.form?.scan).toEqual({name: null, dataUrl: null, error: null});
    expect(result.current.dirty).toBe(false);
  });
});

describe('publishing', () => {
  it('publishes an add, closes the form, says where it landed and reads the branch again', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const {result, generations} = renderWithGenerations('2047');
    act(() => result.current.openAdd(PRINCE));
    act(() => result.current.patch({promoGrouping: 'P4', number: '9', versions: 'foil'}));
    await act(() => result.current.chooseScan(pngFile('scan.png')));
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
    expect(result.current.form).toBeNull();
    expect(result.current.dirty).toBe(false);
    expect(result.current.publishing).toBe(false);
    expect(result.current.outcome).toEqual({result: {commitUrl: COMMIT_URL}, error: null, note: 'Its art shows on inkweave.ink once the app has converted the scan and deployed.'});
    expect(generations.at(-1)).toBe(1);
    expect(Object.keys(repo.filesSent())).toContain('apps/web/public/card-images-raw/80050.png');
    expect(repo.reads()).toHaveLength(3);
    expect(repo.reads().every(({token}) => token === 't')).toBe(true);
  });
  it('says the printing shows once the app has deployed when no scan went with it', async () => {
    stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2035');
    startNoteOnMkb(result);
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
    expect(result.current.outcome.note).toBe('It shows on inkweave.ink once the app has deployed.');
  });
  it("names the branch when the scan can't convert to art there", async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-77');
    stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    act(() => result.current.patch({promoGrouping: 'P4', number: '9', versions: 'foil'}));
    await act(() => result.current.chooseScan(pngFile('scan.png')));
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
    expect(result.current.outcome.note).toBe('The scan converts to art on master only, so on rehearse-77 the printing has no art yet.');
  });
  it('is publishing until the commit settles, and shows no failure while it runs', async () => {
    let updates = 0;
    const held = deferredResponse();
    stubRepo({files: FIXTURE_FILES, update: () => (updates++ === 0 ? notAFastForward() : held.response)});
    const {result} = renderFor('2035');
    startNoteOnMkb(result);
    expect(result.current.publishing).toBe(false);
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.error).toBe('master changed while publishing, so nothing was published. Publish again.');

    const landed = startPublish(result);
    expect(result.current.publishing).toBe(true);
    expect(result.current.form?.error).toBeNull();
    await act(async () => {
      held.respond(moved());
      expect(await landed).toBe(true);
    });
    expect(result.current.publishing).toBe(false);
  });
  it('refuses a form that is not complete, writing nothing', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.error).toBe('The form is incomplete, so it has no printing to publish.');
    expect(result.current.publishing).toBe(false);
    expect(repo.fetch).not.toHaveBeenCalled();
  });
  it('does nothing with no form open', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2047');
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(repo.fetch).not.toHaveBeenCalled();
  });
  it('starts no second publish while one runs', async () => {
    const {repo, held} = holdingTheRefUpdate();
    const {result} = renderFor('2035');
    startNoteOnMkb(result);
    const landed = startPublish(result);
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    await act(async () => {
      held.respond(moved());
      expect(await landed).toBe(true);
    });
    // The held ref update never reaches the stub's own log, so it is counted on the mock.
    expect(repo.fetch.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1);
    expect(repo.writes().filter((write) => write === 'POST git/commits')).toHaveLength(1);
  });
});

describe('a publish the branch refuses or fails', () => {
  it('re-seeds an edit form from the branch when its printing changed meanwhile', async () => {
    const repo = stubRepo({files: SNOW_WHITE_MOVED});
    const {result} = renderFor('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printingOf(80049)}));
    act(() => result.current.patch({number: '44'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.values.number).toBe('43');
    expect(result.current.form?.error).toBe("Someone changed 42/P2 on master after you opened it. The form now shows the branch's values: make your change again.");
    expect(result.current.form?.printing).toMatchObject({id: 80049, number: 43});
    expect(result.current.form?.initial).toEqual(result.current.form?.values);
    expect(result.current.publishing).toBe(false);
    expect(result.current.dirty).toBe(false);
    expect(repo.writes()).toEqual([]);
  });
  it('keeps the note the owner typed when it re-seeds the form, which stays unsaved until the note lands', async () => {
    const repo = stubRepo({files: SNOW_WHITE_MOVED});
    const {result} = renderFor('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printingOf(80049)}));
    act(() => result.current.patch({number: '44', note: 'Seen at a store event.'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    const branchValues = {promoGrouping: 'P2', number: '43', versions: null, scanLanguage: 'zh', note: ''};
    expect(result.current.form?.values).toEqual({...branchValues, note: 'Seen at a store event.'});
    expect(result.current.form?.initial).toEqual(branchValues);
    expect(result.current.dirty).toBe(true);

    act(() => result.current.patch({number: '44'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
    expect(parseCatalog(repo.filesSent()[CATALOG_PATH]).notes).toEqual([
      {printing: '44/P2', card: 'Snow White - Unexpected Houseguest', note: 'Seen at a store event.'},
    ]);
  });
  it('drops the scan it chose when it re-seeds the form', async () => {
    stubRepo({files: SNOW_WHITE_MOVED});
    const {result} = renderFor('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printingOf(80049)}));
    await act(() => result.current.chooseScan(pngFile('better.png')));
    expect(result.current.form?.scan.name).toBe('better.png');
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.scan).toEqual({name: null, dataUrl: null, error: null});
  });
  it('closes the form and says so when the printing is gone, and reads the branch again', async () => {
    stubRepo({files: FIXTURE_FILES});
    const {result, generations} = renderWithGenerations('2035');
    act(() => result.current.openEdit({card: MKB_BASE, printing: GHOST}));
    act(() => result.current.patch({note: 'x'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form).toBeNull();
    expect(result.current.publishing).toBe(false);
    expect(result.current.outcome).toEqual({result: null, error: '13/C3 is no longer on master.', note: ''});
    expect(generations.at(-1)).toBe(1);
  });
  it('keeps the form and its error when a publish fails', async () => {
    stubRepo({files: FIXTURE_FILES, update: notAFastForward});
    const {result, generations} = renderWithGenerations('2035');
    act(() => result.current.openEdit({card: MKB_BASE, printing: printingOf(80024)}));
    act(() => result.current.patch({note: 'Foil twin of 1/C3.'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.error).toBe('master changed while publishing, so nothing was published. Publish again.');
    expect(result.current.form?.values.note).toBe('Foil twin of 1/C3.');
    expect(result.current.dirty).toBe(true);
    expect(result.current.publishing).toBe(false);
    expect(generations.at(-1)).toBe(0);
  });
  it('keeps the form with a refusal the owner can act on', async () => {
    stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2035');
    act(() => result.current.openEdit({card: MKB_BASE, printing: printingOf(80024)}));
    act(() => result.current.patch({number: '12'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.error).toBe('12/C3 is taken on master: Mickey Mouse - Brave Little Tailor has it.');
    expect(result.current.form?.values.number).toBe('12');
  });
});

/** What opens the form a case publishes from, and fills it in as far as that publish needs. */
type Opening = (result: Rendered) => Promise<void>;

/**
 * Each kind of refusal the branch gives: the files of the branch that gives it, the form the publish is
 * made from, and what the owner is told. A kind added to `RefusalKind` fails to compile until it has a case.
 */
const REFUSALS: Record<RefusalKind, {files: Record<string, string>; open: Opening; says: string}> = {
  changed: {
    files: SNOW_WHITE_MOVED,
    open: async (result) => {
      act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printingOf(80049)}));
      act(() => result.current.patch({number: '44'}));
    },
    says: "Someone changed 42/P2 on master after you opened it. The form now shows the branch's values: make your change again.",
  },
  gone: {
    files: FIXTURE_FILES,
    open: async (result) => {
      act(() => result.current.openEdit({card: MKB_BASE, printing: GHOST}));
      act(() => result.current.patch({note: 'x'}));
    },
    says: '13/C3 is no longer on master.',
  },
  taken: {
    files: FIXTURE_FILES,
    open: async (result) => {
      act(() => result.current.openEdit({card: MKB_BASE, printing: printingOf(80024)}));
      act(() => result.current.patch({number: '12'}));
    },
    says: '12/C3 is taken on master: Mickey Mouse - Brave Little Tailor has it.',
  },
  unknownSet: {
    files: FIXTURE_FILES,
    open: async (result) => {
      act(() => result.current.openAdd(PRINCE));
      act(() => result.current.patch({promoGrouping: 'Q9', number: '9', versions: 'foil'}));
      await act(() => result.current.chooseScan(pngFile('scan.png')));
    },
    says: "Q9 isn't one of the app's promo sets. Add it to PROMO_SETS in the app first.",
  },
  outOfStep: {
    files: {...FIXTURE_FILES, [PROMOS_PATH]: '[]\n'},
    open: async (result) => startNoteOnMkb(result),
    says: 'The catalog and the card files are out of step on master: the merge would change collection/promos.json. Run pnpm merge-promos --write in the app, then publish again.',
  },
  unknownCard: {
    files: withSet3Chunk([]),
    open: async (result) => {
      act(() => result.current.openAdd(BALOO_BASE));
      act(() => result.current.patch({promoGrouping: 'P4', number: '9', versions: 'foil'}));
      await act(() => result.current.chooseScan(pngFile('scan.png')));
    },
    says: "The app's set 3 data on master doesn't match Baloo - von Bruinwald XIII: promo 80050 (Baloo - von Bruinwald XIII) reprints card 433, which no dataset holds.",
  },
};

/** Each failure that is not a refusal and reads nothing new of the branch: the branch it happens on, and what the owner is told. */
const FAILURES: Record<string, {files: Readonly<Record<string, Served>>; update?: () => Response; says: string}> = {
  'a lost race': {
    files: FIXTURE_FILES,
    update: notAFastForward,
    says: 'master changed while publishing, so nothing was published. Publish again.',
  },
  'a rejected token': {
    files: {...FIXTURE_FILES, [CATALOG_PATH]: () => new Response('Bad credentials', {status: 401})},
    says: `GitHub 401 on ${CATALOG_PATH}: Bad credentials`,
  },
  'a network error': {
    files: {...FIXTURE_FILES, [CATALOG_PATH]: () => Promise.reject(new TypeError('Failed to fetch'))},
    says: 'Failed to fetch',
  },
};

describe('the branch files kept after a publish', () => {
  it.each(Object.entries(REFUSALS))('are read again after a refusal of kind %s, so the panel shows what the publish saw', async (_kind, {files, open, says}) => {
    stubRepo({files});
    const {result, generations} = renderWithGenerations('2035');
    await open(result);
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.error ?? result.current.outcome.error).toBe(says);
    expect(generations.at(-1)).toBe(1);
  });
  it.each(Object.entries(FAILURES))('are left alone after %s', async (_what, {files, update, says}) => {
    stubRepo({files, update});
    const {result, generations} = renderWithGenerations('2035');
    startNoteOnMkb(result);
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.error).toBe(says);
    expect(generations.at(-1)).toBe(0);
  });
});

describe('a form that stays open after a refusal or a failure', () => {
  it('keeps its scan, so the owner fixes the form and publishes again', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2047');
    await REFUSALS.unknownSet.open(result);
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.scan.name).toBe('scan.png');
    act(() => result.current.patch({promoGrouping: 'P4'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
    expect(Object.keys(repo.filesSent())).toContain('apps/web/public/card-images-raw/80050.png');
  });
  it('keeps its scan after a lost race, so publishing again sends it', async () => {
    let updates = 0;
    stubRepo({files: FIXTURE_FILES, update: () => (updates++ === 0 ? notAFastForward() : moved())});
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    act(() => result.current.patch({promoGrouping: 'P4', number: '9', versions: 'foil'}));
    await act(() => result.current.chooseScan(pngFile('scan.png')));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.scan.name).toBe('scan.png');
    // An add without its scan is no change at all (changeOf throws), so a publish that lands had it.
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
  });
});

describe('a form belongs to its card', () => {
  it('drops the form when the card changes', () => {
    const {result, rerender} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    act(() => result.current.patch({note: 'x'}));
    rerender({cardId: '2035'});
    expect(result.current.form).toBeNull();
    expect(result.current.dirty).toBe(false);
  });
  it('drops the last outcome when the card changes', async () => {
    stubRepo({files: FIXTURE_FILES});
    const {result, rerender} = renderFor('2035');
    startNoteOnMkb(result);
    await act(async () => {
      expect(await result.current.publish()).toBe(true);
    });
    expect(result.current.outcome.result).not.toBeNull();
    rerender({cardId: '2047'});
    expect(result.current.outcome).toEqual({result: null, error: null, note: ''});
  });
  it('keeps the form while the card is the same', () => {
    const {result, rerender} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    act(() => result.current.patch({note: 'x'}));
    rerender({cardId: '2047'});
    expect(result.current.form?.values.note).toBe('x');
    expect(result.current.dirty).toBe(true);
  });
  it('starts a form on the new card clean, and not publishing', async () => {
    const {held} = holdingTheRefUpdate();
    const {result, rerender} = renderFor('2035');
    startNoteOnMkb(result);
    const landed = startPublish(result);
    expect(result.current.publishing).toBe(true);
    rerender({cardId: '2047'});
    expect(result.current.publishing).toBe(false);
    act(() => result.current.openAdd(PRINCE));
    expect(result.current.form).toMatchObject({kind: 'add', values: EMPTY_PRINTING_FORM, error: null});
    expect(result.current.publishing).toBe(false);
    await act(async () => {
      held.respond(moved());
      await landed;
    });
  });
});

describe('a publish that settles after its form is gone', () => {
  it("drops a publish's outcome that lands after the card changed", async () => {
    const {held} = holdingTheRefUpdate();
    const {result, rerender} = renderFor('2035');
    startNoteOnMkb(result);
    const landed = startPublish(result);
    rerender({cardId: '2047'});
    await act(async () => {
      held.respond(new Response('{}'));
      await landed;
    });
    expect(result.current.outcome.result).toBeNull();
    expect(result.current.form).toBeNull();
  });
  it('still tells the panel the branch changed, since the commit landed', async () => {
    const {held} = holdingTheRefUpdate();
    const {result, rerender, generations} = renderWithGenerations('2035');
    startNoteOnMkb(result);
    const landed = startPublish(result);
    rerender({cardId: '2047'});
    await act(async () => {
      held.respond(moved());
      expect(await landed).toBe(true);
    });
    expect(generations.at(-1)).toBe(1);
  });
  it("drops a publish's outcome that lands after Cancel", async () => {
    const {held} = holdingTheRefUpdate();
    const {result} = renderFor('2035');
    startNoteOnMkb(result);
    const landed = startPublish(result);
    act(() => result.current.cancel());
    expect(result.current.form).toBeNull();
    expect(result.current.publishing).toBe(false);
    await act(async () => {
      held.respond(moved());
      expect(await landed).toBe(true);
    });
    expect(result.current.outcome).toEqual({result: null, error: null, note: ''});
    expect(result.current.form).toBeNull();
  });
  it('leaves the form opened since alone', async () => {
    const {held} = holdingTheRefUpdate();
    const {result} = renderFor('2035');
    startNoteOnMkb(result);
    const landed = startPublish(result);
    act(() => result.current.openAdd(MKB_BASE));
    act(() => result.current.patch({note: 'y'}));
    await act(async () => {
      held.respond(moved());
      expect(await landed).toBe(true);
    });
    expect(result.current.form).toMatchObject({kind: 'add', values: {...EMPTY_PRINTING_FORM, note: 'y'}, error: null});
    expect(result.current.outcome).toEqual({result: null, error: null, note: ''});
    expect(result.current.publishing).toBe(false);
  });
  it('drops the outcome of a publish that lands after the page is gone', async () => {
    const {held} = holdingTheRefUpdate();
    const {result, unmount} = renderFor('2035');
    startNoteOnMkb(result);
    const landed = startPublish(result);
    unmount();
    await act(async () => {
      held.respond(moved());
      expect(await landed).toBe(true);
    });
  });
  it("drops a refusal that arrives after Cancel, so it can't close the next form", async () => {
    stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2035');
    act(() => result.current.openEdit({card: MKB_BASE, printing: GHOST}));
    act(() => result.current.patch({note: 'x'}));
    const refused = startPublish(result);
    act(() => result.current.cancel());
    act(() => result.current.openAdd(MKB_BASE));
    await act(async () => {
      expect(await refused).toBe(false);
    });
    expect(result.current.form).toMatchObject({kind: 'add'});
    expect(result.current.outcome.error).toBeNull();
  });
  it('reads the branch again after a refusal that arrives when its form is gone, and leaves the form opened since alone', async () => {
    stubRepo({files: SNOW_WHITE_MOVED});
    const {result, generations} = renderWithGenerations('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printingOf(80049)}));
    act(() => result.current.patch({number: '44'}));
    const refused = startPublish(result);
    act(() => result.current.cancel());
    act(() => result.current.openAdd(SNOW_WHITE_BASE));
    await act(async () => {
      expect(await refused).toBe(false);
    });
    expect(result.current.form).toMatchObject({kind: 'add', printing: null, error: null});
    expect(result.current.outcome).toEqual({result: null, error: null, note: ''});
    expect(generations.at(-1)).toBe(1);
  });
});

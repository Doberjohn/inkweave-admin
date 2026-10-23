import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {pngFile} from '../../../../test/images';
import {deferredResponse} from '../../finishes/__tests__/branchHarness';
import {COMMIT_URL, moved, notAFastForward, stubRepo} from '../../finishes/__tests__/repoHarness';
import {useBranchFilesGeneration} from '../../finishes/branchFiles';
import {withEditedPrinting} from '../catalogEdits';
import {EMPTY_PRINTING_FORM} from '../printingForm';
import {findPrinting, type BaseCard, type CatalogPrinting} from '../promoCatalog';
import {usePrintingForm} from '../usePrintingForm';
import {FIXTURE_CATALOG, FIXTURE_FILES, MKB_BASE, PRINCE, SNOW_WHITE_BASE, filesFor} from './promoFixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Hiro Hamada - Armor Designer, whose 24A/P2 and 24B/P2 have Ravensburger's art. */
const HIRO: BaseCard = {id: 1529, fullName: 'Hiro Hamada - Armor Designer', setCode: '7', number: 96, core: false};

/** The printing of FIXTURE_CATALOG with this id. */
const printing = (id: number) => findPrinting(FIXTURE_CATALOG, id)!.printing;

/** The controller for a card, which `rerender` moves to another. */
const renderFor = (cardId: string) => renderHook((props: {cardId: string}) => usePrintingForm({token: 't', cardId: props.cardId}), {initialProps: {cardId}});
type Rendered = ReturnType<typeof renderFor>['result'];

/** Opens an edit of Mother Knows Best's 13/C3 with a note on it, so the form has something to publish. */
function startNoteOnMkb(result: Rendered): void {
  act(() => result.current.openEdit({card: MKB_BASE, printing: printing(80024)}));
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
    const snow = findPrinting(FIXTURE_CATALOG, 80049)!.printing;
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
    act(() => result.current.openEdit({card: MKB_BASE, printing: printing(80017)}));
    expect(result.current.form).toMatchObject({kind: 'edit', printing: {id: 80017}});
  });
  it('starts every form without the scan an earlier one held', async () => {
    const {result} = renderFor('2047');
    act(() => result.current.openAdd(PRINCE));
    await act(() => result.current.chooseScan(pngFile('scan.png')));
    expect(result.current.form?.scan.name).toBe('scan.png');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printing(80049)}));
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
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printing(80049)}));
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
    act(() => result.current.openEdit({card: HIRO, printing: printing(1661)}));
    await act(() => result.current.chooseScan(pngFile('scan.png')));
    expect(result.current.form?.scan).toEqual({name: null, dataUrl: null, error: null});
    expect(result.current.dirty).toBe(false);
  });
});

describe('publishing', () => {
  it('publishes an add, closes the form, says where it landed and reads the branch again', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const generations: number[] = [];
    const {result} = renderHook(() => {
      generations.push(useBranchFilesGeneration());
      return usePrintingForm({token: 't', cardId: '2047'});
    });
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
    const changed = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80049, edit: {promoGrouping: 'P2', number: 43, scanLanguage: 'zh'}, note: null});
    const repo = stubRepo({files: filesFor(changed)});
    const {result} = renderFor('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printing(80049)}));
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
  it('drops the scan it chose when it re-seeds the form', async () => {
    const changed = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80049, edit: {promoGrouping: 'P2', number: 43, scanLanguage: 'zh'}, note: null});
    stubRepo({files: filesFor(changed)});
    const {result} = renderFor('240');
    act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: printing(80049)}));
    await act(() => result.current.chooseScan(pngFile('better.png')));
    expect(result.current.form?.scan.name).toBe('better.png');
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.scan).toEqual({name: null, dataUrl: null, error: null});
  });
  it('closes the form and says so when the printing is gone, and reads the branch again', async () => {
    stubRepo({files: FIXTURE_FILES});
    const generations: number[] = [];
    const {result} = renderHook(() => {
      generations.push(useBranchFilesGeneration());
      return usePrintingForm({token: 't', cardId: '2035'});
    });
    const ghost: CatalogPrinting = {id: 80099, rarity: 'Special', number: 13, promoGrouping: 'C3', finishes: ['foil']};
    act(() => result.current.openEdit({card: MKB_BASE, printing: ghost}));
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
    const generations: number[] = [];
    const {result} = renderHook(() => {
      generations.push(useBranchFilesGeneration());
      return usePrintingForm({token: 't', cardId: '2035'});
    });
    act(() => result.current.openEdit({card: MKB_BASE, printing: findPrinting(FIXTURE_CATALOG, 80024)!.printing}));
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
    act(() => result.current.openEdit({card: MKB_BASE, printing: printing(80024)}));
    act(() => result.current.patch({number: '12'}));
    await act(async () => {
      expect(await result.current.publish()).toBe(false);
    });
    expect(result.current.form?.error).toBe('12/C3 is taken on master: Mickey Mouse - Brave Little Tailor has it.');
    expect(result.current.form?.values.number).toBe('12');
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
    const generations: number[] = [];
    const {result, rerender} = renderHook((props: {cardId: string}) => {
      generations.push(useBranchFilesGeneration());
      return usePrintingForm({token: 't', cardId: props.cardId});
    }, {initialProps: {cardId: '2035'}});
    startNoteOnMkb(result);
    const landed = startPublish(result);
    rerender({cardId: '2047'});
    await act(async () => {
      held.respond(moved());
      expect(await landed).toBe(false);
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
      expect(await landed).toBe(false);
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
      expect(await landed).toBe(false);
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
      expect(await landed).toBe(false);
    });
  });
  it("drops a refusal that arrives after Cancel, so it can't close the next form", async () => {
    stubRepo({files: FIXTURE_FILES});
    const {result} = renderFor('2035');
    const ghost: CatalogPrinting = {id: 80099, rarity: 'Special', number: 13, promoGrouping: 'C3', finishes: ['foil']};
    act(() => result.current.openEdit({card: MKB_BASE, printing: ghost}));
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
});

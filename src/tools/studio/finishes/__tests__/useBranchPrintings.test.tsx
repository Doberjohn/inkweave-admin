import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {forgetBranchFiles} from '../branchFiles';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH, setChunkPath} from '../finishFiles';
import {useBranchPrintings, type BranchPrintings} from '../useBranchPrintings';
import {deferredResponse, stubBranch} from './branchHarness';
import {
  C2_PEGASUS_ENTRIES,
  C3_MKB_ENTRIES,
  EMPTY_CATALOG_TEXT,
  MOTHER_KNOWS_BEST,
  MOTHER_KNOWS_BEST_ENTRY,
  PEGASUS,
  PEGASUS_ENTRY,
  SET_4,
  SET_4_ENTRIES,
  SET_4_TEXT,
  SET_9_ENTRIES,
  YEN_SID,
  allCardsText,
  catalogText,
  collectionText,
  withFinishes,
} from './finishFixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const CHUNK_4 = setChunkPath('4');
const CHUNK_9 = setChunkPath('9');
const EMPTY_FILE = collectionText([]);

/** The three files a Sets 1 to 8 card reads: Set 4's chunk, which holds Yen Sid's three entries, and an empty promos.json and catalog. */
const YEN_SID_FILES = {[CHUNK_4]: SET_4_TEXT, [PROMOS_PATH]: EMPTY_FILE, [CATALOG_PATH]: EMPTY_CATALOG_TEXT};

/**
 * Mother Knows Best's files: a Core card with two C3 promos. promos.json and the catalog both name
 * the promos' versions, and allCards.json holds the card with the same promos as its variants.
 */
const MKB_FILES = {
  [CHUNK_9]: EMPTY_FILE,
  [PROMOS_PATH]: collectionText(C3_MKB_ENTRIES),
  [CATALOG_PATH]: catalogText([{baseId: 2035, variants: C3_MKB_ENTRIES}]),
  [ALL_CARDS_PATH]: allCardsText([MOTHER_KNOWS_BEST_ENTRY]),
};
const MKB_NAMES = ['#99', '1/C3', '13/C3'];

/**
 * Pegasus's files, each naming a printing's versions differently from the others that hold it
 * (variants of the card in allCards.json, the chunk, promos.json, the catalog), so a row can show
 * only what its primary home says.
 */
const PEGASUS_FILES = {
  [ALL_CARDS_PATH]: allCardsText([
    {
      ...PEGASUS_ENTRY,
      finishes: ['normal'],
      variants: [
        {id: 2166, rarity: 'Epic', finishes: ['normal']},
        {id: 2451, rarity: 'Special', finishes: ['normal', 'foil']},
      ],
    },
  ]),
  [CHUNK_9]: collectionText(withFinishes(SET_9_ENTRIES, {2166: ['foil']})),
  [PROMOS_PATH]: collectionText(withFinishes(C2_PEGASUS_ENTRIES, {2451: ['foil'], 2455: ['foil']})),
  [CATALOG_PATH]: catalogText([{baseId: 2020, variants: withFinishes(C2_PEGASUS_ENTRIES.slice(0, 1), {2451: ['normal']})}]),
};

/** The view as ready, or a failure that says what it was instead. */
function ready(view: BranchPrintings) {
  if (view.status !== 'ready') throw new Error(`expected the printings to be ready, but they are ${view.status}`);
  return view;
}

function failed(view: BranchPrintings) {
  if (view.status !== 'error') throw new Error(`expected the read to have failed, but the printings are ${view.status}`);
  return view;
}

const namesOf = (view: BranchPrintings) => ready(view).rows.map((row) => row.name);
const valuesOf = (view: BranchPrintings) => ready(view).rows.map((row) => row.value);

/** The hook on a card, with a token; `rerender` opens another card. */
function renderPrintings(card: LorcanaCard) {
  return renderHook(({open}: {open: LorcanaCard}) => useBranchPrintings({token: 't', card: open}), {
    initialProps: {open: card},
  });
}

type Rendered = ReturnType<typeof renderPrintings>;

const whenReady = (rendered: Rendered) => waitFor(() => expect(rendered.result.current.status).toBe('ready'));
const whenFailed = (rendered: Rendered) => waitFor(() => expect(rendered.result.current.status).toBe('error'));

describe('useBranchPrintings', () => {
  it("gives Yen Sid's rows with the branch's values", async () => {
    const branch = stubBranch(YEN_SID_FILES);
    const rendered = renderPrintings(YEN_SID);
    expect(rendered.result.current).toEqual({status: 'loading'});

    await whenReady(rendered);
    expect(namesOf(rendered.result.current)).toEqual(['#59', '#209 · Enchanted', '#223 · Alt foil']);
    expect(valuesOf(rendered.result.current)).toEqual([null, null, ['foil']]);
    // A Sets 1 to 8 card needs no allCards.json.
    expect(branch.paths()).not.toContain(ALL_CARDS_PATH);
    expect(branch.paths().sort()).toEqual([CATALOG_PATH, CHUNK_4, PROMOS_PATH].sort());
    expect(branch.tokens()).toEqual(['t', 't', 't']);
  });

  it('reads allCards.json as well for a Core card', async () => {
    const branch = stubBranch(MKB_FILES);
    const rendered = renderPrintings(MOTHER_KNOWS_BEST);
    await whenReady(rendered);
    expect(branch.paths().sort()).toEqual([ALL_CARDS_PATH, CATALOG_PATH, CHUNK_9, PROMOS_PATH].sort());
    expect(namesOf(rendered.result.current)).toEqual(MKB_NAMES);
    expect(valuesOf(rendered.result.current)).toEqual([null, ['normal'], ['foil']]);
  });

  it('shows each row the versions of its primary home, whatever the other files that hold it say', async () => {
    stubBranch(PEGASUS_FILES);
    const rendered = renderPrintings(PEGASUS);
    await whenReady(rendered);
    expect(ready(rendered.result.current).rows.map((row) => [row.name, row.value])).toEqual([
      ['#84', ['normal']], // allCards.json is a Core card's only home
      ['#212 · Epic', ['foil']], // its chunk, not its variant in allCards.json
      ['1/C2', ['normal']], // the catalog, not promos.json or allCards.json
      ['5/C2', null], // the catalog doesn't hold it, though promos.json names versions for it
    ]);
  });

  describe('a failed read', () => {
    it('is reported, and its retry reads the files again', async () => {
      const files: Record<string, string> = {[PROMOS_PATH]: EMPTY_FILE, [CATALOG_PATH]: EMPTY_CATALOG_TEXT};
      const branch = stubBranch(files); // the branch holds no chunk of Set 4 yet
      const rendered = renderPrintings(YEN_SID);
      await whenFailed(rendered);
      expect(rendered.result.current).toEqual({
        status: 'error',
        error: `GitHub 404 on ${CHUNK_4}: Not Found`,
        retry: expect.any(Function),
      });

      files[CHUNK_4] = SET_4_TEXT;
      act(() => failed(rendered.result.current).retry());
      expect(rendered.result.current).toEqual({status: 'loading'});
      await whenReady(rendered);
      expect(valuesOf(rendered.result.current)).toEqual([null, null, ['foil']]);
      expect(branch.paths().filter((path) => path === CHUNK_4)).toHaveLength(2);
    });

    it('names a file whose text is not what its parser reads, and a retry reads that text again', async () => {
      const files: Record<string, string> = {...YEN_SID_FILES, [CHUNK_4]: '<<<<<<< HEAD\n'};
      stubBranch(files);
      const rendered = renderPrintings(YEN_SID);
      await whenFailed(rendered);
      expect(failed(rendered.result.current).error).toContain(`${CHUNK_4} can't be read: `);

      files[CHUNK_4] = SET_4_TEXT;
      act(() => failed(rendered.result.current).retry());
      await whenReady(rendered);
      expect(valuesOf(rendered.result.current)).toEqual([null, null, ['foil']]);
    });

    it('names a file whose JSON is not the shape its parser reads', async () => {
      stubBranch({...YEN_SID_FILES, [PROMOS_PATH]: '{"promos": []}\n'});
      const rendered = renderPrintings(YEN_SID);
      await whenFailed(rendered);
      expect(failed(rendered.result.current).error).toContain(`${PROMOS_PATH} can't be read: `);
    });
  });

  describe('a card opened after another', () => {
    it("reads nothing again for another card of the same set, and shows that card's rows at once", async () => {
      const branch = stubBranch(YEN_SID_FILES);
      const rendered = renderPrintings(YEN_SID);
      await whenReady(rendered);

      rendered.rerender({open: SET_4[1]}); // Yen Sid's Enchanted, another card of Set 4's chunk
      expect(namesOf(rendered.result.current)).toEqual(['#209']);
      expect(branch.paths()).toHaveLength(3);
    });

    it('reads the files of the next card’s set, and shows that card once they are read', async () => {
      const branch = stubBranch({...YEN_SID_FILES, ...MKB_FILES});
      const rendered = renderPrintings(YEN_SID);
      await whenReady(rendered);

      rendered.rerender({open: MOTHER_KNOWS_BEST});
      expect(rendered.result.current).toEqual({status: 'loading'});
      await whenReady(rendered);
      expect(namesOf(rendered.result.current)).toEqual(MKB_NAMES);
      // The promos and the catalog were read for Yen Sid: only the next set's chunk and allCards.json are new.
      expect(branch.paths().slice(3).sort()).toEqual([ALL_CARDS_PATH, CHUNK_9].sort());
    });

    it("drops the previous card's read when it lands after the next card is open", async () => {
      const late = deferredResponse();
      stubBranch({...YEN_SID_FILES, ...MKB_FILES, [CHUNK_4]: () => late.response});
      const rendered = renderPrintings(YEN_SID);
      rendered.rerender({open: MOTHER_KNOWS_BEST});
      await whenReady(rendered);

      await act(async () => late.respond(new Response(SET_4_TEXT)));
      expect(namesOf(rendered.result.current)).toEqual(MKB_NAMES);
    });
  });

  /*
   * Card studio mounts the panel anew for each card it opens, so its first render must already have
   * the rows when the files were read for an earlier card: a loading line would show for a frame.
   * `renderHook` returns before the read the hook's effect starts can land, so `result.current` is
   * what the first render gave.
   */
  describe('a card opened once its files were read', () => {
    it('starts with its rows, and reads nothing again', async () => {
      const branch = stubBranch(YEN_SID_FILES);
      const first = renderPrintings(YEN_SID);
      await whenReady(first);
      first.unmount();

      const next = renderPrintings(YEN_SID);
      expect(namesOf(next.result.current)).toEqual(['#59', '#209 · Enchanted', '#223 · Alt foil']);
      expect(valuesOf(next.result.current)).toEqual([null, null, ['foil']]);
      await act(async () => {}); // the read the hook starts anyway finds the files kept
      expect(branch.paths()).toHaveLength(3);
      expect(namesOf(next.result.current)).toEqual(['#59', '#209 · Enchanted', '#223 · Alt foil']);
    });

    it('starts with the rows of another card of the same set', async () => {
      stubBranch(YEN_SID_FILES);
      const first = renderPrintings(YEN_SID);
      await whenReady(first);
      first.unmount();

      const next = renderPrintings(SET_4[1]);
      expect(namesOf(next.result.current)).toEqual(['#209']);
      await act(async () => {}); // the read the hook starts anyway
    });

    it('starts loading when any file of its set was not read yet', async () => {
      stubBranch({...YEN_SID_FILES, ...MKB_FILES});
      const first = renderPrintings(YEN_SID);
      await whenReady(first);
      first.unmount();

      // The promos and the catalog were read for Yen Sid: Set 9's chunk and allCards.json were not.
      const next = renderPrintings(MOTHER_KNOWS_BEST);
      expect(next.result.current).toEqual({status: 'loading'});
      await whenReady(next);
      expect(namesOf(next.result.current)).toEqual(MKB_NAMES);
    });

    it('starts loading once the files were forgotten, and shows the branch as it is then', async () => {
      const files: Record<string, string> = {...YEN_SID_FILES};
      stubBranch(files);
      const first = renderPrintings(YEN_SID);
      await whenReady(first);
      first.unmount();

      files[CHUNK_4] = collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal', 'foil']}));
      act(() => forgetBranchFiles());
      const next = renderPrintings(YEN_SID);
      expect(next.result.current).toEqual({status: 'loading'});
      await whenReady(next);
      expect(valuesOf(next.result.current)).toEqual([null, null, ['normal', 'foil']]);
    });

    it('starts loading when a file kept is one its parser cannot read, and names the file once it has read it', async () => {
      stubBranch({...YEN_SID_FILES, [CHUNK_4]: '<<<<<<< HEAD\n'});
      const first = renderPrintings(YEN_SID);
      await whenFailed(first);
      first.unmount();

      const next = renderPrintings(YEN_SID);
      expect(next.result.current).toEqual({status: 'loading'});
      await whenFailed(next);
      expect(failed(next.result.current).error).toContain(`${CHUNK_4} can't be read: `);
    });
  });

  describe('when the branch changes', () => {
    it('reads the files again once they are forgotten, and shows the branch as it is then', async () => {
      const files: Record<string, string> = {...YEN_SID_FILES};
      const branch = stubBranch(files);
      const rendered = renderPrintings(YEN_SID);
      await whenReady(rendered);
      expect(valuesOf(rendered.result.current)).toEqual([null, null, ['foil']]);

      // The owner publishes Both for #223: the next read shows it.
      files[CHUNK_4] = collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal', 'foil']}));
      act(() => forgetBranchFiles());
      expect(rendered.result.current).toEqual({status: 'loading'});
      await whenReady(rendered);
      expect(valuesOf(rendered.result.current)).toEqual([null, null, ['normal', 'foil']]);
      expect(branch.paths()).toHaveLength(6);
    });

    it('drops a read that lands after the files were forgotten and read again', async () => {
      const late = deferredResponse();
      let asked = 0;
      stubBranch({...YEN_SID_FILES, [CHUNK_4]: () => (asked++ === 0 ? late.response : new Response(SET_4_TEXT))});
      const rendered = renderPrintings(YEN_SID);
      act(() => forgetBranchFiles()); // the first read of the chunk is still pending
      await whenReady(rendered);

      await act(async () => late.respond(new Response(SET_4_TEXT)));
      expect(namesOf(rendered.result.current)).toEqual(['#59', '#209 · Enchanted', '#223 · Alt foil']);
    });
  });

  describe('parsing', () => {
    /** Counts the times each text is parsed as JSON from here on. */
    function countParses() {
      const parse = vi.spyOn(JSON, 'parse');
      return (text: string) => parse.mock.calls.filter(([argument]) => argument === text).length;
    }

    it('parses allCards.json once, however often the hook renders', async () => {
      const parsesOf = countParses();
      stubBranch(MKB_FILES);
      const rendered = renderPrintings(MOTHER_KNOWS_BEST);
      await whenReady(rendered);

      rendered.rerender({open: MOTHER_KNOWS_BEST});
      rendered.rerender({open: MOTHER_KNOWS_BEST});
      expect(parsesOf(MKB_FILES[ALL_CARDS_PATH])).toBe(1);
    });

    it('parses a file again only when the branch changed it', async () => {
      const parsesOf = countParses();
      const files: Record<string, string> = {...MKB_FILES};
      stubBranch(files);
      const rendered = renderPrintings(MOTHER_KNOWS_BEST);
      await whenReady(rendered);

      const catalog = catalogText([{baseId: 2035, variants: C3_MKB_ENTRIES.slice(0, 1)}]);
      files[CATALOG_PATH] = catalog;
      act(() => forgetBranchFiles());
      await waitFor(() => expect(valuesOf(rendered.result.current)).toEqual([null, ['normal'], null]));

      // allCards.json was read again too, and is the same text: it is not parsed again.
      expect(parsesOf(MKB_FILES[ALL_CARDS_PATH])).toBe(1);
      expect(parsesOf(MKB_FILES[CATALOG_PATH])).toBe(1);
      expect(parsesOf(catalog)).toBe(1);
    });
  });
});

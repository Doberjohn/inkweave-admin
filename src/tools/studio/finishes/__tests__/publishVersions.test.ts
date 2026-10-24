import {afterEach, describe, expect, it, vi} from 'vitest';
import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {ALL_CARDS_PATH, CATALOG_PATH, FinishFileError, PROMOS_PATH, readFinishes, setChunkPath} from '../finishFiles';
import {VersionClashError, clashMessage, publishVersions, versionCommitMessage} from '../publishVersions';
import {changeFor, type VersionChange, type VersionClash} from '../versionBatch';
import {
  C3_MKB_ENTRIES,
  MKB_ROWS,
  MKB_VARIANTS,
  MOTHER_KNOWS_BEST_ENTRY,
  SET_4_ENTRIES,
  SET_4_TEXT,
  YEN_SID_ROWS,
  allCardsText,
  catalogText,
  collectionText,
  withFinishes,
} from './finishFixtures';
import {BASE, COMMIT_URL, notAFastForward, stubRepo} from './repoHarness';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CHUNK_4 = setChunkPath('4');
const BOTH: PrintingFinishes = ['normal', 'foil'];

/** Yen Sid's #59 (no field, so Both), his Enchanted #209 (no field, so Foil) and his alt foil #223 (`["foil"]`). */
const [CARD_59, ENCHANTED_209, ALT_FOIL_223] = YEN_SID_ROWS;
/** Mother Knows Best's 1/C3 (`["normal"]`) and 13/C3 (`["foil"]`). */
const [, MKB_1C3, MKB_13C3] = MKB_ROWS;

/** #223 from Foil only to Both: a printing of Set 4, which only Set 4's chunk holds. */
const YEN_SID_223_TO_BOTH = changeFor({row: ALT_FOIL_223, choice: 'both'});
/** 1/C3 from Normal only to Both: a promo of a Core card, which the catalog, promos.json and allCards.json hold. */
const MKB_1C3_TO_BOTH = changeFor({row: MKB_1C3, choice: 'both'});

/** allCards.json holding Mother Knows Best, with these promos as its `variants`. */
const allCardsWith = (variants = MKB_VARIANTS) => allCardsText([{...MOTHER_KNOWS_BEST_ENTRY, variants}]);
/** The promo catalog holding Mother Knows Best's group, with these promos. */
const catalogWith = (variants = MKB_VARIANTS) => catalogText([{baseId: 2035, variants}]);

/** Every file the two changes' printings are in, as the commit a publish builds on holds them: as they were staged from. */
const BASE_FILES = {
  [CHUNK_4]: SET_4_TEXT,
  [CATALOG_PATH]: catalogWith(),
  [PROMOS_PATH]: collectionText(C3_MKB_ENTRIES),
  [ALL_CARDS_PATH]: allCardsWith(),
};

/** Those files in path order, the order a publish reads and writes them in. */
const BASE_PATHS = [ALL_CARDS_PATH, CHUNK_4, PROMOS_PATH, CATALOG_PATH];

const publish = (...changes: VersionChange[]) => publishVersions({token: 't', changes});

/** The clashes a publish was refused for. Any other end fails the test. */
async function clashesOf(publishing: Promise<unknown>): Promise<readonly VersionClash[]> {
  const refusal = await publishing.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(refusal instanceof VersionClashError)) throw new Error(`expected a VersionClashError, not ${String(refusal)}`);
  return refusal.clashes;
}

describe('publishVersions', () => {
  it('writes one commit with every home of every change', async () => {
    const repo = stubRepo({files: BASE_FILES});
    await expect(publish(YEN_SID_223_TO_BOTH, MKB_1C3_TO_BOTH)).resolves.toEqual({commitUrl: COMMIT_URL});

    const files = repo.filesSent();
    expect(Object.keys(files)).toEqual(BASE_PATHS);
    expect(readFinishes({path: CHUNK_4, text: files[CHUNK_4]}).get('946')).toEqual(BOTH);
    for (const path of [ALL_CARDS_PATH, PROMOS_PATH, CATALOG_PATH]) {
      expect(readFinishes({path, text: files[path]}).get('80017')).toEqual(BOTH);
    }
    expect(repo.commitMessage()).toBe('chore(collection): set the versions of 2 printings from Card studio');
  });

  it('reads each file once, at the commit it builds on, in path order', async () => {
    const repo = stubRepo({files: BASE_FILES});
    const MKB_13C3_TO_BOTH = changeFor({row: MKB_13C3, choice: 'both'});
    await publish(MKB_1C3_TO_BOTH, YEN_SID_223_TO_BOTH, MKB_13C3_TO_BOTH, changeFor({row: CARD_59, choice: 'foil'}));
    expect(repo.reads()).toEqual(BASE_PATHS.map((path) => ({path, ref: BASE, token: 't'})));
  });

  it('changes only the entries it sets, each file in its own format', async () => {
    const repo = stubRepo({files: BASE_FILES});
    await publish(YEN_SID_223_TO_BOTH, MKB_1C3_TO_BOTH);
    const promos = withFinishes(MKB_VARIANTS, {80017: BOTH});
    expect(repo.filesSent()).toEqual({
      [ALL_CARDS_PATH]: allCardsWith(promos),
      [CHUNK_4]: collectionText(withFinishes(SET_4_ENTRIES, {946: BOTH})),
      [PROMOS_PATH]: collectionText(withFinishes(C3_MKB_ENTRIES, {80017: BOTH})),
      [CATALOG_PATH]: catalogWith(promos),
    });
  });

  it('leaves out of the commit a file that already holds what it would write', async () => {
    // allCards.json already says Both for 1/C3. Its catalog entry, where the change is checked, still says Normal only.
    const repo = stubRepo({files: {...BASE_FILES, [ALL_CARDS_PATH]: allCardsWith(withFinishes(MKB_VARIANTS, {80017: BOTH}))}});
    await publish(MKB_1C3_TO_BOTH);
    expect(Object.keys(repo.filesSent())).toEqual([PROMOS_PATH, CATALOG_PATH]);
  });

  it('checks a change against its primary home alone, and writes it over the other homes', async () => {
    // promos.json and allCards.json say Foil only for 1/C3, but the catalog, where its versions are first set, is as it was.
    const repo = stubRepo({
      files: {
        ...BASE_FILES,
        [PROMOS_PATH]: collectionText(withFinishes(C3_MKB_ENTRIES, {80017: ['foil']})),
        [ALL_CARDS_PATH]: allCardsWith(withFinishes(MKB_VARIANTS, {80017: ['foil']})),
      },
    });
    await publish(MKB_1C3_TO_BOTH);
    const written = Object.entries(repo.filesSent()).map(([path, text]) => [path, readFinishes({path, text}).get('80017')]);
    expect(written).toEqual([
      [ALL_CARDS_PATH, BOTH],
      [PROMOS_PATH, BOTH],
      [CATALOG_PATH, BOTH],
    ]);
  });

  it('refuses every clash at once and writes nothing', async () => {
    // Since the changes were staged, someone made #223 Normal only and 1/C3 Foil only. #59 is as it was.
    const repo = stubRepo({
      files: {
        ...BASE_FILES,
        [CHUNK_4]: collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal']})),
        [CATALOG_PATH]: catalogWith(withFinishes(MKB_VARIANTS, {80017: ['foil']})),
      },
    });
    const clashes = await clashesOf(publish(YEN_SID_223_TO_BOTH, changeFor({row: CARD_59, choice: 'foil'}), MKB_1C3_TO_BOTH));
    expect(clashes).toEqual([
      {id: '946', now: ['normal'], shownNow: ['normal']},
      {id: '80017', now: ['foil'], shownNow: ['foil']},
    ]);
    expect(repo.writes()).toEqual([]);
  });

  it('counts a field someone set since as a clash, though it shows what the printing showed', async () => {
    // #59, a Legendary with no field, came in both when its change was staged. Someone has since written Both for it.
    stubRepo({files: {[CHUNK_4]: collectionText(withFinishes(SET_4_ENTRIES, {750: BOTH}))}});
    expect(await clashesOf(publish(changeFor({row: CARD_59, choice: 'foil'})))).toEqual([{id: '750', now: BOTH, shownNow: BOTH}]);
  });

  it('reports a printing missing from its primary home as gone', async () => {
    const repo = stubRepo({files: {...BASE_FILES, [CATALOG_PATH]: catalogWith(MKB_VARIANTS.slice(1))}});
    expect(await clashesOf(publish(MKB_1C3_TO_BOTH, YEN_SID_223_TO_BOTH))).toEqual([
      {id: '80017', now: null, shownNow: [], gone: true},
    ]);
    expect(repo.writes()).toEqual([]);
  });

  it('shows what a clashed printing comes in now by the rarity its primary home gives it', async () => {
    // Both changes were staged from a value someone has since dropped: the Enchanted's explicit Both, and #223's Foil only.
    const enchantedNamingBoth = {...ENCHANTED_209, value: BOTH, shown: BOTH};
    const bare = SET_4_ENTRIES.map((entry) => ({...entry, finishes: undefined}));
    stubRepo({files: {[CHUNK_4]: collectionText(bare)}});
    const clashes = await clashesOf(
      publish(changeFor({row: enchantedNamingBoth, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'normal'})),
    );
    expect(clashes).toEqual([
      {id: '900', now: null, shownNow: ['foil']}, // an Enchanted comes in foil alone
      {id: '946', now: null, shownNow: ['normal', 'foil']}, // a Legendary in both
    ]);
  });

  it('refuses a printing that one of its other homes lacks, and writes nothing', async () => {
    const repo = stubRepo({files: {...BASE_FILES, [PROMOS_PATH]: collectionText(C3_MKB_ENTRIES.slice(1))}});
    const publishing = publish(MKB_1C3_TO_BOTH);
    await expect(publishing).rejects.toThrow(FinishFileError);
    await expect(publishing).rejects.toThrow(`80017 isn't in ${PROMOS_PATH}`);
    expect(repo.writes()).toEqual([]);
  });

  it('names the change whose printing a file lacks, and the way out: publish the rest without it', async () => {
    stubRepo({files: {...BASE_FILES, [PROMOS_PATH]: collectionText(C3_MKB_ENTRIES.slice(1))}});
    const refusal = await publish(YEN_SID_223_TO_BOTH, MKB_1C3_TO_BOTH).then(
      () => null,
      (e: unknown) => e,
    );
    expect(refusal).toBeInstanceOf(FinishFileError);
    expect(refusal).toHaveProperty(
      'message',
      `Mother Knows Best 1/C3: 80017 isn't in ${PROMOS_PATH}. Revert it to publish the rest.`,
    );
    // Every press fails the same way until the owner reverts that change, so the message names it.
    expect((refusal as FinishFileError).id).toBe('80017');
  });

  it('refuses a file whose text drifted from its format, and writes nothing', async () => {
    // Someone saved the catalog by hand with a newline at the end: writing it would rewrite all of it.
    const repo = stubRepo({files: {...BASE_FILES, [CATALOG_PATH]: `${catalogWith()}\n`}});
    await expect(publish(YEN_SID_223_TO_BOTH, MKB_1C3_TO_BOTH)).rejects.toMatchObject({
      name: 'FinishFileError',
      message: `${CATALOG_PATH} isn't in its format (JSON.stringify(x, null, 2), with no newline at the end), so a publish would rewrite all of it. Put it back in that format first.`,
    });
    expect(repo.writes()).toEqual([]);
  });

  it('publishes over a drifted file it doesn’t touch: it reads only the homes of its changes (#74)', async () => {
    // The catalog has a newline at the end, but #223 is a printing of Set 4, which only Set 4's chunk holds.
    const repo = stubRepo({files: {...BASE_FILES, [CATALOG_PATH]: `${catalogWith()}\n`}});
    await expect(publish(YEN_SID_223_TO_BOTH)).resolves.toEqual({commitUrl: COMMIT_URL});
    expect(repo.reads().map(({path}) => path)).toEqual([CHUNK_4]);
    expect(Object.keys(repo.filesSent())).toEqual([CHUNK_4]);
  });

  it.each([
    [CHUNK_4, 'text that is not JSON', '<<<<<<< HEAD\n'],
    [PROMOS_PATH, 'JSON of another shape', '{"promos": []}\n'],
    [CATALOG_PATH, 'JSON with none of its parts', '{}'],
  ])('names %s when it is %s, and writes nothing', async (path, _what, text) => {
    const repo = stubRepo({files: {...BASE_FILES, [path]: text}});
    await expect(publish(YEN_SID_223_TO_BOTH, MKB_1C3_TO_BOTH)).rejects.toThrow(`${path} can't be read: `);
    expect(repo.writes()).toEqual([]);
  });

  it('passes on the refusal of a branch that moved while it published', async () => {
    stubRepo({files: BASE_FILES, update: notAFastForward});
    await expect(publish(YEN_SID_223_TO_BOTH)).rejects.toHaveProperty(
      'message',
      'master changed while publishing, so nothing was published. Publish again.',
    );
  });
});

describe('the words of a publish', () => {
  it('counts the printings in its commit message', () => {
    expect(versionCommitMessage(1)).toBe('chore(collection): set the versions of 1 printing from Card studio');
    expect(versionCommitMessage(3)).toBe('chore(collection): set the versions of 3 printings from Card studio');
  });

  it('counts the clashes, and names the branch they are on', () => {
    expect(clashMessage(1)).toBe(
      '1 change clashes: someone changed this printing on master since. Keep or drop each one, then publish.',
    );
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68');
    expect(clashMessage(3)).toBe(
      '3 changes clash: someone changed these printings on rehearse-68 since. Keep or drop each one, then publish.',
    );
  });

  it('makes an error of the clashes that says what clashMessage says', () => {
    const clashes: VersionClash[] = [{id: '946', now: ['normal'], shownNow: ['normal']}];
    const error = new VersionClashError(clashes);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('VersionClashError');
    expect(error.clashes).toBe(clashes);
    expect(error.message).toBe(clashMessage(1));
  });
});

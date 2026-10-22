import {afterEach, describe, expect, it, vi} from 'vitest';
import {commitDetails, MAX_READ} from '../commitDetails';
import {commitOf, stubHistory} from './historyHarness';

const ALL_CARDS = 'apps/web/public/data/allCards.json';
const CATALOG = 'scripts/data/promo-printings.json';
const PROMOS = 'apps/web/public/data/collection/promos.json';
const TUNING = 'packages/synergy-engine/src/data/tuning.json';
const RAW = 'apps/web/public/card-images-raw';

afterEach(() => vi.unstubAllGlobals());

const BRUNO = {id: 1936, fullName: 'Bruno Madrigal - Undetected Uncle', setCode: '9', number: 0};
const D23 = {id: 1194, rarity: 'Special', number: 4, promoGrouping: 'D23'};
const foil = <T,>(entry: T) => ({...entry, finishes: ['foil']});

/** The three files a promo's versions live in, before and after Card studio set them. */
function promoFiles(sha: string, parent: string) {
  const catalog = (variant: object) => JSON.stringify({fold: [{baseId: 1936, fullName: BRUNO.fullName, variants: [variant]}]}, null, 2);
  const promos = (entry: object) => `${JSON.stringify([{...entry, fullName: BRUNO.fullName, baseId: 1936}])}\n`;
  const allCards = (variant: object) => `${JSON.stringify({cards: [{...BRUNO, variants: [variant]}]}, null, 2)}\n`;
  return {
    [`${parent}:${CATALOG}`]: catalog(D23),
    [`${sha}:${CATALOG}`]: catalog(foil(D23)),
    [`${parent}:${PROMOS}`]: promos(D23),
    [`${sha}:${PROMOS}`]: promos(foil(D23)),
    [`${parent}:${ALL_CARDS}`]: allCards(D23),
    [`${sha}:${ALL_CARDS}`]: allCards(foil(D23)),
  };
}

const modified = (filename: string) => ({filename, status: 'modified' as const});

describe('commitDetails', () => {
  it("reads a versions commit's files on both sides, and lists each printing it changed once", async () => {
    stubHistory({
      commits: {v1: commitOf({sha: 'v1', parent: 'p1', files: [modified(CATALOG), modified(PROMOS), modified(ALL_CARDS)]})},
      files: promoFiles('v1', 'p1'),
    });
    expect(await commitDetails({token: 't', sha: 'v1'})).toEqual({
      url: 'https://github.com/Doberjohn/inkweave/commit/v1',
      entries: [
        {
          id: '1194',
          cardId: '1936',
          label: 'Bruno Madrigal - Undetected Uncle 4/D23',
          kind: 'changed',
          values: [{key: 'finishes', label: 'Versions', from: 'Not set', to: 'Foil only'}],
        },
      ],
      tuning: [],
      scans: [],
      unread: [],
      otherFiles: 0,
    });
  });

  it('lists the scans a commit added, by the card each is for, and counts the files it changed outside the history', async () => {
    const stub = stubHistory({
      commits: {
        s1: commitOf({sha: 's1', parent: 'p1', files: [{filename: `${RAW}/14040.jpg`, status: 'added'}, modified('README.md')]}),
      },
    });
    const details = await commitDetails({token: 't', sha: 's1'});
    expect(details).toMatchObject({scans: [{path: `${RAW}/14040.jpg`, cardId: '14040', sha: 's1'}], entries: [], otherFiles: 1});
    // A scan isn't read until the view shows it.
    expect(stub.asked()).toEqual(['/commits/s1']);
  });

  it('reads tuning.json as values, and a file the commit added as having none before', async () => {
    stubHistory({
      commits: {t1: commitOf({sha: 't1', parent: 'p1', files: [{filename: TUNING, status: 'added'}]})},
      files: {[`t1:${TUNING}`]: JSON.stringify({playstyles: {ramp: {name: 'Ramp'}}})},
    });
    expect((await commitDetails({token: 't', sha: 't1'})).tuning).toEqual([
      {key: 'playstyles.ramp.name', label: 'Ramp · Title', from: '—', to: 'Ramp'},
    ]);
  });

  it(`lists a commit's files unread, and reads none, past ${MAX_READ} followed files`, async () => {
    const chunks = Array.from({length: MAX_READ + 1}, (_, i) => `apps/web/public/data/collection/${i + 1}.json`);
    const stub = stubHistory({commits: {big: commitOf({sha: 'big', parent: 'p1', files: chunks.map(modified)})}});
    expect(await commitDetails({token: 't', sha: 'big'})).toMatchObject({entries: [], unread: chunks});
    expect(stub.asked()).toEqual(['/commits/big']);
  });

  it("lists a file it can't read as unread, and itemizes the rest", async () => {
    stubHistory({
      commits: {m1: commitOf({sha: 'm1', parent: 'p1', files: [modified(CATALOG), modified(TUNING)]})},
      files: {
        [`p1:${CATALOG}`]: '{"fold": [',
        [`m1:${CATALOG}`]: '{"fold": []}',
        [`p1:${TUNING}`]: '{"playstyles": {}}',
        [`m1:${TUNING}`]: '{"playstyles": {"ramp": {"name": "Ramp"}}}',
      },
    });
    const details = await commitDetails({token: 't', sha: 'm1'});
    expect(details.unread).toEqual([CATALOG]);
    expect(details.tuning).toHaveLength(1);
  });

  it('reads a commit once a session, and again after a read that failed', async () => {
    const stub = stubHistory({commits: {ok: commitOf({sha: 'ok', parent: 'p1', files: []})}});
    await commitDetails({token: 't', sha: 'ok'});
    await commitDetails({token: 't', sha: 'ok'});
    expect(stub.asked()).toEqual(['/commits/ok']);

    await expect(commitDetails({token: 't', sha: 'missing'})).rejects.toThrow('GitHub 404 on /repos/Doberjohn/inkweave/commits/missing');
    await expect(commitDetails({token: 't', sha: 'missing'})).rejects.toThrow();
    expect(stub.asked().filter((asked) => asked === '/commits/missing')).toHaveLength(2);
  });
});

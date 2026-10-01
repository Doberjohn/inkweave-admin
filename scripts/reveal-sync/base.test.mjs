// @vitest-environment node
import {afterEach, describe, expect, it} from 'vitest';
import {assertNoOpenRevealPr, readBase} from './base.mjs';
import {setGhRunner} from './github.mjs';
import {fakeGh, fileAnswer, table} from './__fixtures__/gh.mjs';

const OPEN_PRS = 'GET repos/Doberjohn/inkweave/pulls?state=open&per_page=100&page=1';

afterEach(() => setGhRunner());

describe('the start check', () => {
  it('refuses while a reveal PR is open, naming it', () => {
    fakeGh(
      table({
        [OPEN_PRS]: [
          {number: 700, html_url: 'https://github.com/Doberjohn/inkweave/pull/700', head: {ref: 'reveals/set14-20261001-101500'}},
          {number: 701, html_url: 'https://github.com/Doberjohn/inkweave/pull/701', head: {ref: 'feature/1-other'}},
        ],
      }),
    );
    expect(assertNoOpenRevealPr).toThrow(/pull\/700\)/);
  });

  it('lets through the PR on the branch it is told is its own, and no other', () => {
    fakeGh(
      table({
        [OPEN_PRS]: [{number: 702, html_url: 'https://github.com/Doberjohn/inkweave/pull/702', head: {ref: 'reveals/set14-variants-215'}}],
      }),
    );
    expect(() => assertNoOpenRevealPr({except: 'reveals/set14-variants-215'})).not.toThrow();
    expect(() => assertNoOpenRevealPr({except: 'reveals/set14-variants-239'})).toThrow(/pull\/702\)/);
  });

  it('lets a run start when no reveal PR is open', () => {
    fakeGh(table({[OPEN_PRS]: [{number: 701, html_url: 'u', head: {ref: 'feature/1-other'}}]}));
    expect(assertNoOpenRevealPr).not.toThrow();
  });

  it("reads the app's preview data from master and admin's state from main", () => {
    fakeGh(
      table({
        'GET repos/Doberjohn/inkweave/contents/apps/web/public/data/previewCards.json?ref=master': fileAnswer('{"cards":[]}', 'p1'),
        'GET repos/Doberjohn/inkweave-admin/contents/scripts/reveal-sync/state.json?ref=main': fileAnswer('{"sets":{}}\n', 's1'),
      }),
    );
    expect(readBase()).toEqual({
      appBase: 'master',
      stateBranch: 'main',
      preview: {text: '{"cards":[]}', sha: 'p1'},
      state: {text: '{"sets":{}}\n', sha: 's1'},
    });
  });
});

import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {
  forgetBranchFiles,
  lastTextCached,
  readBranchFile,
  resetBranchFiles,
  useBranchFilesGeneration,
  type BranchFile,
} from '../branchFiles';
import {CATALOG_PATH, PROMOS_PATH} from '../finishFiles';
import {deferredResponse, stubBranch} from './branchHarness';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const BAD_GATEWAY = `GitHub 502 on ${PROMOS_PATH}: Bad gateway`;
const badGateway = () => new Response('Bad gateway', {status: 502});

/** A read of promos.json, or of another path, by a token. */
const read = (path = PROMOS_PATH) => readBranchFile({token: 't', path});

describe('readBranchFile', () => {
  it('reads a file once per branch and path', async () => {
    const branch = stubBranch({[PROMOS_PATH]: '[]\n', [CATALOG_PATH]: '{}'});
    expect(await read(PROMOS_PATH)).toBe('[]\n');
    expect(await read(PROMOS_PATH)).toBe('[]\n');
    expect(branch.paths()).toEqual([PROMOS_PATH]);

    expect(await read(CATALOG_PATH)).toBe('{}');
    expect(branch.paths()).toEqual([PROMOS_PATH, CATALOG_PATH]);
  });

  it('reads with the token, from the target branch', async () => {
    const branch = stubBranch({[PROMOS_PATH]: '[]\n'});
    await read();
    expect(branch.refs()).toEqual(['master']);
    expect(branch.tokens()).toEqual(['t']);
  });

  it('keeps one read for each branch', async () => {
    const branch = stubBranch({[PROMOS_PATH]: '[]\n'});
    await read();
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68');
    await read();
    await read();
    vi.unstubAllEnvs();
    await read();
    expect(branch.refs()).toEqual(['master', 'rehearse-68']);
  });

  it('shares one read among the callers that ask while it is under way', async () => {
    const late = deferredResponse();
    const branch = stubBranch({[PROMOS_PATH]: () => late.response});
    const first = read();
    const second = read();
    late.respond(new Response('[]\n'));
    expect(await Promise.all([first, second])).toEqual(['[]\n', '[]\n']);
    expect(branch.paths()).toEqual([PROMOS_PATH]);
  });

  it('reads again after forgetBranchFiles', async () => {
    const branch = stubBranch({[PROMOS_PATH]: '[]\n'});
    await read();
    forgetBranchFiles();
    await read();
    expect(branch.paths()).toEqual([PROMOS_PATH, PROMOS_PATH]);
  });

  it('gives a failed read its failure, and reads again the next time it is asked', async () => {
    const branch = stubBranch({[PROMOS_PATH]: '[]\n'});
    branch.fetch.mockImplementationOnce(async () => badGateway());
    await expect(read()).rejects.toThrow(BAD_GATEWAY);
    expect(await read()).toBe('[]\n');
    await read();
    expect(branch.paths()).toHaveLength(2); // the failure was not kept, the success was

    forgetBranchFiles();
    await read();
    expect(branch.paths()).toHaveLength(3);
  });

  it('keeps a read that began after a forget when an earlier one fails', async () => {
    const early = deferredResponse();
    const branch = stubBranch({[PROMOS_PATH]: '[]\n'});
    branch.fetch.mockImplementationOnce(() => early.response);
    const stale = read();
    forgetBranchFiles();
    await read();

    early.respond(badGateway());
    await expect(stale).rejects.toThrow(BAD_GATEWAY);
    await read();
    expect(branch.paths()).toHaveLength(2);
  });
});

describe('useBranchFilesGeneration', () => {
  it('counts the times the reads were dropped, and renders the hooks that follow it again', () => {
    const {result} = renderHook(() => useBranchFilesGeneration());
    expect(result.current).toBe(0);
    act(() => forgetBranchFiles());
    expect(result.current).toBe(1);
    act(() => forgetBranchFiles());
    expect(result.current).toBe(2);
  });

  it('is back at 0 after resetBranchFiles, which also drops every read', async () => {
    const branch = stubBranch({[PROMOS_PATH]: '[]\n'});
    const {result} = renderHook(() => useBranchFilesGeneration());
    await read();
    act(() => forgetBranchFiles());
    await read();
    expect(result.current).toBe(1);
    expect(branch.paths()).toHaveLength(2);

    act(() => resetBranchFiles());
    expect(result.current).toBe(0);
    await read();
    expect(branch.paths()).toHaveLength(3);
  });
});

describe('lastTextCached', () => {
  const parsing = () => vi.fn(({text}: BranchFile) => ({text}));

  it("parses a path's text once, however often it is asked", () => {
    const parse = parsing();
    const parsed = lastTextCached(parse);
    const first = parsed({path: 'a.json', text: '[1]'});
    expect(first).toEqual({text: '[1]'});
    expect(parsed({path: 'a.json', text: '[1]'})).toBe(first);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('keeps each path apart, and only the last text of each', () => {
    const parse = parsing();
    const parsed = lastTextCached(parse);
    parsed({path: 'a.json', text: '[1]'});
    parsed({path: 'b.json', text: '[1]'});
    expect(parse).toHaveBeenCalledTimes(2);

    parsed({path: 'a.json', text: '[2]'});
    parsed({path: 'a.json', text: '[1]'});
    expect(parse).toHaveBeenCalledTimes(4);
  });

  it('keeps nothing of a text it could not parse', () => {
    const parse = vi.fn(({text}: BranchFile) => {
      if (text === 'broken') throw new Error('Unexpected token');
      return text;
    });
    const parsed = lastTextCached(parse);
    const broken = {path: 'a.json', text: 'broken'};
    expect(() => parsed(broken)).toThrow('Unexpected token');
    expect(() => parsed(broken)).toThrow('Unexpected token');
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('forgets everything on resetBranchFiles', () => {
    const parse = parsing();
    const parsed = lastTextCached(parse);
    parsed({path: 'a.json', text: '[1]'});
    resetBranchFiles();
    parsed({path: 'a.json', text: '[1]'});
    expect(parse).toHaveBeenCalledTimes(2);
  });
});

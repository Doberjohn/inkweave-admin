import {afterEach, describe, it, expect, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {DeferredReader} from '../../../test/DeferredReader';
import {imageDataUrl, pngFile} from '../../../test/images';

// The hook pulls a token + card list from context; stub both so the hook can run
// in isolation. The token is present so canPublish hinges on card + image only.
vi.mock('../../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
}));
vi.mock('../../../app-bridge', () => ({
  useCardDataContext: () => ({cards: []}),
}));
// Each publish test decides when its commit settles.
const commitCardImage = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({commitCardImage}));

import {useImageAdmin} from '../useImageAdmin';

function card(id: string): LorcanaCard {
  return {id, name: id, fullName: id, cost: 1, ink: 'Amber', inkwell: true, type: 'Character'};
}

const image = pngFile;

/**
 * Card A picked, its image staged, and a publish under way whose commit lands
 * when the test calls `finishCommit`.
 */
async function publishingCardA() {
  let finish: () => void = () => {};
  commitCardImage.mockReturnValue(new Promise((resolve) => (finish = () => resolve({commitUrl: 'https://github.com/x/y/commit/1'}))));
  const {result} = renderHook(() => useImageAdmin());
  act(() => result.current.selectCard(card('A')));
  await act(async () => {
    await result.current.onImageChange(image('a.png'));
  });
  act(() => {
    result.current.publish();
  });
  return {result, finishCommit: () => act(async () => finish())};
}

/** Reads finish only when the test says so (see DeferredReader). */
function deferReads() {
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
}

afterEach(() => vi.unstubAllGlobals());

describe('useImageAdmin', () => {
  it('clears the staged image when a different card is selected', async () => {
    const {result} = renderHook(() => useImageAdmin());

    act(() => result.current.selectCard(card('A')));
    await act(async () => {
      await result.current.onImageChange(image('a.png'));
    });
    expect(result.current.canPublish).toBe(true);

    // Switching cards must drop card A's upload — otherwise it would publish
    // against card B's id.
    act(() => result.current.selectCard(card('B')));
    expect(result.current.newImageUrl).toBeNull();
    expect(result.current.canPublish).toBe(false);
  });

  it("never offers one file's bytes under another file's name", async () => {
    deferReads();
    const {result} = renderHook(() => useImageAdmin());
    act(() => result.current.selectCard(card('A')));
    act(() => void result.current.onImageChange(image('a.png')));
    await DeferredReader.finish(0);
    expect(result.current.canPublish).toBe(true);

    act(() => void result.current.onImageChange(image('b.webp')));
    expect(result.current.canPublish).toBe(false);
    await DeferredReader.finish(1);
    expect(result.current.newImageUrl).toBe(imageDataUrl('b.webp'));
  });

  it('clears the published card and image once the commit lands', async () => {
    const {result, finishCommit} = await publishingCardA();
    await finishCommit();
    expect(result.current.result).not.toBeNull();
    expect(result.current.selectedCard).toBeNull();
    expect(result.current.newImageUrl).toBeNull();
  });

  it('leaves a card picked while the publish was running', async () => {
    const {result, finishCommit} = await publishingCardA();
    act(() => result.current.selectCard(card('B')));
    await finishCommit();
    expect(result.current.result).not.toBeNull();
    expect(result.current.selectedCard?.id).toBe('B');
  });

  it('drops a read that finishes after switching cards', async () => {
    deferReads();
    const {result} = renderHook(() => useImageAdmin());
    act(() => result.current.selectCard(card('A')));
    act(() => void result.current.onImageChange(image('a.png')));
    act(() => result.current.selectCard(card('B')));

    await DeferredReader.finish(0);
    expect(result.current.newImageUrl).toBeNull();
    expect(result.current.canPublish).toBe(false);
  });
});

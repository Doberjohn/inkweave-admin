import {afterEach, describe, it, expect, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {DeferredReader} from '../../../test/DeferredReader';

// The hook pulls a token + card list from context; stub both so the hook can run
// in isolation. The token is present so canPublish hinges on card + image only.
vi.mock('../../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
}));
vi.mock('../../../app-bridge', () => ({
  useCardDataContext: () => ({cards: []}),
}));

import {useImageAdmin} from '../useImageAdmin';

function card(id: string): LorcanaCard {
  return {id, name: id, fullName: id, cost: 1, ink: 'Amber', inkwell: true, type: 'Character'};
}

const image = (name: string) => new File(['x'], name, {type: 'image/png'});

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
      await result.current.onImageChange(new File(['x'], 'a.png', {type: 'image/png'}));
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
    expect(result.current.newImageUrl).toBe('data:b.webp');
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

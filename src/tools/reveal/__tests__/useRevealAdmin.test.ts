import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {DeferredReader} from '../../../test/DeferredReader';
import {inkBlock} from '../../../app-bridge';
import {useRevealAdmin} from '../useRevealAdmin';

// A saved token and an empty card list; the rest of the bridge stays real.
vi.mock('../../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../app-bridge')>()),
  useCardDataContext: () => ({cards: []}),
}));

const image = (name: string) => new File(['x'], name, {type: 'image/png'});

// A complete character, numbered inside Ruby's block for the current season.
const VALID_FORM = {
  collectorNumber: String(inkBlock('Ruby').first),
  name: 'Mei',
  rarity: 'Rare',
  cost: '4',
  ink: 'Ruby' as const,
  type: 'Character' as const,
  strength: '3',
  willpower: '5',
  lore: '2',
};

beforeEach(() => {
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
});

afterEach(() => vi.unstubAllGlobals());

describe('useRevealAdmin', () => {
  it("never offers one file's bytes under another file's name", async () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => result.current.patchForm(VALID_FORM));
    act(() => void result.current.onImageChange(image('a.png')));
    await DeferredReader.finish(0);
    expect(result.current.canPublish).toBe(true);

    act(() => void result.current.onImageChange(image('b.webp')));
    expect(result.current.canPublish).toBe(false);
    await DeferredReader.finish(1);
    expect(result.current.canPublish).toBe(true);
  });

  it('keeps the newest image when an older read finishes last', async () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => result.current.patchForm(VALID_FORM));
    act(() => void result.current.onImageChange(image('a.png')));
    act(() => void result.current.onImageChange(image('b.webp')));

    await DeferredReader.finish(1);
    await DeferredReader.finish(0);
    expect(result.current.previewCard?.imageUrl).toBe('data:b.webp');
  });
});

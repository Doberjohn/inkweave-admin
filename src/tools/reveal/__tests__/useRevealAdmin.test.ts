import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {DeferredReader} from '../../../test/DeferredReader';
import {imageDataUrl, pngFile} from '../../../test/images';
import {REVEAL_ID_BASE, inkBlock} from '../../../app-bridge';
import {revealChecklist} from '../../studio/readiness';
import {useRevealAdmin, type RevealAdminController} from '../useRevealAdmin';

// A saved token and an empty card list; the rest of the bridge stays real.
vi.mock('../../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../app-bridge')>()),
  useCardDataContext: () => ({cards: []}),
}));
// Each publish test decides how its commit settles.
const commitNewCard = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({commitNewCard}));

const image = pngFile;

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

afterEach(() => {
  vi.unstubAllGlobals();
  // No clearMocks in vite.config.ts: call counts would carry over between tests.
  commitNewCard.mockReset();
});

/** Whether the studio's checklist reads all done, as it would over this controller. */
const checklistDone = (c: RevealAdminController) =>
  revealChecklist(c.form, c.validation, c.imageDataUrl !== null).every((i) => i.done);

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

  it("previews a card with its scan language, which the engine's transform drops", () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => result.current.patchForm({...VALID_FORM, scanLanguage: 'ja'}));
    expect(result.current.previewCard?.scanLanguage).toBe('ja');
  });

  it('keeps the newest image when an older read finishes last', async () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => result.current.patchForm(VALID_FORM));
    act(() => void result.current.onImageChange(image('a.png')));
    act(() => void result.current.onImageChange(image('b.webp')));

    await DeferredReader.finish(1);
    await DeferredReader.finish(0);
    expect(result.current.previewCard?.imageUrl).toBe(imageDataUrl('b.webp'));
  });

  it('is dirty after a field change or a chosen image, and clean again after a publish', async () => {
    commitNewCard.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/1'});
    const {result} = renderHook(() => useRevealAdmin());
    expect(result.current.dirty).toBe(false);
    act(() => result.current.patchForm({name: 'Mei'}));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.patchForm({name: ''}));
    act(() => void result.current.onImageChange(image('a.png')));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.patchForm(VALID_FORM));
    await DeferredReader.finish(0);
    await act(async () => result.current.publish());
    expect(result.current.dirty).toBe(false);
  });

  it("carries a bad file's error as uploadError", async () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => void result.current.onImageChange(image('scan.gif')));
    await DeferredReader.finish(0);
    expect(result.current.uploadError).toMatch(/not a JPEG, PNG or WebP image/);
    expect(result.current.imageName).toBe('scan.gif');
  });

  // The checklist and the Publish button must never disagree.
  it('reads all done on the checklist exactly when Publish is on', async () => {
    commitNewCard.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/1'});
    const {result} = renderHook(() => useRevealAdmin());
    const states: [boolean, boolean][] = [];
    const record = () => states.push([checklistDone(result.current), result.current.canPublish]);

    record(); // empty
    act(() => result.current.patchForm(VALID_FORM));
    record(); // valid, no image
    act(() => void result.current.onImageChange(image('a.png')));
    record(); // the file is still being read
    await DeferredReader.finish(0);
    record(); // ready
    await act(async () => result.current.publish());
    record(); // published

    expect(states).toEqual([
      [false, false],
      [false, false],
      [false, false],
      [true, true],
      [false, false],
    ]);
  });

  // Card studio counts the branch's previewCards.json, so a card published since the
  // last deploy is no new reveal.
  it("refuses a number the branch's previewCards.json already holds", () => {
    const ids = new Set([REVEAL_ID_BASE + Number(VALID_FORM.collectorNumber)]);
    const {result} = renderHook(() => useRevealAdmin({ids, reload: () => {}}));
    act(() => result.current.patchForm(VALID_FORM));
    expect(result.current.validation.errors.collectorNumber).toMatch(/already exists/);
  });

  it("reads the branch's file again after a publish", async () => {
    commitNewCard.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/1'});
    const reload = vi.fn();
    const {result} = renderHook(() => useRevealAdmin({ids: new Set(), reload}));
    act(() => result.current.patchForm(VALID_FORM));
    act(() => void result.current.onImageChange(image('a.png')));
    await DeferredReader.finish(0);
    await act(async () => result.current.publish());
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

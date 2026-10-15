import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {DeferredReader} from '../../../test/DeferredReader';
import {imageDataUrl, pngFile} from '../../../test/images';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {inkBlock, REVEAL_ID_BASE, REVEAL_SET_CODE, SET_TOTAL} from '../../../app-bridge';
import {revealChecklist} from '../../studio/readiness';
import {studioCard} from '../../studio/studioFixtures';
import type {RevealCardForm} from '../buildPreviewCard';
import {EMPTY_FORM} from '../emptyForm';
import {useRevealAdmin, type RevealAdminController} from '../useRevealAdmin';

// A saved token and the card list each test sets (empty unless it says); the rest of the bridge stays real.
vi.mock('../../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
}));
const cardList = vi.hoisted(() => ({cards: [] as LorcanaCard[]}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../app-bridge')>()),
  useCardDataContext: () => cardList,
}));
// Each test decides how the commit settles; the rest of the client stays real.
const commitNewCard = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../githubClient')>()),
  commitNewCard,
}));

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

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'};

beforeEach(() => {
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
  cardList.cards = [];
  // mockReset, not clearAllMocks: it also drops the last test's implementations.
  commitNewCard.mockReset();
  commitNewCard.mockResolvedValue(COMMIT);
});

afterEach(() => vi.unstubAllGlobals());

type Hook = {current: RevealAdminController};

/** Fill in the complete Ruby character, with any fields changed. */
function fill(hook: Hook, patch: Partial<RevealCardForm> = {}) {
  act(() => hook.current.patchForm({...VALID_FORM, ...patch}));
}

/** Choose a file; its read waits for DeferredReader.finish. */
function choose(hook: Hook, name: string) {
  act(() => void hook.current.onImageChange(image(name)));
}

/** A complete card with its image read: everything Publish needs. */
async function ready(hook: Hook) {
  fill(hook);
  choose(hook, 'a.png');
  await DeferredReader.finish(0);
}

/** Press Publish, and wait for the commit to land. */
async function publish(hook: Hook) {
  act(() => void hook.current.publish());
  await waitFor(() => expect(hook.current.result).toEqual(COMMIT));
}

/** The ready checklist (R4-3a), read from the controller as the studio reads it. */
function checklistOf(ctrl: RevealAdminController) {
  const imageState = {ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError};
  return revealChecklist(ctrl.form, ctrl.validation, imageState);
}

/** Every item of the ready checklist is done. */
function checklistDone(ctrl: RevealAdminController): boolean {
  return checklistOf(ctrl).every((item) => item.done);
}

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

  it.each([
    {state: 'an empty form', reach: async () => {}, publishable: false},
    {state: 'a complete card with no image', reach: async (hook: Hook) => fill(hook), publishable: false},
    {
      state: 'a complete card whose image is still being read',
      reach: async (hook: Hook) => {
        fill(hook);
        choose(hook, 'a.png');
      },
      publishable: false,
    },
    {
      state: 'a complete card whose file fails its byte check',
      reach: async (hook: Hook) => {
        fill(hook);
        choose(hook, 'a.gif');
        await DeferredReader.finish(0);
      },
      publishable: false,
    },
    {
      state: 'a card in the wrong ink block, with its image read',
      reach: async (hook: Hook) => {
        await ready(hook);
        fill(hook, {ink: 'Amber'});
      },
      publishable: false,
    },
    {state: 'a complete card with its image read', reach: ready, publishable: true},
    {
      state: 'a card just published',
      reach: async (hook: Hook) => {
        await ready(hook);
        await publish(hook);
      },
      publishable: false,
    },
  ])('ticks every checklist item exactly when Publish is on: $state', async ({reach, publishable}) => {
    const {result} = renderHook(() => useRevealAdmin());
    await reach(result);
    expect(result.current.canPublish).toBe(publishable);
    expect(checklistDone(result.current)).toBe(publishable);
  });

  describe('dirty', () => {
    it('turns dirty on a field change, and clean again once the field is back to empty', () => {
      const {result} = renderHook(() => useRevealAdmin());
      expect(result.current.dirty).toBe(false);
      act(() => result.current.patchForm({name: 'Mei'}));
      expect(result.current.dirty).toBe(true);
      act(() => result.current.patchForm({name: ''}));
      expect(result.current.dirty).toBe(false);
    });

    it('turns dirty as soon as a file is chosen, before its bytes are read, and clean once it is cleared', () => {
      const {result} = renderHook(() => useRevealAdmin());
      choose(result, 'a.png');
      expect(result.current).toMatchObject({dirty: true, imageName: 'a.png', imageDataUrl: null});
      act(() => void result.current.onImageChange(null));
      expect(result.current).toMatchObject({dirty: false, imageName: null});
    });

    it('is clean once a publish lands: the card is committed, the form emptied and the image cleared', async () => {
      const {result} = renderHook(() => useRevealAdmin());
      fill(result);
      choose(result, 'Mei.WebP');
      await DeferredReader.finish(0);
      expect(result.current).toMatchObject({dirty: true, imageDataUrl: imageDataUrl('Mei.WebP')});

      await publish(result);
      expect(commitNewCard).toHaveBeenCalledOnce();
      expect(commitNewCard).toHaveBeenCalledWith({
        token: 'tok',
        card: expect.objectContaining({id: REVEAL_ID_BASE + inkBlock('Ruby').first, name: 'Mei'}),
        imageBase64: imageDataUrl('Mei.WebP'),
        imageExt: 'webp',
      });
      expect(result.current).toMatchObject({dirty: false, form: EMPTY_FORM, imageName: null, imageDataUrl: null});
    });
  });

  describe('errors', () => {
    it("shows the validator's message for a name it refuses while its bytes are read, then the bytes' own", async () => {
      const {result} = renderHook(() => useRevealAdmin());
      const refused = 'Image must be jpg, jpeg, png, or webp';
      choose(result, 'a.gif');
      expect(result.current).toMatchObject({imageError: refused, uploadError: null});

      await DeferredReader.finish(0);
      const problem = 'a.gif is not a JPEG, PNG or WebP image.';
      expect(result.current).toMatchObject({
        imageName: 'a.gif',
        imageDataUrl: null,
        uploadError: problem,
        imageError: problem,
        commitError: null,
      });
    });

    it('carries a failed read as uploadError', async () => {
      const {result} = renderHook(() => useRevealAdmin());
      choose(result, 'a.png');
      await act(async () => DeferredReader.reads[0].fail());
      expect(result.current).toMatchObject({
        uploadError: 'Could not read the image: read failed',
        imageError: 'Could not read the image: read failed',
        commitError: null,
      });
    });

    it('shows no image error before a file is chosen: the checklist names it (R-72)', () => {
      const {result} = renderHook(() => useRevealAdmin());
      expect(result.current.validation.errors.image).toBe('Upload a card image');
      expect(result.current).toMatchObject({uploadError: null, imageError: null});
    });

    it('reports a failed commit as commitError alone, keeps the draft, and clears it when the next publish starts', async () => {
      commitNewCard.mockRejectedValueOnce(new Error('master changed while publishing'));
      const {result} = renderHook(() => useRevealAdmin());
      await ready(result);
      act(() => void result.current.publish());
      await waitFor(() => expect(result.current.commitError).toBe('master changed while publishing'));
      expect(result.current).toMatchObject({
        uploadError: null,
        result: null,
        dirty: true,
        canPublish: true,
      });

      await publish(result);
      expect(result.current).toMatchObject({commitError: null});
    });
  });

  // Graduation (Doberjohn/inkweave#780) moved #21 to its official id, 3286, and
  // emptied previewCards.json, so no preview id shows the number is taken.
  describe('a number a released card of the reveal set holds', () => {
    const MIGUEL = studioCard({
      id: '3286',
      name: 'Miguel Rivera',
      version: 'Street Musician',
      setCode: REVEAL_SET_CODE,
      setNumber: 21,
    });

    it('refuses #21 under the card that holds it, and the checklist names that card', async () => {
      cardList.cards = [MIGUEL];
      const {result} = renderHook(() => useRevealAdmin());
      fill(result, {collectorNumber: '21', ink: 'Amber'});
      choose(result, 'a.png');
      await DeferredReader.finish(0);

      const message = '#21 is already Miguel Rivera - Street Musician (3286)';
      expect(result.current.validation).toEqual({ok: false, errors: {collectorNumber: message}});
      expect(result.current.canPublish).toBe(false);
      // The ink-block check runs on a number in the set, as on an id collision, so only the number is open.
      expect(checklistOf(result.current).filter((item) => !item.done)).toEqual([
        {id: 'collectorNumber', label: 'Collector number', done: false, message},
      ]);
    });

    it('still refuses a number past the set as past the set, and the Ink item reads "fix it first"', () => {
      cardList.cards = [MIGUEL];
      const {result} = renderHook(() => useRevealAdmin());
      fill(result, {collectorNumber: String(SET_TOTAL + 1)});

      expect(result.current.validation.errors.collectorNumber).toMatch(/is past the \d+-card set/);
      expect(checklistOf(result.current).find((item) => item.id === 'ink')?.message).toBe(
        'Checked against the collector number: fix it first',
      );
    });
  });
});

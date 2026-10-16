import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {formFromPreviewCard} from '../cardEdit';
import {draftChanges, type Draft} from '../editorState';
import {PREVIEW_ENTRY, cardOf} from '../studioFixtures';
import {useEditSave, type EditSaveInput} from '../useEditSave';

// useCardEditor.save.test.ts drives the save side through the editor. This
// file reaches what the editor can't make happen: a throw while a landed save
// lands. Only the commit is faked.
const commitCardEdit = vi.hoisted(() => vi.fn());
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit,
}));

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/c0ffee'};
const MEI = cardOf(PREVIEW_ENTRY);
const FORM = formFromPreviewCard(PREVIEW_ENTRY);
/** Mei open with her cost edited: a fields save, and nothing staged. */
const DRAFT: Draft = {
  cardId: MEI.id,
  seed: 1,
  read: 1,
  follow: false,
  edit: {kind: 'fields', loaded: PREVIEW_ENTRY, before: FORM, form: {...FORM, cost: '5'}},
  image: null,
};

/** The save side over a draft it holds, wired as useCardEditor wires it, with `file` for previewCards.json. */
function useSaveSide(file: EditSaveInput['file']) {
  const [draft, setDraft] = useState(DRAFT);
  return useEditSave({
    token: 'tok',
    draft,
    setDraft,
    card: MEI,
    changes: draftChanges(draft),
    validation: {ok: true, errors: {}},
    staged: {name: null, dataUrl: null, error: null},
    clearIf: () => false,
    file,
  });
}

describe('useEditSave', () => {
  // Each path ends the save itself, with no finally for the React Compiler to skip the hook over (Doberjohn/inkweave-admin#59).
  it("reads a throw while a landed save lands as the save's failure, and the save ends", async () => {
    commitCardEdit.mockResolvedValueOnce(COMMIT);
    const commit = vi.fn(() => {
      throw new Error('previewCards.json: the entry did not merge');
    });
    const {result} = renderHook(() => useSaveSide({requested: 1, reload: vi.fn(), commit}));
    expect(result.current.canSave).toBe(true);
    await act(() => result.current.save());

    expect(commit).toHaveBeenCalledOnce();
    expect(result.current).toMatchObject({
      saving: false,
      result: null,
      saveError: 'previewCards.json: the entry did not merge',
      failure: 'other',
      canSave: true,
    });
  });
});

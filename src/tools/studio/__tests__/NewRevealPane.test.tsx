import {describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {revealForm} from '../../../test/revealForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import type {RevealAdminController} from '../../reveal/useRevealAdmin';
import {NewRevealPane} from '../NewRevealPane';
import {revealChecklist} from '../readiness';
import {revealController} from '../studioFixtures';

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/** A handoff as the pane sees it, the page's or the step's: a request is recorded, and a pending one waits to be taken. */
function handoffOf({pending = false} = {}) {
  return {pending, request: vi.fn(), done: vi.fn()};
}

type Handoff = ReturnType<typeof handoffOf>;

/** The pane, wide (every form field shows), on a controller that starts from an empty draft. */
function renderPane({
  ctrl = {},
  handoff = handoffOf(),
  stepHandoff = handoffOf(),
  onForgetToken = vi.fn(),
}: {
  ctrl?: Partial<RevealAdminController>;
  handoff?: Handoff;
  stepHandoff?: Handoff;
  onForgetToken?: () => void;
} = {}) {
  render(
    <NewRevealPane
      ctrl={revealController(ctrl)}
      layout="wide"
      handoff={handoff}
      stepHandoff={stepHandoff}
      onForgetToken={onForgetToken}
    />,
  );
  return {handoff, stepHandoff, user: userEvent.setup()};
}

const aside = () => within(screen.getByRole('complementary', {name: 'Publish'}));
const panel = () => within(screen.getByRole('region', {name: 'Card preview'}));
const checklist = () => within(aside().getByRole('region', {name: 'Ready to publish'}));
const publishButton = () => aside().getByRole('button', {name: /^Publish/});

describe('NewRevealPane', () => {
  it.each([
    {why: 'stays off until the card is ready', ctrl: {}, label: 'Publish to master', on: false},
    {why: 'publishes a ready card', ctrl: {canPublish: true}, label: 'Publish to master', on: true},
    {why: 'goes off while the commit runs', ctrl: {canPublish: true, publishing: true}, label: 'Publishing…', on: false},
  ])('Publish $why', ({ctrl, label, on}) => {
    renderPane({ctrl});
    expect(publishButton()).toHaveTextContent(label);
    expect(publishButton()).toHaveProperty('disabled', !on);
  });

  it('asks for the handoff once the publish lands, and not before (R-59)', async () => {
    let land: () => void = () => {};
    const publish = vi.fn(() => new Promise<void>((resolve) => (land = resolve)));
    const {handoff, user} = renderPane({ctrl: {canPublish: true, publish}});
    await user.click(publishButton());
    expect(publish).toHaveBeenCalledOnce();
    expect(handoff.request).not.toHaveBeenCalled();

    await act(async () => land());
    expect(handoff.request).toHaveBeenCalledOnce();
  });

  it('asks for nothing when the publish lands after a switch to Edit card took the pane away (R-59)', async () => {
    let land: () => void = () => {};
    const publish = vi.fn(() => new Promise<void>((resolve) => (land = resolve)));
    const handoff = handoffOf();
    const user = userEvent.setup();
    const {unmount} = render(
      <NewRevealPane
        ctrl={revealController({canPublish: true, publish})}
        layout="wide"
        handoff={handoff}
        stepHandoff={handoffOf()}
        onForgetToken={vi.fn()}
      />,
    );
    await user.click(publishButton());
    // The workspace renders this pane only as New card's step 2, so a switch unmounts it.
    unmount();

    await act(async () => land());
    expect(handoff.request).not.toHaveBeenCalled();
  });

  it("gives the form the page's pending handoff while no outcome shows: the card list's", () => {
    const {handoff} = renderPane({handoff: handoffOf({pending: true})});
    expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus();
    expect(handoff.done).toHaveBeenCalled();
  });

  it("leaves the page's pending handoff to the outcome once one shows: it is the publish's", () => {
    renderPane({ctrl: {result: {commitUrl: COMMIT_URL}}, handoff: handoffOf({pending: true})});
    expect(screen.getByRole('textbox', {name: 'Collector number'})).not.toHaveFocus();
  });

  it("gives the form the step's pending handoff even while an outcome shows: the set was chosen for it (R-48)", () => {
    const {stepHandoff} = renderPane({ctrl: {result: {commitUrl: COMMIT_URL}}, stepHandoff: handoffOf({pending: true})});
    expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus();
    expect(stepHandoff.done).toHaveBeenCalled();
  });

  it('shows a refused scan under the card panel, never as the outcome', () => {
    const validation = validateRevealCardForm(revealForm(), new Set(), 'mei.png');
    // The controller's imageError (R4-3b's imageErrorOf) is what the panel shows: here, the upload's own error.
    renderPane({ctrl: {imageName: 'mei.png', uploadError: 'Not a PNG', imageError: 'Not a PNG', validation}});
    expect(panel().getByText('Not a PNG')).toBeInTheDocument();
    // The checklist's Image item words it too (R4-3a); the outcome under Publish stays empty.
    expect(aside().queryByRole('alert')).not.toBeInTheDocument();
    expect(aside().getByRole('status')).toBeEmptyDOMElement();
  });

  it("shows the controller's image error under the card panel, as the Edit pane does, never working it out again", () => {
    const BAD_BYTES = 'mei.png holds a JPEG image; rename it to end in .jpg.';
    renderPane({ctrl: {imageName: 'mei.png', imageError: BAD_BYTES}});
    expect(panel().getByText(BAD_BYTES)).toBeInTheDocument();
  });

  it("keeps a fresh draft's missing scan out of the card panel: the checklist names it (R-72)", () => {
    renderPane();
    expect(panel().queryByText('Upload a card image')).not.toBeInTheDocument();
    expect(checklist().getByText('Upload a card image')).toBeInTheDocument();
  });

  it('offers Forget token when GitHub rejects the token (R-26), and leaves asking to the workspace', async () => {
    const onForgetToken = vi.fn();
    const {user} = renderPane({ctrl: {commitError: REJECTED_PUBLISH}, onForgetToken});
    expect(aside().getByRole('alert')).toHaveTextContent('GitHub 401 on');
    await user.click(aside().getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('reverts a staged scan by clearing the chosen file', async () => {
    const onImageChange = vi.fn();
    const {user} = renderPane({ctrl: {imageName: 'mei.png', onImageChange}});
    await user.click(screen.getByRole('button', {name: 'Revert image'}));
    expect(onImageChange).toHaveBeenCalledWith(null);
  });

  it('keeps Collector number open while the card list loads, saying why, with Publish off (R4-8a)', () => {
    const form = revealForm();
    const validation = validateRevealCardForm(form, new Set(), 'mei.png');
    const scan = {imageName: 'mei.png', imageDataUrl: 'data:image/png;base64,AAAA'};
    renderPane({ctrl: {form, validation, ...scan, cardList: {isLoading: true, error: null}}});
    expect(checklist().getByText("Checking the number needs the card list: it's still loading…")).toBeInTheDocument();
    expect(publishButton()).toHaveProperty('disabled', true);
  });

  it("leaves Identity's dot incomplete while the card list loads, as its checklist item is (R4-8f)", () => {
    const form = revealForm();
    const validation = validateRevealCardForm(form, new Set(), 'mei.png');
    renderPane({ctrl: {form, validation, cardList: {isLoading: true, error: null}}});
    expect(screen.getByRole('heading', {name: 'Identity, incomplete'})).toBeInTheDocument();
  });

  it('offers to load a failed card list again, by the checklist line that names it (R4-8f)', async () => {
    const retryCardList = vi.fn();
    const failed = {isLoading: false, error: new Error('Failed to fetch local cards: 500')};
    const form = revealForm();
    const validation = validateRevealCardForm(form, new Set(), 'mei.png');
    const {user} = renderPane({ctrl: {form, validation, cardList: failed, retryCardList}});
    const item = checklist().getByText(/failed to load: Failed to fetch local cards: 500$/).closest('li') as HTMLElement;
    await user.click(within(item).getByRole('button', {name: 'Load the card list again'}));
    expect(retryCardList).toHaveBeenCalledOnce();
  });

  it.each([
    {state: 'loaded', cardList: {isLoading: false, error: null}},
    {state: 'still loading', cardList: {isLoading: true, error: null}},
  ])('offers no reload while the card list is $state', ({cardList}) => {
    renderPane({ctrl: {cardList}});
    expect(screen.queryByRole('button', {name: 'Load the card list again'})).not.toBeInTheDocument();
  });

  it("counts the scan as ready once the controller has read its bytes, as the checklist's invariant needs", () => {
    const form = revealForm();
    const validation = validateRevealCardForm(form, new Set(), 'mei.png');
    renderPane({ctrl: {form, validation, imageName: 'mei.png', imageDataUrl: 'data:image/png;base64,AAAA'}});
    const items = revealChecklist(form, validation, {ready: true, error: null});
    expect(items.every((item) => item.done)).toBe(true);
    // The count is the checklist Panel's action, beside its h2.
    expect(checklist().getByText(`${items.length}/${items.length}`)).toBeInTheDocument();
  });
});

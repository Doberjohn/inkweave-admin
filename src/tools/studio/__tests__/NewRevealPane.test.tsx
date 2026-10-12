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

/** The page's handoff as the pane sees it: a request is recorded, and a pending one waits to be taken. */
function handoffOf({pending = false} = {}) {
  return {pending, request: vi.fn(), done: vi.fn()};
}

/** The pane, wide (every form field shows), on a controller that starts from an empty draft. */
function renderPane({ctrl = {}, handoff = handoffOf(), onForgetToken = vi.fn()}: {
  ctrl?: Partial<RevealAdminController>;
  handoff?: ReturnType<typeof handoffOf>;
  onForgetToken?: () => void;
} = {}) {
  render(<NewRevealPane ctrl={revealController(ctrl)} layout="wide" handoff={handoff} onForgetToken={onForgetToken} />);
  return {handoff, user: userEvent.setup()};
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

  it("gives the form Save token's pending handoff while no outcome shows", () => {
    const {handoff} = renderPane({handoff: handoffOf({pending: true})});
    expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus();
    expect(handoff.done).toHaveBeenCalled();
  });

  it("leaves a pending handoff to the outcome once one shows: it is the publish's", () => {
    renderPane({ctrl: {result: {commitUrl: COMMIT_URL}}, handoff: handoffOf({pending: true})});
    expect(screen.getByRole('textbox', {name: 'Collector number'})).not.toHaveFocus();
  });

  it('shows a refused scan under the card panel, never as the outcome', () => {
    const validation = validateRevealCardForm(revealForm(), new Set(), 'mei.png');
    renderPane({ctrl: {imageName: 'mei.png', uploadError: 'Not a PNG', validation}});
    expect(panel().getByText('Not a PNG')).toBeInTheDocument();
    // The checklist's Image item words it too (R4-3a); the outcome under Publish stays empty.
    expect(aside().queryByRole('alert')).not.toBeInTheDocument();
    expect(aside().getByRole('status')).toBeEmptyDOMElement();
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

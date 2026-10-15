import type {ComponentProps} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {CommitOutcome} from '../components/CommitOutcome';
import {loadAgainNote} from '../loadAgainNote';

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
/** New reveal's go-live note on master (the R4 header's "Labels and notes"); the page picks it, the outcome prints it. */
const NOTE = 'Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.';
/** R4-1b's StaleCardError message for a card whose entry changed at the base (R-67). */
const STALE = 'Mei - Red Panda changed on master since you loaded it. Load it again.';
const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';
/** commitFiles' race, as New reveal gets it (githubCommit.ts) and as Edit's controller words it for a save (R4-4c). */
const NEW_RACE = 'master changed while publishing, so nothing was published. Publish again.';
const EDIT_RACE = 'master changed while saving, so nothing was saved. Save again.';

type Props = ComponentProps<typeof CommitOutcome>;

function outcomeElement(props: Partial<Props> = {}) {
  return <CommitOutcome result={null} error={null} note={NOTE} {...props} />;
}

/** A handoff the page has asked for and no view has taken yet. */
function pendingHandoff(): FocusHandoff {
  return {pending: true, request: vi.fn(), done: vi.fn()};
}

describe('CommitOutcome', () => {
  it('mounts an empty status line before any commit, so "Committed." is announced when it arrives', () => {
    const {rerender} = render(outcomeElement());
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    rerender(outcomeElement({result: {commitUrl: COMMIT_URL}}));
    // The same element, now filled: a live region mounted with its text often goes unannounced.
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(`Committed. View commit. ${NOTE}`);
  });

  it('links the commit in a new tab, as R2\'s tray does', () => {
    render(outcomeElement({result: {commitUrl: COMMIT_URL}}));
    const link = within(screen.getByRole('status')).getByRole('link', {name: 'View commit'});
    expect(link).toHaveAttribute('href', COMMIT_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows a failure as an alert, beside the empty status line', () => {
    render(outcomeElement({error: 'Publish failed: 403 Forbidden'}));
    expect(screen.getByRole('alert')).toHaveTextContent('Publish failed: 403 Forbidden');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers Load it again after a stale refusal, as a neutral button (R-68)', async () => {
    const onLoadAgain = vi.fn();
    render(outcomeElement({error: STALE, onLoadAgain, onForgetToken: vi.fn()}));
    expect(screen.getByRole('alert')).toHaveTextContent(STALE);
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Load it again'}));
    expect(onLoadAgain).toHaveBeenCalledOnce();
  });

  it('offers Forget token when GitHub rejected the token (R-26)', async () => {
    const onForgetToken = vi.fn();
    render(outcomeElement({error: REJECTED, onForgetToken}));
    expect(screen.getByText(/GitHub rejected the saved token/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it.each([
    ['without onForgetToken', REJECTED, undefined],
    ['for a failure the token didn\'t cause', NEW_RACE, () => {}],
  ])('offers no Forget token %s', (_case, error, onForgetToken) => {
    render(outcomeElement({error, onForgetToken}));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it.each([
    ['New reveal', NEW_RACE],
    ['Edit card', EDIT_RACE],
  ])("shows %s's race refusal word for word, and no way out but trying again", (_mode, error) => {
    render(outcomeElement({error, onForgetToken: () => {}}));
    expect(screen.getByRole('alert').textContent).toBe(error);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says in the status line what Load it again kept, once it lands (R-68)', () => {
    const {rerender} = render(outcomeElement({error: STALE, onLoadAgain: () => {}}));
    const status = screen.getByRole('status');
    rerender(outcomeElement({dropped: 2}));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(loadAgainNote({dropped: 2}));
  });

  // R4-8c: what the draft holds once the read lands decides the line, so "Every edit still applies." needs an edit.
  it.each<[string, Partial<Props>, string]>([
    ['an edit', {dropped: 0, edits: true}, 'Loaded the card again from master. Every edit still applies.'],
    ['a staged image alone', {dropped: 0, staged: true}, 'Loaded the card again from master. Your image is still staged.'],
    ['nothing', {dropped: 0}, 'Loaded the card again from master.'],
  ])('says what Load it again left when the draft holds %s', (_case, props, line) => {
    render(outcomeElement(props));
    expect(screen.getByRole('status').textContent).toBe(line);
  });

  it("says Load it again dropped the edits with the form when the card can't be edited now (R-65, R-68)", () => {
    render(outcomeElement({dropped: 1, editable: false}));
    expect(screen.getByRole('status')).toHaveTextContent(loadAgainNote({dropped: 1, editable: false}));
  });

  it("says a card Load it again turned read-only can't be edited now, though it dropped no edit (R-65, R4-8f)", () => {
    render(outcomeElement({dropped: 0, editable: false, wasEditable: true}));
    expect(screen.getByRole('status').textContent).toBe(
      "Loaded the card again from master. It can't be edited here now, because it holds data the form can't.",
    );
  });

  it('puts a landed commit before an older Load it again note', () => {
    render(outcomeElement({result: {commitUrl: COMMIT_URL}, dropped: 1}));
    expect(screen.getByRole('status')).toHaveTextContent(`Committed. View commit. ${NOTE}`);
  });

  describe('the focus handoff (R-59)', () => {
    it.each<[string, Partial<Props>, () => HTMLElement]>([
      ['the status line after a commit', {result: {commitUrl: COMMIT_URL}}, () => screen.getByRole('status')],
      [
        'the failure after a refusal',
        {error: STALE, onLoadAgain: () => {}},
        () => screen.getByRole('alert').parentElement as HTMLElement,
      ],
      ['the status line after Load it again', {dropped: 0}, () => screen.getByRole('status')],
    ])('gives a pending handoff to %s', (_case, props, target) => {
      const handoff = pendingHandoff();
      render(outcomeElement({...props, handoff}));
      expect(target()).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });

    it('keeps a pending handoff while there is nothing to show', () => {
      const handoff = pendingHandoff();
      render(outcomeElement({handoff}));
      expect(document.body).toHaveFocus();
      expect(handoff.done).not.toHaveBeenCalled();
    });

    it('leaves focus where the user moved it while the commit ran', () => {
      const handoff = pendingHandoff();
      const {rerender} = render(
        <>
          <button type="button">Elsewhere</button>
          {outcomeElement({handoff})}
        </>,
      );
      screen.getByRole('button', {name: 'Elsewhere'}).focus();
      rerender(
        <>
          <button type="button">Elsewhere</button>
          {outcomeElement({handoff, result: {commitUrl: COMMIT_URL}})}
        </>,
      );
      expect(screen.getByRole('button', {name: 'Elsewhere'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });
  });
});

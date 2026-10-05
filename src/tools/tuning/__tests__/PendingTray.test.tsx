import type {ComponentProps} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PendingTray} from '../components/PendingTray';
import {applyTuningEdits} from '../githubClient';
import type {PendingEdit} from '../useTuningAdmin';

// vite.config.ts doesn't set unstubEnvs, so the rehearsal-branch case unstubs by hand.
afterEach(() => vi.unstubAllEnvs());

const EDIT: PendingEdit = {
  pathKey: '["playstyles","ramp","name"]',
  path: ['playstyles', 'ramp', 'name'],
  value: 'Ramp!',
  oldValue: 'Ramp',
  label: 'Title · text',
  valid: true,
};

function renderTray(pending: PendingEdit[], props: Partial<ComponentProps<typeof PendingTray>> = {}) {
  render(
    <PendingTray
      pending={pending}
      publishDisabled={false}
      publishing={false}
      result={null}
      error={null}
      onRevert={() => {}}
      onClear={() => {}}
      onPublish={() => {}}
      {...props}
    />,
  );
}

/** applyTuningEdits' own refusal: the edit expected 'Ramp', and tuning.json now says 'Ramp 2'. */
function staleRefusal(): string {
  try {
    applyTuningEdits(JSON.stringify({playstyles: {ramp: {name: 'Ramp 2'}}}), [
      {path: ['playstyles', 'ramp', 'name'], value: 'Ramp!', expected: 'Ramp'},
    ]);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('applyTuningEdits accepted a stale value');
}

const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

describe('PendingTray', () => {
  it('reverts one edit by its path key', async () => {
    const onRevert = vi.fn();
    renderTray([EDIT], {onRevert});
    await userEvent.click(screen.getByRole('button', {name: 'revert'}));
    expect(onRevert).toHaveBeenCalledWith(EDIT.pathKey);
  });

  it('clears every edit, and offers Clear all only when there are edits', async () => {
    const onClear = vi.fn();
    renderTray([EDIT], {onClear});
    await userEvent.click(screen.getByRole('button', {name: 'Clear all'}));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('hides Clear all with nothing pending', () => {
    renderTray([]);
    expect(screen.queryByRole('button', {name: 'Clear all'})).not.toBeInTheDocument();
  });

  it('counts the pending edits in its heading', () => {
    renderTray([EDIT]);
    expect(screen.getByRole('heading', {level: 2, name: 'Pending changes · 1'})).toBeInTheDocument();
  });

  it('shows a long tagline diff in full, in a <code> that wraps', () => {
    const tagline =
      'Speed up your ink so you can play powerful cards earlier than your opponent, then keep the pressure on every turn after.';
    const path = ['playstyles', 'ramp', 'tagline'];
    renderTray([{...EDIT, path, pathKey: JSON.stringify(path), label: 'Ramp · Tagline · text', oldValue: 'Ink fast', value: tagline}]);
    const diff = screen.getByText(`Ink fast → ${tagline}`);
    expect(diff.tagName).toBe('CODE');
    expect(diff).toHaveStyle({whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'});
  });

  it('scrolls its edits inside the tray, so the pinned foot never outgrows the view', () => {
    renderTray([EDIT]);
    const edits = screen.getByRole('button', {name: 'revert'}).parentElement?.parentElement;
    // jest-dom's toHaveStyle can't parse vh in jsdom, so this reads the declared style.
    expect(edits?.style).toMatchObject({maxHeight: '30vh', overflowY: 'auto'});
  });

  it('names the branch it publishes to', () => {
    renderTray([EDIT]);
    expect(screen.getByRole('button', {name: 'Publish to master'})).toBeEnabled();
  });

  it('names a rehearsal branch on the Publish button', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderTray([EDIT]);
    expect(screen.getByRole('button', {name: 'Publish to admin-verify'})).toBeInTheDocument();
  });

  it('offers Reload tuning.json after a stale value', async () => {
    const onReload = vi.fn();
    renderTray([EDIT], {error: staleRefusal(), onReload, onForgetToken: vi.fn()});
    expect(screen.getByRole('alert')).toHaveTextContent('changed since the editor loaded it (now "Ramp 2")');
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('offers no reload for a failure a reload would not fix', () => {
    renderTray([EDIT], {error: 'master changed while publishing, so nothing was published. Publish again.', onReload: vi.fn()});
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Reload tuning.json'})).not.toBeInTheDocument();
  });

  it('offers no reload without onReload', () => {
    renderTray([EDIT], {error: staleRefusal()});
    expect(screen.queryByRole('button', {name: 'Reload tuning.json'})).not.toBeInTheDocument();
  });

  it('offers Forget token when GitHub rejected the token', async () => {
    const onForgetToken = vi.fn();
    renderTray([EDIT], {error: REJECTED, onReload: vi.fn(), onForgetToken});
    expect(screen.getByText(/GitHub rejected the saved token/)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Reload tuning.json'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('offers no Forget token without onForgetToken', () => {
    renderTray([EDIT], {error: REJECTED});
    expect(screen.getByRole('alert')).toHaveTextContent('GitHub 401 on');
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });
});

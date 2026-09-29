import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PendingTray} from '../components/PendingTray';
import type {PendingEdit} from '../useTuningAdmin';

const EDIT: PendingEdit = {
  pathKey: '["playstyles","ramp","name"]',
  path: ['playstyles', 'ramp', 'name'],
  value: 'Ramp!',
  oldValue: 'Ramp',
  label: 'Title · text',
  valid: true,
};

function renderTray(pending: PendingEdit[], handlers: {onRevert?: () => void; onClear?: () => void} = {}) {
  render(
    <PendingTray
      pending={pending}
      publishDisabled={false}
      publishing={false}
      result={null}
      error={null}
      onRevert={handlers.onRevert ?? (() => {})}
      onClear={handlers.onClear ?? (() => {})}
      onPublish={() => {}}
    />,
  );
}

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
});

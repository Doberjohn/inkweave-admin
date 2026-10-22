import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VersionsTray, type VersionsTrayProps} from '../components/VersionsTray';
import {
  NUMBER_209_TO_BOTH,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  NUMBER_59_TO_FOIL,
  NUMBER_59_TO_FOIL_GONE,
  batchView,
} from '../finishes/__tests__/finishFixtures';
import {clashMessage} from '../finishes/publishVersions';
import {keptClash, type VersionChange} from '../finishes/versionBatch';
import type {VersionBatchView} from '../finishes/versionBatchStore';

// vite.config.ts doesn't set unstubEnvs, so the rehearsal-branch cases unstub by hand.
afterEach(() => vi.unstubAllEnvs());

/*
 * The Version changes tray on plain views (#68): it takes `view` as a prop, so a test hands it an
 * object that matches the store's view and watches the actions it is given. The tray over the
 * real store, in the page, is StudioVersions.test.tsx.
 */

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
const LANDED = {commitUrl: COMMIT_URL, count: 2};
const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: Bad credentials';
const RACE = 'master changed while publishing, so nothing was published. Publish again.';

/** Three changes, one row each, in the order they were staged. */
const THREE = [NUMBER_59_TO_FOIL, NUMBER_209_TO_BOTH, NUMBER_223_TO_BOTH];

const LINE_59 = 'Yen Sid - Powerful Sorcerer #59: Both → Foil only';
const LINE_223 = 'Yen Sid - Powerful Sorcerer #223: Foil only → Both';

function trayElement(view: VersionBatchView, props: Partial<VersionsTrayProps> = {}) {
  return <VersionsTray view={view} token="tok" onForgetToken={() => {}} {...props} />;
}

function renderTray(view: VersionBatchView, props: Partial<VersionsTrayProps> = {}) {
  return render(trayElement(view, props));
}

/**
 * The tray over a batch of its own, as the store keeps one: a revert, a keep or a discard changes
 * what the tray reads next. `rest` is what else the view says; one with a `result` keeps the
 * tray on screen once its last change is gone, as a publish that landed does.
 */
function LiveTray({initial, rest = {}}: {initial: readonly VersionChange[]; rest?: Partial<VersionBatchView>}) {
  const [changes, setChanges] = useState(initial);
  return trayElement(
    batchView(changes, {
      ...rest,
      revert: (id) => setChanges((held) => held.filter((change) => change.id !== id)),
      keep: (id) => setChanges((held) => keptClash({changes: held}, id).changes),
      discard: () => setChanges([]),
    }),
  );
}

/** The list item that holds a change, found by the line it prints. */
const itemOf = (line: string) => screen.getByText(line).closest('li') as HTMLElement;

describe('VersionsTray: when it shows', () => {
  it('is absent with nothing to show', () => {
    expect(renderTray(batchView([])).container).toBeEmptyDOMElement();
  });

  it.each([
    ['a publish is under way', {publishing: true}],
    ['the last publish landed', {result: LANDED}],
    ['the last publish failed', {error: RACE}],
  ])('shows with no change staged when %s', (_what, rest) => {
    renderTray(batchView([], rest));
    const tray = screen.getByRole('region', {name: 'Version changes'});
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 0'})).toBeInTheDocument();
    // Nothing to list, nothing to discard.
    expect(within(tray).queryByRole('list')).not.toBeInTheDocument();
    expect(within(tray).queryByRole('button', {name: 'Discard all'})).not.toBeInTheDocument();
  });

  it('is a row of its own across the studio’s root: every column of the wide grid, a whole line when narrow', () => {
    renderTray(batchView([NUMBER_223_TO_BOTH]));
    const tray = screen.getByRole('region', {name: 'Version changes'});
    // Each property applies in its own layout only: grid-column in the grid, flex in the wrapping row.
    expect(tray.style.gridColumn).toBe('1 / -1');
    expect(tray.style.flex).toBe('1 1 100%');
  });
});

describe('VersionsTray: the changes', () => {
  it('lists the changes with their removals', () => {
    renderTray(batchView([NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH]));
    expect(screen.getByRole('region', {name: 'Version changes'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Version changes · 2'})).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(LINE_59)).toBeInTheDocument();
    expect(screen.getByText(LINE_223)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Publish 2 changes to master'})).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('flags only a change that takes a version away, on the line after its own', () => {
    renderTray(batchView([NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH]));
    expect(screen.getAllByText(/^Removes /)).toHaveLength(1);
    const note = screen.getByText('Removes Normal. Copies counted in it will show under Foil.');
    const line = screen.getByText(LINE_59);
    expect(itemOf(LINE_59)).toContainElement(note);
    expect(line.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(itemOf(LINE_223)).queryByText(/^Removes /)).not.toBeInTheDocument();
  });

  it('names the branch Publish writes to, and counts a single change in the singular', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68');
    renderTray(batchView([NUMBER_223_TO_BOTH]));
    expect(screen.getByRole('button', {name: 'Publish 1 change to rehearse-68'})).toBeInTheDocument();
  });

  it('reverts a change by its id, from a button named for it that starts with the word it shows', async () => {
    const revert = vi.fn();
    renderTray(batchView([NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH], {revert}));
    const buttons = screen.getAllByRole('button', {name: /^Revert /});
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Revert Yen Sid - Powerful Sorcerer #59',
      'Revert Yen Sid - Powerful Sorcerer #223',
    ]);
    expect(buttons.map((button) => button.textContent)).toEqual(['Revert', 'Revert']);

    await userEvent.click(buttons[1]);
    expect(revert).toHaveBeenCalledExactlyOnceWith('946');
  });

  it('discards every change at once', async () => {
    const discard = vi.fn();
    renderTray(batchView(THREE, {discard}));
    await userEvent.click(screen.getByRole('button', {name: 'Discard all'}));
    expect(discard).toHaveBeenCalledOnce();
  });
});

describe('VersionsTray: focus (R-48)', () => {
  const revertOf = (change: VersionChange) => screen.getByRole('button', {name: `Revert ${change.label}`});

  it('moves focus to the next change’s button after a revert, else the previous one’s, else the heading', async () => {
    const user = userEvent.setup();
    render(<LiveTray initial={THREE} rest={{result: LANDED}} />);
    await user.click(revertOf(NUMBER_209_TO_BOTH));
    expect(revertOf(NUMBER_223_TO_BOTH)).toHaveFocus();

    // The last row has no next one.
    await user.keyboard('{Enter}');
    expect(revertOf(NUMBER_59_TO_FOIL)).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', {level: 2, name: 'Version changes · 0'})).toHaveFocus();
  });

  it('moves focus to the heading after Discard all', async () => {
    render(<LiveTray initial={THREE} rest={{result: LANDED}} />);
    await userEvent.click(screen.getByRole('button', {name: 'Discard all'}));
    expect(screen.getByRole('heading', {level: 2, name: 'Version changes · 0'})).toHaveFocus();
  });

  it('moves focus on after Drop as after a Revert, to the first button of the next change', async () => {
    render(<LiveTray initial={[NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL_GONE, NUMBER_209_TO_BOTH]} />);
    // The next row is a clash too, and a printing that is gone has Drop alone: that is its first button.
    await userEvent.click(screen.getByRole('button', {name: `Drop ${NUMBER_223_TO_BOTH_CLASHED.label}`}));
    expect(screen.getByRole('button', {name: `Drop ${NUMBER_59_TO_FOIL_GONE.label}`})).toHaveFocus();
  });

  it('moves focus to the next change’s Keep mine when that change is a clash that can be kept', async () => {
    render(<LiveTray initial={[NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH_CLASHED]} />);
    await userEvent.click(revertOf(NUMBER_59_TO_FOIL));
    expect(screen.getByRole('button', {name: `Keep my change to ${NUMBER_223_TO_BOTH.label}`})).toHaveFocus();
  });

  it('moves focus on after Keep mine too, since the button goes with the clash', async () => {
    render(<LiveTray initial={[NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL]} />);
    await userEvent.click(screen.getByRole('button', {name: `Keep my change to ${NUMBER_223_TO_BOTH.label}`}));
    // The change stays, built on what the branch has now, and its row has Revert in the place of the two.
    expect(revertOf(NUMBER_223_TO_BOTH)).toBeInTheDocument();
    expect(revertOf(NUMBER_59_TO_FOIL)).toHaveFocus();
  });

  it('moves focus to the heading when the only change is dropped', async () => {
    render(<LiveTray initial={[NUMBER_59_TO_FOIL_GONE]} rest={{result: LANDED}} />);
    await userEvent.click(screen.getByRole('button', {name: `Drop ${NUMBER_59_TO_FOIL_GONE.label}`}));
    expect(screen.getByRole('heading', {level: 2, name: 'Version changes · 0'})).toHaveFocus();
  });

  it('leaves focus on Publish when it is pressed: the button stays', async () => {
    renderTray(batchView(THREE));
    const publish = screen.getByRole('button', {name: 'Publish 3 changes to master'});
    await userEvent.click(publish);
    expect(publish).toHaveFocus();
  });
});

describe('VersionsTray: a clash', () => {
  it('replaces Revert with what changed on the branch, and a way to keep or drop the change', async () => {
    const keep = vi.fn();
    const revert = vi.fn();
    renderTray(batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL], {keep, revert}));
    const row = itemOf(LINE_223);
    expect(within(row).getByText('Changed on master since: now Normal only.')).toBeInTheDocument();
    expect(within(row).queryByRole('button', {name: /^Revert /})).not.toBeInTheDocument();
    expect(within(row).getAllByRole('button').map((button) => button.textContent)).toEqual(['Keep mine', 'Drop']);

    await userEvent.click(within(row).getByRole('button', {name: 'Keep my change to Yen Sid - Powerful Sorcerer #223'}));
    expect(keep).toHaveBeenCalledExactlyOnceWith('946');
    // Drop is a revert: the change leaves the batch.
    await userEvent.click(within(row).getByRole('button', {name: 'Drop Yen Sid - Powerful Sorcerer #223'}));
    expect(revert).toHaveBeenCalledExactlyOnceWith('946');
    expect(keep).toHaveBeenCalledOnce();

    // A change that isn't clashed keeps its Revert.
    expect(within(itemOf(LINE_59)).getByRole('button', {name: /^Revert /})).toBeInTheDocument();
    expect(within(itemOf(LINE_59)).queryByText(/^Changed on /)).not.toBeInTheDocument();
  });

  it('names the branch, and what the printing shows there now', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68');
    const bothNow = {...NUMBER_223_TO_BOTH, clash: {id: '946', now: null, shownNow: ['normal', 'foil'] as const}};
    renderTray(batchView([bothNow]));
    expect(screen.getByText('Changed on rehearse-68 since: now Both.')).toBeInTheDocument();
  });

  it('says a printing is no longer in the data, and offers to drop its change only', async () => {
    const revert = vi.fn();
    renderTray(batchView([NUMBER_59_TO_FOIL_GONE], {revert}));
    const row = itemOf(LINE_59);
    expect(within(row).getByText('No longer in the data.')).toBeInTheDocument();
    expect(within(row).queryByText(/^Changed on /)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Keep my change/})).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', {name: 'Drop Yen Sid - Powerful Sorcerer #59'}));
    expect(revert).toHaveBeenCalledExactlyOnceWith('750');
  });

  it('holds Publish while a clash is open, and does nothing if it is pressed', async () => {
    const publish = vi.fn(() => Promise.resolve());
    renderTray(batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL], {publish}));
    const button = screen.getByRole('button', {name: 'Publish 2 changes to master'});
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled keeps the button focusable, so a click still arrives; the tray must not act on it.
    await userEvent.click(button);
    expect(publish).not.toHaveBeenCalled();
  });

  it('describes the held Publish by the clash line, so a screen reader hears why it is held', () => {
    renderTray(batchView([NUMBER_223_TO_BOTH_CLASHED]));
    expect(screen.getByRole('button', {name: 'Publish 1 change to master'})).toHaveAccessibleDescription(clashMessage(1));
  });

  it('describes Publish by nothing when no clash holds it', () => {
    renderTray(batchView([NUMBER_223_TO_BOTH]));
    expect(screen.getByRole('button', {name: 'Publish 1 change to master'})).not.toHaveAttribute('aria-describedby');
  });
});

/*
 * The clash line comes from the batch's marks, never from the store's `error` (a clash is not an
 * error there): it counts the changes still marked, and it goes with the last mark.
 */
describe('VersionsTray: what it says of clashes', () => {
  it('names how many changes are marked', () => {
    renderTray(batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL_GONE, NUMBER_209_TO_BOTH]));
    expect(screen.getByRole('alert')).toHaveTextContent(clashMessage(2));
  });

  it('says it in the singular for one', () => {
    renderTray(batchView([NUMBER_223_TO_BOTH_CLASHED, NUMBER_209_TO_BOTH]));
    expect(screen.getByRole('alert')).toHaveTextContent(clashMessage(1));
    expect(screen.getByRole('alert')).toHaveTextContent('1 change clashes: someone changed this printing on master since.');
  });

  it('counts the changes still marked as they are settled, and says nothing once none is', () => {
    const view = (...changes: VersionChange[]) => batchView([...changes, NUMBER_209_TO_BOTH]);
    const {rerender} = renderTray(view(NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL_GONE));
    expect(screen.getByRole('alert')).toHaveTextContent(clashMessage(2));

    rerender(trayElement(view(NUMBER_59_TO_FOIL_GONE)));
    expect(screen.getByRole('alert')).toHaveTextContent(clashMessage(1));

    rerender(trayElement(view(NUMBER_59_TO_FOIL)));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('region', {name: 'Version changes'})).not.toHaveTextContent(/clash/i);
    expect(screen.getByRole('button', {name: 'Publish 2 changes to master'})).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('says nothing of a clash once the owner keeps the last one, and lets Publish through', async () => {
    const publish = vi.fn(() => Promise.resolve());
    render(<LiveTray initial={[NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL]} rest={{publish}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(clashMessage(1));

    await userEvent.click(screen.getByRole('button', {name: `Keep my change to ${NUMBER_223_TO_BOTH.label}`}));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('region', {name: 'Version changes'})).not.toHaveTextContent(/clash/i);
    const button = screen.getByRole('button', {name: 'Publish 2 changes to master'});
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toHaveAttribute('aria-describedby');
    await userEvent.click(button);
    expect(publish).toHaveBeenCalledOnce();
  });

  it('says nothing of a clash once the owner drops the last one', async () => {
    render(<LiveTray initial={[NUMBER_59_TO_FOIL_GONE, NUMBER_223_TO_BOTH]} />);
    await userEvent.click(screen.getByRole('button', {name: `Drop ${NUMBER_59_TO_FOIL_GONE.label}`}));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('region', {name: 'Version changes'})).not.toHaveTextContent(/clash/i);
    expect(screen.getByRole('button', {name: 'Publish 1 change to master'})).not.toHaveAttribute('aria-disabled', 'true');
  });
});

describe('VersionsTray: publishing', () => {
  it('publishes with the token it was given', async () => {
    const publish = vi.fn(() => Promise.resolve());
    renderTray(batchView([NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH], {publish}), {token: 'github_pat_abc'});
    await userEvent.click(screen.getByRole('button', {name: 'Publish 2 changes to master'}));
    expect(publish).toHaveBeenCalledExactlyOnceWith('github_pat_abc');
  });

  it('reads Publishing… and holds Publish while a publish is under way', async () => {
    const publish = vi.fn(() => Promise.resolve());
    renderTray(batchView([NUMBER_223_TO_BOTH], {publishing: true, publish}));
    const button = screen.getByRole('button', {name: 'Publishing…'});
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    expect(publish).not.toHaveBeenCalled();
  });

  it('holds every other button while a publish is under way, as it has the changes it sent', () => {
    renderTray(batchView([NUMBER_209_TO_BOTH, NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL_GONE], {publishing: true}));
    const held = screen.getAllByRole('button').filter((button) => button.textContent !== 'Publishing…');
    expect(held.map((button) => button.textContent)).toEqual(['Discard all', 'Revert', 'Keep mine', 'Drop', 'Drop']);
    held.forEach((button) => expect(button).toBeDisabled());
  });

  it('holds Publish with nothing staged', async () => {
    const publish = vi.fn(() => Promise.resolve());
    renderTray(batchView([], {result: LANDED, publish}));
    const button = screen.getByRole('button', {name: 'Publish 0 changes to master'});
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    expect(publish).not.toHaveBeenCalled();
  });
});

describe('VersionsTray: the outcome', () => {
  it('mounts its status line before a publish, so what it says is announced when it arrives', () => {
    const {rerender} = renderTray(batchView(THREE, {publishing: true}));
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    rerender(trayElement(batchView([], {result: LANDED})));
    // The same element, now filled: a live region mounted with its text often goes unannounced.
    expect(screen.getByRole('status')).toBe(status);
    expect(within(status).getByText('Published 2 changes.')).toBeInTheDocument();
    expect(within(status).getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    expect(status).toHaveTextContent('They show in the binder once the app has deployed: on staging only, for now.');
  });

  it('opens the commit in a tab of its own', () => {
    renderTray(batchView([], {result: LANDED}));
    expect(screen.getByRole('link', {name: 'View commit'})).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', {name: 'View commit'})).toHaveAttribute('rel', 'noreferrer');
  });

  it('counts a single change in the singular', () => {
    renderTray(batchView([], {result: {commitUrl: COMMIT_URL, count: 1}}));
    expect(screen.getByRole('status')).toHaveTextContent('Published 1 change.');
  });

  it('says where a rehearsal went, where master would have been deployed', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68');
    renderTray(batchView([], {result: LANDED}));
    expect(screen.getByRole('status')).toHaveTextContent('It went to rehearse-68; only master deploys to production.');
    expect(screen.getByRole('status')).not.toHaveTextContent('They show in the binder');
  });
});

describe('VersionsTray: a publish that failed', () => {
  it('shows why as an alert, in the words the store gave it', () => {
    renderTray(batchView([NUMBER_223_TO_BOTH], {error: RACE}));
    expect(screen.getByRole('alert')).toHaveTextContent(RACE);
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
    // The changes stay, and Publish is there to try again.
    expect(screen.getByRole('button', {name: 'Publish 1 change to master'})).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('offers to forget a rejected token', async () => {
    const onForgetToken = vi.fn();
    renderTray(batchView([NUMBER_223_TO_BOTH], {error: REJECTED}), {onForgetToken});
    expect(screen.getByRole('alert')).toHaveTextContent(REJECTED);
    expect(screen.getByText(/GitHub rejected the saved token/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('leaves the batch alone when the token is forgotten', async () => {
    const view = batchView([NUMBER_223_TO_BOTH], {
      error: REJECTED,
      stage: vi.fn(),
      revert: vi.fn(),
      discard: vi.fn(),
      keep: vi.fn(),
      publish: vi.fn(() => Promise.resolve()),
    });
    renderTray(view);
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    for (const action of [view.stage, view.revert, view.discard, view.keep, view.publish]) {
      expect(action).not.toHaveBeenCalled();
    }
  });
});

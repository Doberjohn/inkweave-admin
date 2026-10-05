import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {applyTuningEdits} from '../../../tuning/githubClient';
import {useTuningAdmin} from '../../../tuning/useTuningAdmin';
import type {RuleStat} from '../../voteAnalyticsTypes';
import type {CalibrationRow} from '../calibrationModel';
import {TuningAside, type TuningState} from '../TuningAside';

// Publishes go through commitTuning; each test decides how it settles. The
// rest of githubClient stays real, so applyTuningEdits gives its own refusal.
const commitTuning = vi.hoisted(() => vi.fn());
vi.mock('../../../tuning/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../tuning/githubClient')>()),
  commitTuning,
}));

type Live = TuningState['live'];

const CONFIG: TuningConfig = {
  playstyles: {
    ramp: {name: 'Ramp', tagline: 'Ink fast'},
    dwarfs: {name: 'Dwarfs', tagline: 'Go wide'},
    'location-control': {name: 'Locations', tagline: 'Build around locations'},
  },
  directRules: {'shift-targets': {name: 'Shift Targets', description: 'Shift onto a target'}},
  ruleTexts: {'shift-targets': {'curve.gap3': {score: 5, text: 'Wide gap'}}, ramp: {scores: {density: 5}, templates: {}}},
};

function row(
  id: string,
  name: string,
  tuningKey: string | null,
  meanGap: number | null,
  category: CalibrationRow['category'] = 'playstyle',
): CalibrationRow {
  const stat: RuleStat = {
    ruleId: id,
    ruleName: name,
    category,
    scoreVotes: 557,
    pairsVoted: 40,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 120,
  };
  return {id, name, category, stat, tuningKey};
}

const RAMP = row('ramp', 'Ramp', 'ramp', -0.57);
const DWARFS = row('dwarfs', 'Dwarfs', 'dwarfs', 0.1);
const SINGER = row('singer-songs', 'Singer + Songs', null, 0.4, 'direct');
const SHIFT = row('shift-targets', 'Shift Targets', 'shift-targets', 0.83, 'direct');
// A tuningKey from app master that the live tuning.json has no entry for (R-17).
const GHOST = row('ghost', 'Ghost', 'ghost-key', 0.3);
// The nine location-* rules, which all keep their copy under location-control (pin bc877e1).
const LOCATIONS = [
  ['location-at-payoff', 'At Location Payoff'],
  ['location-play-trigger', 'Location Play Trigger'],
  ['location-move-trigger', 'Location Move Trigger'],
  ['location-buff', 'Location Buff'],
  ['location-location-ramp', 'Location Ramp'],
  ['location-move', 'Move to Location'],
  ['location-in-play-check', 'Location In-Play Check'],
  ['location-search', 'Location Search'],
  ['location-boost', 'Location Boost'],
].map(([id, name], i) => row(id, name, 'location-control', -(i + 1) / 10));
const BOOST = LOCATIONS[8]; // gap −0.90

// Someone changed Ramp's tagline on the branch after the editor read it.
const TAGLINE_CHANGED: TuningConfig = {
  ...CONFIG,
  playstyles: {...CONFIG.playstyles, ramp: {name: 'Ramp', tagline: 'Ink faster'}},
};

const REJECTED_READ ='GitHub 401 on packages/synergy-engine/src/data/tuning.json: {"message":"Bad credentials"}';
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/**
 * The real edit hook and a live read that is ready with CONFIG, as R2-6's
 * TunedWorkspace hands them down. `live` replaces the read; a reload reads
 * `reloadTo()` and shows it, as useLiveTuning does.
 */
function Harness({
  selected = null,
  sharedWith = [],
  live,
  reloadTo = () => CONFIG,
  onForgetToken = () => {},
}: {
  selected?: CalibrationRow | null;
  sharedWith?: CalibrationRow[];
  live?: Live;
  /** What a reload reads, or null when the read fails or a newer one replaces it: nothing then reaches the screen. */
  reloadTo?: () => TuningConfig | null;
  onForgetToken?: () => void;
}) {
  const [config, setConfig] = useState(CONFIG);
  const admin = useTuningAdmin('tok');
  const ready: Live = {
    status: 'ready',
    config,
    reload: async () => {
      const next = reloadTo();
      if (next) setConfig(next);
      return next;
    },
  };
  return (
    <TuningAside
      tuning={{live: live ?? ready, admin}}
      onSaveToken={() => {}}
      onForgetToken={onForgetToken}
      selected={selected}
      sharedWith={sharedWith}
    />
  );
}

/** applyTuningEdits' own refusal of the tagline edit, once the branch holds `onBranch`. */
function staleRefusal(onBranch: TuningConfig): Error {
  try {
    applyTuningEdits(JSON.stringify(onBranch), [
      {path: ['playstyles', 'ramp', 'tagline'], value: 'Ink fast!', expected: 'Ink fast'},
    ]);
  } catch (e) {
    return e as Error;
  }
  throw new Error('applyTuningEdits accepted a stale value');
}

const title = () => screen.getByRole('textbox', {name: 'Title text'});
const tray = () => within(screen.getByRole('region', {name: 'Pending changes'}));

async function renameRamp(to: string) {
  await userEvent.clear(title());
  await userEvent.type(title(), to);
}

// vite.config.ts doesn't set unstubEnvs; restoreAllMocks undoes the window.confirm spies.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  commitTuning.mockReset();
});

describe('TuningAside, by state', () => {
  it('asks for a GitHub token without one, for the tuning editor', () => {
    render(
      <TuningAside tuning={null} onSaveToken={() => {}} onForgetToken={() => {}} selected={RAMP} sharedWith={[RAMP]} />,
    );
    expect(screen.getByText('Tuning editor')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub token')).toBeInTheDocument();
  });

  it('says it is reading tuning.json from the target branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(<Harness live={{status: 'loading', reload: vi.fn()}} />);
    expect(screen.getByText('Reading tuning.json from admin-verify…')).toBeInTheDocument();
  });

  it('says why tuning.json could not be read, in its one alert', () => {
    const error = 'GitHub 404 on packages/synergy-engine/src/data/tuning.json: Not Found';
    render(<Harness live={{status: 'error', error, reload: vi.fn()}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(`Could not read tuning.json: ${error}`);
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it('reads tuning.json again from a failed read', async () => {
    const reload = vi.fn(() => Promise.resolve(null));
    const error = 'GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway';
    render(<Harness live={{status: 'error', error, reload}} />);
    await userEvent.click(screen.getByRole('button', {name: 'Read tuning.json again'}));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('offers Forget token when GitHub rejects the token on the read, without asking when nothing is pending', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const onForgetToken = vi.fn();
    render(<Harness live={{status: 'error', error: REJECTED_READ, reload: vi.fn()}} onForgetToken={onForgetToken} />);
    expect(screen.getByRole('alert')).toHaveTextContent(`Could not read tuning.json: ${REJECTED_READ}`);
    // Reading again with the same token would fail the same way.
    expect(screen.queryByRole('button', {name: 'Read tuning.json again'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before Forget token drops pending edits, when GitHub rejects the token on the read', async () => {
    const onForgetToken = vi.fn();
    const rejected: Live = {status: 'error', error: REJECTED_READ, reload: vi.fn()};
    const {rerender} = render(<Harness selected={RAMP} onForgetToken={onForgetToken} />);
    await renameRamp('Ramp!');
    await userEvent.type(screen.getByRole('textbox', {name: 'Tagline text'}), '!');

    // The same Harness keeps useTuningAdmin's state, so both edits stay pending under the error.
    rerender(<Harness selected={RAMP} live={rejected} onForgetToken={onForgetToken} />);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop 2 unpublished edits?');
    expect(onForgetToken).not.toHaveBeenCalled();

    // Declined: the token stays, and the read coming back finds both edits still pending.
    rerender(<Harness selected={RAMP} onForgetToken={onForgetToken} />);
    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 2'})).toBeInTheDocument();
    expect(title()).toHaveValue('Ramp!');

    rerender(<Harness selected={RAMP} live={rejected} onForgetToken={onForgetToken} />);
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('prompts for a rule with none selected, over the pinned tray', () => {
    render(<Harness />);
    expect(screen.getByText('Pick a playstyle or direct synergy to edit its copy and scores.')).toBeInTheDocument();
    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 0'})).toBeInTheDocument();
    expect(screen.getByRole('region', {name: 'Pending changes'}).parentElement).toHaveStyle({position: 'sticky', bottom: '0px'});
    expect(screen.getByRole('button', {name: 'Publish to master'})).toBeDisabled();
  });

  it.each([
    ['has no tuningKey', SINGER, 'Direct synergy', 'Singer + Songs'],
    ['has a tuningKey the live file has no entry for', GHOST, 'Playstyle', 'Ghost'],
  ])('says a rule with no entry has no copy in tuning.json: it %s', (_why, selected, eyebrow, name) => {
    render(<Harness selected={selected} sharedWith={[]} />);
    expect(screen.getByText(eyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name})).toBeInTheDocument();
    expect(screen.getByText(`No copy in tuning.json, so ${name} has nothing to tune here.`)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('TuningAside, editing', () => {
  it("heads a shared entry with its name and its rules, and the gap with the selected rule's name", () => {
    render(<Harness selected={BOOST} sharedWith={LOCATIONS} />);
    expect(screen.getByText('Playstyle · tuning.json')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Locations'})).toBeInTheDocument();
    expect(
      screen.getByText(
        'Shared by 9 rules: At Location Payoff, Location Play Trigger, Location Move Trigger, Location Buff, ' +
          'Location Ramp, Move to Location, Location In-Play Check, Location Search, Location Boost',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Location Boost gap').parentElement).toHaveTextContent('Location Boost gap −0.90');
    expect(
      screen.getByText('Location Boost: The engine rates pairs about 0.90 points higher than the community on average.'),
    ).toBeInTheDocument();
    expect(title()).toHaveValue('Locations');
  });

  it('heads an entry of its own with the plain gap and read line, over its real rows', () => {
    render(<Harness selected={RAMP} sharedWith={[RAMP]} />);
    expect(screen.getByRole('heading', {level: 2, name: 'Ramp'})).toBeInTheDocument();
    expect(screen.getByText('Gap').parentElement).toHaveTextContent('Gap −0.57');
    expect(
      screen.getByText('The engine rates pairs about 0.57 points higher than the community on average.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Shared by/)).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', {name: 'score · density score'})).toHaveValue(5);
  });

  it('shows each rule its own values, and keeps a pending edit with its rule', async () => {
    const {rerender} = render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');

    rerender(<Harness selected={DWARFS} />);
    expect(title()).toHaveValue('Dwarfs');

    rerender(<Harness selected={RAMP} />);
    expect(title()).toHaveValue('Ramp!');
  });

  it('shows the saved value again once an edit is reverted', async () => {
    render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');

    await userEvent.click(tray().getByRole('button', {name: 'revert'}));
    expect(title()).toHaveValue('Ramp');
  });

  it("labels a pending edit with the entry's name", async () => {
    render(<Harness selected={BOOST} sharedWith={LOCATIONS} />);
    await userEvent.type(title(), '!');
    expect(tray().getByText('Locations · Title · text')).toBeInTheDocument();
  });

  it("heads a direct entry as one, and labels a score edit with the entry's name", async () => {
    render(<Harness selected={SHIFT} sharedWith={[SHIFT]} />);
    expect(screen.getByText('Direct synergy · tuning.json')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Shift Targets'})).toBeInTheDocument();

    const score = screen.getByRole('spinbutton', {name: 'curve.gap3 score'});
    expect(score).toHaveValue(5);
    await userEvent.clear(score);
    await userEvent.type(score, '7');
    expect(score).toHaveValue(7);
    expect(tray().getByText('Shift Targets · curve.gap3 · score')).toBeInTheDocument();
    expect(tray().getByText('5 → 7')).toBeInTheDocument();
  });
});

describe('TuningAside, publishing', () => {
  it('links the commit after a publish, says when it goes live, and reads tuning.json again', async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'});
    const reloadTo = vi.fn(() => CONFIG);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('link', {name: 'View commit'})).toHaveAttribute(
      'href',
      'https://github.com/Doberjohn/inkweave/commit/abc123',
    );
    expect(screen.getByText(/Changes go live on the next Vercel redeploy\./)).toBeInTheDocument();
    await vi.waitFor(() => expect(reloadTo).toHaveBeenCalledOnce());
  });

  it('keeps the values it has when a publish fails, and says why in an alert', async () => {
    commitTuning.mockRejectedValue(new Error('GitHub 422 on /refs: not a fast forward'));
    const reloadTo = vi.fn(() => CONFIG);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub 422 on /refs: not a fast forward');
    expect(title()).toHaveValue('Ramp!');
    expect(reloadTo).not.toHaveBeenCalled();
  });

  it('shows Publishing… on a disabled button while the commit runs', async () => {
    commitTuning.mockReturnValue(new Promise(() => {}));
    render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(screen.getByRole('button', {name: 'Publishing…'})).toBeDisabled();
  });

  it('offers Reload tuning.json, which drops the stale edit, keeps the other and says so, until the next publish', async () => {
    commitTuning.mockRejectedValue(staleRefusal(TAGLINE_CHANGED));
    const reloadTo = vi.fn(() => TAGLINE_CHANGED);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');
    await userEvent.type(screen.getByRole('textbox', {name: 'Tagline text'}), '!');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'playstyles.ramp.tagline changed since the editor loaded it (now "Ink faster")',
    );

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    const note = await screen.findByText('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.');
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveFocus();
    expect(reloadTo).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tray().getAllByRole('button', {name: 'revert'})).toHaveLength(1);
    expect(tray().getByText('Ramp · Title · text')).toBeInTheDocument();
    expect(title()).toHaveValue('Ramp!');
    expect(screen.getByRole('textbox', {name: 'Tagline text'})).toHaveValue('Ink faster');

    commitTuning.mockReturnValue(new Promise(() => {}));
    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(note).toBeEmptyDOMElement();
  });

  it('says every pending edit still applies when the reload drops none', async () => {
    // The default reload reads CONFIG, which still holds what the edit started from.
    commitTuning.mockRejectedValue(staleRefusal(TAGLINE_CHANGED));
    render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');
    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('changed since the editor loaded it');

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    const note = await screen.findByText('Reloaded tuning.json. Every pending edit still applies.');
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveFocus();
    expect(tray().getAllByRole('button', {name: 'revert'})).toHaveLength(1);
  });

  it('keeps every pending edit when the reload read nothing, with the error still on screen', async () => {
    commitTuning.mockRejectedValue(staleRefusal(TAGLINE_CHANGED));
    // The read failed, or a newer one replaced it: dropStale must never see "no config".
    const reloadTo = vi.fn(() => null);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');
    await userEvent.type(screen.getByRole('textbox', {name: 'Tagline text'}), '!');
    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('changed since the editor loaded it');

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    await vi.waitFor(() => expect(reloadTo).toHaveBeenCalledOnce());
    await act(async () => {}); // lets the reload's .then run

    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 2'})).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('changed since the editor loaded it');
    expect(screen.queryByText(/^Reloaded tuning\.json/)).not.toBeInTheDocument();
  });

  it("publishes a direct entry's score as a number, against the saved score", async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'});
    render(<Harness selected={SHIFT} sharedWith={[SHIFT]} />);
    const score = screen.getByRole('spinbutton', {name: 'curve.gap3 score'});
    await userEvent.clear(score);
    await userEvent.type(score, '7');

    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    // value 7 and expected 5 are numbers: a string would be written into tuning.json, or refused as stale.
    expect(commitTuning).toHaveBeenCalledWith({
      token: 'tok',
      edits: [{path: ['ruleTexts', 'shift-targets', 'curve.gap3', 'score'], value: 7, expected: 5}],
    });
    await screen.findByRole('link', {name: 'View commit'});
  });

  it('names a rehearsal branch on the Publish button', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(<Harness selected={RAMP} />);
    await renameRamp('Ramp!');
    expect(screen.getByRole('button', {name: 'Publish to admin-verify'})).toBeEnabled();
  });

  it('asks before Forget token drops a pending edit, after GitHub rejects the token on publish', async () => {
    commitTuning.mockRejectedValue(new Error(REJECTED_PUBLISH));
    const onForgetToken = vi.fn();
    render(<Harness selected={RAMP} onForgetToken={onForgetToken} />);
    await renameRamp('Ramp!');
    await userEvent.click(screen.getByRole('button', {name: 'Publish to master'}));
    const forget = await screen.findByRole('button', {name: 'Forget token'});

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop 1 unpublished edit?');
    expect(onForgetToken).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(forget);
    expect(onForgetToken).toHaveBeenCalledOnce();
  });
});

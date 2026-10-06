import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {applyTuningEdits, type TuningEdit} from '../../../tuning/githubClient';
import {useTuningAdmin} from '../../../tuning/useTuningAdmin';
import type {RuleStat} from '../../voteAnalyticsTypes';
import type {CalibrationRow} from '../calibrationModel';
import {useFocusHandoff} from '../focusHandoff';
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

// The app removed Ramp's entry on the branch after the editor read it.
const RAMP_GONE: TuningConfig = {...CONFIG, playstyles: {dwarfs: {name: 'Dwarfs', tagline: 'Go wide'}}};

// tuning.json once "Ramp!" is published.
const PUBLISHED: TuningConfig = {
  ...CONFIG,
  playstyles: {...CONFIG.playstyles, ramp: {name: 'Ramp!', tagline: 'Ink fast'}},
};

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
const BAD_GATEWAY = 'GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway';
const REJECTED_READ = 'GitHub 401 on packages/synergy-engine/src/data/tuning.json: {"message":"Bad credentials"}';
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/** What a reload reads: a config, an Error when the read fails, or null when a newer read replaces it. */
type ReloadResult = TuningConfig | Error | null;

/**
 * The real edit hook, a live read that is ready with CONFIG, and a focus
 * handoff, as CalibrationPage hands them down. `live` replaces the read. A
 * reload reads `reloadTo()` and shows it as useLiveTuning does: a failed read
 * keeps the values on screen beside its reason, and a replaced one changes nothing.
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
  reloadTo?: () => ReloadResult | Promise<ReloadResult>;
  onForgetToken?: () => void;
}) {
  const [read, setRead] = useState<{config: TuningConfig; reloadError?: string}>({config: CONFIG});
  const admin = useTuningAdmin('tok');
  const handoff = useFocusHandoff();
  const ready: Live = {
    status: 'ready',
    ...read,
    reload: async () => {
      const next = await reloadTo();
      if (next instanceof Error) {
        setRead((prev) => ({config: prev.config, reloadError: next.message}));
        return null;
      }
      if (next) setRead({config: next});
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
      handoff={handoff}
    />
  );
}

const TAGLINE_EDIT: TuningEdit = {path: ['playstyles', 'ramp', 'tagline'], value: 'Ink fast!', expected: 'Ink fast'};

/** applyTuningEdits' own refusal of `edit` (the tagline's by default), once the branch holds `onBranch`. */
function staleRefusal(onBranch: TuningConfig, edit: TuningEdit = TAGLINE_EDIT): Error {
  try {
    applyTuningEdits(JSON.stringify(onBranch), [edit]);
  } catch (e) {
    return e as Error;
  }
  throw new Error('applyTuningEdits accepted a stale value');
}

const title = () => screen.getByRole('textbox', {name: 'Title text'});
const tagline = () => screen.getByRole('textbox', {name: 'Tagline text'});
const tray = () => within(screen.getByRole('region', {name: 'Pending changes'}));
const publishButton = () => screen.getByRole('button', {name: 'Publish to master'});

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

  it('asks before Forget token drops pending edits, when GitHub rejects the token on a reload', async () => {
    const onForgetToken = vi.fn();
    const rejected: Live = {status: 'ready', config: CONFIG, reloadError: REJECTED_READ, reload: vi.fn()};
    const {rerender} = render(<Harness selected={RAMP} onForgetToken={onForgetToken} />);
    await renameRamp('Ramp!');
    await userEvent.type(tagline(), '!');

    // The same Harness keeps useTuningAdmin's state. A failed reload keeps the editor
    // and both edits on screen, with the read's error and its way out above the tray (C1).
    rerender(<Harness selected={RAMP} live={rejected} onForgetToken={onForgetToken} />);
    expect(screen.getByRole('alert')).toHaveTextContent(`Could not read tuning.json: ${REJECTED_READ}`);
    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 2'})).toBeInTheDocument();
    expect(title()).toHaveValue('Ramp!');
    // Reading again with the same token would fail the same way.
    expect(screen.queryByRole('button', {name: 'Read tuning.json again'})).not.toBeInTheDocument();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop 2 unpublished edits?');
    expect(onForgetToken).not.toHaveBeenCalled();

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

    await userEvent.click(tray().getByRole('button', {name: 'Revert Ramp · Title · text'}));
    expect(title()).toHaveValue('Ramp');
  });

  it("ties an invalid edit's error to its field and the tray, and holds Publish until it is fixed", async () => {
    render(<Harness selected={SHIFT} sharedWith={[SHIFT]} />);
    const label = screen.getByRole('textbox', {name: 'Label text'});
    await userEvent.clear(label);
    expect(label).toHaveAccessibleDescription('Text cannot be empty');
    expect(label).toHaveAttribute('aria-invalid', 'true');

    const score = screen.getByRole('spinbutton', {name: 'curve.gap3 score'});
    await userEvent.clear(score);
    await userEvent.type(score, '11');
    expect(score).toHaveAccessibleDescription('Score must be an integer 1-10');
    expect(score).toHaveAttribute('aria-invalid', 'true');

    // The tray prints each invalid edit's reason in place of a diff.
    expect(tray().getByText('Text cannot be empty')).toBeInTheDocument();
    expect(tray().getByText('Score must be an integer 1-10')).toBeInTheDocument();
    expect(publishButton()).toBeDisabled();

    await userEvent.type(label, 'Shift onto it');
    await userEvent.clear(score);
    await userEvent.type(score, '7');
    expect(label).not.toHaveAttribute('aria-invalid');
    expect(score).not.toHaveAttribute('aria-invalid');
    expect(publishButton()).toBeEnabled();
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

  it('keeps the commit link and the tray when the read after a publish fails, and says why above the tray', async () => {
    commitTuning.mockResolvedValue({commitUrl: COMMIT_URL});
    const reloadTo = vi.fn<() => ReloadResult>(() => new Error(BAD_GATEWAY));
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');
    await userEvent.click(publishButton());

    // The commit landed: the read's failure must not read as the publish's (C1).
    expect(await screen.findByRole('alert')).toHaveTextContent(`Could not read tuning.json: ${BAD_GATEWAY}`);
    expect(screen.getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 0'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'Ramp'})).toBeInTheDocument();
    expect(publishButton()).toHaveFocus();

    reloadTo.mockReturnValue(PUBLISHED);
    await userEvent.click(screen.getByRole('button', {name: 'Read tuning.json again'}));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(title()).toHaveValue('Ramp!');
    expect(screen.getByRole('link', {name: 'View commit'})).toBeInTheDocument();
    // The button went with the error it answered: focus goes to the entry's heading, not <body> (F2).
    expect(screen.getByRole('heading', {level: 2, name: 'Ramp!'})).toHaveFocus();
  });

  it('leaves no focus waiting when reading again fails, so a later read leaves focus where it is', async () => {
    commitTuning.mockResolvedValue({commitUrl: COMMIT_URL});
    const reloadTo = vi.fn<() => ReloadResult>(() => new Error(BAD_GATEWAY));
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');
    await userEvent.click(publishButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(BAD_GATEWAY);

    // Reading again fails too, and its button stays.
    await userEvent.click(screen.getByRole('button', {name: 'Read tuning.json again'}));
    await vi.waitFor(() => expect(reloadTo).toHaveBeenCalledTimes(2));
    await act(async () => {}); // lets the read's .then run

    // The next publish's read lands with <body> focused: the user clicked into the title while
    // the commit ran, then away. Nothing should take focus from there.
    let land: () => void = () => {};
    commitTuning.mockReturnValue(new Promise((resolve) => (land = () => resolve({commitUrl: COMMIT_URL}))));
    reloadTo.mockReturnValue(PUBLISHED);
    await userEvent.type(title(), '?');
    await userEvent.click(publishButton());
    await userEvent.click(title());
    await userEvent.click(screen.getByText('Playstyle · tuning.json'));
    expect(document.body).toHaveFocus();
    await act(async () => land());
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', {level: 2, name: 'Ramp!'})).toBeInTheDocument();
    expect(document.body).toHaveFocus();
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
    // The note's live region is in place, empty, before the reload fills it: one mounted with its text often goes unannounced.
    const [before] = screen.getAllByRole('status');
    expect(before).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    const note = await screen.findByText('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.');
    expect(note).toBe(before);
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveFocus();
    expect(reloadTo).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tray().getAllByRole('button', {name: /^Revert /})).toHaveLength(1);
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
    expect(tray().getAllByRole('button', {name: /^Revert /})).toHaveLength(1);
  });

  it("leaves focus where the user put it while the reload read, and still says what it did", async () => {
    commitTuning.mockRejectedValue(staleRefusal(TAGLINE_CHANGED));
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    render(
      <Harness
        selected={RAMP}
        reloadTo={async () => {
          await gate;
          return TAGLINE_CHANGED;
        }}
      />,
    );
    await userEvent.type(tagline(), '!');
    await userEvent.click(publishButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('changed since the editor loaded it');

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    // A GitHub read takes a moment, and the user moves on to the title meanwhile.
    await userEvent.click(title());
    await act(async () => release());

    expect(await screen.findByText('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.')).toBeInTheDocument();
    expect(title()).toHaveFocus();
  });

  it("keeps every pending edit, and the error, when a newer read replaces the reload's", async () => {
    commitTuning.mockRejectedValue(staleRefusal(TAGLINE_CHANGED));
    // A newer read replaced it, so the reload resolves with nothing: dropStale must never see "no config".
    // A failed read is CalibrationPage's case: there the real hook keeps the values beside the read's error.
    const reloadTo = vi.fn(() => null);
    render(<Harness selected={RAMP} reloadTo={reloadTo} />);
    await renameRamp('Ramp!');
    await userEvent.type(tagline(), '!');
    await userEvent.click(publishButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('changed since the editor loaded it');

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    await vi.waitFor(() => expect(reloadTo).toHaveBeenCalledOnce());
    await act(async () => {}); // lets the reload's .then run

    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 2'})).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('changed since the editor loaded it');
    expect(screen.queryByText(/^Reloaded tuning\.json/)).not.toBeInTheDocument();
  });

  it("offers Reload when the edit's entry is gone from the branch, and Reload drops the edit", async () => {
    commitTuning.mockRejectedValue(
      staleRefusal(RAMP_GONE, {path: ['playstyles', 'ramp', 'name'], value: 'Ramp!', expected: 'Ramp'}),
    );
    render(<Harness selected={RAMP} reloadTo={() => RAMP_GONE} />);
    await renameRamp('Ramp!');
    await userEvent.click(publishButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'playstyles.ramp.name changed since the editor loaded it (now missing). Reload tuning.json and make the edit again.',
    );

    await userEvent.click(screen.getByRole('button', {name: 'Reload tuning.json'}));
    expect(
      await screen.findByText('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.'),
    ).toHaveFocus();
    expect(tray().getByRole('heading', {level: 2, name: 'Pending changes · 0'})).toBeInTheDocument();
    // Ramp's scores live elsewhere in tuning.json, so they stay; its playstyle copy went with the entry.
    expect(screen.queryByRole('textbox', {name: 'Title text'})).not.toBeInTheDocument();
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

describe('TuningAside, the pinned tray', () => {
  /** A box from `top` to `bottom` in the view, all getBoundingClientRect's callers here read. */
  const box = (top: number, bottom: number) => ({top, bottom}) as DOMRect;

  it('brings a field that takes focus under the pinned tray up into view (WCAG 2.4.11)', () => {
    render(<Harness selected={RAMP} />);
    const foot = screen.getByRole('region', {name: 'Pending changes'}).parentElement as HTMLElement;
    vi.spyOn(foot, 'getBoundingClientRect').mockReturnValue(box(600, 730));
    // The title sits clear of the tray; the tagline has scrolled under its top edge.
    vi.spyOn(title(), 'getBoundingClientRect').mockReturnValue(box(400, 476));
    vi.spyOn(tagline(), 'getBoundingClientRect').mockReturnValue(box(580, 656));
    title().scrollIntoView = vi.fn();
    tagline().scrollIntoView = vi.fn();

    act(() => title().focus());
    expect(title().scrollIntoView).not.toHaveBeenCalled();

    act(() => tagline().focus());
    expect(tagline().scrollIntoView).toHaveBeenCalledWith({block: 'center'});
  });
});

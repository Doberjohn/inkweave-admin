import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {renderWithCards} from '../../../../test/cardLinks';
import {OverviewView, type OverviewViewProps} from '../OverviewView';
import {
  ANALYTICS,
  COLLECTORS,
  EMPTY_VOTE_LOG,
  NO_COLLECTOR_KEY,
  NO_EVENTS,
  NO_RAW_ANALYTICS,
  NO_VERCEL,
  VERCEL,
  VOTE_LOG,
} from '../overviewFixtures';

const LOADED: OverviewViewProps = {
  analytics: ANALYTICS,
  analyticsState: {loading: false, error: null},
  voteLog: VOTE_LOG,
  voteLogError: null,
  vercel: VERCEL,
  vercelError: null,
  collectors: COLLECTORS,
  collectorsError: null,
};

// The cards link to other pages, so the view needs a router.
function renderView(overrides: Partial<OverviewViewProps> = {}) {
  render(
    <MemoryRouter>
      <OverviewView {...LOADED} {...overrides} />
    </MemoryRouter>,
  );
}

const kpis = () => screen.getByRole('region', {name: 'Key figures'});

describe('OverviewView', () => {
  it('leads with the headline numbers', () => {
    renderView();
    for (const text of ['2,054', '+260 since Sep 28', '1,928', 'Distinct voters', '114', '8,540', '5 event types · Vercel']) {
      expect(within(kpis()).getByText(text)).toBeInTheDocument();
    }
  });

  // #29: the KPI counts the real engine gaps; the pairs the engine can never score go in its hint.
  it('counts the engine-silent pairs with both cards in Core, and the rest in the hint', () => {
    renderView();
    const silent = within(kpis()).getByRole('group', {name: 'Engine-silent pairs'});
    expect(within(silent).getByText('12')).toBeInTheDocument();
    expect(
      within(silent).getByText('both cards in Core · 184 more outside the current card list'),
    ).toBeInTheDocument();
  });

  it('reads the calibration verdict and links to Calibration', () => {
    renderView();
    expect(screen.getByText('is well-calibrated')).toBeInTheDocument();
    expect(screen.getByText('mean gap').parentElement).toHaveTextContent('−0.30');
    expect(
      screen.getByText('The engine rates pairs about 0.30 points higher than the community on average.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Accuracy sentiment/)).toHaveTextContent(
      'Accuracy sentiment raw +0.03 (too-low vs too-high · 1,902 answers)',
    );
    expect(screen.getByRole('link', {name: 'Open calibration →'})).toHaveAttribute('href', '/calibration');
  });

  it('charts weekly activity, the last bar dated by the latest vote', () => {
    // WeeklyCard.test.tsx covers the chart itself: tooltips, keyboard, table view and width.
    renderView();
    expect(screen.getByRole('slider', {name: 'Votes per week'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Table'})).toBeInTheDocument();
    expect(screen.getByText(/the last bar runs through the latest vote \(Sep 30\)\.$/)).toBeInTheDocument();
  });

  it('lists the rules to review widest gap first, leaving out thin and unvoted rules', () => {
    renderView();
    const list = screen.getByRole('list', {name: 'Rules to review'});
    expect(within(list).getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
      'Tune Discard',
      'Tune Ramp',
      'Tune Shift Targets',
      // A direct rule with no tuning.json copy (R-22).
      'Inspect Singer + Songs',
    ]);
    expect(within(list).getByRole('link', {name: 'Tune Ramp'})).toHaveAttribute('href', '/calibration?rule=ramp');
    expect(within(list).queryByText('Location Boost')).not.toBeInTheDocument();
    expect(within(list).queryByText('Bodyguard')).not.toBeInTheDocument();
  });

  it('shows the four latest votes newest first, with a dash for a quick vote', () => {
    renderView();
    const rows = within(screen.getByRole('list', {name: 'Latest votes'})).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    // Voter 41's ts is Supabase's created_at shape: it still sorts first and is labelled by its UTC day.
    expect(rows[0]).toHaveTextContent('Maui × Fishhook');
    expect(rows[0]).toHaveTextContent('voter 41 · Sep 30');
    expect(rows[1]).toHaveTextContent('voter 12 · Sep 30');
    expect(rows[1]).toHaveTextContent('—');
    expect(rows[3]).toHaveTextContent('Cogsworth × Beast’s Castle');
    expect(screen.getByRole('link', {name: 'Open activity →'})).toHaveAttribute('href', '/activity');
  });

  it('links a latest vote’s card to its card page when the card list holds it (R-33)', () => {
    renderWithCards(<OverviewView {...LOADED} />, ['crd-Maui']);
    const rows = within(screen.getByRole('list', {name: 'Latest votes'})).getAllByRole('listitem');
    expect(within(rows[0]).getByRole('link', {name: 'Maui'})).toHaveAttribute('href', '/cards/crd-Maui');
    expect(within(rows[0]).queryByRole('link', {name: 'Fishhook'})).not.toBeInTheDocument();
    expect(rows[0]).toHaveTextContent('Maui × Fishhook');
    expect(within(rows[3]).queryByRole('link')).not.toBeInTheDocument();
  });

  it('lists web events busiest first, with all-time totals and the trend window', () => {
    renderView();
    const rows = within(screen.getByRole('list', {name: 'Web events'})).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Reveal card clicks4,820',
      'Searches2,010',
      'Votes submitted1,240',
      'Votes skipped330',
      'Share clicks140',
    ]);
    expect(screen.getByText('Trends Jul 31 – Sep 29 · totals all-time')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Open web analytics →'})).toHaveAttribute('href', '/web');
  });

  it('says it is loading while each artifact loads', () => {
    renderView({analytics: null, analyticsState: {loading: true, error: null}, voteLog: null, vercel: null});
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Key figures'})).not.toBeInTheDocument();
    expect(screen.getByText('Loading votes...')).toBeInTheDocument();
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
  });

  it('lists no row and counts no event type for an event never sent', () => {
    const neverSent = {name: 'friend_action', label: 'Friend actions', total: 0, visitors: 0, trend: [], breakdowns: []};
    renderView({vercel: {...VERCEL, events: [...VERCEL.events, neverSent]}});
    const rows = within(screen.getByRole('list', {name: 'Web events'})).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(screen.queryByText('Friend actions')).not.toBeInTheDocument();
    expect(within(kpis()).getByText('5 event types · Vercel')).toBeInTheDocument();
  });

  it('says no events are tracked when none has been sent', () => {
    const neverSent = {name: 'friend_action', label: 'Friend actions', total: 0, visitors: 0, trend: [], breakdowns: []};
    renderView({vercel: {...VERCEL, events: [neverSent]}});
    expect(screen.queryByRole('list', {name: 'Web events'})).not.toBeInTheDocument();
    expect(within(kpis()).getByText('No events tracked yet')).toBeInTheDocument();
    expect(screen.getByText('No events tracked yet.')).toBeInTheDocument();
  });

  it('keeps Tracked events blank while the Vercel data loads', () => {
    renderView({vercel: null});
    expect(within(kpis()).getByText('—')).toBeInTheDocument();
    expect(within(kpis()).getByText('Loading Vercel data...')).toBeInTheDocument();
  });

  it('says why vote analytics are missing, without hiding the other artifacts', () => {
    renderView({
      analytics: null,
      analyticsState: {loading: false, error: new Error('vote-analytics.json has not been generated yet')},
    });
    expect(
      screen.getByText(
        'Could not load vote analytics. Has the artifact been generated? (vote-analytics.json has not been generated yet)',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Rules to review'})).not.toBeInTheDocument();
    expect(screen.getByRole('list', {name: 'Latest votes'})).toBeInTheDocument();
    expect(screen.getByRole('list', {name: 'Web events'})).toBeInTheDocument();
  });

  it('asks for raw votes where the Overview needs them', () => {
    renderView({analytics: NO_RAW_ANALYTICS, voteLog: EMPTY_VOTE_LOG});
    expect(within(kpis()).queryByText('Distinct voters')).not.toBeInTheDocument();
    expect(within(kpis()).queryByText(/since/)).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', {name: 'Votes per week'})).not.toBeInTheDocument();
    expect(screen.getByText(/Weekly activity and voter counts need raw votes/)).toBeInTheDocument();
    expect(screen.getByText(/Needs raw votes/)).toBeInTheDocument();
    expect(screen.queryByText(/Accuracy sentiment/)).not.toBeInTheDocument();
  });

  it('reads an artifact written before the split and the answer count as it was', () => {
    const global = {...ANALYTICS.global, engineSilentSplit: undefined, accuracyAnswers: undefined};
    renderView({analytics: {...ANALYTICS, global}});
    const silent = within(kpis()).getByRole('group', {name: 'Engine-silent pairs'});
    expect(within(silent).getByText('196')).toBeInTheDocument();
    expect(within(silent).getByText('voted, no engine score')).toBeInTheDocument();
    // Its sentiment came from the few pairs in pairs[], so the card leaves it out.
    expect(screen.queryByText(/Accuracy sentiment/)).not.toBeInTheDocument();
  });

  it('names the missing Vercel secrets instead of showing a zero', () => {
    renderView({vercel: NO_VERCEL});
    expect(within(kpis()).getByText('—')).toBeInTheDocument();
    expect(kpis()).toHaveTextContent('Needs VERCEL_ANALYTICS_TOKEN and ANALYTICS_VERCEL_PROJECT_ID');
    expect(screen.getAllByText('VERCEL_ANALYTICS_TOKEN')).toHaveLength(2);
    expect(screen.queryByRole('list', {name: 'Web events'})).not.toBeInTheDocument();
  });

  it('says when no web events were tracked', () => {
    renderView({vercel: NO_EVENTS});
    expect(within(kpis()).getByText('No events tracked yet')).toBeInTheDocument();
    expect(screen.getByText('No events tracked yet.')).toBeInTheDocument();
  });

  it('reports an artifact that failed to load in the cards built from it', () => {
    renderView({
      voteLog: null,
      voteLogError: new Error('vote-log.json: HTTP 500'),
      vercel: null,
      vercelError: new Error('vercel-analytics.json: HTTP 500'),
    });
    expect(screen.getByText('Could not load the vote log (vote-log.json: HTTP 500).')).toBeInTheDocument();
    expect(screen.getByText('Could not load Web Analytics (vercel-analytics.json: HTTP 500).')).toBeInTheDocument();
    expect(within(kpis()).getByText('Vercel data could not load')).toBeInTheDocument();
    expect(screen.getByText(/the last bar runs through the latest vote\.$/)).toBeInTheDocument();
  });

  it("shows this week's returning collectors out of every collector, with a link to the page", () => {
    renderView();
    const card = screen.getByRole('region', {name: 'Returning this week'});
    expect(within(card).getByText('4')).toBeInTheDocument();
    expect(within(card).getByText('of 12 collectors · 2 new')).toBeInTheDocument();
    expect(within(card).getByRole('link', {name: 'Open collectors →'})).toHaveAttribute('href', '/collectors');
  });

  it.each<[string, Partial<OverviewViewProps>, string]>([
    ['loading', {collectors: null}, 'Loading collector analytics...'],
    ['missing', {collectors: null, collectorsError: new Error('collector-analytics.json has not been generated yet')}, 'Could not load collector analytics (collector-analytics.json has not been generated yet).'],
    ['without the key', {collectors: NO_COLLECTOR_KEY}, 'Needs SUPABASE_SERVICE_ROLE_KEY.'],
    ['after a failed read', {collectors: {...NO_COLLECTOR_KEY, reason: 'read-failed'}}, "Couldn't read the collections table on the last deploy."],
    ['with no collectors', {collectors: {...COLLECTORS, collectors: 0, new7: 0, returning7: 0, weeks: []}}, 'No collections yet.'],
  ])('says so in the collectors card %s', (_state, overrides, line) => {
    renderView(overrides);
    expect(screen.getByRole('region', {name: 'Returning this week'})).toHaveTextContent(line);
  });
});

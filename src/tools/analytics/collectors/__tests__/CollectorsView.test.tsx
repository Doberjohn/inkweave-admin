import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CollectorsPage} from '../CollectorsPage';
import {CollectorsView} from '../CollectorsView';
import {COUNTS} from '../collectorFixtures';

/** The value under a headline figure's label. */
function figure(label: string) {
  return within(screen.getByRole('group', {name: label}));
}

/** The start-week table's body rows, as the text of each cell, row header included. */
function weekRows() {
  const [, ...body] = within(screen.getByRole('table', {name: 'Collectors by start week'})).getAllByRole('row');
  return body.map((tr) => [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent));
}

describe('CollectorsView', () => {
  it('leads with the headline counts', () => {
    render(<CollectorsView analytics={COUNTS} />);
    expect(figure('Collectors').getByText('27')).toBeInTheDocument();
    expect(figure('New, 7 days').getByText('5')).toBeInTheDocument();
    expect(figure('Returning, 7 days').getByText('9')).toBeInTheDocument();
    expect(figure('Returning, 30 days').getByText('14')).toBeInTheDocument();
    expect(figure('Came back at least once').getByText('17 of 27')).toBeInTheDocument();
  });

  it('lists each start week newest first, a week too new for a week in saying so', () => {
    render(<CollectorsView analytics={COUNTS} />);
    expect(weekRows()).toEqual([
      ['Nov 2', '5', '1', 'too new', '5'],
      ['Oct 26', '8', '5', '1 of 3', '4'],
      ['Oct 19', '10', '8', '6 of 10', '3'],
      ['Oct 12', '4', '3', '2 of 4', '1'],
    ]);
  });

  it("says what the counts can't see", () => {
    render(<CollectorsView analytics={COUNTS} />);
    expect(screen.getByText(/Opening the binder without changing it isn.t recorded/)).toHaveTextContent(
      'a cleared collection drops out',
    );
  });

  it('names the secret when the deploy had no service-role key', () => {
    render(<CollectorsView analytics={{generatedAt: COUNTS.generatedAt, hasData: false, reason: 'no-key'}} />);
    expect(screen.getByText('SUPABASE_SERVICE_ROLE_KEY')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it("says the read failed, as an error, when the deploy couldn't read the table", () => {
    render(<CollectorsView analytics={{generatedAt: COUNTS.generatedAt, hasData: false, reason: 'read-failed'}} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't read the collections table on the last deploy.");
    expect(screen.queryByText('SUPABASE_SERVICE_ROLE_KEY')).not.toBeInTheDocument();
  });

  it('says there are no collections yet', () => {
    render(<CollectorsView analytics={{...COUNTS, collectors: 0, new7: 0, returning7: 0, weeks: []}} />);
    expect(screen.getByText('No collections yet.')).toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Collectors'})).not.toBeInTheDocument();
  });

  it('shows the loading state until the file arrives', () => {
    render(<CollectorsView analytics={null} />);
    expect(screen.getByText('Loading collector analytics...')).toBeInTheDocument();
  });

  it('says why when the file could not be loaded, instead of loading forever', () => {
    render(<CollectorsView analytics={null} error={new Error('collector-analytics.json has not been generated yet')} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load collector analytics. Has the artifact been generated? (collector-analytics.json has not been generated yet)',
    );
  });
});

describe('CollectorsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads collector-analytics.json alone and dates the page from it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(COUNTS), {headers: {'content-type': 'application/json'}}),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <CollectorsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', {level: 1, name: 'Collectors'})).toBeInTheDocument();
    expect(await screen.findByText('2026-11-04')).toBeInTheDocument();
    expect(figure('Collectors').getByText('27')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/admin-data/collector-analytics.json');
  });
});

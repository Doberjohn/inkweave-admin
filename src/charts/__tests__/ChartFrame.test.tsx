import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ChartFrame, type ChartTable, type ChartView} from '../ChartFrame';

const TABLE: ChartTable = {
  caption: 'Votes per day, Sep 29 – Sep 30',
  columns: ['Day', 'Votes', 'Voters'],
  rows: [
    ['Sep 29', '0', '0'],
    ['Sep 30', '12', '4'],
  ],
};

function renderFrame(extra: Partial<React.ComponentProps<typeof ChartFrame>> = {}) {
  render(
    <ChartFrame
      title="Votes per day"
      subtitle="Last 30 days"
      legend={<ul aria-label="Legend" />}
      actions={<a href="/activity">Open activity</a>}
      table={TABLE}
      {...extra}>
      <div data-testid="plot" />
    </ChartFrame>,
  );
}

describe('ChartFrame', () => {
  it('is a figure named by its h2 title, with the subtitle, actions, legend and chart', () => {
    renderFrame();
    const figure = screen.getByRole('figure', {name: 'Votes per day'});
    // The header row is the figcaption, the figure's first child, and it holds the heading.
    expect(figure.firstElementChild?.tagName).toBe('FIGCAPTION');
    expect(figure.firstElementChild).toContainElement(within(figure).getByRole('heading', {level: 2, name: 'Votes per day'}));
    // No surface of its own: the page's untitled Panel is the card.
    expect(figure.style.backgroundColor).toBe('');
    expect(figure.style.borderStyle).toBe('');
    expect(within(figure).getByText('Last 30 days')).toBeInTheDocument();
    expect(within(figure).getByRole('link', {name: 'Open activity'})).toBeInTheDocument();
    expect(within(figure).getByRole('list', {name: 'Legend'})).toBeInTheDocument();
    expect(within(figure).getByTestId('plot')).toBeInTheDocument();
  });

  it('takes an h3 inside a titled section', () => {
    renderFrame({titleLevel: 3});
    expect(screen.getByRole('heading', {level: 3, name: 'Votes per day'})).toBeInTheDocument();
  });

  it('opens on the chart, with a Chart | Table toggle named for the chart', () => {
    renderFrame();
    const toggle = screen.getByRole('group', {name: 'Show Votes per day as'});
    expect(within(toggle).getByRole('button', {name: 'Chart'})).toHaveAttribute('aria-pressed', 'true');
    expect(within(toggle).getByRole('button', {name: 'Table'})).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('swaps the chart and legend for a real table, and back', async () => {
    renderFrame();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));

    const table = screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'});
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((th) => th.textContent)).toEqual(['Day', 'Votes', 'Voters']);
    for (const th of headers) expect(th).toHaveAttribute('scope', 'col');
    const rowHeaders = within(table).getAllByRole('rowheader');
    expect(rowHeaders.map((th) => th.textContent)).toEqual(['Sep 29', 'Sep 30']);
    for (const th of rowHeaders) expect(th).toHaveAttribute('scope', 'row');
    expect(within(table).getAllByRole('cell').map((td) => td.textContent)).toEqual(['0', '0', '12', '4']);
    expect(screen.queryByTestId('plot')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Chart'}));
    expect(screen.getByTestId('plot')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('scrolls a wide table inside its own box, never the page body', () => {
    renderFrame({defaultView: 'table'});
    const box = screen.getByRole('table').parentElement!;
    expect(box).toHaveStyle({overflowX: 'auto', maxWidth: '100%'});
    expect(box.tagName).toBe('DIV');
  });

  it('can open on the table', () => {
    renderFrame({defaultView: 'table'});
    expect(screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Table'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the view its parent passes, and reports the toggle', async () => {
    const onViewChange = vi.fn();
    renderFrame({view: 'table', onViewChange});
    // Opening on the table takes no focus: only a switch from the chart does.
    expect(screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'})).not.toHaveFocus();
    await userEvent.click(screen.getByRole('button', {name: 'Chart'}));
    expect(onViewChange).toHaveBeenCalledWith('chart');
  });

  it('hands focus to the table when a control inside the chart opens it', async () => {
    function Controlled() {
      const [view, setView] = useState<ChartView>('chart');
      return (
        <ChartFrame title="Votes per day" table={TABLE} view={view} onViewChange={setView}>
          <button type="button" onClick={() => setView('table')}>
            Show all
          </button>
        </ChartFrame>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', {name: 'Show all'}));
    expect(screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'})).toHaveFocus();
  });
});

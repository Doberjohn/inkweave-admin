import {describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RouterProvider, createMemoryRouter, useLocation, useParams} from 'react-router-dom';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {NETWORK_MAX_NODES, NetworkDiagram, type NetworkNode} from '../NetworkDiagram';
import {networkLayout} from '../networkLayout';
import {CHART_FALLBACK_WIDTH, tooltipText, type SeriesDef} from '../series';

// networkLayout runs as it is, and counts its calls: the placement test checks a hover places nothing again.
vi.mock('../networkLayout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../networkLayout')>();
  return {...actual, networkLayout: vi.fn(actual.networkLayout)};
});

const SERIES: SeriesDef[] = [
  {id: 'strong', label: 'Strong', color: ADMIN_COLORS.under},
  {id: 'weak', label: 'Weak', color: ADMIN_COLORS.over},
];

/** Card i as a partner, strongest first by i: a short printed name and a fuller tooltip title. */
function node(i: number, overrides: Partial<NetworkNode> = {}): NetworkNode {
  const score = 10 - i * 0.5;
  return {
    id: String(i),
    label: `Partner ${i}`,
    href: `/cards/${i}`,
    value: score,
    seriesId: i < 3 ? 'strong' : 'weak',
    tooltip: {title: `Partner ${i} - Full Name`, rows: [{label: 'engine score', value: String(score)}]},
    ...overrides,
  };
}

const nodes = (count: number) => Array.from({length: count}, (_, i) => node(i));

/** A card's partners: the first four other cards, so following a link swaps the nodes, as on /cards/:id. */
const partnersOf = (cardId: string) => [0, 1, 2, 3, 4].filter((i) => String(i) !== cardId).slice(0, 4).map((i) => node(i));

/** The diagram on /cards/:id, with the router's path printed so a test can see a link was followed. */
function Diagram(props: Partial<React.ComponentProps<typeof NetworkDiagram>>) {
  const {id = ''} = useParams();
  return (
    <>
      <NetworkDiagram nodes={partnersOf(id)} series={SERIES} ariaLabel="Strongest partners" {...props} />
      <output aria-label="Location">{useLocation().pathname}</output>
    </>
  );
}

function renderDiagram(props: Partial<React.ComponentProps<typeof NetworkDiagram>> = {}) {
  const router = createMemoryRouter([{path: '/cards/:id', element: <Diagram {...props} />}], {initialEntries: ['/cards/9']});
  return render(<RouterProvider router={router} />);
}

const nodeLinks = () => within(screen.getByRole('list', {name: 'Strongest partners'})).getAllByRole('link');
/** The spokes in strength order (the DOM draws the weakest first, so the strongest sits on top). */
const spokesOf = (container: HTMLElement) => Array.from(container.querySelectorAll('line')).reverse();
const printedNames = (container: HTMLElement) => Array.from(container.querySelectorAll('text'), (t) => t.textContent);

describe('NetworkDiagram: nodes and links', () => {
  it('lists one link per node, strongest first, each to its page and named by its tooltip’s text (R-41)', () => {
    renderDiagram();
    const links = nodeLinks();
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual([0, 1, 2, 3].map((i) => tooltipText(node(i).tooltip)));
    expect(links[0]).toHaveAccessibleName('Partner 0 - Full Name: 10 engine score');
    expect(links[2]).toHaveAttribute('href', '/cards/2');
  });

  it('draws at most twelve nodes and offers the rest in the table', async () => {
    const onShowAll = vi.fn();
    renderDiagram({nodes: nodes(15), onShowAll});
    expect(nodeLinks()).toHaveLength(NETWORK_MAX_NODES);
    await userEvent.click(screen.getByRole('button', {name: 'and 3 more in the table'}));
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it('names the rest as text when there is no table to open, and says nothing when all fit', () => {
    const {unmount} = renderDiagram({nodes: nodes(13)});
    expect(screen.getByText('and 1 more in the table view')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    renderDiagram({nodes: nodes(12)});
    expect(screen.queryByText(/more in the table/)).not.toBeInTheDocument();
  });

  it('sets the note at one size, as a button or as text', () => {
    const {unmount} = renderDiagram({nodes: nodes(13), onShowAll: vi.fn()});
    expect(screen.getByRole('button', {name: 'and 1 more in the table'})).toHaveStyle({fontSize: `${ADMIN_TYPE.small}px`});
    unmount();
    renderDiagram({nodes: nodes(13)});
    expect(screen.getByText('and 1 more in the table view')).toHaveStyle({fontSize: `${ADMIN_TYPE.small}px`});
  });

  it('covers each node’s target and its printed name with its link', () => {
    renderDiagram();
    // jsdom measures no width, so the diagram lays out at CHART_FALLBACK_WIDTH and its default 340px height.
    const layout = networkLayout({width: CHART_FALLBACK_WIDTH, height: 340}, ['Partner 0', 'Partner 1', 'Partner 2', 'Partner 3']);
    const items = within(screen.getByRole('list', {name: 'Strongest partners'})).getAllByRole('listitem');
    expect(items.map((li) => [li.style.left, li.style.top, li.style.width, li.style.height])).toEqual(
      layout.links.map((box) => [`${box.x}px`, `${box.y}px`, `${box.width}px`, `${box.height}px`]),
    );
  });

  it('follows a node’s link, as a click or a tap does', async () => {
    renderDiagram();
    await userEvent.click(screen.getByRole('link', {name: /^Partner 2 - Full Name/}));
    expect(screen.getByRole('status', {name: 'Location'})).toHaveTextContent('/cards/2');
  });

  it('shows its empty text, and no list, without nodes', () => {
    renderDiagram({nodes: [], emptyText: 'No partners to draw.'});
    expect(screen.getByText('No partners to draw.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('NetworkDiagram: marks', () => {
  it('colours each spoke and dot by its series, neutral for an unknown one, and widens the spoke with the value', () => {
    const {container} = renderDiagram({nodes: [node(0, {value: 10}), node(3, {value: 0}), node(4, {seriesId: 'gone', value: 5})]});
    expect(spokesOf(container).map((l) => l.getAttribute('stroke'))).toEqual([
      ADMIN_COLORS.under,
      ADMIN_COLORS.over,
      ADMIN_COLORS.barNeutral,
    ]);
    expect(spokesOf(container).map((l) => l.getAttribute('stroke-width'))).toEqual(['4', '1', '2.5']);
    expect(container.querySelector('circle[data-mark="3"]')).toHaveAttribute('fill', ADMIN_COLORS.over);
  });

  it('draws the hub as an unnamed dot (R-38): every printed name is a node’s', () => {
    const {container} = renderDiagram();
    expect(container.querySelector('circle[data-mark="hub"]')).toHaveAttribute('fill', ADMIN_COLORS.text);
    expect(printedNames(container)).toEqual(['Partner 0', 'Partner 1', 'Partner 2', 'Partner 3']);
  });

  it('prints the names that fit and leaves out one too wide for the plot, which keeps its accessible name (R-40)', () => {
    const wide = 'An extraordinarily long partner name that cannot fit beside its node at all';
    const {container} = renderDiagram({nodes: [node(0), node(1, {label: wide}), node(2), node(3)]});
    expect(printedNames(container)).toEqual(['Partner 0', 'Partner 2', 'Partner 3']);
    expect(screen.getByRole('link', {name: /^Partner 1 - Full Name/})).toBeInTheDocument();
  });
});

describe('NetworkDiagram: hover and focus', () => {
  it('shows the node’s tooltip on hover, lifts its dot, brightens its name and dims the other spokes (R-41)', async () => {
    const {container} = renderDiagram();
    await userEvent.hover(nodeLinks()[1]);
    expect(screen.getByText('Partner 1 - Full Name')).toBeInTheDocument();
    const spokes = spokesOf(container);
    expect(spokes.every((l) => l.classList.contains('adm-chart-mark'))).toBe(true);
    expect(spokes.map((l) => l.getAttribute('data-dim'))).toEqual(['true', null, 'true', 'true']);
    expect(spokes[1]).toHaveAttribute('data-active', 'true');
    expect(container.querySelector('circle[data-mark="1"]')).toHaveAttribute('r', '7');
    expect(Array.from(container.querySelectorAll('text'), (t) => t.getAttribute('fill'))).toEqual([
      ADMIN_COLORS.muted,
      ADMIN_COLORS.text,
      ADMIN_COLORS.muted,
      ADMIN_COLORS.muted,
    ]);

    await userEvent.unhover(nodeLinks()[1]);
    expect(screen.queryByText('Partner 1 - Full Name')).not.toBeInTheDocument();
    expect(container.querySelector('line[data-dim], line[data-active]')).toBeNull();
  });

  it('shows the focused node’s tooltip, follows Tab, and hides it on blur', async () => {
    renderDiagram();
    const links = nodeLinks();
    await userEvent.tab();
    expect(links[0]).toHaveFocus();
    expect(screen.getByText('Partner 0 - Full Name')).toBeInTheDocument();
    await userEvent.tab();
    expect(links[1]).toHaveFocus();
    expect(screen.getByText('Partner 1 - Full Name')).toBeInTheDocument();
    expect(screen.queryByText('Partner 0 - Full Name')).not.toBeInTheDocument();
    act(() => links[1].blur());
    expect(screen.queryByText('Partner 1 - Full Name')).not.toBeInTheDocument();
  });

  it('hides the focused node’s tooltip on Escape and keeps focus on its link (WCAG 1.4.13)', async () => {
    const {container} = renderDiagram();
    await userEvent.tab();
    expect(screen.getByText('Partner 0 - Full Name')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Partner 0 - Full Name')).not.toBeInTheDocument();
    expect(container.querySelector('line[data-dim], line[data-active]')).toBeNull();
    expect(nodeLinks()[0]).toHaveFocus();
  });

  it('shows nothing active once a followed link swaps the nodes, though no leave or blur came (R-46)', async () => {
    const {container} = renderDiagram();
    await userEvent.click(screen.getByRole('link', {name: /^Partner 2 - Full Name/}));
    // The new card's partners: node 2's link is gone with no pointerleave or blur, and the pointer rests where it was.
    expect(screen.getByRole('status', {name: 'Location'})).toHaveTextContent('/cards/2');
    expect(nodeLinks().map((a) => a.getAttribute('href'))).toEqual(['/cards/0', '/cards/1', '/cards/3', '/cards/4']);
    expect(container.querySelector('.adm-chart-tip')).toBeNull();
    expect(container.querySelector('line[data-dim], line[data-active]')).toBeNull();
  });

  it('places the nodes once per layout: hover and focus place nothing again', async () => {
    renderDiagram();
    const placed = vi.mocked(networkLayout);
    placed.mockClear();
    for (const link of nodeLinks()) await userEvent.hover(link);
    await userEvent.tab();
    expect(screen.getByText('Partner 0 - Full Name')).toBeInTheDocument();
    expect(placed).not.toHaveBeenCalled();
    // The control: new nodes are placed again.
    await userEvent.click(nodeLinks()[2]);
    expect(placed).toHaveBeenCalled();
  });
});

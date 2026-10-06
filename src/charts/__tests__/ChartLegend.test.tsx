import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ChartLegend} from '../ChartLegend';
import type {SeriesDef} from '../series';

const BANDS: SeriesDef[] = [
  {id: 'high', label: '7+', color: ADMIN_COLORS.under},
  {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
  {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
];

describe('ChartLegend', () => {
  it('renders nothing for a single series: the title names it', () => {
    const {container} = render(<ChartLegend series={BANDS.slice(0, 1)} mark="rect" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every series in order, labelled in the muted text colour', () => {
    render(<ChartLegend series={BANDS} mark="rect" />);
    const legend = screen.getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['7+', '5–6', 'No score']);
    expect(legend).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('keys bars with a filled swatch and a hatched series with its pattern', () => {
    const {container} = render(<ChartLegend series={BANDS} mark="rect" />);
    const swatches = container.querySelectorAll('svg[aria-hidden="true"] > rect');
    expect(swatches[0]).toHaveAttribute('fill', ADMIN_COLORS.under);
    const pattern = container.querySelector('pattern');
    expect(pattern).not.toBeNull();
    expect(pattern!.querySelector('rect')).toHaveAttribute('fill', ADMIN_COLORS.muted);
    expect(swatches[2]).toHaveAttribute('fill', `url(#${pattern!.id})`);
  });

  it('keys lines with a short stroke', () => {
    const {container} = render(
      <ChartLegend
        series={[
          {id: 'searches', label: 'Searches', color: ADMIN_COLORS.accent},
          {id: 'views', label: 'Card views', color: ADMIN_COLORS.under},
        ]}
        mark="line"
      />,
    );
    const keys = container.querySelectorAll('line');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    expect(keys[0]).toHaveAttribute('stroke-width', '2');
    expect(container.querySelector('rect')).toBeNull();
  });

  it('keys scatter dots with a filled circle, a hatched series with its pattern', () => {
    const {container} = render(<ChartLegend series={BANDS} mark="dot" />);
    const keys = container.querySelectorAll('svg[aria-hidden="true"] > circle');
    expect(keys).toHaveLength(3);
    expect(keys[0]).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(keys[2]).toHaveAttribute('fill', `url(#${container.querySelector('pattern')!.id})`);
    expect(container.querySelector('svg[aria-hidden="true"] > rect')).toBeNull();
  });
});

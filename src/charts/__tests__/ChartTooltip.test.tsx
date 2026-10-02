import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ChartTooltip, type TooltipContent} from '../ChartTooltip';
import {tooltipText} from '../series';

const CONTENT: TooltipContent = {
  title: 'Sep 30',
  rows: [
    {label: 'votes', value: '12', color: ADMIN_COLORS.under},
    {label: 'voters', value: '4'},
  ],
};
const BOUNDS = {width: 400, height: 200};

function tipOf(container: HTMLElement): HTMLElement {
  const tip = container.querySelector<HTMLElement>('.adm-chart-tip');
  expect(tip).not.toBeNull();
  return tip!;
}

describe('ChartTooltip', () => {
  it('renders nothing without content', () => {
    const {container} = render(<ChartTooltip content={null} x={10} y={10} bounds={BOUNDS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is visual only: hidden from assistive tech and from the pointer', () => {
    const {container} = render(<ChartTooltip content={CONTENT} x={10} y={10} bounds={BOUNDS} />);
    const tip = tipOf(container);
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(tip).toHaveStyle({pointerEvents: 'none'});
  });

  it('shows the title, then each value before its label, values in the strong text colour', () => {
    const {container, getByText} = render(<ChartTooltip content={CONTENT} x={10} y={10} bounds={BOUNDS} />);
    expect(tipOf(container)).toHaveTextContent(/^Sep 3012votes4voters$/);
    expect(getByText('12')).toHaveStyle({fontWeight: '700'});
    expect(getByText('votes')).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('keys a coloured row with a short line in the series colour, never the text', () => {
    const {getByText} = render(<ChartTooltip content={CONTENT} x={10} y={10} bounds={BOUNDS} />);
    const value = getByText('12');
    expect(value.previousElementSibling).toHaveStyle({background: ADMIN_COLORS.under, height: '2px'});
    expect(value).not.toHaveStyle({color: ADMIN_COLORS.under});
  });

  it.each([
    [20, 20, 'below-right'],
    [380, 20, 'below-left'],
    [20, 180, 'above-right'],
    [380, 180, 'above-left'],
  ])('at (%s, %s) opens %s, towards the roomier side', (x, y, placement) => {
    const {container} = render(<ChartTooltip content={CONTENT} x={x} y={y} bounds={BOUNDS} />);
    expect(tipOf(container)).toHaveAttribute('data-placement', placement);
  });

  it('keeps its anchor inside the plot', () => {
    const {container} = render(<ChartTooltip content={CONTENT} x={999} y={-40} bounds={BOUNDS} />);
    const tip = tipOf(container);
    expect(tip.style.transform).toBe('translate(400px, 0px) translate(calc(-100% - 12px), 12px)');
    expect(tip).toHaveAttribute('data-placement', 'below-left');
  });

  it('reads as one line for accessible names, in the order it shows', () => {
    expect(tooltipText(CONTENT)).toBe('Sep 30: 12 votes, 4 voters');
    expect(tooltipText({title: 'Sep 29', rows: []})).toBe('Sep 29');
  });
});

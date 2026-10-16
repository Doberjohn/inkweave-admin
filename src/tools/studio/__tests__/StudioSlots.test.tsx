import {useState} from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {StudioSlots} from '../components/StudioSlots';

/** A region with a count of its own, so a remount would show as a reset. */
function Region({name}: {name: string}) {
  const [presses, setPresses] = useState(0);
  return (
    <button type="button" onClick={() => setPresses(presses + 1)}>
      {name} {presses}
    </button>
  );
}

const SLOTS = {card: <Region name="card" />, form: <Region name="form" />, aside: <Region name="aside" />};

/** The regions in DOM order, which is the Tab order. */
const order = () => screen.getAllByRole('button').map((region) => region.textContent?.split(' ')[0]);

describe('StudioSlots', () => {
  it.each([
    ['wide', ['card', 'form', 'aside']],
    ['narrow', ['form', 'card', 'aside']],
  ] as const)('puts its regions in Tab order when %s: %j (R-63)', (layout, regions) => {
    render(<StudioSlots layout={layout} slots={SLOTS} />);
    expect(order()).toEqual(regions);
  });

  it('moves its regions on a layout switch, each with its state and its element', async () => {
    const user = userEvent.setup();
    const {rerender} = render(<StudioSlots layout="narrow" slots={SLOTS} />);
    await user.click(screen.getByRole('button', {name: 'form 0'}));
    const form = screen.getByRole('button', {name: 'form 1'});

    rerender(<StudioSlots layout="wide" slots={SLOTS} />);
    expect(order()).toEqual(['card', 'form', 'aside']);
    expect(screen.getByRole('button', {name: 'form 1'})).toBe(form);
  });

  it("gives each region its layout's place", () => {
    const {rerender} = render(<StudioSlots layout="narrow" slots={SLOTS} />);
    expect(screen.getByRole('button', {name: 'form 0'}).parentElement).toHaveStyle({flex: '0 1 400px'});
    rerender(<StudioSlots layout="wide" slots={SLOTS} />);
    expect(screen.getByRole('button', {name: 'form 0'}).parentElement?.style.gridColumn).toBe('2 / span 2');
  });
});

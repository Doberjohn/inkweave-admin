import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ToolIndex} from './ToolIndex';
import {ADMIN_TOOLS} from './tools';

describe('ToolIndex', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists every admin tool by name', () => {
    render(<ToolIndex />);
    for (const tool of ADMIN_TOOLS) {
      expect(screen.getByRole('heading', {name: tool.name})).toBeInTheDocument();
    }
  });

  it('opens a tool at its current home on the public app until it moves here', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<ToolIndex />);
    await userEvent.click(screen.getByRole('button', {name: 'Open Reveal publisher'}));
    expect(open).toHaveBeenCalledWith('https://inkweave.ink/admin/reveal', '_blank', 'noopener');
  });

  it('disables a tool that only runs locally, and names it that way', () => {
    render(<ToolIndex />);
    expect(screen.getByRole('button', {name: 'Banner generator, runs locally'})).toBeDisabled();
  });
});

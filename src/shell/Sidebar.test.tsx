import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {Sidebar} from './Sidebar';

// Pinned here, not imported: renaming the key would silently reset everyone's choice.
const KEY = 'inkweave-admin.sidebar-open';

function renderSidebar({path = '/calibration', tokenSaved = false, onForgetToken = () => {}} = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar tokenSaved={tokenSaved} onForgetToken={onForgetToken} />
    </MemoryRouter>,
  );
}

const nav = () => within(screen.getByRole('navigation', {name: 'Admin'}));
const hrefs = (group: string) =>
  within(screen.getByRole('list', {name: group}))
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Sidebar', () => {
  it('lists the pages under their group labels', () => {
    renderSidebar();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(hrefs('Insights')).toEqual(['/calibration', '/activity', '/web']);
    expect(hrefs('Publish')).toEqual(['/reveal', '/image']);
    // The mark is aria-hidden: the exact name proves it stays out of the link's name.
    expect(nav().getByRole('link', {name: 'Reveal publisher'})).toHaveAttribute('href', '/reveal');
  });

  it('marks the current page', () => {
    renderSidebar({path: '/reveal'});
    expect(nav().getByRole('link', {name: 'Reveal publisher'})).toHaveAttribute('aria-current', 'page');
    expect(nav().getByRole('link', {name: 'Card images'})).not.toHaveAttribute('aria-current');
  });

  it('shows the token box on a page that writes, and forgets the token from it', async () => {
    const onForgetToken = vi.fn();
    renderSidebar({path: '/image', tokenSaved: true, onForgetToken});
    expect(screen.getByText('GitHub token saved')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it.each([
    ['a page that writes, with no token saved', '/image', false],
    ['a read-only page, even with a token saved', '/activity', true],
  ])('shows no token box on %s', (_case, path, tokenSaved) => {
    renderSidebar({path, tokenSaved});
    expect(screen.queryByText('GitHub token saved')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it('collapses to marks that keep their names, and saves the choice', async () => {
    renderSidebar();
    const toggle = screen.getByRole('button', {name: 'Collapse sidebar'});
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', screen.getByRole('complementary', {name: 'Admin sidebar'}).id);

    await userEvent.click(toggle);

    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
    const link = nav().getByRole('link', {name: 'Reveal publisher'});
    expect(link).toHaveTextContent(/^Re$/);
    expect(link).toHaveAttribute('title', 'Reveal publisher');
    expect(screen.queryByText('Insights')).not.toBeInTheDocument();
    expect(screen.getByRole('list', {name: 'Insights'})).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('false');
  });

  it('keeps Forget token reachable when collapsed', async () => {
    localStorage.setItem(KEY, 'false');
    const onForgetToken = vi.fn();
    renderSidebar({path: '/reveal', tokenSaved: true, onForgetToken});
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('starts collapsed when that was saved', () => {
    localStorage.setItem(KEY, 'false');
    renderSidebar();
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toBeInTheDocument();
  });

  it('starts collapsed below 900px, whatever was saved', () => {
    localStorage.setItem(KEY, 'true');
    const matchMedia = vi.fn((query: string) => ({matches: query === '(max-width: 899px)'}));
    vi.stubGlobal('matchMedia', matchMedia);
    renderSidebar();
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 899px)');
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toBeInTheDocument();
  });

  it('starts open at 900px and wider', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false})));
    renderSidebar();
    expect(screen.getByRole('button', {name: 'Collapse sidebar'})).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts collapsed at 900px and wider when that was saved: the saved choice beats the open default', () => {
    localStorage.setItem(KEY, 'false');
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false})));
    renderSidebar();
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens, and still toggles, when storage is unavailable', async () => {
    const denied = () => {
      throw new Error('storage denied');
    };
    vi.stubGlobal('localStorage', {getItem: denied, setItem: denied});
    renderSidebar();
    await userEvent.click(screen.getByRole('button', {name: 'Collapse sidebar'}));
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toBeInTheDocument();
  });
});

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {ComponentType} from 'react';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ImagePage} from '../image/ImagePage';
import {RevealPage} from '../reveal/RevealPage';

// The token each test hands the pages. The mock's clearToken is a no-op:
// forgetting the token is the sidebar's job now (router.test.tsx covers that).
const saved = vi.hoisted(() => ({token: null as string | null}));
vi.mock('../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: saved.token, setToken: () => {}, clearToken: () => {}}),
}));
// An empty card list; the rest of the bridge stays real.
vi.mock('../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app-bridge')>()),
  useCardDataContext: () => ({cards: []}),
}));

// The pages whose whole body sits behind the token gate. /calibration writes
// too, but only its tuning aside is gated: its page tests and router.test.tsx's
// WRITE_PAGES cases cover it.
const PAGES: Array<[title: string, Page: ComponentType, subtitle: string]> = [
  ['Reveal publisher', RevealPage, 'Add a newly revealed card to the preview set.'],
  ['Card images', ImagePage, "Replace an existing card's image."],
];

beforeEach(() => {
  // Neither page fetches on mount. A fetch that slips through stays pending
  // instead of reaching the network.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  saved.token = null;
  vi.unstubAllGlobals();
});

// Every page renders under the router in the app.
describe.each(PAGES)('%s', (title, Page, subtitle) => {
  it('renders inside the page layout, which names the branch it writes to', () => {
    saved.token = 'tok';
    render(<Page />, {wrapper: MemoryRouter});
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
  });

  it('leaves Forget token to the sidebar', () => {
    saved.token = 'tok';
    render(<Page />, {wrapper: MemoryRouter});
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it('asks for a token under the same title and branch notice', () => {
    render(<Page />, {wrapper: MemoryRouter});
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub token')).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
  });
});

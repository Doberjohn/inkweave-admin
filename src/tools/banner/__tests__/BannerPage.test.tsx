import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {BannerPage} from '../BannerPage';

const CARD: LorcanaCard = {id: '2983', name: 'Pocahontas', fullName: 'Pocahontas - Guiding the Tribe', cost: 2, ink: 'Amber', inkwell: true, type: 'Character'};

// The card and its synergies come from the app's providers; stand them in.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../app-bridge')>()),
  useCardDataContext: () => ({getCardById: (id: string) => (id === CARD.id ? CARD : undefined), isLoading: false, error: null}),
  usePrecomputedSynergies: () => ({synergies: [], isLoading: false}),
}));

afterEach(() => vi.unstubAllGlobals());

function renderBanner(path = '/banner/2983') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/banner/:cardId" element={<BannerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BannerPage', () => {
  it('renders the stage once the full-size card art is known', async () => {
    const cards = {cards: [{id: 2983, images: {full: 'https://example.test/2983.png'}}]};
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(cards))));
    const {container} = renderBanner();
    await vi.waitFor(() => expect(container.querySelector('.banner-stage')).not.toBeNull());
  });

  it('says so, instead of rendering a banner with missing art, when the card art cannot load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', {status: 502})));
    const {container} = renderBanner();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load full-size card art');
    expect(container.querySelector('.banner-stage')).toBeNull();
  });

  it('names an unknown card id instead of loading forever', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({cards: []}))));
    renderBanner('/banner/9999');
    expect(await screen.findByRole('alert')).toHaveTextContent('No card has the id 9999.');
  });
});

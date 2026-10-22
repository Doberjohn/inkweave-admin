import {describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {EditingBanner} from '../components/EditingBanner';
import {URSULA_SET_3, URSULA_SET_9, YEN_SID} from '../finishes/__tests__/finishFixtures';
import {PREVIEW_ENTRY, RELEASED_CARD, cardOf, studioCard} from '../studioFixtures';

const MEI = cardOf(PREVIEW_ENTRY);

type BannerProps = Parameters<typeof EditingBanner>[0];

/** The banner's links are router Links. */
function renderBanner(overrides: Partial<BannerProps> = {}) {
  render(
    <MemoryRouter>
      <EditingBanner card={MEI} tag="Preview" deployed {...overrides} />
    </MemoryRouter>,
  );
}

function handoffOf(pending: boolean): FocusHandoff {
  return {pending, request: vi.fn(), done: vi.fn()};
}

describe('EditingBanner', () => {
  it('says which card is open in an h2, with its collector number and tag', () => {
    renderBanner();
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Mei Red Panda'})).toBeInTheDocument();
    expect(screen.getByText(`#${MEI.setNumber}`).tagName).toBe('CODE');
    expect(screen.getByText('preview')).toBeInTheDocument();
  });

  it("links to the card's analytics and back to the search, as data links (adm-link)", () => {
    renderBanner();
    const analytics = screen.getByRole('link', {name: 'View card analytics'});
    expect(analytics).toHaveAttribute('href', `/cards/${MEI.id}`);
    expect(analytics).toHaveClass('adm-link');
    const back = screen.getByRole('link', {name: 'Load a different card'});
    expect(back).toHaveAttribute('href', '/studio?mode=edit');
    expect(back).toHaveClass('adm-link');
  });

  it('leaves out View card analytics for a card only the branch file holds, and marks it (R-33, R-66)', () => {
    renderBanner({deployed: false});
    expect(screen.queryByRole('link', {name: 'View card analytics'})).not.toBeInTheDocument();
    expect(screen.getByText('not deployed yet')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Load a different card'})).toBeInTheDocument();
  });

  // Card analytics reads the card list, which holds Core cards alone: its page for a card of Sets 1 to 8 says it rotated out.
  it('leaves out View card analytics for a card of Sets 1 to 8, which Card analytics has no page for (#68)', () => {
    renderBanner({card: YEN_SID, tag: 'Released'});
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Yen Sid Powerful Sorcerer'})).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'View card analytics'})).not.toBeInTheDocument();
    // It is deployed all the same: inkweave.ink serves it.
    expect(screen.queryByText('not deployed yet')).not.toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Load a different card'})).toBeInTheDocument();
  });

  // Ursula - Deceiver is #90 in Set 3 and in Set 9: the banner names the set as the search row does (#68).
  it('prints the set before the number of a card of Sets 1 to 8, so it tells from its Core reprint', () => {
    renderBanner({card: URSULA_SET_3, tag: 'Released'});
    expect(screen.getByText('Set 3 · #90').tagName).toBe('CODE');
    cleanup();

    renderBanner({card: URSULA_SET_9, tag: 'Released'});
    expect(screen.getByText('#90').tagName).toBe('CODE');
    expect(screen.queryByText(/^Set /)).not.toBeInTheDocument();
  });

  it('tags a released card', () => {
    renderBanner({card: RELEASED_CARD, tag: 'Released'});
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Lantern Keeper Night Watch'})).toBeInTheDocument();
    expect(screen.getByText('released')).toHaveAttribute('title', 'Its data comes from LorcanaJSON');
  });

  it('reads a card with no version or collector number', () => {
    renderBanner({card: studioCard({id: '2001', name: 'Magic Mirror'}), tag: 'Released'});
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Magic Mirror'})).toBeInTheDocument();
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
  });

  it("stops its translucent fill at its bottom border, as a panel's fill stops at its border", () => {
    renderBanner();
    const banner = screen.getByRole('heading', {level: 2}).parentElement!.parentElement!;
    expect(banner).toHaveStyle({backgroundClip: 'padding-box'});
  });

  it('gives a pending focus handoff to its h2 (R-59)', () => {
    const handoff = handoffOf(true);
    renderBanner({handoff});
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Mei Red Panda'})).toHaveFocus();
    expect(handoff.done).toHaveBeenCalled();
  });
});

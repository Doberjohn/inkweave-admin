import {afterEach, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {ArtLink} from '../ArtLink';
import {ART_HEIGHT} from '../artPlacement';
import {ART_OPEN_DELAY_MS} from '../useArtPreview';

const ART = '/card-images/en/set14/63_un-poco-loco.jpg';
const MOUSE = {pointerType: 'mouse'};
const TOUCH = {pointerType: 'touch'};

/** `null` renders the link without art. */
function renderLink(art: string | null = ART) {
  return render(
    <MemoryRouter>
      <p>
        <ArtLink to="/cards/3328" art={art ?? undefined}>
          Un Poco Loco
        </ArtLink>{' '}
        <a href="/elsewhere">Next</a>
      </p>
    </MemoryRouter>,
  );
}

const link = () => screen.getByRole('link', {name: 'Un Poco Loco'});
/** The preview's image: alt-less decoration, so it has no role to find it by. */
const art = () => document.body.querySelector<HTMLImageElement>(`img[src="${ART}"]`);
const preview = () => art()?.parentElement;

describe('ArtLink', () => {
  it('is a data link (adm-link) to its page', () => {
    renderLink();
    expect(link()).toHaveAttribute('href', '/cards/3328');
    expect(link()).toHaveClass('adm-link');
  });

  // Fake timers time the rest exactly. user-event waits on a timer of its own after each
  // action, which Testing Library advances only under Jest's, so these fire events directly.
  describe('under a pointer', () => {
    const wait = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms);
      });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows its art once the pointer has rested on it, and hides it when the pointer leaves', () => {
      renderLink();
      fireEvent.pointerEnter(link(), MOUSE);
      wait(ART_OPEN_DELAY_MS - 1);
      expect(art()).toBeNull();
      wait(1);
      expect(art()).not.toBeNull();

      fireEvent.pointerLeave(link(), MOUSE);
      expect(art()).toBeNull();
    });

    it('shows nothing for a pointer that passes over it, as one sweeping down a list does', () => {
      renderLink();
      fireEvent.pointerEnter(link(), MOUSE);
      wait(ART_OPEN_DELAY_MS / 2);
      fireEvent.pointerLeave(link(), MOUSE);
      wait(ART_OPEN_DELAY_MS);
      expect(art()).toBeNull();
    });

    it('shows nothing for a touch, whose tap follows the link', () => {
      renderLink();
      fireEvent.pointerEnter(link(), TOUCH);
      wait(ART_OPEN_DELAY_MS);
      expect(art()).toBeNull();
    });

    it('is a plain data link without art, and previews nothing', () => {
      renderLink(null);
      expect(link()).toHaveClass('adm-link');
      fireEvent.pointerEnter(link(), MOUSE);
      wait(ART_OPEN_DELAY_MS);
      act(() => link().focus());
      expect(document.body.querySelector('img')).toBeNull();
    });
  });

  it('shows its art at once on keyboard focus, and hides it when focus moves on', async () => {
    const user = userEvent.setup();
    renderLink();
    await user.tab();
    expect(link()).toHaveFocus();
    expect(art()).not.toBeNull();

    await user.tab();
    expect(art()).toBeNull();
  });

  it("doesn't show it for the focus a click gives, which would hold it open once the pointer left", () => {
    renderLink();
    fireEvent.pointerDown(link(), MOUSE);
    act(() => link().focus());
    fireEvent.pointerUp(link(), MOUSE);
    expect(link()).toHaveFocus();
    expect(art()).toBeNull();

    // Released, the next keyboard focus shows it.
    act(() => link().blur());
    act(() => link().focus());
    expect(art()).not.toBeNull();
  });

  // A browser sends a tap's mouse events, and with them its focus, after the touch ends.
  it("doesn't show it for the focus a tap gives, which comes after the touch ends", () => {
    renderLink();
    fireEvent.pointerDown(link(), TOUCH);
    fireEvent.pointerUp(link(), TOUCH);
    act(() => link().focus());
    expect(art()).toBeNull();

    // The tap's click ends it: the next keyboard focus shows the art.
    fireEvent.click(link());
    act(() => link().blur());
    act(() => link().focus());
    expect(art()).not.toBeNull();
  });

  it('shows it on keyboard focus after a press the browser cancelled, as it does a touch that turns into a scroll', () => {
    renderLink();
    fireEvent.pointerDown(link(), TOUCH);
    fireEvent.pointerCancel(link(), TOUCH);
    act(() => link().focus());
    expect(art()).not.toBeNull();
  });

  it('hides it on Escape, leaving focus on the link, before anything under it hears the key', async () => {
    const user = userEvent.setup();
    renderLink();
    await user.tab();
    const heard = vi.fn();
    document.addEventListener('keydown', heard);
    onTestFinished(() => document.removeEventListener('keydown', heard));
    await user.keyboard('{Escape}');
    expect(art()).toBeNull();
    expect(link()).toHaveFocus();
    expect(heard).not.toHaveBeenCalled();

    // Hidden, the next Escape goes on to the page: a dialog underneath closes on it.
    await user.keyboard('{Escape}');
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('draws it outside the link, hidden from assistive tech and taking no pointer, so the link reads as before', async () => {
    const user = userEvent.setup();
    renderLink();
    await user.tab();
    expect(preview()?.parentElement).toBe(document.body);
    expect(preview()).toHaveAttribute('aria-hidden', 'true');
    expect(preview()).toHaveStyle({position: 'fixed', pointerEvents: 'none', boxSizing: 'border-box'});
    expect(art()).toHaveAttribute('alt', '');
    expect(link()).toHaveAccessibleName('Un Poco Loco');
  });

  it('places it above the link, at its left edge, as artPlacement says, and moves it with the link on a scroll', async () => {
    const user = userEvent.setup();
    const {container} = renderLink();
    const box = vi.spyOn(link(), 'getBoundingClientRect');
    box.mockReturnValue(DOMRect.fromRect({x: 300, y: 400, width: 80, height: 20}));
    await user.tab();
    expect(preview()).toHaveStyle({top: `${400 - 8 - ART_HEIGHT}px`, left: '300px'});

    // A scroll inside any box moves it: the listener captures on window.
    box.mockReturnValue(DOMRect.fromRect({x: 300, y: 500, width: 80, height: 20}));
    fireEvent.scroll(container.firstElementChild!);
    expect(preview()).toHaveStyle({top: `${500 - 8 - ART_HEIGHT}px`});
  });

  it('takes the art away while its focused link is scrolled out of the window, and brings it back with the link', async () => {
    const user = userEvent.setup();
    const {container} = renderLink();
    const box = vi.spyOn(link(), 'getBoundingClientRect');
    box.mockReturnValue(DOMRect.fromRect({x: 300, y: 400, width: 80, height: 20}));
    await user.tab();
    expect(art()).not.toBeNull();

    box.mockReturnValue(DOMRect.fromRect({x: 300, y: -100, width: 80, height: 20}));
    fireEvent.scroll(container.firstElementChild!);
    expect(art()).toBeNull();
    expect(link()).toHaveFocus();

    box.mockReturnValue(DOMRect.fromRect({x: 300, y: 400, width: 80, height: 20}));
    fireEvent.scroll(container.firstElementChild!);
    expect(art()).not.toBeNull();
  });

  it('takes the art away while a box that scrolls round the link hides it, though the window still holds it', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <div data-testid="page-body" style={{overflowY: 'auto'}}>
          <ArtLink to="/cards/3328" art={ART}>
            Un Poco Loco
          </ArtLink>
        </div>
      </MemoryRouter>,
    );
    const body = screen.getByTestId('page-body');
    vi.spyOn(body, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({x: 240, y: 64, width: 784, height: 704}));
    const box = vi.spyOn(link(), 'getBoundingClientRect');
    box.mockReturnValue(DOMRect.fromRect({x: 300, y: 400, width: 80, height: 20}));
    await user.tab();
    expect(art()).not.toBeNull();

    // Scrolled up under the page's header: out of its body, in the window still.
    box.mockReturnValue(DOMRect.fromRect({x: 300, y: 20, width: 80, height: 20}));
    fireEvent.scroll(body);
    expect(art()).toBeNull();
  });

  it('takes the preview away when its art fails to load', async () => {
    const user = userEvent.setup();
    renderLink();
    await user.tab();
    fireEvent.error(art()!);
    expect(art()).toBeNull();
    expect(link()).toHaveFocus();
  });
});

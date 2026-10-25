import {useState} from 'react';
import {NavigationType, useLocation, useNavigationType} from 'react-router-dom';
import {useCardDataContext} from '../../app-bridge';
import {useFocusHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import type {StudioMode} from '../../shell/nav';
import {studioCardOf, studioModeOf} from './studioPaths';

/** What the studio's focus handoff watches: the mode and card the URL names, and whether the card list has failed. */
export interface StudioWatch {
  mode: StudioMode;
  cardId: string | null;
  failed: boolean;
}

/**
 * Whether the move from `before` to `now` leaves focus for the next view to
 * take (R-59, after R3's asksForFocus). Three moves do: the card list's error
 * clearing, which only Retry does, and the URL naming another card or none, or
 * another mode, unless a redirect did it (`replaced`), which is no one's
 * action. A mode change asks for New card's Edit a card instead, which goes
 * with its step; pressed on the mode switch, it moves nothing, since a view
 * takes the handoff by moving focus only from <body> (useTakeHandoff).
 */
export function asksForFocus(before: StudioWatch, now: StudioWatch & {replaced: boolean}): boolean {
  if (before.failed && !now.failed) return true;
  if (now.replaced) return false;
  return now.cardId !== before.cardId || now.mode !== before.mode;
}

/**
 * Where the page starts watching from: no card, when another page's link
 * pushed it here, as Card analytics starts (#34). That link went with its
 * page, so the card it opens takes focus ("Edit in Card studio", R-82); the
 * mode it opens asks for nothing of its own. A load, Back or a redirect starts
 * from what the URL names, and asks for nothing.
 */
function arrival(watched: StudioWatch, navigation: NavigationType): StudioWatch {
  return navigation === NavigationType.Push ? {mode: watched.mode, cardId: null, failed: false} : watched;
}

/** Whether the URL's mode or card, or the card list's failure, changed since the page last looked. */
function moved(seen: StudioWatch, now: StudioWatch): boolean {
  return seen.mode !== now.mode || seen.cardId !== now.cardId || seen.failed !== now.failed;
}

/**
 * Card studio's one focus handoff (R-59, R-48). StudioPage holds it, above the
 * gate, so Save token can ask for it before the workspace mounts. It also asks
 * when the URL's mode or card changes and when the card list's Retry lands: during
 * render, from what it saw last, as Card analytics' useCardHandoff does
 * (CardAnalyticsPage.tsx:41-50), and from no card when another page's link
 * opened the studio (arrival). Never in a click handler: a router link's
 * navigation renders as a transition, so the old card's view would take a
 * request made on click. The view that replaces the control that went takes
 * it, and moves focus only if focus fell to <body> (useTakeHandoff).
 */
export function useStudioHandoff(): FocusHandoff {
  const handoff = useFocusHandoff();
  const navigation = useNavigationType();
  const replaced = navigation === NavigationType.Replace;
  const location = useLocation();
  const watched: StudioWatch = {
    mode: studioModeOf(location),
    cardId: studioCardOf(location),
    failed: useCardDataContext().error !== null,
  };
  const [seen, setSeen] = useState(() => arrival(watched, navigation));
  if (moved(seen, watched)) {
    setSeen(watched);
    if (asksForFocus(seen, {...watched, replaced})) handoff.request();
  }
  return handoff;
}

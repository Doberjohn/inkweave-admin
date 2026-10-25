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

/** How the URL last moved: by a redirect (`replaced`), or by a push that carried HANDOFF_STATE (`handsOver`). */
export interface StudioMove {
  replaced: boolean;
  handsOver: boolean;
}

/**
 * The state a navigation into another mode carries when the control pressed
 * goes with the view it leaves, so the view it opens takes focus: New card's
 * Edit a card instead (R-48). The mode switch stays on screen, so it carries
 * none.
 */
export const HANDOFF_STATE = {studioHandoff: true} as const;

/** Whether a location's state is HANDOFF_STATE. */
function carriesHandoff(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'studioHandoff' in state;
}

/**
 * Whether the move from `before` to `now` leaves focus for the next view to
 * take (R-59, after R3's asksForFocus). Three moves do: the card list's error
 * clearing, which only Retry does; the URL naming another card or none; and
 * another mode, pushed with HANDOFF_STATE by a control that went with its
 * view. A redirect (`replaced`) is no one's action, so it asks for none. The
 * mode switch never asks: Safari, and Firefox on macOS, focus no button a
 * click presses, so focus would still be on <body> and the next view would
 * take it (useTakeHandoff).
 */
export function asksForFocus(before: StudioWatch, now: StudioWatch & StudioMove): boolean {
  if (before.failed && !now.failed) return true;
  if (now.replaced) return false;
  return now.cardId !== before.cardId || (now.handsOver && now.mode !== before.mode);
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
 * Card studio's page handoff (R-59, R-48). StudioPage holds it, above the
 * gate, so Save token can ask for it before the workspace mounts. It also asks
 * when the URL's card changes, or its mode by Edit a card instead, and when
 * the card list's Retry lands: during render, from what it saw last, as Card
 * analytics' useCardHandoff does (CardAnalyticsPage.tsx:41-50), and from no
 * card when another page's link opened the studio (arrival). Never in a click
 * handler: a router link's navigation renders as a transition, so the old
 * card's view would take a request made on click. The view that replaces the
 * control that went takes it, and moves focus only if focus fell to <body>
 * (useTakeHandoff). New card's step swap has its own (useNewCardStep).
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
  // Back and Forward return to an entry Edit a card instead pushed, state and all, but move nothing.
  const handsOver = navigation === NavigationType.Push && carriesHandoff(location.state);
  const [seen, setSeen] = useState(() => arrival(watched, navigation));
  if (moved(seen, watched)) {
    setSeen(watched);
    if (asksForFocus(seen, {...watched, replaced, handsOver})) handoff.request();
  }
  return handoff;
}

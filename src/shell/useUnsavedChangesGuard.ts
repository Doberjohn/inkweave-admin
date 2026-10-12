import {useEffect} from 'react';
import {useBlocker, type Blocker, type Location} from 'react-router-dom';

/** What a page with unsaved edits needs to ask before they are lost. */
export interface UnsavedChangesGuardState {
  /** A navigation to another page is on hold until stay() or leave(). */
  blocked: boolean;
  /** Where the held navigation goes, while one is held; null otherwise. A page can word its question for it (R-58). */
  to: Location | null;
  /** Cancels the held navigation: the page stays, edits and all. */
  stay: () => void;
  /** Lets the held navigation through, and the edits are lost. */
  leave: () => void;
}

/** Whether a navigation from one location to another leaves what the page guards. */
export type LeavesPage = (from: Location, to: Location) => boolean;

/** The default: only a new pathname leaves, so ?rule= and other search changes keep the page. */
const toAnotherPath: LeavesPage = (from, to) => from.pathname !== to.pathname;

/** Where the blocker holds a navigation to, while it holds one. */
function heldTarget(blocker: Blocker): Location | null {
  return blocker.state === 'blocked' ? blocker.location : null;
}

/**
 * Guards unsaved edits (decision R-19). While `dirty`:
 * - a navigation that leaves (a sidebar link, the browser's Back) is held
 *   until the page answers with stay() or leave(). By default only a new
 *   pathname leaves: the same page with other search params (?rule=) keeps
 *   its state, so it is never held. A page whose search holds what it edits
 *   (R4's ?card=) passes its own `leaves`;
 * - while a navigation is held, `to` says where it goes, so a page that loses
 *   only some of its edits to it (R4's studio: a card change drops the Edit
 *   draft, leaving drops both) can say which (R-58);
 * - closing or reloading the tab raises the browser's own prompt, in the
 *   browser's own words.
 *
 * useBlocker needs a data router (the app's createBrowserRouter; in tests,
 * createMemoryRouter), and the router holds one blocker at a time, so a page
 * mounts one guard. Edits that clear while a navigation is held (a publish
 * that lands) end the hold as a stay: the page keeps showing the publish's
 * outcome, and the old navigation never comes back.
 */
export function useUnsavedChangesGuard(dirty: boolean, leaves: LeavesPage = toAnotherPath): UnsavedChangesGuardState {
  const blocker = useBlocker(({currentLocation, nextLocation}) => dirty && leaves(currentLocation, nextLocation));

  // A hold with nothing left to lose ends, as react-router's own usePrompt ends it.
  useEffect(() => {
    if (blocker.state === 'blocked' && !dirty) blocker.reset();
  }, [blocker, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome and Edge before 119 prompt only for a truthy returnValue.
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // `dirty` too, so the render where the edits clear already shows no question and names no target.
  const to = dirty ? heldTarget(blocker) : null;
  return {
    blocked: to !== null,
    to,
    stay: () => blocker.reset?.(),
    leave: () => blocker.proceed?.(),
  };
}

import {useEffect, useState, type RefObject} from 'react';

/**
 * Focus waiting for the view that replaces the control pressed (R2's F2;
 * R-48). An action that unmounts its own button would drop focus to <body>, so
 * a component that outlives the swap holds the handoff and asks for it, and
 * the view that replaces the button takes it. On /calibration the page holds
 * it, since a token change remounts the tuning aside: saving or forgetting a
 * token, and reading tuning.json again, hand focus to the aside's next view,
 * and reading again asks only once a read lands, so a failed read leaves none
 * waiting. Moved from calibration/ (R3-1a), so other pages can use it.
 */
export interface FocusHandoff {
  /** Asked for, and no view has taken it yet. */
  pending: boolean;
  request: () => void;
  /** The view that took it, whether or not it moved focus. */
  done: () => void;
}

export function useFocusHandoff(): FocusHandoff {
  const [pending, setPending] = useState(false);
  return {pending, request: () => setPending(true), done: () => setPending(false)};
}

/**
 * Whether focus is still where an action left it: on `from`, or on <body>
 * because the control that had it unmounted. Anywhere else, the user moved it
 * while the action ran, and it stays there.
 */
export function focusUnmoved(from: Element | null = null): boolean {
  const now = document.activeElement;
  return now === null || now === document.body || now === from;
}

/**
 * Takes a pending handoff once `ready`: focuses the first `selector` in
 * `container`, unless the user moved focus meanwhile, and marks it done.
 */
export function useTakeHandoff(
  handoff: FocusHandoff | undefined,
  container: RefObject<HTMLElement | null>,
  selector: string,
  ready = true,
) {
  const take = ready && handoff?.pending === true;
  useEffect(() => {
    if (!take) return;
    if (focusUnmoved()) container.current?.querySelector<HTMLElement>(selector)?.focus();
    handoff?.done();
  }, [take, handoff, container, selector]);
}

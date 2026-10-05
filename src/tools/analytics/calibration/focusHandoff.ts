import {useEffect, useState, type RefObject} from 'react';

/**
 * Focus waiting for the tuning aside's next view (F2). Saving or forgetting a
 * token, and reading tuning.json again, unmount the button pressed, so focus
 * would fall to <body>. The page holds the handoff, since a token change
 * remounts the aside, and the view that replaces the button takes it.
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

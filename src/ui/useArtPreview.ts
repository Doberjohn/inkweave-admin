import {useEffect, useRef, useState, type PointerEvent} from 'react';

/**
 * How long the pointer rests on a link before its art shows: long enough that
 * a pointer sweeping down a list of names opens none of them.
 */
export const ART_OPEN_DELAY_MS = 150;

/**
 * The events that end a pointer press, after which a focus is the keyboard's
 * again. A mouse's press ends at its release: the link takes focus as it is
 * pressed, or never in Safari, so the press can't wait for that focus. A
 * touch's focus comes after its release, with the mouse events a browser
 * sends once the touch ends, so a touch's press, and a pen's, ends at its
 * click. A press the browser cancels (a touch that turns into a scroll) ends
 * at once.
 */
function pressEnds(pointerType: string): string[] {
  return [pointerType === 'mouse' ? 'pointerup' : 'click', 'pointercancel'];
}

/**
 * An art preview's open state, the app's tooltip contract for a popover that
 * takes no pointer (the app's overlays.md, and its useTooltip): it opens once
 * a mouse or pen rests on the link for ART_OPEN_DELAY_MS, and at once on
 * keyboard focus; it closes when both have left; and Escape hides it, leaving
 * focus where it is. A touch opens nothing: the tap follows the link.
 *
 * The focus a pointer press gives doesn't open it, as in useTooltip: the
 * pointer already does, and a clicked link would otherwise keep its art over
 * the page once the pointer moved on. Spread `triggerProps` on the link.
 */
export function useArtPreview() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pressing = useRef(false);
  const open = hovered || focused;

  // In the capture phase on document, so the first Escape hides the art and a
  // dialog underneath closes only on the next, as useTooltip does.
  useEffect(() => {
    if (!open) return;
    const hideOnEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setHovered(false);
      setFocused(false);
    };
    document.addEventListener('keydown', hideOnEscape, true);
    return () => document.removeEventListener('keydown', hideOnEscape, true);
  }, [open]);

  useEffect(() => () => clearTimeout(openTimer.current), []);

  return {
    open,
    triggerProps: {
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        clearTimeout(openTimer.current);
        openTimer.current = setTimeout(() => setHovered(true), ART_OPEN_DELAY_MS);
      },
      onPointerLeave: () => {
        clearTimeout(openTimer.current);
        setHovered(false);
      },
      onPointerDown: (e: PointerEvent) => {
        pressing.current = true;
        const ended = new AbortController();
        const release = () => {
          pressing.current = false;
          ended.abort();
        };
        for (const type of pressEnds(e.pointerType)) document.addEventListener(type, release, {signal: ended.signal});
      },
      onFocus: () => {
        if (!pressing.current) setFocused(true);
      },
      onBlur: () => setFocused(false),
    },
  };
}

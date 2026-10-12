/** The narrowest studio that fits the form's sections side by side with the card panel. */
export const STUDIO_WIDE_MIN = 1360;

/** Wide: every form section open, beside the card. Narrow: an accordion, one section open at a time. */
export type StudioLayout = 'wide' | 'narrow';

/** The layout for the studio's measured width; 0, before it is measured, is narrow. */
export function studioLayout(width: number): StudioLayout {
  return width >= STUDIO_WIDE_MIN ? 'wide' : 'narrow';
}

import type {ReactNode} from 'react';
import {STUDIO_SLOT_ORDER, type StudioLayout, type StudioSlot} from '../studioLayout';
import {STUDIO_SLOT} from '../studioStyles';

interface StudioSlotsProps {
  layout: StudioLayout;
  /** What each region holds: the card panel, the form and the aside. */
  slots: Readonly<Record<StudioSlot, ReactNode>>;
}

/**
 * A pane's three regions, in the DOM order the layout reads in (R-63): the card
 * first when wide, where it is the first column, and the form first when
 * narrow, as the handoff orders them. Each is keyed by its region, so a layout
 * switch moves it, state and all, instead of remounting it. They render
 * straight into StudioWorkspace's measured root, whose grid or flex-wrap
 * places them (STUDIO_GRID, STUDIO_SLOT).
 */
export function StudioSlots({layout, slots}: StudioSlotsProps) {
  return (
    <>
      {STUDIO_SLOT_ORDER[layout].map((slot) => (
        <div key={slot} style={STUDIO_SLOT[layout][slot]}>
          {slots[slot]}
        </div>
      ))}
    </>
  );
}

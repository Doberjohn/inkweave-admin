import type {CSSProperties} from 'react';
import {DISABLED_STYLE} from '../../../app-bridge';
import type {NewCardSet} from '../newCardSets';

/** The boxes New card draws a set's logo in: the open set's tile, the set bar, and a closed set's row. */
const BOXES = {
  tile: {width: 140, height: 72},
  bar: {width: 104, height: 56},
  row: {width: 56, height: 32},
} as const;

/** Which of New card's places the logo is for. */
export type SetLogoSize = keyof typeof BOXES;

const BOX: CSSProperties = {flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'};
const IMAGE: CSSProperties = {maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'};
// A set that takes no new card: its logo dimmed as the kit dims a control that's off.
const FADED_IMAGE: CSSProperties = {...IMAGE, opacity: DISABLED_STYLE.opacity};

interface SetLogoProps {
  set: NewCardSet;
  size: SetLogoSize;
  /** A set that takes no new card. */
  faded?: boolean;
}

/**
 * A set's logo from /art/sets/ (forwarded to inkweave.ink), scaled into its
 * box. The set's name is always beside it, so the image says nothing (alt="").
 * A set without a logo keeps its empty box, so the names beside line up.
 */
export function SetLogo({set, size, faded = false}: SetLogoProps) {
  return (
    <span style={{...BOX, ...BOXES[size]}}>
      {set.logo !== undefined && <img src={set.logo} alt="" decoding="async" style={faded ? FADED_IMAGE : IMAGE} />}
    </span>
  );
}

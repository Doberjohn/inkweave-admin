import {useState, type ChangeEvent} from 'react';

// Visually hidden but still focusable, so keyboard users can tab to it and open
// the picker with Space/Enter. display:none would drop it from the tab order,
// and some browsers refuse to open a display:none file input from a label click.
const SR_ONLY_INPUT = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

/**
 * Props for a visually hidden file input inside a clickable tile, and whether
 * it has focus: the input is invisible, so the tile shows the focus ring.
 * Picking a file empties the input, so choosing the same file again (say, for
 * the next card) still fires onChange.
 */
export function useHiddenFileInput(onFile: (file: File | null) => void) {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    inputProps: {
      type: 'file',
      style: SR_ONLY_INPUT,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        onFile(e.target.files?.[0] ?? null);
        e.target.value = '';
      },
    },
  };
}

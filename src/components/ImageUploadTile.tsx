import {COLORS, EMPTY_BOX, FONT_SIZES, GOLD_GLOW, RADIUS} from '../app-bridge';
import {useHiddenFileInput} from './useHiddenFileInput';

interface ImageUploadTileProps {
  /** Preview URL for the chosen image (data URL), or null when none chosen. */
  imageUrl: string | null;
  onImageChange: (file: File | null) => void;
  /** File-input accept list. */
  accept?: string;
  width?: number;
  height?: number;
}

const ACCEPT_DEFAULT = 'image/jpeg,image/png,image/webp';

/**
 * A clickable image drop-tile: the whole box is a <label> wrapping a hidden file
 * input, so clicking (or keyboard-activating) it opens the native picker. Shows
 * the chosen image as a thumbnail, or a "click to choose" prompt when empty. The
 * tile carries the kit's focus ring while its input has focus.
 */
export function ImageUploadTile({
  imageUrl,
  onImageChange,
  accept = ACCEPT_DEFAULT,
  width = 160,
  height = 223,
}: ImageUploadTileProps) {
  const {focused, inputProps} = useHiddenFileInput(onImageChange);
  return (
    <label
      style={{
        ...EMPTY_BOX,
        position: 'relative',
        width,
        height,
        borderRadius: RADIUS.sm,
        background: COLORS.surfaceAlt,
        fontSize: FONT_SIZES.xs,
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: focused ? GOLD_GLOW.focusRing : undefined,
      }}>
      <input {...inputProps} accept={accept} aria-label="Choose image" />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Selected upload preview"
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      ) : (
        <span style={{padding: 8}}>Click to choose image</span>
      )}
    </label>
  );
}

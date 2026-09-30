import type {LorcanaCard} from 'inkweave-synergy-engine';
import {
  CardTile,
  CardTranslationPanel,
  COLORS,
  EMPTY_BOX,
  GOLD_GLOW,
  SPACING,
  FONT_SIZES,
  RADIUS,
} from '../../../app-bridge';
import {useHiddenFileInput} from '../../../components/useHiddenFileInput';

const ACCEPT = 'image/jpeg,image/png,image/webp';

interface CardPreviewPanelProps {
  /** The transformed card, or null when required fields are missing. */
  card: LorcanaCard | null;
  /**
   * Choosing a file uploads the card art. The preview doubles as the upload
   * control: the whole image area is a click target for choosing/replacing art.
   */
  onImageChange: (file: File | null) => void;
}

export function CardPreviewPanel({card, onImageChange}: CardPreviewPanelProps) {
  const {focused, inputProps} = useHiddenFileInput(onImageChange);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm, maxWidth: 240}}>
      <div style={{position: 'relative'}}>
        {card ? (
          <CardTile card={card} isSelected={false} />
        ) : (
          <div
            style={{
              ...EMPTY_BOX,
              aspectRatio: '0.72',
              padding: SPACING.md,
              borderRadius: RADIUS.xl,
              background: COLORS.surfaceAlt,
              fontSize: FONT_SIZES.sm,
            }}>
            Click to upload card art
          </div>
        )}
        <label
          style={{
            position: 'absolute',
            inset: 0,
            cursor: 'pointer',
            borderRadius: RADIUS.xl,
            boxShadow: focused ? GOLD_GLOW.focusRing : undefined,
          }}>
          <input {...inputProps} accept={ACCEPT} aria-label="Upload card art" />
        </label>
      </div>
      {card ? (
        <div style={{color: COLORS.text, fontSize: FONT_SIZES.sm}}>
          <strong>{card.fullName}</strong>
          <div style={{color: COLORS.gray600}}>
            {card.ink}
            {card.ink2 ? `-${card.ink2}` : ''} · {card.type} · cost {card.cost}
          </div>
          <div style={{color: COLORS.gray600, fontSize: FONT_SIZES.xs, marginTop: 4}}>
            Click the image to change it.
          </div>
          {/* What the app's "See translation" toggle lays over the scan. */}
          {card.scanLanguage && (
            <CardTranslationPanel card={card} size="compact" style={{marginTop: SPACING.sm, borderRadius: RADIUS.md}} />
          )}
        </div>
      ) : (
        <div style={{color: COLORS.gray600, fontSize: FONT_SIZES.sm}}>
          Fill in name, ink, and type to preview the card.
        </div>
      )}
    </div>
  );
}

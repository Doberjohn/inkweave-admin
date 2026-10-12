import {useId, useRef, type CSSProperties} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {
  CardTile,
  CardTranslationPanel,
  COLORS,
  FONTS,
  InkIcon,
  LinkButton,
  SPACING,
  smallImageUrl,
} from '../../../app-bridge';
import {useHiddenFileInput} from '../../../components/useHiddenFileInput';
import type {StudioMode} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {
  IMAGE_ACCEPT,
  IMAGE_FORMATS,
  fileDescription,
  frameState,
  hasPreview,
  pillCaption,
  stagedNote,
  type FrameState,
  type ImageNoteIds,
  type ImageSlot,
  type StagedImage,
} from '../cardPanel';
import type {StudioLayout} from '../studioLayout';
import {ERROR_TEXT, HINT, STUDIO_PANEL} from '../studioStyles';

/** The preview's widest, by layout (handoff README §7: 320px wide, 280px narrow). */
const PREVIEW_MAX: Readonly<Record<StudioLayout, number>> = {wide: 320, narrow: 280};
/** CardTile's own proportions, so the stripes and the card take the same box. */
const CARD_ASPECT = '0.72';
const STRIPE = 10;
const ICON_SIZE = 18;
/** The current art's thumbnail: the card header's 64 × 90 (CardHeader.tsx:8-10), a card's proportions. */
const THUMB_WIDTH = 64;
const THUMB_HEIGHT = 90;

const PANEL: CSSProperties = {
  ...STUDIO_PANEL,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: SPACING.lg,
  padding: `${SPACING.xxl}px ${SPACING.xl}px`,
};
// No overflow clip here: the file control's ring sits 2px outside the frame.
const FRAME: CSSProperties = {position: 'relative', width: '100%'};
const PICTURE: CSSProperties = {borderRadius: ADMIN_RADIUS.preview, overflow: 'hidden'};
const FRAME_BORDER: Readonly<Record<FrameState, string>> = {
  empty: `1px dashed ${ADMIN_COLORS.strongBorder}`,
  current: `1px solid ${ADMIN_COLORS.inputBorder}`,
  staged: `1px solid ${ADMIN_COLORS.accentStrong}`,
};
const STRIPES: CSSProperties = {
  aspectRatio: CARD_ASPECT,
  background: `repeating-linear-gradient(135deg, ${ADMIN_COLORS.card} 0 ${STRIPE}px, ${ADMIN_COLORS.rowHover} ${STRIPE}px ${2 * STRIPE}px)`,
};
const PILL: CSSProperties = {
  position: 'relative',
  margin: SPACING.md,
  padding: `${SPACING.xs}px ${SPACING.md}px`,
  borderRadius: ADMIN_RADIUS.pill,
  background: COLORS.scrimHeavy,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.text,
};
const CENTRED: CSSProperties = {textAlign: 'center', maxWidth: PREVIEW_MAX.wide};
const CAPTION: CSSProperties = {display: 'grid', gap: SPACING.xs, justifyItems: 'center', textAlign: 'center'};
const NAME: CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  lineHeight: 1.2,
  color: ADMIN_COLORS.text,
};
const SUBLINE: CSSProperties = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.sm,
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};
const TRANSLATION: CSSProperties = {width: '100%', borderRadius: ADMIN_RADIUS.box};
const ACTIONS: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: SPACING.md};
const STAGED: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md, maxWidth: PREVIEW_MAX.wide};
const FIGURE: CSSProperties = {margin: 0, flex: 'none', display: 'grid', gap: SPACING.xs, justifyItems: 'center'};
const THUMB: CSSProperties = {objectFit: 'cover', borderRadius: ADMIN_RADIUS.box, border: `1px solid ${ADMIN_COLORS.inputBorder}`};

/** How the file controls report: who takes the file, and what describes them. */
interface FileWiring {
  onFile: (file: File | null) => void;
  describedBy: string;
  invalid: boolean;
}

/** The hidden input's own props: the accept list, the description, and aria-invalid while there is an error. */
function fileInputProps(wiring: FileWiring) {
  return {accept: IMAGE_ACCEPT, 'aria-describedby': wiring.describedBy, 'aria-invalid': wiring.invalid || undefined};
}

/** The pill over the preview: a <label> round a visually hidden file input, which carries the focus. */
function FileCover({caption, wiring}: {caption: string; wiring: FileWiring}) {
  const {focused, inputProps} = useHiddenFileInput(wiring.onFile);
  return (
    <label className="adm-file-cover" data-focused={focused || undefined}>
      <span style={PILL}>{caption}</span>
      <input {...inputProps} {...fileInputProps(wiring)} />
    </label>
  );
}

/** Edit's "Replace card image": the same picker as the preview, as a button (handoff README §7, item 3). */
function ReplaceImage({wiring}: {wiring: FileWiring}) {
  const {focused, inputProps} = useHiddenFileInput(wiring.onFile);
  return (
    <label className="adm-file-btn" data-focused={focused || undefined}>
      Replace card image
      <input {...inputProps} {...fileInputProps(wiring)} />
    </label>
  );
}

/**
 * The card as the app draws it, or the stripes while there is nothing to draw.
 * A picture, never a control: CardTile renders a button, so it takes no Tab
 * stop and sits in an aria-hidden wrapper, and the file control over it is
 * the frame's one stop. Keyed by its art, so art that failed to load doesn't
 * keep the next image from showing (CardTile remembers the failure).
 */
function PreviewPicture({card, state}: {card: LorcanaCard | null; state: FrameState}) {
  return (
    <div aria-hidden="true" style={{...PICTURE, border: FRAME_BORDER[state]}}>
      {hasPreview(card) ? (
        <CardTile key={card.imageUrl ?? ''} card={card} isSelected={false} tabIndex={-1} />
      ) : (
        <div style={STRIPES} />
      )}
    </div>
  );
}

function PreviewFrame({card, slot, layout, wiring}: {card: LorcanaCard | null; slot: ImageSlot; layout: StudioLayout; wiring: FileWiring}) {
  return (
    <div style={{...FRAME, maxWidth: PREVIEW_MAX[layout]}}>
      <PreviewPicture card={card} state={frameState(slot)} />
      <FileCover caption={pillCaption(slot)} wiring={wiring} />
    </div>
  );
}

/** Under the preview (R-89): the name in Tinos, then the version and the inks, named for a screen reader. */
function CardCaption({card}: {card: LorcanaCard | null}) {
  if (!card?.name) return <p style={{...HINT, ...CENTRED}}>Fill in the name to preview the card.</p>;
  return (
    <div style={CAPTION}>
      <p style={NAME}>{card.name}</p>
      <p style={SUBLINE}>
        {card.version}
        <InkIcon ink={card.ink} size={ICON_SIZE} decorative={false} />
        {card.ink2 && <InkIcon ink={card.ink2} size={ICON_SIZE} decorative={false} />}
      </p>
    </div>
  );
}

/** What the app's "See translation" lays over a scan that isn't English. */
function ScanTranslation({card}: {card: LorcanaCard | null}) {
  if (!card?.scanLanguage) return null;
  return <CardTranslationPanel card={card} size="compact" style={TRANSLATION} />;
}

/** The card's art as it stands, beside the note while another image is staged (R-89). */
function CurrentArt({current}: {current: LorcanaCard | null}) {
  const src = current ? smallImageUrl(current) : undefined;
  if (!current || !src) return null;
  return (
    <figure style={FIGURE}>
      <img src={src} alt={`Current art for ${current.fullName}`} width={THUMB_WIDTH} height={THUMB_HEIGHT} style={THUMB} />
      <figcaption style={HINT}>Current</figcaption>
    </figure>
  );
}

function ImageActions({slot, wiring, onRevert}: {slot: ImageSlot; wiring: FileWiring; onRevert: () => void}) {
  return (
    <div style={ACTIONS}>
      {slot.mode === 'edit' && <ReplaceImage wiring={wiring} />}
      {slot.staged.name !== null && (
        <LinkButton type="button" tone="muted" onClick={onRevert} style={{fontSize: ADMIN_TYPE.small}}>
          Revert image
        </LinkButton>
      )}
    </div>
  );
}

/** The formats, the file's error (a polite live region, since the bytes are checked after the pick) and the staged note. */
function ImageNotes({slot, current, ids}: {slot: ImageSlot; current: LorcanaCard | null; ids: ImageNoteIds}) {
  const note = stagedNote(slot);
  return (
    <>
      <p id={ids.hint} style={{...HINT, ...CENTRED}}>
        {IMAGE_FORMATS}
      </p>
      <div aria-live="polite" style={CENTRED}>
        {slot.staged.error !== null && (
          <p id={ids.error} style={ERROR_TEXT}>
            {slot.staged.error}
          </p>
        )}
      </div>
      {note !== null && (
        <div style={STAGED}>
          <CurrentArt current={current} />
          <p style={HINT}>{note}</p>
        </div>
      )}
    </>
  );
}

/** Revert image unmounts itself, so focus moves on first (R-48): to Replace card image in Edit, else the preview's control. */
function focusLastFileControl(root: HTMLElement | null) {
  const inputs = root?.querySelectorAll<HTMLInputElement>('input[type="file"]') ?? [];
  inputs[inputs.length - 1]?.focus();
}

export interface StudioCardPanelProps {
  /** The card as it would publish or save, a staged image in place: the controller's previewCard. */
  card: LorcanaCard | null;
  mode: StudioMode;
  layout: StudioLayout;
  /** The controller's imageName and imageError. */
  staged: StagedImage;
  /** Edit: the card as it stands, whose art the thumbnail shows while an image is staged (R-89). New reveal has none. */
  current?: LorcanaCard | null;
  onImageChange: (file: File | null) => void;
  /** Edit's revertImage. Without it, Revert image clears the file through onImageChange(null), as New reveal does. */
  onRevertImage?: () => void;
}

/**
 * Card studio's card panel (handoff README §7): the app's CardTile render
 * under a click-to-upload pill, the caption, the translation of a scan that
 * isn't English, and the image's controls and notes. Both file controls are
 * useHiddenFileInput labels, so the keyboard reaches them, and both are
 * described by the formats and by the file's error.
 */
export function StudioCardPanel({card, mode, layout, staged, current = null, onImageChange, onRevertImage}: StudioCardPanelProps) {
  const id = useId();
  const ids: ImageNoteIds = {hint: `${id}-hint`, error: `${id}-error`};
  const root = useRef<HTMLElement>(null);
  const slot: ImageSlot = {mode, staged};
  const wiring: FileWiring = {
    onFile: onImageChange,
    describedBy: fileDescription({ids, error: staged.error}),
    invalid: staged.error !== null,
  };
  const revert = () => {
    focusLastFileControl(root.current);
    if (onRevertImage) onRevertImage();
    else onImageChange(null);
  };
  return (
    <section ref={root} aria-label="Card preview" style={PANEL}>
      <PreviewFrame card={card} slot={slot} layout={layout} wiring={wiring} />
      <CardCaption card={card} />
      <ScanTranslation card={card} />
      <ImageActions slot={slot} wiring={wiring} onRevert={revert} />
      <ImageNotes slot={slot} current={current} ids={ids} />
    </section>
  );
}

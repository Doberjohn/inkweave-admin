import {useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import {SHADOWS, Z_INDEX} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS} from '../theme/adminTheme';
import {ART_HEIGHT, ART_WIDTH, artPlacement, type ArtPlace} from './artPlacement';
import {useArtPreview} from './useArtPreview';

/**
 * The preview's frame: opaque, so the page doesn't show through while the art
 * loads, rounded past the black corners a card scan carries, and lifted as
 * the app lifts its previews. It takes no pointer (the app's popover
 * contract), so it never sits between the pointer and the next name.
 */
const FRAME: CSSProperties = {
  position: 'fixed',
  zIndex: Z_INDEX.popover,
  width: ART_WIDTH,
  height: ART_HEIGHT,
  overflow: 'hidden',
  background: ADMIN_COLORS.page,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
  boxShadow: SHADOWS.panel,
  pointerEvents: 'none',
};

const IMAGE: CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};

/** Where the preview of the link in `anchor` goes, kept up to date while the page scrolls or resizes. */
function useArtPlace(anchor: RefObject<HTMLAnchorElement | null>): ArtPlace | null {
  const [place, setPlace] = useState<ArtPlace | null>(null);
  useLayoutEffect(() => {
    const link = anchor.current;
    if (!link) return;
    const reposition = () => {
      setPlace(artPlacement(link.getBoundingClientRect(), {width: window.innerWidth, height: window.innerHeight}));
    };
    reposition();
    window.addEventListener('resize', reposition);
    // In the capture phase, so a scroll inside any box (a page's body, a table) moves it too.
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [anchor]);
  return place;
}

/**
 * The art beside its link, on document.body, so a box that clips or scrolls
 * round the link never cuts it. Decoration: hidden from assistive tech, since
 * the link's text names what it shows. An image that fails to load takes the
 * preview away.
 */
function ArtPreview({art, anchor}: {art: string; anchor: RefObject<HTMLAnchorElement | null>}) {
  const place = useArtPlace(anchor);
  const [failed, setFailed] = useState(false);
  if (place === null || failed) return null;
  return createPortal(
    <div aria-hidden="true" style={{...FRAME, top: place.top, left: place.left}}>
      <img src={art} alt="" width={ART_WIDTH} height={ART_HEIGHT} style={IMAGE} onError={() => setFailed(true)} />
    </div>,
    document.body,
  );
}

interface ArtLinkProps {
  to: string;
  /** The image the link previews: a card's art. Without one it is a plain data link. */
  art?: string;
  /** The native tooltip: the whole name, for a link that cuts it short. */
  title?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * A link inside data (adm-link) that shows an image beside itself while a
 * mouse rests on it or the keyboard focuses it (useArtPreview): a card name
 * that shows the card. The preview renders only while it shows, so a hidden
 * one leaves nothing in the page.
 */
export function ArtLink({to, art, title, style, children}: ArtLinkProps) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const {open, triggerProps} = useArtPreview();
  if (!art) {
    return (
      <Link to={to} title={title} className="adm-link" style={style}>
        {children}
      </Link>
    );
  }
  return (
    <>
      <Link ref={anchor} to={to} title={title} className="adm-link" style={style} {...triggerProps}>
        {children}
      </Link>
      {open && <ArtPreview art={art} anchor={anchor} />}
    </>
  );
}

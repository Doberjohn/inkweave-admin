import {Link} from 'react-router-dom';
import {COLORS, FONTS, FONT_SIZES, SPACING} from '../app-bridge';

/** Any path that isn't a tool. */
export function NotFound() {
  return (
    <main style={{maxWidth: 960, margin: '0 auto', padding: SPACING.xxxl}}>
      <h1 style={{fontFamily: FONTS.hero, fontSize: FONT_SIZES.displaySm, margin: 0}}>Not found</h1>
      <p style={{color: COLORS.textMuted, fontSize: FONT_SIZES.lg}}>
        No admin tool lives at this address.{' '}
        <Link to="/" style={{color: COLORS.primary}}>
          See all tools
        </Link>
      </p>
    </main>
  );
}

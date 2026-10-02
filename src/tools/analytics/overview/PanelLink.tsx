import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';

interface PanelLinkProps {
  to: string;
  /** The accessible name, when the visible text alone is ambiguous (four "Tune" links). */
  label?: string;
  children: ReactNode;
}

/** A panel's text link ("Open calibration →", "Tune"): a router Link in the accent colour. */
export function PanelLink({to, label, children}: PanelLinkProps) {
  return (
    <Link
      to={to}
      aria-label={label}
      style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.accent, textDecoration: 'none', whiteSpace: 'nowrap'}}>
      {children}
    </Link>
  );
}

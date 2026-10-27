import {useRef} from 'react';
import {CtaButton, Notice, SPACING} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';

const FAILED: React.CSSProperties = {display: 'grid', gap: SPACING.md};
/** At its own width: the grid would stretch it across the column. */
const RETRY: React.CSSProperties = {justifySelf: 'start'};

interface RetryNoticeProps {
  /** What failed, with the error's message in brackets. */
  children: React.ReactNode;
  onRetry: () => void;
  /** The handoff Retry's own press asks for (R-48). */
  handoff: FocusHandoff;
}

/**
 * A read that failed, as an error notice, and a neutral Retry under it (R-45):
 * the card list on the card page, and the card's synergy file in the Engine
 * view. Retry swaps this out, taking its own button with it, so whatever
 * replaces it takes the handoff; if the read fails again, the new Retry does.
 */
export function RetryNotice({children, onRetry, handoff}: RetryNoticeProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'button');
  return (
    <div ref={ref} style={FAILED}>
      <Notice tone="error">{children}</Notice>
      <CtaButton type="button" variant="neutral" onClick={onRetry} style={RETRY}>
        Retry
      </CtaButton>
    </div>
  );
}

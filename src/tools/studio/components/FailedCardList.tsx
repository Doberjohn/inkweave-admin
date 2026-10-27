import {useRef} from 'react';
import {CtaButton, Notice, SPACING} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';

const STACK: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};

interface FailedCardListProps {
  error: Error;
  /** The card list's retryLoad. */
  onRetry: () => void;
  /** The page's (R-59): Retry takes it when the list fails again. Left out where the view round it takes it. */
  handoff?: FocusHandoff;
}

/**
 * The card list failed (R3's FailedCardList), in a view that waits on it
 * whole: Edit card's search, whose rows all come from it, and New card's set
 * step, whose sets do. Retry swaps this for the view, taking its own button
 * with it, so the page asks for a handoff (useStudioHandoff), which waits out
 * the load: the view takes it once the list is in, and Retry takes it if the
 * list fails again.
 */
export function FailedCardList({error, onRetry, handoff}: FailedCardListProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'button');
  return (
    <div ref={ref} style={STACK}>
      <Notice tone="error">Could not load the card list ({error.message})</Notice>
      <CtaButton type="button" variant="neutral" onClick={onRetry} style={{alignSelf: 'flex-start'}}>
        Retry
      </CtaButton>
    </div>
  );
}

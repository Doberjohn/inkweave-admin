import {useRef, type ReactNode} from 'react';
import {Notice} from '../ui/Notice';
import {useTakeHandoff, type FocusHandoff} from './focusHandoff';

const LINE: React.CSSProperties = {margin: 0};

/**
 * A Notice for a state with no control of its own. Its line takes a pending
 * handoff (R-48): after a Retry, or a link to a card the page can't open, the
 * control pressed is gone, so focus lands on what says why. Card analytics
 * and Card studio's Edit card both show their lines through it (R3-7, R-59).
 */
export function FocusNotice({handoff, children}: {handoff: FocusHandoff; children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'p');
  return (
    <div ref={ref}>
      <Notice>
        <p tabIndex={-1} style={LINE}>
          {children}
        </p>
      </Notice>
    </div>
  );
}

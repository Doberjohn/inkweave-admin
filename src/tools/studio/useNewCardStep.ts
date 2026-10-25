import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {FocusHandoff} from '../../shell/focusHandoff';
import {studioHref} from '../../shell/nav';

/** New card's step: the set step 1 chose, and the ways between the steps. */
export interface NewCardStepState {
  /** The set chosen, by its code, or null while step 1 shows. */
  set: string | null;
  /** Step 1's choice: step 2 shows. */
  choose: (code: string) => void;
  /** Step 2's Change set: step 1 shows again. */
  change: () => void;
  /** Step 1's Edit a card instead, offered while no set takes a new card: Edit card opens. */
  editInstead: () => void;
}

/**
 * New card's step, which StudioWorkspace holds beside New card's draft
 * (useRevealAdmin), so a mode switch keeps both (R-57); Change set keeps the
 * draft too. The set is no draft: the guard never asks about it. Choosing a
 * set and Change set each swap one step for the other, taking the control
 * pressed with them, so each asks for the page's handoff (R-48): step 2's form
 * takes it, or step 1's first button. Asking on press is safe here, unlike on
 * a router link's (useStudioHandoff): the swap is this state's, not a
 * navigation's transition, so the step pressed is gone when the request is
 * seen. Edit a card instead does navigate, and the page asks as the mode
 * changes.
 */
export function useNewCardStep({handoff, card}: {handoff: FocusHandoff; card: string | null}): NewCardStepState {
  const navigate = useNavigate();
  const [set, setSet] = useState<string | null>(null);
  const show = (next: string | null) => {
    setSet(next);
    handoff.request();
  };
  return {
    set,
    choose: (code) => show(code),
    change: () => show(null),
    // Pushed, as the mode switch is, so Back returns to step 1; the card rides along (R-57).
    editInstead: () => void navigate(studioHref('edit', card)),
  };
}

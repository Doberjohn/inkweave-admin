import {useCardDataContext} from '../../app-bridge';
import {SetBar} from './components/SetBar';
import {SetStep} from './components/SetStep';
import {newCardSet, newCardSets} from './newCardSets';
import {NewRevealPane, type NewRevealPaneProps} from './NewRevealPane';
import type {NewCardStepState} from './useNewCardStep';

export interface NewCardPaneProps extends Omit<NewRevealPaneProps, 'stepHandoff'> {
  /** The set chosen, the ways between the steps and their handoff, held by StudioWorkspace (useNewCardStep). */
  step: NewCardStepState;
}

/** Step 1 over the card list, which it reads from the shell's provider, as New card's number check does. */
function NewCardSetStep({step, handoff}: Pick<NewCardPaneProps, 'step' | 'handoff'>) {
  const {cards, isLoading, error, retryLoad} = useCardDataContext();
  return (
    <SetStep
      sets={isLoading || error !== null ? null : newCardSets(cards)}
      listError={error}
      onRetryList={retryLoad}
      onChoose={step.choose}
      onEditInstead={step.editInstead}
      handoff={handoff}
      stepHandoff={step.handoff}
    />
  );
}

/**
 * New card: step 1 picks the set, and step 2 is the reveal form (NewRevealPane)
 * under the set bar. Only a set that takes a new card can be chosen, and today
 * that is the reveal set in its season, so step 2 is always the reveal flow:
 * the card goes to previewCards.json, as it always has. The bar spans the
 * studio's root over the form's slots.
 */
export function NewCardPane({step, ...pane}: NewCardPaneProps) {
  if (step.set === null) return <NewCardSetStep step={step} handoff={pane.handoff} />;
  return (
    <>
      <SetBar
        set={newCardSet(step.set)}
        collectorNumber={pane.ctrl.form.collectorNumber}
        onChangeSet={step.change}
        publishing={pane.ctrl.publishing}
        layout={pane.layout}
      />
      <NewRevealPane {...pane} stepHandoff={step.handoff} />
    </>
  );
}

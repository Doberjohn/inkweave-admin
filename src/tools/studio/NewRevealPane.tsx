import {useEffect, useRef, type RefObject} from 'react';
import {CtaButton, LinkButton} from '../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {ADMIN_TYPE} from '../../theme/adminTheme';
import type {RevealAdminController} from '../reveal/useRevealAdmin';
import {CommitOutcome} from './components/CommitOutcome';
import {ReadyChecklist, type ChecklistActions} from './components/ReadyChecklist';
import {StudioCardPanel} from './components/StudioCardPanel';
import {StudioForm} from './components/StudioForm';
import {StudioSlots} from './components/StudioSlots';
import {SynergyPanel} from './components/SynergyPanel';
import {revealChecklist, type ImageStatus} from './readiness';
import {newRevealNote, publishLabel} from './studioCopy';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GAP} from './studioStyles';

// The handoff draws the aside as one column: the checklist, the synergies, then Publish across its width.
const ASIDE: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};
const PUBLISH: React.CSSProperties = {width: '100%'};
// Under the checklist item's message, in its size, as ForgetTokenOffer sets its LinkButton.
const RETRY_LIST: React.CSSProperties = {alignSelf: 'flex-start', fontSize: ADMIN_TYPE.small};

// The form's first control: Identity's header in the narrow accordion, its first field when wide.
const FIRST_CONTROL = 'input, select, textarea, button';

export interface NewRevealPaneProps {
  ctrl: RevealAdminController;
  layout: StudioLayout;
  /**
   * The page's (R-59). Three requests reach this pane: the set's, as New
   * card's step 1 gives way to it (useNewCardStep), which the form takes, or
   * the outcome line while a publish's outcome shows; the card list's, once
   * "Load the card list again" clears its error (R4-8f), which the form takes
   * too while no outcome shows; and a publish's once it lands, which the
   * outcome line takes.
   */
  handoff: FocusHandoff;
  /**
   * R-26's Forget token, offered when GitHub rejects the token. The workspace
   * asks first while a draft is dirty (R-84).
   */
  onForgetToken: () => void;
}

type PartProps = Omit<NewRevealPaneProps, 'onForgetToken'>;

/**
 * Whether the pane is still on screen. The workspace renders it only as New
 * card's step 2, so a switch to Edit card, or Change set, unmounts it, and
 * this reads false.
 */
function useShowing(): RefObject<boolean> {
  const showing = useRef(false);
  useEffect(() => {
    showing.current = true;
    return () => {
      showing.current = false;
    };
  }, []);
  return showing;
}

/** The chosen scan as readiness reads it: its name, whether its bytes are read, and the upload's own error. */
function scanOf(ctrl: RevealAdminController): ImageStatus {
  return {name: ctrl.imageName, ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError};
}

/**
 * The form, in its slot. It takes a pending handoff only while no outcome
 * shows: that is the set's or the card list's, since a publish's request
 * comes with its outcome, which the outcome line takes. Identity's dot waits
 * for the card list, as the checklist's Collector number does.
 */
function NewRevealForm({ctrl, layout, handoff}: PartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const outcome = ctrl.result !== null || ctrl.commitError !== null;
  useTakeHandoff(handoff, ref, FIRST_CONTROL, !outcome);
  return (
    <div ref={ref}>
      <StudioForm
        form={ctrl.form}
        errors={ctrl.validation.errors}
        onChange={ctrl.patchForm}
        layout={layout}
        list={ctrl.cardList}
      />
    </div>
  );
}

/**
 * The way out of a failed card list, under the Collector number item that
 * names it (R4-8f): the list's own retry, so the operator needn't leave New
 * card or reload, which would drop the draft. The retry clears the list's
 * error as its read starts, and the control goes with it: StudioPage asks for
 * the handoff as the error clears (useStudioHandoff, R-48), and the form takes
 * it.
 */
function listActions(ctrl: RevealAdminController): ChecklistActions {
  if (ctrl.cardList.error === null) return {};
  return {
    collectorNumber: (
      <LinkButton type="button" onClick={ctrl.retryCardList} style={RETRY_LIST}>
        Load the card list again
      </LinkButton>
    ),
  };
}

/**
 * The aside: what's left before the card can publish, its synergies, Publish,
 * and the outcome. The synergies run the engine as the aside renders
 * (findSynergies), so only New card runs it for its preview
 * (Doberjohn/inkweave-admin#55). Publish asks for the handoff once the commit
 * lands, failed or not: the button went off while it ran, which drops focus to
 * <body> in a browser, so the outcome line takes it (R-59). It asks only while
 * the pane still shows (`showing`): after a switch to Edit card, or Change
 * set, focus is where the operator put it, and the view there would take a
 * request meant for this outcome.
 */
function NewRevealAside({ctrl, handoff, onForgetToken, showing}: Omit<NewRevealPaneProps, 'layout'> & {
  showing: RefObject<boolean>;
}) {
  const publish = () =>
    void ctrl.publish().then(() => {
      if (showing.current) handoff.request();
    });
  return (
    <aside aria-label="Publish" style={ASIDE}>
      <ReadyChecklist
        items={revealChecklist(ctrl.form, ctrl.validation, scanOf(ctrl), ctrl.cardList)}
        actions={listActions(ctrl)}
      />
      <SynergyPanel groups={ctrl.findSynergies()} />
      <CtaButton type="button" onClick={publish} disabled={!ctrl.canPublish || ctrl.publishing} style={PUBLISH}>
        {publishLabel({publishing: ctrl.publishing})}
      </CtaButton>
      <CommitOutcome
        result={ctrl.result}
        error={ctrl.commitError}
        note={newRevealNote()}
        onForgetToken={onForgetToken}
        handoff={handoff}
      />
    </aside>
  );
}

/**
 * New card's step 2 for the reveal set (R-2), in the studio's layout, under
 * the set bar (NewCardPane): the reveal flow. The card panel previews the
 * draft and takes its scan, the form holds its fields, and the aside publishes
 * it. The controller lives in StudioWorkspace, so a mode switch, and Change
 * set, keep the draft (R-57).
 */
export function NewRevealPane({ctrl, layout, handoff, onForgetToken}: NewRevealPaneProps) {
  const showing = useShowing();
  return (
    <StudioSlots
      layout={layout}
      slots={{
        card: (
          // No current art in New card, and no onRevertImage: Revert image clears the file (R4-5d).
          <StudioCardPanel
            card={ctrl.previewCard}
            mode="new"
            layout={layout}
            staged={{name: ctrl.imageName, error: ctrl.imageError}}
            onImageChange={ctrl.onImageChange}
          />
        ),
        form: <NewRevealForm ctrl={ctrl} layout={layout} handoff={handoff} />,
        aside: <NewRevealAside ctrl={ctrl} handoff={handoff} onForgetToken={onForgetToken} showing={showing} />,
      }}
    />
  );
}

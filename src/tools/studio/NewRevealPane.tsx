import {useRef} from 'react';
import {CtaButton} from '../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import type {RevealAdminController} from '../reveal/useRevealAdmin';
import {CommitOutcome} from './components/CommitOutcome';
import {ReadyChecklist} from './components/ReadyChecklist';
import {StudioCardPanel} from './components/StudioCardPanel';
import {StudioForm} from './components/StudioForm';
import {StudioSlots} from './components/StudioSlots';
import {SynergyPanel} from './components/SynergyPanel';
import {revealChecklist, visibleImageError, type ImageStatus} from './readiness';
import {newRevealNote, publishLabel} from './studioCopy';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GAP} from './studioStyles';

// The handoff draws the aside as one column: the checklist, the synergies, then Publish across its width.
const ASIDE: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};
const PUBLISH: React.CSSProperties = {width: '100%'};

// The form's first control: Identity's header in the narrow accordion, its first field when wide.
const FIRST_CONTROL = 'input, select, textarea, button';

export interface NewRevealPaneProps {
  ctrl: RevealAdminController;
  layout: StudioLayout;
  /**
   * The page's (R-59). Two requests reach this pane: Save token's, which the
   * form takes (the workspace has just mounted, with no outcome), and a
   * publish's once it lands, which the outcome line takes.
   */
  handoff: FocusHandoff;
  /**
   * R-26's Forget token, offered when GitHub rejects the token. The workspace
   * asks first while a draft is dirty (R-84).
   */
  onForgetToken: () => void;
}

type PartProps = Omit<NewRevealPaneProps, 'onForgetToken'>;

/** The chosen scan as readiness reads it: its name, whether its bytes are read, and the upload's own error. */
function scanOf(ctrl: RevealAdminController): ImageStatus {
  return {name: ctrl.imageName, ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError};
}

/**
 * The form, in its slot. It takes a pending handoff only while no outcome
 * shows: that is Save token's, since a publish's request comes with its
 * outcome, which the outcome line takes.
 */
function NewRevealForm({ctrl, layout, handoff}: PartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const outcome = ctrl.result !== null || ctrl.commitError !== null;
  useTakeHandoff(handoff, ref, FIRST_CONTROL, !outcome);
  return (
    <div ref={ref}>
      <StudioForm form={ctrl.form} errors={ctrl.validation.errors} onChange={ctrl.patchForm} layout={layout} />
    </div>
  );
}

/**
 * The aside: what's left before the card can publish, its synergies, Publish,
 * and the outcome. Publish asks for the handoff once the commit lands, failed
 * or not: the button went off while it ran, which drops focus to <body> in a
 * browser, so the outcome line takes it (R-59).
 */
function NewRevealAside({ctrl, handoff, onForgetToken}: Omit<NewRevealPaneProps, 'layout'>) {
  const publish = () => void ctrl.publish().then(handoff.request);
  return (
    <aside aria-label="Publish" style={ASIDE}>
      <ReadyChecklist items={revealChecklist(ctrl.form, ctrl.validation, scanOf(ctrl))} />
      <SynergyPanel groups={ctrl.synergyGroups} />
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
 * New reveal (R-2): today's reveal publisher in the studio's layout. The card
 * panel previews the draft and takes its scan, the form holds its fields, and
 * the aside publishes it. The controller lives in StudioWorkspace, so a mode
 * switch keeps the draft (R-57).
 */
export function NewRevealPane({ctrl, layout, handoff, onForgetToken}: NewRevealPaneProps) {
  return (
    <StudioSlots
      layout={layout}
      slots={{
        card: (
          // No current art in New reveal, and no onRevertImage: Revert image clears the file (R4-5d).
          <StudioCardPanel
            card={ctrl.previewCard}
            mode="new"
            layout={layout}
            staged={{name: ctrl.imageName, error: visibleImageError(ctrl.validation.errors, scanOf(ctrl))}}
            onImageChange={ctrl.onImageChange}
          />
        ),
        form: <NewRevealForm ctrl={ctrl} layout={layout} handoff={handoff} />,
        aside: <NewRevealAside ctrl={ctrl} handoff={handoff} onForgetToken={onForgetToken} />,
      }}
    />
  );
}

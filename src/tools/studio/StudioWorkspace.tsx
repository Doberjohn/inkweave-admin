import {useRef} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useContainerWidth} from '../../app-bridge';
import {useGithubToken} from '../../github/useGithubToken';
import type {FocusHandoff} from '../../shell/focusHandoff';
import {studioHref, type StudioMode} from '../../shell/nav';
import {PageLayout} from '../../shell/PageLayout';
import {UnsavedChangesGuard} from '../../shell/UnsavedChangesGuard';
import {SegmentedControl} from '../../ui/SegmentedControl';
import {useRevealAdmin} from '../reveal/useRevealAdmin';
import {openCard} from './editorState';
import {NewRevealPane} from './NewRevealPane';
import {STUDIO_SUBTITLE, STUDIO_TITLE, studioDocumentTitle} from './studioCopy';
import {studioLayout} from './studioLayout';
import {
  forgetTokenQuestion,
  shouldBlockStudioNavigation,
  studioCardOf,
  studioModeOf,
  studioUnsavedMessage,
  type StudioDrafts,
} from './studioPaths';
import {STUDIO_GRID} from './studioStyles';
import {useCardEditor} from './useCardEditor';

const MODES: ReadonlyArray<{value: StudioMode; label: string}> = [
  {value: 'new', label: 'New reveal'},
  {value: 'edit', label: 'Edit card'},
];

interface StudioWorkspaceProps {
  token: string;
  /** The page's (R-59), held above the gate: Save token asks for it before this mounts. */
  handoff: FocusHandoff;
}

/**
 * R-26's in-page Forget token, offered when GitHub rejects the token. The
 * workspace is keyed by the token, so forgetting it drops both drafts: it asks
 * first while one is dirty, as the tuning aside does (R-84). The gate that
 * replaces the workspace takes the handoff.
 */
function useForgetToken({drafts, handoff}: {drafts: StudioDrafts; handoff: FocusHandoff}): () => void {
  const {clearToken} = useGithubToken();
  return () => {
    const question = forgetTokenQuestion(drafts);
    if (question !== null && !window.confirm(question)) return;
    clearToken();
    handoff.request();
  };
}

/**
 * Card studio with a token saved. It holds both drafts, New reveal's and Edit
 * card's, so a mode switch keeps them (R-57), and the page's one guard over
 * them (R-58): a card change asks about the Edit draft only, leaving about
 * every dirty draft. The guard needs the data router, so no story renders this.
 *
 * The root under the header is the element useContainerWidth measures. It is
 * there in every mode and state, so the measure never stops: the hook watches
 * only the element it finds on mount. Its width picks the layout, wide or
 * narrow (R-64), and the active pane fills its slots in that layout's order
 * (R-63).
 */
export function StudioWorkspace({token, handoff}: StudioWorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = studioModeOf(location);
  const card = studioCardOf(location);
  const rootRef = useRef<HTMLDivElement>(null);
  const layout = studioLayout(useContainerWidth(rootRef));
  const ctrl = useRevealAdmin();
  const edit = useCardEditor({token, cardId: card});
  const drafts = {reveal: ctrl.dirty, edit: edit.dirty};
  const busy = {reveal: ctrl.publishing, edit: edit.saving};
  const forgetToken = useForgetToken({drafts, handoff});

  return (
    <PageLayout
      title={STUDIO_TITLE}
      subtitle={STUDIO_SUBTITLE}
      // Pushed, so Back returns to the other mode; the card rides along (R-57).
      actions={
        <SegmentedControl
          ariaLabel="Studio mode"
          options={MODES}
          value={mode}
          onChange={(next) => void navigate(studioHref(next, card))}
        />
      }
      writes
      flush
      documentTitle={studioDocumentTitle({mode, card: openCard(edit.lookup)})}
      scrollKey={studioHref(mode, card)}>
      <UnsavedChangesGuard
        dirty={drafts.reveal || drafts.edit}
        leaves={(from, to) => shouldBlockStudioNavigation(from, to, drafts)}
        message={(to) => studioUnsavedMessage({from: location, to, drafts, busy})}
      />
      <div ref={rootRef} style={STUDIO_GRID[layout]}>
        {mode === 'new' && <NewRevealPane ctrl={ctrl} layout={layout} handoff={handoff} onForgetToken={forgetToken} />}
      </div>
    </PageLayout>
  );
}

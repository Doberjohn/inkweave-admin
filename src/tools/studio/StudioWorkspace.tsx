import {useRef} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useContainerWidth} from '../../app-bridge';
import {useGithubToken} from '../../github/useGithubToken';
import {keepClearOfFoot} from '../../shell/clearBand';
import type {FocusHandoff} from '../../shell/focusHandoff';
import {studioHref, type StudioMode} from '../../shell/nav';
import {PageLayout} from '../../shell/PageLayout';
import {UnsavedChangesGuard} from '../../shell/UnsavedChangesGuard';
import {SegmentedControl} from '../../ui/SegmentedControl';
import {useRevealAdmin} from '../reveal/useRevealAdmin';
import {VersionsTray} from './components/VersionsTray';
import {EditPane} from './EditPane';
import {openCard} from './editorState';
import {useVersionBatch} from './finishes/versionBatchStore';
import {NewCardPane} from './NewCardPane';
import {usePrintingForm} from './promos/usePrintingForm';
import {STUDIO_SUBTITLE, STUDIO_TITLE, studioDocumentTitle} from './studioCopy';
import {studioLayout} from './studioLayout';
import {
  forgetTokenQuestion,
  shouldBlockStudioNavigation,
  studioCardOf,
  studioModeOf,
  studioUnsavedQuestion,
  type StudioDrafts,
} from './studioPaths';
import {STUDIO_GRID} from './studioStyles';
import {useCardEditor} from './useCardEditor';
import {useNewCardStep} from './useNewCardStep';
import {useReloadAfterPublish} from './useReloadAfterPublish';

const MODES: ReadonlyArray<{value: StudioMode; label: string}> = [
  {value: 'new', label: 'New card'},
  {value: 'edit', label: 'Edit card'},
];

interface StudioWorkspaceProps {
  token: string;
  /** The page's (R-59), held above the gate: Save token asks for it before this mounts. */
  handoff: FocusHandoff;
}

/**
 * R-26's in-page Forget token, offered when GitHub rejects the token. The
 * workspace is keyed by the token, so forgetting it drops every draft: it asks
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
 * Card studio with a token saved. It holds three drafts: New card's, Edit
 * card's, and Edit card's promo printing form (#77), and New card's step, the
 * set it chose (useNewCardStep). So a mode switch keeps them all (R-57), and
 * the page's one guard counts each draft (R-58): a card change asks only about
 * the Edit draft and the printing form, which are the card's, never New
 * card's, and leaving the page asks about every dirty draft. The guard needs
 * the data router, so no story renders this.
 *
 * The root under the header is the element useContainerWidth measures. It is
 * there in every mode and state, so the measure never stops: the hook watches
 * only the element it finds on mount. Its width picks the layout, wide or
 * narrow (R-64), and the active pane fills its slots in that layout's order
 * (R-63). A New card publish that lands reads Edit's file again (R-66).
 *
 * The Version changes tray (#68) is a row of its own under the active pane, in either mode: its
 * batch is the studio's, kept in the browser, so it is no draft. The guard does not count it,
 * leaving the page loses none of it, and forgetting the token (the tray offers it too) never
 * touches it. It stays a child of the root: its foot, a box of the root's, sticks to the bottom
 * of the view across the whole studio while changes are staged (#74). The browser scrolls a
 * control that takes focus only as far as the view's edge, under that foot, so the root keeps one
 * that takes keyboard focus clear of the foot while the foot is pinned (keepClearOfFoot, WCAG
 * 2.4.11). One that a press of the mouse focuses stays under the pointer, so the press clicks it.
 */
export function StudioWorkspace({token, handoff}: StudioWorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = studioModeOf(location);
  const card = studioCardOf(location);
  const rootRef = useRef<HTMLDivElement>(null);
  // The Version changes tray's foot while it is pinned to the bottom of the view; null otherwise.
  const pinnedFootRef = useRef<HTMLDivElement>(null);
  const layout = studioLayout(useContainerWidth(rootRef));
  const ctrl = useRevealAdmin();
  const step = useNewCardStep(card);
  const edit = useCardEditor({token, cardId: card});
  // Edit card's promo printing form (#77), held here beside its draft, so a mode switch keeps it too.
  const printing = usePrintingForm({token, cardId: card});
  // The outcome of a publish is told to the token that made it: a token saved after Forget token starts with none.
  const versions = useVersionBatch(token);
  const drafts = {reveal: ctrl.dirty, edit: edit.dirty, printing: printing.dirty};
  // Edit's save only while it was made from the draft on screen: one left running on another card isn't this card's.
  // The printing form drops with its card, so its publish is always this card's.
  const busy = {reveal: ctrl.publishing, edit: edit.savingThisDraft, printing: printing.publishing};
  const forgetToken = useForgetToken({drafts, handoff});
  useReloadAfterPublish({published: ctrl.result, reload: edit.reloadFile});

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
        dirty={drafts.reveal || drafts.edit || drafts.printing}
        leaves={(from, to) => shouldBlockStudioNavigation(from, to, drafts)}
        message={(to) => studioUnsavedQuestion({from: location, to, drafts, busy})}
      />
      <div
        ref={rootRef}
        style={STUDIO_GRID[layout]}
        onFocus={(event) => keepClearOfFoot({field: event.target, foot: pinnedFootRef.current})}>
        {mode === 'new' ? (
          <NewCardPane ctrl={ctrl} step={step} layout={layout} handoff={handoff} onForgetToken={forgetToken} />
        ) : (
          <EditPane
            edit={edit}
            cardId={card}
            layout={layout}
            handoff={handoff}
            onForgetToken={forgetToken}
            token={token}
            printing={printing}
          />
        )}
        <VersionsTray view={versions} token={token} onForgetToken={forgetToken} pinnedFootRef={pinnedFootRef} />
      </div>
    </PageLayout>
  );
}

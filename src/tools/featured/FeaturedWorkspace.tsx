import {useRef, useState} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CtaButton, LinkButton, SPACING, useCardDataContext} from '../../app-bridge';
import {ForgetTokenOffer} from '../../github/ForgetTokenOffer';
import {targetBranch} from '../../github/githubCommit';
import {isRejectedToken} from '../../github/rejectedToken';
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {PageLayout} from '../../shell/PageLayout';
import {UnsavedChangesGuard, type UnsavedQuestion} from '../../shell/UnsavedChangesGuard';
import {writeInFlightMessage} from '../../shell/writeInFlight';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {Notice} from '../../ui/Notice';
import {FEATURED_SUBTITLE, FEATURED_TITLE} from './featuredCopy';
import {FeaturedSaveBar} from './FeaturedSaveBar';
import {FeaturedSearch} from './FeaturedSearch';
import {FeaturedSlotCard} from './FeaturedSlot';
import {slotProblem, type FeaturedSlot} from './featuredSlots';
import {useDeployedFeatured, type UseDeployedFeaturedResult} from './useDeployedFeatured';
import {useFeaturedEditor, type FeaturedEditor} from './useFeaturedEditor';

const COLUMN: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xl, width: '100%', maxWidth: 880};
const HEADING: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.emphasis, fontWeight: 700, color: ADMIN_COLORS.text, outline: 'none'};
const LINE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const STACK: React.CSSProperties = {display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm};

const plural = (n: number) => (n === 1 ? '' : 's');

/** What leaving drops: the staged picks. */
function picksLine(n: number): string {
  const one = n === 1;
  return `${n} featured card pick${plural(n)} ${one ? 'isn’t' : 'aren’t'} saved yet. Leaving this page drops ${one ? 'it' : 'them'}.`;
}

/** What leaving asks: a save in flight first, else the picks it drops. */
function leaveQuestion(editor: FeaturedEditor): UnsavedQuestion {
  const message = editor.save.status === 'saving' ? writeInFlightMessage({action: 'save'}) : picksLine(editor.picks.size);
  return {title: 'Leave Featured cards?', stay: 'Stay on this page', leave: 'Leave this page', message};
}

/** Whether inkweave.ink serves these six, in order. */
const servesSix = (saved: readonly FeaturedSlot[], ids: readonly string[]) =>
  ids.length === saved.length && saved.every((slot, i) => slot.id === ids[i]);

/** What inkweave.ink shows, as far as the last read of its featuredCards.json says. */
function servedLine(saved: readonly FeaturedSlot[], deployed: UseDeployedFeaturedResult): string {
  if (deployed.status === 'loading') return 'Checking what inkweave.ink shows…';
  if (deployed.status === 'error') return `Couldn’t read what inkweave.ink shows (${deployed.error}).`;
  return servesSix(saved, deployed.ids)
    ? 'inkweave.ink shows these six.'
    : 'inkweave.ink still shows the previous six: the change shows once its deploy finishes.';
}

/** Whether inkweave.ink serves the branch's six: on master only, since only master deploys. */
function LiveLine({saved, deployed}: {saved: readonly FeaturedSlot[]; deployed: UseDeployedFeaturedResult}) {
  const branch = targetBranch();
  if (branch !== 'master') return <p style={LINE}>inkweave.ink builds from master, not {branch}, so a save here never reaches it.</p>;
  return (
    <p role="status" style={LINE}>
      {servedLine(saved, deployed)}{' '}
      {deployed.status !== 'loading' && (
        <LinkButton type="button" tone="muted" onClick={deployed.check} style={{fontSize: ADMIN_TYPE.small}}>
          Check again
        </LinkButton>
      )}
    </p>
  );
}

/** A failed first read of the file, and its way out: Try again, or a new token after a 401. */
function ReadFailure({error, onRetry, onForgetToken}: {error: string; onRetry: () => void; onForgetToken: () => void}) {
  return (
    <div style={STACK}>
      <Notice tone="error">Couldn’t read featuredCardIds.json from {targetBranch()}: {error}</Notice>
      {isRejectedToken(error) ? (
        <ForgetTokenOffer onForget={onForgetToken} />
      ) : (
        <CtaButton type="button" variant="neutral" onClick={onRetry}>
          Try again
        </CtaButton>
      )}
    </div>
  );
}

/** The card list's load: until it is in, every slot would read as a card the list lacks. */
function CardListState({loading, error, onRetry}: {loading: boolean; error: Error | null; onRetry: () => void}) {
  if (loading) return <Notice>Loading the card list…</Notice>;
  return (
    <div style={STACK}>
      <Notice tone="error">Couldn’t load the card list: {error?.message}</Notice>
      <CtaButton type="button" variant="neutral" onClick={onRetry}>
        Try again
      </CtaButton>
    </div>
  );
}

interface SlotsProps {
  editor: FeaturedEditor;
  cards: readonly LorcanaCard[];
  deployed: UseDeployedFeaturedResult;
  handoff?: FocusHandoff;
}

/** The six slots under their heading, the live line, the slot search and the save bar. */
function Slots({editor, cards, deployed, handoff}: SlotsProps) {
  const [open, setOpen] = useState<number | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, headingRef, 'h2');
  const {slots, saved} = editor;
  return (
    <>
      <div ref={headingRef} style={STACK}>
        <h2 tabIndex={-1} style={HEADING}>
          The homepage’s six, Amber to Steel
        </h2>
        <LiveLine saved={saved} deployed={deployed} />
        {editor.read.status === 'ready' && editor.read.reloadError && (
          <Notice tone="error">Couldn’t read the file again: {editor.read.reloadError}</Notice>
        )}
      </div>
      <div className="adm-featured">
        <div className="adm-featured-grid">
          {slots.map((slot, i) => (
            <FeaturedSlotCard
              key={slot.ink}
              slot={slot}
              saved={saved[i]}
              problem={slotProblem(slot, slots)}
              onChange={() => setOpen(i)}
              onUndo={() => editor.undo(i)}
            />
          ))}
        </div>
      </div>
      <FeaturedSearch
        ink={open === null ? null : slots[open].ink}
        currentId={open === null ? null : slots[open].id}
        cards={cards}
        onPick={(card) => open !== null && editor.stage(open, card)}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

/** The shell's card list, as the view needs it (useCardDataContext). */
export interface FeaturedCardList {
  cards: readonly LorcanaCard[];
  isLoading: boolean;
  error: Error | null;
  retryLoad: () => void;
}

interface FeaturedViewProps {
  editor: FeaturedEditor;
  deployed: UseDeployedFeaturedResult;
  list: FeaturedCardList;
  /** Reads the file again: after a failed first read, or a stale refusal. */
  onReload: () => void;
  /** Forgets the saved token, which GitHub rejected. */
  onForgetToken: () => void;
  handoff?: FocusHandoff;
}

/** What the page shows under its header: the file's read, then the card list's load, then the slots and the save bar. */
function ViewBody({editor, deployed, list, onReload, onForgetToken, handoff}: FeaturedViewProps) {
  const {read} = editor;
  if (read.status === 'loading') return <Notice>Reading featuredCardIds.json from {targetBranch()}…</Notice>;
  if (read.status === 'error') return <ReadFailure error={read.error} onRetry={onReload} onForgetToken={onForgetToken} />;
  if (list.isLoading || list.error) return <CardListState loading={list.isLoading} error={list.error} onRetry={list.retryLoad} />;
  return (
    <>
      <Slots editor={editor} cards={list.cards} deployed={deployed} handoff={handoff} />
      <FeaturedSaveBar
        count={editor.picks.size}
        blocked={editor.blocked}
        save={editor.save}
        onSave={editor.onSave}
        onDiscard={editor.discard}
        onReload={onReload}
        onForgetToken={onForgetToken}
      />
    </>
  );
}

/**
 * The page as its state has it. Stories render it with fixed state;
 * FeaturedWorkspace gives it the live hooks.
 */
export function FeaturedView(props: FeaturedViewProps) {
  return (
    <PageLayout title={FEATURED_TITLE} subtitle={FEATURED_SUBTITLE} writes>
      <div style={COLUMN}>
        <ViewBody {...props} />
      </div>
    </PageLayout>
  );
}

interface FeaturedWorkspaceProps {
  token: string;
  /** Forgets the saved token (the shared store's clearToken). The workspace asks first while picks are staged. */
  onForgetToken: () => void;
  /** The page's: the slots' heading takes it once they show (after Save token, or Reload). */
  handoff?: FocusHandoff;
}

/**
 * The Featured cards page behind its token gate: the branch's featuredCardIds.json
 * as six slots, each changeable to another card of its ink, and a save that
 * commits the six in one commit (useFeaturedEditor). Leaving with staged picks,
 * or mid-save, asks first.
 */
export function FeaturedWorkspace({token, onForgetToken, handoff}: FeaturedWorkspaceProps) {
  const list = useCardDataContext();
  const editor = useFeaturedEditor(token, list.getCardById);
  const deployed = useDeployedFeatured();
  const forget = () => {
    const n = editor.picks.size;
    if (n > 0 && !window.confirm(`Forget the token and drop ${n} unsaved pick${plural(n)}?`)) return;
    handoff?.request();
    onForgetToken();
  };
  const reload = () => {
    void editor.reload().then((landed) => landed && handoff?.request());
  };
  return (
    <>
      <FeaturedView editor={editor} deployed={deployed} list={list} onReload={reload} onForgetToken={forget} handoff={handoff} />
      <UnsavedChangesGuard
        dirty={editor.picks.size > 0 || editor.save.status === 'saving'}
        message={() => leaveQuestion(editor)}
      />
    </>
  );
}

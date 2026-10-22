import {useState, type CSSProperties, type ReactNode} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CtaButton, LinkButton, SPACING, useCardDataContext} from '../../app-bridge';
import {ForgetTokenOffer} from '../../github/ForgetTokenOffer';
import {isRejectedToken} from '../../github/rejectedToken';
import type {FocusHandoff} from '../../shell/focusHandoff';
import {FocusNotice} from '../../shell/FocusNotice';
import {Notice} from '../../ui/Notice';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {goneNote} from './branchCards';
import {IMAGE_ONLY_NOTES, type ImageOnlyReason} from './cardEdit';
import {ChangeList} from './components/ChangeList';
import {CommitOutcome} from './components/CommitOutcome';
import {EditingBanner} from './components/EditingBanner';
import {EditSearch} from './components/EditSearch';
import {PrintingsPanel} from './components/PrintingsPanel';
import {ReleasedCardFacts} from './components/ReleasedCardFacts';
import {StudioCardPanel} from './components/StudioCardPanel';
import {StudioForm} from './components/StudioForm';
import {StudioSlots} from './components/StudioSlots';
import {SynergyPanel} from './components/SynergyPanel';
import type {EditLookup, PreviewFileView} from './editorState';
import {searchCards} from './editSearch';
import type {CollectionOnlyCards} from './finishes/collectionCards';
import {useBranchPrintings} from './finishes/useBranchPrintings';
import {changeFor} from './finishes/versionBatch';
import {useVersionBatch} from './finishes/versionBatchStore';
import {outcomeShows} from './outcomeShows';
import {PRINTINGS_ONLY_NOTE, editNote, saveLabel} from './studioCopy';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GAP} from './studioStyles';
import type {CardEditorController} from './useCardEditor';

/** Edit locks the collector number: renumbering changes the card's id, which goes by PR (R-91 1). */
const EDIT_LOCKS: ReadonlySet<keyof RevealCardForm> = new Set<keyof RevealCardForm>(['collectorNumber']);

/** A row of its own across the studio's root: the search, the loading line and the Editing banner. */
const WHOLE_ROW: Readonly<Record<StudioLayout, CSSProperties>> = {
  wide: {gridColumn: '1 / -1', minWidth: 0},
  narrow: {flex: '1 1 100%', minWidth: 0},
};
// The handoff draws the aside as one column, Save across its width (README §7).
const ASIDE: CSSProperties = {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};
const SAVE: CSSProperties = {width: '100%'};
// The form slot's panels in a column, spaced as the aside's are: an image-only card's facts over
// their way out, and a released card's data over its printings.
const COLUMN: CSSProperties = {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};
const READ_AGAIN: CSSProperties = {alignSelf: 'flex-start'};
// A read error over its way out, spaced as the search's is.
const FILE_ERROR: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};

export interface EditPaneProps {
  edit: CardEditorController;
  /** The card the URL names (studioCardOf), for the line while it waits on a failed read of previewCards.json. */
  cardId: string | null;
  layout: StudioLayout;
  /** The page's (R-59): StudioPage asks for it when the URL's card changes, and when the card list's Retry lands. */
  handoff: FocusHandoff;
  /** R-26's Forget token; StudioWorkspace asks first while a draft is dirty (R-84). */
  onForgetToken: () => void;
  /** The saved GitHub token: a released card's Printings panel reads the branch's data files with it (#68). */
  token: string;
}

type ReadyLookup = Extract<EditLookup, {kind: 'ready'}>;
type EntryLookup = Exclude<EditLookup, {kind: 'ready' | 'loading'}>;
type PartProps = Pick<EditPaneProps, 'edit' | 'handoff' | 'onForgetToken'>;
type RevertRow = CardEditorController['revertRow'];

/**
 * A control whose read replaces it: it asks for the handoff once the read
 * lands, never on the click, so the view that replaced it takes focus, and a
 * read that fails again leaves none waiting (TuningAside's readAgainWith). The
 * controller's reads resolve after the landing renders (R4-4a), so that view
 * is there to take it.
 */
function askWhenLanded(read: () => Promise<boolean>, handoff: FocusHandoff): () => void {
  return () => {
    void read().then((landed) => {
      if (landed) handoff.request();
    });
  };
}

/**
 * Why the URL's card isn't open, above the search: an id neither the card list
 * nor previewCards.json holds (R-29), a card that waits on a failed read of the
 * file (R-71; the search shows the read's error and its way out), or a preview
 * id the file no longer holds (R-66). Nothing for the bare search, or for a
 * failed card list, whose own error takes the field's place.
 */
function EntryNotice({lookup, cardId, handoff}: {lookup: EntryLookup; cardId: string | null; handoff: FocusHandoff}) {
  switch (lookup.kind) {
    case 'missing':
      return (
        <FocusNotice handoff={handoff}>
          No card has the id <code>{lookup.cardId}</code> in the card list or in previewCards.json. Cards from sets
          before 9 rotated out of Core, and a preview id changes when its card is released: find it by name below.
        </FocusNotice>
      );
    case 'fileFailed':
      return (
        <FocusNotice handoff={handoff}>
          Card <code>{cardId}</code> opens once previewCards.json can be read.
        </FocusNotice>
      );
    case 'gone':
      return <FocusNotice handoff={handoff}>{goneNote(lookup.card)}</FocusNotice>;
    default:
      return null;
  }
}

/** What the search says when Sets 1 to 8 couldn't be read (#68): the card list's cards are all it holds. */
const COLLECTION_FAILED = "Sets 1 to 8 didn't load, so the search holds Sets 9 and up only.";

/**
 * Above the search, when the chunks of Sets 1 to 8 failed (#68), with a way to read them again. The
 * card list's cards search and open as ever. Try again takes its own notice with it (the read
 * starts at once), so it asks for the handoff on the click, as the card list's Retry does when its
 * error clears (useStudioHandoff): the search field takes it when no card is waiting, and the
 * card a URL names takes it, or its explanation does, once the read lands. Only the click asks:
 * a read that fails again leaves none waiting.
 */
function CollectionNotice({collection, handoff}: {collection: CollectionOnlyCards; handoff: FocusHandoff}) {
  if (collection.status !== 'error') return null;
  const tryAgain = () => {
    collection.retry();
    handoff.request();
  };
  return (
    <Notice tone="error">
      {COLLECTION_FAILED}{' '}
      <LinkButton type="button" onClick={tryAgain}>
        Try again
      </LinkButton>
    </Notice>
  );
}

/**
 * Edit card's search (R4-5f) over the controller's cards: the card list plus
 * the cards only the branch file holds (R-66), the file's first (R-76), and
 * then Sets 1 to 8 (#68), whose notice says when they failed to load. The
 * card list's Retry asks for nothing here: StudioPage asks once its error
 * clears. The file's asks once its read lands.
 */
function SearchView({edit, handoff, onForgetToken, query, onQuery, notice}: PartProps & {
  query: string;
  onQuery: (query: string) => void;
  notice: ReactNode;
}) {
  const cardList = useCardDataContext();
  const {rows, total} = searchCards({
    cards: edit.searchCards,
    query,
    previewIds: edit.previewFile.previewIds,
    branchOnlyIds: edit.branchOnlyIds,
  });
  return (
    <EditSearch
      rows={rows}
      total={total}
      query={query}
      onQuery={onQuery}
      list={{loading: cardList.isLoading, error: cardList.error, onRetry: cardList.retryLoad}}
      file={{error: edit.previewFile.error, onRetry: askWhenLanded(edit.retry, handoff), onForgetToken}}
      notice={
        <>
          {notice}
          <CollectionNotice collection={edit.collection} handoff={handoff} />
        </>
      }
      handoff={handoff}
    />
  );
}

/**
 * An image-only card's facts and why (R-61, R-65). An entry the form can't
 * hold is the one reason a branch edit can lift (a released, unnumbered or
 * other-set card can't change here), so it offers to read the file again. The
 * read goes through Load it again, never previewFile.reload: the draft follows
 * it, keeps a staged image, and opens the form once the entry round-trips
 * (R-68). The re-seed replaces this view, button and all, so it asks for the
 * handoff once the read lands, and the outcome line, saying what the read
 * did, takes it.
 */
function ImageOnlyFacts({edit, card, reason, handoff}: Pick<PartProps, 'edit' | 'handoff'> & {
  card: LorcanaCard;
  reason: ImageOnlyReason;
}) {
  const facts = <ReleasedCardFacts card={card} note={IMAGE_ONLY_NOTES[reason]} />;
  if (reason !== 'unrepresentable') return facts;
  return (
    <div style={COLUMN}>
      {facts}
      <CtaButton
        type="button"
        variant="neutral"
        onClick={askWhenLanded(edit.loadAgain, handoff)}
        disabled={edit.saving}
        style={READ_AGAIN}>
        Read previewCards.json again
      </CtaButton>
    </div>
  );
}

/**
 * A preview card's form, the collector number locked (R-91 1); or, for an
 * image-only card, its facts and why (R-61, R-65). It goes by the controller's
 * reason (imageOnlyOf), not the lookup's: an image draft whose entry now has
 * fields still has no form to show, so it keeps its facts. A card of Sets 1 to
 * 8 is read-only whole, its image included, so its facts say that instead, and
 * offer no read of the file (#68).
 */
function EditForm({edit, ready, layout, handoff, inksRestored}: Pick<PartProps, 'edit' | 'handoff'> & {
  ready: ReadyLookup;
  layout: StudioLayout;
  inksRestored: number;
}) {
  if (edit.printingsOnly) return <ReleasedCardFacts card={ready.card} note={PRINTINGS_ONLY_NOTE} />;
  if (edit.imageOnly) return <ImageOnlyFacts edit={edit} card={ready.card} reason={edit.imageOnly} handoff={handoff} />;
  if (edit.form === null) return null;
  return (
    <StudioForm
      form={edit.form}
      errors={edit.validation.errors}
      onChange={edit.patchForm}
      layout={layout}
      locked={EDIT_LOCKS}
      inksRestored={inksRestored}
    />
  );
}

/**
 * A released card's printings (#68): their versions as the target branch's files give them, and
 * the studio's batch of version changes, which a choice joins. Nothing is committed here: the
 * Version changes tray lists the batch and publishes it. Both are shared by the whole studio, so
 * a change staged for one card shows on it again whenever it is opened.
 */
function PrintingsSection({card, token}: {card: LorcanaCard; token: string}) {
  const view = useBranchPrintings({token, card});
  const batch = useVersionBatch();
  return <PrintingsPanel view={view} changes={batch.changes} onChoose={(chosen) => batch.stage(changeFor(chosen))} />;
}

/**
 * The form slot: the card's data, and under it a released card's printings (#68), whether its
 * data is a Sets 1 to 8 card's facts or the facts of a card whose image can change. A preview
 * card has none: its versions arrive with LorcanaJSON once its set is official. The printings
 * sit beside the form, not in it, so a Discard or a re-seed that opens the form afresh
 * (CardEditor's `formKey`) never mounts them again.
 */
function FormSlot({released, card, token, children}: {
  released: boolean;
  card: LorcanaCard;
  token: string;
  children: ReactNode;
}) {
  if (!released) return children;
  return (
    <div style={COLUMN}>
      {children}
      <PrintingsSection card={card} token={token} />
    </div>
  );
}

/**
 * A failed re-read of previewCards.json while a card is open, in the search's
 * words (EditSearch): Load it again, or the image-only view's "Read
 * previewCards.json again". Either leaves its button in place (R4-4c), so this
 * says why the press changed nothing, and offers Forget token when GitHub
 * rejected the token (R-26), as the search does. A failed first read is the
 * search's to show: a card open through it doesn't need the file (R-71).
 */
function FileError({file, onForgetToken}: {file: PreviewFileView; onForgetToken: () => void}) {
  const error = file.status === 'ready' ? file.error : null;
  if (error === null) return null;
  return (
    <div style={FILE_ERROR}>
      <Notice tone="error">Could not read previewCards.json: {error}.</Notice>
      {isRejectedToken(error) && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}

/**
 * The aside: the changes as a diff, the synergies of a card whose fields
 * change (none for an image-only card, R-61), Save, and the outcome, its note
 * picked by whether an image went with the commit. The synergies run the
 * engine as the aside renders (findSynergies), so only Edit card runs it for
 * the card open there (Doberjohn/inkweave-admin#55). Save asks for the handoff
 * once the commit settles: it went off while it ran, which drops focus to
 * <body> in a browser, so the outcome line takes it. Discard and each row's
 * Revert are held while it runs, as Save is (R4-4c). Load it again asks once
 * its re-read lands, and the line then says what it kept (R-68), or that the
 * card can't be edited now; a read that fails shows its error under the
 * outcome. A card of Sets 1 to 8 has nothing to change or save, so it has no
 * aside at all (#68).
 */
function EditAside({edit, handoff, onForgetToken, onDiscard, onRevert}: PartProps & {onDiscard: () => void; onRevert: RevertRow}) {
  if (edit.printingsOnly) return null;
  const save = () => void edit.save().then(handoff.request);
  return (
    <aside aria-label="Changes" style={ASIDE}>
      <ChangeList
        rows={edit.changes}
        onDiscard={onDiscard}
        onRevert={onRevert}
        busy={edit.saving}
        imageOnly={edit.form === null}
      />
      {edit.form !== null && <SynergyPanel groups={edit.findSynergies()} />}
      <CtaButton type="button" onClick={save} disabled={!edit.canSave} style={SAVE}>
        {saveLabel(edit)}
      </CtaButton>
      <CommitOutcome
        result={edit.result}
        error={edit.saveError}
        note={editNote(edit.result)}
        dropped={edit.dropped}
        editable={edit.form !== null}
        edits={edit.kept?.edits}
        staged={edit.kept?.staged}
        wasEditable={edit.kept?.wasEditable}
        onLoadAgain={edit.failure === 'stale' ? askWhenLanded(edit.loadAgain, handoff) : undefined}
        onForgetToken={onForgetToken}
        handoff={handoff}
      />
      <FileError file={edit.previewFile} onForgetToken={onForgetToken} />
    </aside>
  );
}

/**
 * How the form's view follows the change list's take-backs. Discard keeps the
 * draft's seed, so the form's key counts Discards too: the form opens fresh,
 * its open section and its Dual-ink switch with it. An Ink row's Revert
 * resets the switch alone (StudioForm's inksRestored), so the open section
 * stays (Doberjohn/inkweave-admin#52).
 */
function useFormResets(edit: CardEditorController) {
  const [discards, setDiscards] = useState(0);
  const [inksRestored, setInksRestored] = useState(0);
  const discard = () => {
    edit.discard();
    setDiscards(discards + 1);
  };
  const revertRow: RevertRow = (row) => {
    if (row === 'color') setInksRestored(inksRestored + 1);
    return edit.revertRow(row);
  };
  return {formKey: `${edit.seed}:${discards}`, inksRestored, discard, revertRow};
}

/**
 * One card open in Edit: the Editing banner over the card panel, the form (or
 * the facts) and the aside, in the layout's slot order (R-63). EditPane keys it
 * by the card's id (R-46), so nothing a view holds, such as the open accordion
 * section, carries over to the next card. The form is keyed further by the
 * draft's seed and by Discard, so a re-seed (Load it again) or a Discard opens
 * it fresh too: its open section and its Dual-ink switch follow the form it
 * shows. An Ink row's Revert resets the switch alone (useFormResets). The
 * banner's h2 takes the page's handoff while the outcome line has nothing to
 * say (outcomeShows, CommitOutcome's own rule); after that the line does. A
 * ready card always has its tag; 'Released' only narrows the type. A released
 * card's printings go under its data, in the form slot (#68).
 */
function CardEditor({edit, ready, layout, handoff, onForgetToken, token}: PartProps & {
  ready: ReadyLookup;
  layout: StudioLayout;
  token: string;
}) {
  const resets = useFormResets(edit);
  const outcomeShowing = outcomeShows({result: edit.result, error: edit.saveError, dropped: edit.dropped});
  return (
    <>
      <div style={WHOLE_ROW[layout]}>
        <EditingBanner
          card={ready.card}
          tag={edit.tag ?? 'Released'}
          deployed={edit.deployed}
          handoff={outcomeShowing ? undefined : handoff}
        />
      </div>
      <StudioSlots
        layout={layout}
        slots={{
          card: (
            <StudioCardPanel
              card={edit.previewCard}
              mode="edit"
              layout={layout}
              staged={{name: edit.imageName, error: edit.imageError}}
              current={ready.card}
              imageControl={!edit.printingsOnly}
              onImageChange={edit.onImageChange}
              onRevertImage={edit.revertImage}
            />
          ),
          form: (
            <FormSlot released={edit.tag === 'Released'} card={ready.card} token={token}>
              <EditForm
                key={resets.formKey}
                edit={edit}
                ready={ready}
                layout={layout}
                handoff={handoff}
                inksRestored={resets.inksRestored}
              />
            </FormSlot>
          ),
          aside: (
            <EditAside
              edit={edit}
              handoff={handoff}
              onForgetToken={onForgetToken}
              onDiscard={resets.discard}
              onRevert={resets.revertRow}
            />
          ),
        }}
      />
    </>
  );
}

/**
 * Edit card (R-2): one state at a time, in the lookup's order (R3's
 * cardPageState). A ready card opens in the editor; one that loads says so;
 * every other state is the search, with a line above it saying why the URL's
 * card isn't open. The pane holds the search's query, so it survives opening
 * a card and coming back. The controller lives in StudioWorkspace, so a mode
 * switch keeps the draft (R-57).
 */
export function EditPane({edit, cardId, layout, handoff, onForgetToken, token}: EditPaneProps) {
  const [query, setQuery] = useState('');
  const {lookup} = edit;
  const parts = {edit, handoff, onForgetToken};
  if (lookup.kind === 'ready') {
    return <CardEditor key={lookup.card.id} {...parts} ready={lookup} layout={layout} token={token} />;
  }
  if (lookup.kind === 'loading') {
    return (
      <div style={WHOLE_ROW[layout]}>
        <Notice>Loading the card…</Notice>
      </div>
    );
  }
  return (
    <div style={WHOLE_ROW[layout]}>
      <SearchView
        {...parts}
        query={query}
        onQuery={setQuery}
        notice={<EntryNotice lookup={lookup} cardId={cardId} handoff={handoff} />}
      />
    </div>
  );
}

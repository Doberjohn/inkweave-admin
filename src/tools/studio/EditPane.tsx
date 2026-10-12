import {useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {CtaButton, useCardDataContext} from '../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {Notice} from '../../ui/Notice';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {goneNote} from './branchCards';
import {IMAGE_ONLY_NOTES} from './cardEdit';
import {ChangeList} from './components/ChangeList';
import {CommitOutcome} from './components/CommitOutcome';
import {EditingBanner} from './components/EditingBanner';
import {EditSearch} from './components/EditSearch';
import {ReleasedCardFacts} from './components/ReleasedCardFacts';
import {StudioCardPanel} from './components/StudioCardPanel';
import {StudioForm} from './components/StudioForm';
import {StudioSlots} from './components/StudioSlots';
import {SynergyPanel} from './components/SynergyPanel';
import type {EditLookup} from './editorState';
import {searchCards} from './editSearch';
import {editNote, saveLabel} from './studioCopy';
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
const LINE: CSSProperties = {margin: 0};

export interface EditPaneProps {
  edit: CardEditorController;
  /** The card the URL names (studioCardOf), for the line while it waits on a failed read of previewCards.json. */
  cardId: string | null;
  layout: StudioLayout;
  /** The page's (R-59): StudioPage asks for it when the URL's card changes, and when the card list's Retry lands. */
  handoff: FocusHandoff;
  /** R-26's Forget token; StudioWorkspace asks first while a draft is dirty (R-84). */
  onForgetToken: () => void;
}

type ReadyLookup = Extract<EditLookup, {kind: 'ready'}>;
type EntryLookup = Exclude<EditLookup, {kind: 'ready' | 'loading'}>;
type PartProps = Pick<EditPaneProps, 'edit' | 'handoff' | 'onForgetToken'>;

/**
 * Whether the outcome line shows something: a save's commit or failure, or
 * what a Load it again kept. While it does, the outcome is the open card's
 * focus target (CommitOutcome takes the handoff once it shows), so the banner
 * leaves the handoff alone: one handoff, never two takers (R-59).
 */
function outcomeShowing({result, saveError, dropped}: Pick<CardEditorController, 'result' | 'saveError' | 'dropped'>) {
  return [result, saveError, dropped].some((value) => value !== null);
}

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
 * A line for a state with no control of its own, as R3's FocusNotice is: it
 * takes a pending handoff after a link opened a card the studio can't, so
 * focus lands on what says why.
 */
function FocusLine({handoff, children}: {handoff: FocusHandoff; children: ReactNode}) {
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
        <FocusLine handoff={handoff}>
          No card has the id <code>{lookup.cardId}</code> in the card list or in previewCards.json. Cards from sets
          before 9 rotated out of Core, and a preview id changes when its card is released: find it by name below.
        </FocusLine>
      );
    case 'fileFailed':
      return (
        <FocusLine handoff={handoff}>
          Card <code>{cardId}</code> opens once previewCards.json can be read.
        </FocusLine>
      );
    case 'gone':
      return <FocusLine handoff={handoff}>{goneNote(lookup.card)}</FocusLine>;
    default:
      return null;
  }
}

/**
 * Edit card's search (R4-5f) over the controller's cards: the card list plus
 * the cards only the branch file holds (R-66), the file's first (R-76). The
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
      notice={notice}
      handoff={handoff}
    />
  );
}

/** A preview card's form, the collector number locked (R-91 1); or, for an image-only card, its facts and why (R-61, R-65). */
function EditForm({edit, ready, layout}: {edit: CardEditorController; ready: ReadyLookup; layout: StudioLayout}) {
  if (ready.imageOnly) return <ReleasedCardFacts card={ready.card} note={IMAGE_ONLY_NOTES[ready.imageOnly]} />;
  if (edit.form === null) return null;
  return (
    <StudioForm form={edit.form} errors={edit.validation.errors} onChange={edit.patchForm} layout={layout} locked={EDIT_LOCKS} />
  );
}

/**
 * The aside: the changes as a diff, the synergies of a card whose fields
 * change (none for an image-only card, R-61), Save, and the outcome, its note
 * picked by whether an image went with the commit. Save asks for the handoff
 * once the commit settles: it went off while it ran, which drops focus to
 * <body> in a browser, so the outcome line takes it. Discard is held while it
 * runs, as Save is (R4-4c). Load it again asks once its re-read lands, and
 * the line then says what it kept (R-68).
 */
function EditAside({edit, handoff, onForgetToken, onDiscard}: PartProps & {onDiscard: () => void}) {
  const save = () => void edit.save().then(handoff.request);
  return (
    <aside aria-label="Changes" style={ASIDE}>
      <ChangeList rows={edit.changes} onDiscard={onDiscard} busy={edit.saving} />
      {edit.form !== null && <SynergyPanel groups={edit.synergyGroups} />}
      <CtaButton type="button" onClick={save} disabled={!edit.canSave} style={SAVE}>
        {saveLabel(edit)}
      </CtaButton>
      <CommitOutcome
        result={edit.result}
        error={edit.saveError}
        note={editNote(edit.result)}
        dropped={edit.dropped}
        onLoadAgain={edit.failure === 'stale' ? askWhenLanded(edit.loadAgain, handoff) : undefined}
        onForgetToken={onForgetToken}
        handoff={handoff}
      />
    </aside>
  );
}

/**
 * One card open in Edit: the Editing banner over the card panel, the form (or
 * the facts) and the aside, in the layout's slot order (R-63). EditPane keys it
 * by the card's id (R-46), so nothing a view holds, such as the open accordion
 * section, carries over to the next card. The form is keyed further by the
 * draft's seed and by Discard, so a re-seed (Load it again) or a Discard opens
 * it fresh too: its open section and its Dual-ink switch follow the form it
 * shows. The banner's h2 takes the page's handoff while the outcome line has
 * nothing to say; after that the line does. A ready card always has its tag;
 * 'Released' only narrows the type.
 */
function CardEditor({edit, ready, layout, handoff, onForgetToken}: PartProps & {ready: ReadyLookup; layout: StudioLayout}) {
  // Discard keeps the draft's seed, so it counts its own resets.
  const [discards, setDiscards] = useState(0);
  const discard = () => {
    edit.discard();
    setDiscards(discards + 1);
  };
  return (
    <>
      <div style={WHOLE_ROW[layout]}>
        <EditingBanner
          card={ready.card}
          tag={edit.tag ?? 'Released'}
          deployed={edit.deployed}
          handoff={outcomeShowing(edit) ? undefined : handoff}
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
              onImageChange={edit.onImageChange}
              onRevertImage={edit.revertImage}
            />
          ),
          form: <EditForm key={`${edit.seed}:${discards}`} edit={edit} ready={ready} layout={layout} />,
          aside: <EditAside edit={edit} handoff={handoff} onForgetToken={onForgetToken} onDiscard={discard} />,
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
export function EditPane({edit, cardId, layout, handoff, onForgetToken}: EditPaneProps) {
  const [query, setQuery] = useState('');
  const {lookup} = edit;
  const parts = {edit, handoff, onForgetToken};
  if (lookup.kind === 'ready') return <CardEditor key={lookup.card.id} {...parts} ready={lookup} layout={layout} />;
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

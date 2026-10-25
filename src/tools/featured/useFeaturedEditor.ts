import {useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction} from 'react';
import {getInks, type LorcanaCard} from 'inkweave-synergy-engine';
import {featuredEntry, type FeaturedEntry} from '../../app-bridge';
import {featuredFailureKind, type FeaturedFailureKind} from './featuredFailure';
import {commitFeatured, readFeatured} from './githubClient';
import {changedSlots, entriesOf, featuredProblem, slotsOf, type CardById, type FeaturedSlot} from './featuredSlots';

export type FeaturedRead =
  | {status: 'loading'}
  // reloadError: the last reload failed, and `entries` is the last read that landed.
  | {status: 'ready'; entries: FeaturedEntry[]; reloadError?: string}
  // No read has landed yet.
  | {status: 'error'; error: string};

export type FeaturedSave =
  | {status: 'idle'}
  | {status: 'saving'}
  | {status: 'saved'; commitUrl: string}
  // kind: the way out the page offers (featuredFailureKind).
  | {status: 'failed'; error: string; kind: FeaturedFailureKind};

/** A slot's staged card: the slot's index, and the card picked for it. */
export type FeaturedPicks = ReadonlyMap<number, LorcanaCard>;

export interface FeaturedEditor {
  read: FeaturedRead;
  /** The six as they would be saved: the branch's file with the picks over it. Empty until a read lands. */
  slots: FeaturedSlot[];
  /** Each slot's card as the branch's file has it, for "Was …". Empty until a read lands. */
  saved: FeaturedSlot[];
  picks: FeaturedPicks;
  /** Why Save is off, or null: nothing picked, a save running, or what featuredProblem refuses. */
  blocked: string | null;
  save: FeaturedSave;
  stage: (index: number, card: LorcanaCard) => void;
  undo: (index: number) => void;
  discard: () => void;
  onSave: () => void;
  /** Reads the file again, keeping the picks that still change a slot: a stale refusal's way out. Resolves true once a read lands. */
  reload: () => Promise<boolean>;
}

/**
 * Starts a read of featuredCardIds.json. `newest` numbers the reads, and only
 * the newest one sets the state, so a slow read never lands over a newer one
 * (as useLiveTuning's do). A failed reload keeps the entries already read.
 */
function startRead(
  token: string,
  newest: RefObject<number>,
  setRead: Dispatch<SetStateAction<FeaturedRead>>,
): Promise<boolean> {
  const read = ++newest.current;
  return readFeatured(token).then(
    (entries) => {
      if (read !== newest.current) return false;
      setRead({status: 'ready', entries});
      return true;
    },
    (e: unknown) => {
      if (read !== newest.current) return false;
      const error = e instanceof Error ? e.message : 'Read failed';
      setRead((prev) => (prev.status === 'ready' ? {...prev, reloadError: error} : {status: 'error', error}));
      return false;
    },
  );
}

/** A slot with a picked card in it. */
function pickedSlot(slot: FeaturedSlot, card: LorcanaCard): FeaturedSlot {
  const {card: label} = featuredEntry({id: card.id, inks: getInks(card), fullName: card.fullName});
  return {ink: slot.ink, id: card.id, label, card};
}

const entriesIn = (read: FeaturedRead) => (read.status === 'ready' ? read.entries : []);

/** A failed save, with the way out its error asks for. */
const failedSave = (e: unknown): FeaturedSave => ({
  status: 'failed',
  error: e instanceof Error ? e.message : 'Save failed',
  kind: featuredFailureKind(e),
});

/** The picks left once a save of `sent` lands: those made while it ran, which it didn't commit. */
const unsent = (picks: FeaturedPicks, sent: FeaturedPicks): FeaturedPicks =>
  new Map([...picks].filter(([index, card]) => sent.get(index) !== card));

/** The picks that still change a slot: a pick of the card the branch's file now holds there stages nothing. */
const stillPicked = (picks: FeaturedPicks, saved: readonly FeaturedSlot[]): FeaturedPicks =>
  new Map([...picks].filter(([index, card]) => saved[index]?.id !== card.id));

/** Why Save is off, or null. */
function blockedReason({picks, slots, save}: {picks: FeaturedPicks; slots: FeaturedSlot[]; save: FeaturedSave}): string | null {
  if (save.status === 'saving') return 'Saving…';
  if (picks.size === 0) return 'Pick a card to change first.';
  return featuredProblem(slots);
}

/**
 * The Featured cards page's state: featuredCardIds.json from the target
 * branch (read once per token, and again on reload() and after a save), the
 * picks staged over it, and the save. A save writes the six in one commit
 * (commitFeatured). Once it lands the page shows the six it committed, keeps
 * only the picks made while it ran, and reads the file again to confirm. A
 * pick lasts until it is saved, undone or discarded: a read that brings the
 * picked card into its slot drops it, and Reload keeps every other.
 */
export function useFeaturedEditor(token: string, cardById: CardById): FeaturedEditor {
  const [read, setRead] = useState<FeaturedRead>({status: 'loading'});
  const [staged, setPicks] = useState<FeaturedPicks>(new Map());
  const [save, setSave] = useState<FeaturedSave>({status: 'idle'});
  const newest = useRef(0);

  useEffect(() => {
    void startRead(token, newest, setRead);
  }, [token]);

  const loaded = entriesIn(read);
  const saved = slotsOf(loaded, cardById);
  const picks = stillPicked(staged, saved);
  const slots = saved.map((slot, i) => {
    const card = picks.get(i);
    return card ? pickedSlot(slot, card) : slot;
  });

  const stage = (index: number, card: LorcanaCard) => {
    setPicks((prev) => {
      const next = new Map(prev);
      if (saved[index]?.id === card.id) next.delete(index);
      else next.set(index, card);
      return next;
    });
  };
  const undo = (index: number) => {
    setPicks((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  };
  const discard = () => setPicks(new Map());
  const reload = () => {
    setSave({status: 'idle'});
    return startRead(token, newest, setRead);
  };

  const blocked = blockedReason({picks, slots, save});
  const onSave = () => {
    if (blocked) return;
    const entries = entriesOf(slots);
    const sent = picks;
    setSave({status: 'saving'});
    commitFeatured({token, entries, loaded, changes: changedSlots(loaded, entries)}).then(
      ({commitUrl}) => {
        setSave({status: 'saved', commitUrl});
        // The branch holds what the commit wrote, so the slots show it now, and stay right if the re-read fails.
        setRead({status: 'ready', entries});
        setPicks((prev) => unsent(prev, sent));
        void startRead(token, newest, setRead);
      },
      (e: unknown) => setSave(failedSave(e)),
    );
  };

  return {read, slots, saved, picks, blocked, save, stage, undo, discard, onSave, reload};
}

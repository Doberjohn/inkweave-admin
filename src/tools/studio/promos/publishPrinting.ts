import {
  commitFiles,
  readRepoFile,
  targetBranch,
  utf8ToBase64,
  type CommitFile,
} from '../../../github/githubCommit';
import {RAW_DIR} from '../../image/githubClient';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH} from '../finishes/finishFiles';
import {withEditedPrinting, withNewPrinting, type NewPrinting, type PrintingEdit} from './catalogEdits';
import {
  findPrinting,
  isKnownPromoSet,
  parseCatalog,
  printingCode,
  serializeCatalog,
  takenBy,
  type BaseCard,
  type CatalogPrinting,
  type CodeParts,
  type PromoCatalog,
} from './promoCatalog';
import {mergeOver, outOfStep, type MergeInput} from './promoMerge';

/*
 * The publish of a promo printing's add or edit (#77): one commit on the target branch that writes the
 * owner's catalog, the card files the app's merge rewrites from it, and the scan. All of it is decided at
 * the commit the publish builds on. `commitFiles` hands that commit to a callback, which reads the catalog
 * and both card files there, checks the change against them, applies it and runs the app's merge over the
 * result (promoMerge.ts). A change the branch can't take is refused there, before anything is written
 * (PrintingRefusal), and so is a branch that moves meanwhile (commitFiles' own error, which ends "Publish
 * again."). allCards.json and collection/promos.json are the merge's output, each sent only when its text
 * changes: nothing here edits their entries. Any other failure, an unreadable file or a catalog the merge
 * can't take, passes through as it is. A code that a message or a result names is the printing's own, its
 * art variant included: 24A/P2, not 24/P2.
 */

/** A scan to commit: its extension as the image control takes it (jpg, jpeg, png or webp), and its bytes in base64, with no data-URL prefix. */
export interface ScanFile {
  ext: string;
  base64: string;
}

/**
 * What an edit checks the branch's entry against: the fields its form edits, whether its art is
 * Ravensburger's, and its art variant where it has one (the A in 24A/P2), which a code needs to name it.
 */
export interface PrintingFacts {
  promoGrouping: string;
  number: number | null;
  scanLanguage: string | null;
  officialArt: boolean;
  /** As the catalog holds it, so the key is left out where the printing has none. */
  artVariant?: string;
}

/** A printing to add to its card, with the scan the printing needs. */
interface AddChange {
  kind: 'add';
  card: BaseCard;
  printing: NewPrinting;
  note: string | null;
  scan: ScanFile;
}

/** An edit of the printing `id`, as the form opened it (`from`); `scan` replaces its art where there is one. */
interface EditChange {
  kind: 'edit';
  card: BaseCard;
  id: number;
  from: PrintingFacts;
  edit: PrintingEdit;
  note: string | null;
  scan: ScanFile | null;
}

/** What a publish does: an add or an edit of a promo printing. */
export type PrintingChange = AddChange | EditChange;

/** Why a publish was refused. */
export type RefusalKind = 'outOfStep' | 'taken' | 'unknownSet' | 'changed' | 'gone';

/** A publish the branch can't take as it is. Nothing was written, and the message tells the owner what to do. */
export class PrintingRefusal extends Error {
  name = 'PrintingRefusal';
  readonly kind: RefusalKind;
  /** For 'changed': the printing as the branch holds it now, for the form to show. */
  readonly now: CatalogPrinting | null;

  constructor({kind, message, now = null}: {kind: RefusalKind; message: string; now?: CatalogPrinting | null}) {
    super(message);
    this.kind = kind;
    this.now = now;
  }
}

/** What a landed publish tells: its commit, and the printing it added or edited, by id and by code. */
export interface PrintingPublished {
  commitUrl: string;
  id: number;
  code: string;
}

/** The facts an edit checks the branch's entry against: the fields its form edits, whether the entry has Ravensburger's art (`images`), and its art variant. */
export function factsOf(printing: CatalogPrinting): PrintingFacts {
  const facts: PrintingFacts = {
    promoGrouping: printing.promoGrouping,
    number: printing.number ?? null,
    scanLanguage: printing.scanLanguage ?? null,
    officialArt: printing.images !== undefined,
  };
  if (printing.artVariant !== undefined) facts.artVariant = printing.artVariant;
  return facts;
}

/** Whether two sets of facts agree on every field. */
function sameFacts(a: PrintingFacts, b: PrintingFacts): boolean {
  return a.promoGrouping === b.promoGrouping
    && a.number === b.number
    && a.scanLanguage === b.scanLanguage
    && a.officialArt === b.officialArt
    && a.artVariant === b.artVariant;
}

/** The code the facts name, as the form showed it when it opened: "13/C3", "24A/P2", or "?/C1" where nobody knows the number. */
function oldCodeOf({promoGrouping, number, artVariant}: PrintingFacts): string {
  return printingCode({promoGrouping, number: number ?? undefined, artVariant});
}

/** The parts of the printing's code once the change is made. An edit keeps the printing's art variant: the form doesn't change it. */
function codePartsAfter(change: PrintingChange): CodeParts {
  if (change.kind === 'add') return {promoGrouping: change.printing.promoGrouping, number: change.printing.number};
  const {promoGrouping, number} = change.edit;
  return {promoGrouping, number, artVariant: change.from.artVariant};
}

/**
 * The commit's message: the printing and its card, as the version commits word theirs (#68). An edit that
 * moves the printing names the code it had and the one it has. `code` is the printing's code after the change.
 */
export function printingCommitMessage({change, code}: {change: PrintingChange; code: string}): string {
  const {fullName} = change.card;
  if (change.kind === 'add') return `chore(collection): add ${code} ${fullName} from Card studio`;
  const was = oldCodeOf(change.from);
  const moved = was === code ? '' : ` to ${code}`;
  return `chore(collection): edit ${was}${moved} ${fullName} from Card studio`;
}

/** Refuses files the merge would change as they are: the commit would carry someone else's half-done change with the printing. */
function requireInStep(held: MergeInput): void {
  const names = outOfStep(held);
  if (names.length === 0) return;
  throw new PrintingRefusal({
    kind: 'outOfStep',
    message: `The catalog and the card files are out of step on ${targetBranch()}: the merge would change ${names.join(', ')}. Run pnpm merge-promos --write in the app, then publish again.`,
  });
}

/**
 * The printing an edit changes, as the branch holds it. A printing the branch lacks is gone. One whose
 * facts aren't those its form opened with was changed since, and the refusal hands back the branch's entry.
 */
function entryToEdit({catalog, change}: {catalog: PromoCatalog; change: EditChange}): CatalogPrinting {
  const was = oldCodeOf(change.from);
  const found = findPrinting(catalog, change.id);
  if (!found) throw new PrintingRefusal({kind: 'gone', message: `${was} is no longer on ${targetBranch()}.`});
  if (sameFacts(factsOf(found.printing), change.from)) return found.printing;
  throw new PrintingRefusal({
    kind: 'changed',
    message: `Someone changed ${was} on ${targetBranch()} after you opened it. The form now shows the branch's values: make your change again.`,
    now: found.printing,
  });
}

/** Refuses a promo set the app doesn't know (`PROMO_SETS`, at admin's pin). */
function requireKnownSet({promoGrouping}: Pick<CodeParts, 'promoGrouping'>): void {
  if (isKnownPromoSet(promoGrouping)) return;
  throw new PrintingRefusal({
    kind: 'unknownSet',
    message: `${promoGrouping} isn't one of the app's promo sets. Add it to PROMO_SETS in the app first.`,
  });
}

/** Refuses a code another printing has. `exceptId` leaves out the printing being edited. */
function requireFreeCode({catalog, code, exceptId}: {catalog: PromoCatalog; code: CodeParts; exceptId?: number}): void {
  const holder = takenBy({catalog, code, exceptId});
  if (!holder) return;
  throw new PrintingRefusal({
    kind: 'taken',
    message: `${printingCode(code)} is taken on ${targetBranch()}: ${holder.group.fullName} has it.`,
  });
}

/** Whether the edit moves the printing to another promo set. */
function movesSet({entry, edit}: {entry: CatalogPrinting; edit: PrintingEdit}): boolean {
  return entry.promoGrouping !== edit.promoGrouping;
}

/** Whether the edit moves the printing to another promo set or number. Only then can its code clash with another printing's. */
function movesCode({entry, edit}: {entry: CatalogPrinting; edit: PrintingEdit}): boolean {
  return movesSet({entry, edit}) || entry.number !== edit.number;
}

/** An add is held to every rule: a promo set the app knows, and a code nobody has. */
function checkAdd({catalog, change}: {catalog: PromoCatalog; change: AddChange}): void {
  requireKnownSet(change.printing);
  requireFreeCode({catalog, code: codePartsAfter(change)});
}

/**
 * An edit is held to what it moves. One that moves the printing to another promo set needs a set the app
 * knows, and one that moves it to another set or number needs a code nobody has. A note, a scan or a scan
 * language changes neither, so it is never refused for a code the printing has already: twins share one
 * (Moana and Vaiana's 26/P2, the two Hades of 28/C3), and so does a printing in a set the app learned of
 * before admin's pin did. The printing's art variant counts in its code, so 24A/P2 and 24B/P2 stay two.
 */
function checkEdit({catalog, change}: {catalog: PromoCatalog; change: EditChange}): void {
  const entry = entryToEdit({catalog, change});
  const {edit} = change;
  if (movesSet({entry, edit})) requireKnownSet(edit);
  if (movesCode({entry, edit})) requireFreeCode({catalog, code: codePartsAfter(change), exceptId: change.id});
}

/**
 * Refuses a change the branch can't take as it is, in this order: files out of step, a printing that is
 * gone or changed since its form opened (an edit), a promo set the app doesn't know, and a code that is taken.
 */
function checkAtBase({change, held}: {change: PrintingChange; held: MergeInput}): void {
  requireInStep(held);
  if (change.kind === 'add') checkAdd({catalog: held.catalog, change});
  else checkEdit({catalog: held.catalog, change});
}

/** The catalog with the change made, and the id of the printing it adds or edits. */
function applied({change, catalog}: {change: PrintingChange; catalog: PromoCatalog}): {catalog: PromoCatalog; id: number} {
  if (change.kind === 'add') return withNewPrinting({catalog, card: change.card, printing: change.printing, note: change.note});
  const {id, edit, note} = change;
  return {catalog: withEditedPrinting({catalog, id, edit, note}), id};
}

/** A text file of the commit. */
function textFile({path, text}: {path: string; text: string}): CommitFile {
  return {path, contentBase64: utf8ToBase64(text)};
}

/**
 * The commit's files: the catalog as changed, each card file whose text the app's merge changes, and the
 * scan where there is one. The merge runs over the files as the branch holds them (`held`).
 */
function filesToCommit({change, id, catalog, held}: {change: PrintingChange; id: number; catalog: PromoCatalog; held: MergeInput}): CommitFile[] {
  const merged = mergeOver({catalog, files: held.files});
  const files = [textFile({path: CATALOG_PATH, text: serializeCatalog(catalog)})];
  if (merged.allCards !== held.files.allCards) files.push(textFile({path: ALL_CARDS_PATH, text: merged.allCards}));
  if (merged.promos !== held.files.promos) files.push(textFile({path: PROMOS_PATH, text: merged.promos}));
  // RAW_DIR is where Edit card's image tool commits a scan too: the app converts it to the printing's art.
  if (change.scan) files.push({path: `${RAW_DIR}/${id}.${change.scan.ext}`, contentBase64: change.scan.base64});
  return files;
}

/** What a publish commits, and the id of its printing. */
interface Plan {
  files: CommitFile[];
  id: number;
}

/** The catalog and both card files as they are at the commit `base`. */
async function readHeld({token, base}: {token: string; base: string}): Promise<MergeInput> {
  const paths = [CATALOG_PATH, ALL_CARDS_PATH, PROMOS_PATH];
  const [catalog, allCards, promos] = await Promise.all(paths.map((path) => readRepoFile(token, path, base)));
  return {catalog: parseCatalog(catalog), files: {allCards, promos}};
}

/** Reads the branch at `base`, checks the change against it and works out what to commit. */
async function planAt({token, base, change}: {token: string; base: string; change: PrintingChange}): Promise<Plan> {
  const held = await readHeld({token, base});
  checkAtBase({change, held});
  const {catalog, id} = applied({change, catalog: held.catalog});
  return {files: filesToCommit({change, id, catalog, held}), id};
}

/**
 * Publishes the change in one commit on the target branch: the catalog, the card files the app's merge
 * changes, and the scan. Nothing is written when the branch can't take it (PrintingRefusal, whose `kind`
 * says why), when a file can't be read or the catalog can't merge (the error as it is), or when the
 * branch moves first (commitFiles' error, whose message ends "Publish again.").
 */
export async function publishPrinting({token, change}: {token: string; change: PrintingChange}): Promise<PrintingPublished> {
  const code = printingCode(codePartsAfter(change));
  // An add's id is the next one at the base, so it is known only inside the callback, which
  // commitFiles calls once and only returns after.
  const planned: Plan[] = [];
  const {commitUrl} = await commitFiles({
    token,
    message: printingCommitMessage({change, code}),
    files: async (base) => {
      const plan = await planAt({token, base, change});
      planned.push(plan);
      return plan.files;
    },
  });
  return {commitUrl, id: planned[0].id, code};
}

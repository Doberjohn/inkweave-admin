import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {finishesOf} from '../../../app-bridge';
import {
  commitFiles,
  readRepoFile,
  targetBranch,
  utf8ToBase64,
  type CommitFile,
  type CommitResult,
} from '../../../github/githubCommit';
import {namingItsFile, type BranchFile} from './branchFiles';
import {FinishFileError, readEntryFacts, writeFinishes, type EntryFacts} from './finishFiles';
import {sameFinishes} from './finishValues';
import {homesOf, primaryHome} from './printingHomes';
import type {VersionChange, VersionClash} from './versionBatch';

/*
 * A publish of the batch of version changes (#68): one commit on the target branch that writes each
 * change's versions into every file that holds its printing (`homesOf`), with the files read at the
 * commit it builds on. If the branch moves meanwhile, commitFiles refuses the commit rather than
 * undo the other change.
 *
 * Each change remembers the value its printing's primary home held when it was staged (`from`).
 * Where that file now holds another value, or no longer holds the printing, someone changed it since:
 * the change clashes. A publish with a clash writes nothing and names every clash at once, for the
 * batch to mark (`withClashes`), so the owner keeps or drops each one before publishing again.
 */

/** The commit's message. */
export function versionCommitMessage(count: number): string {
  return `chore(collection): set the versions of ${count} printing${count === 1 ? '' : 's'} from Card studio`;
}

/**
 * What the owner is told of the changes clashed: by a publish refused for them, or by a choice made
 * again from a row read since. Either way the owner settles them before a publish.
 */
export function clashMessage(count: number): string {
  const clash = count === 1 ? ' clashes' : 's clash';
  const printings = count === 1 ? 'this printing' : 'these printings';
  return `${count} change${clash}: someone changed ${printings} on ${targetBranch()} since. Keep or drop each one, then publish.`;
}

/** A publish refused because printings changed on the branch since their changes were staged. It names every one. */
export class VersionClashError extends Error {
  name = 'VersionClashError';
  readonly clashes: readonly VersionClash[];

  constructor(clashes: readonly VersionClash[]) {
    super(clashMessage(clashes.length));
    this.clashes = clashes;
  }
}

/** A file at the commit a publish builds on, with what each of its entries says. */
interface BaseFile extends BranchFile {
  facts: ReadonlyMap<string, EntryFacts>;
}

/**
 * What each entry of a file says, naming a file whose text its parser can't read. Every file is
 * read through it, so writing one can then fail only for an id it lacks (FinishFileError).
 */
const factsIn = namingItsFile(readEntryFacts);

/** Every file that holds a change's printing, each once, in path order: the order a publish reads and writes them in. */
function pathsOf(changes: readonly VersionChange[]): string[] {
  return [...new Set(changes.flatMap(({ref}) => homesOf(ref)))].sort();
}

/** Reads the files at `base`, in the order given. */
async function readBase({token, paths, base}: {token: string; paths: readonly string[]; base: string}): Promise<BaseFile[]> {
  const texts = await Promise.all(paths.map((path) => readRepoFile(token, path, base)));
  return paths.map((path, i) => ({path, text: texts[i], facts: factsIn({path, text: texts[i]})}));
}

/**
 * The clash a change meets at the base, or null where its printing's primary home still holds the
 * value the change was staged from. What the printing comes in now follows the rarity that file gives it.
 */
function clashOf({change, files}: {change: VersionChange; files: readonly BaseFile[]}): VersionClash | null {
  const {id, ref, from} = change;
  const home = primaryHome(ref);
  const facts = files.find(({path}) => path === home)?.facts.get(id);
  if (!facts) return {id, now: null, shownNow: [], gone: true};
  if (sameFinishes(facts.finishes, from)) return null;
  const {finishes: now, rarity} = facts;
  return {id, now, shownNow: finishesOf({rarity, finishes: now ?? undefined})};
}

/** What a file is written with: by id, the versions of each change whose printing it holds, and only those. */
function valuesFor({path, changes}: {path: string; changes: readonly VersionChange[]}): Map<string, PrintingFinishes> {
  const homed = changes.filter(({ref}) => homesOf(ref).includes(path));
  return new Map(homed.map(({id, to}): [string, PrintingFinishes] => [id, to]));
}

/**
 * A file's refusal of an id it lacks (FinishFileError), named by the change that would have written
 * it there, with the way out: every publish fails the same way until that change leaves the batch.
 * Any other failure is as it was.
 */
function namingTheChange({error, changes}: {error: unknown; changes: readonly VersionChange[]}): unknown {
  if (!(error instanceof FinishFileError)) return error;
  const change = changes.find(({id}) => id === error.id);
  if (!change) return error;
  return new FinishFileError(`${change.label}: ${error.message}. Revert it to publish the rest.`, {id: change.id, cause: error});
}

/**
 * The commit's files: each file written with its changes' versions, where that changes its text. A
 * file that lacks a change's printing refuses the whole commit, naming that change (`namingTheChange`).
 */
function writtenFiles({changes, files}: {changes: readonly VersionChange[]; files: readonly BaseFile[]}): CommitFile[] {
  try {
    return files.flatMap(({path, text}) => {
      const written = writeFinishes({path, text, values: valuesFor({path, changes})});
      return written === text ? [] : [{path, contentBase64: utf8ToBase64(written)}];
    });
  } catch (error) {
    throw namingTheChange({error, changes});
  }
}

/**
 * Writes the changes' versions in one commit on the target branch. Nothing is written when a change
 * clashes (VersionClashError, naming every clash), when a file that should hold a printing lacks it
 * (FinishFileError, naming its change), when a file can't be read, or when the branch moves first
 * (commitFiles' race, whose message ends "Publish again.").
 */
export async function publishVersions({token, changes}: {token: string; changes: readonly VersionChange[]}): Promise<CommitResult> {
  return commitFiles({
    token,
    message: versionCommitMessage(changes.length),
    files: async (base) => {
      const files = await readBase({token, paths: pathsOf(changes), base});
      const clashes = changes.map((change) => clashOf({change, files})).filter((clash) => clash !== null);
      if (clashes.length > 0) throw new VersionClashError(clashes);
      return writtenFiles({changes, files});
    },
  });
}

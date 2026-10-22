import {vi} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {askedOf, contentsAnswer, type Served} from '../finishes/__tests__/branchHarness';
import {chunksOf} from '../finishes/__tests__/collectionHarness';
import {SET_4_ENTRIES} from '../finishes/__tests__/finishFixtures';
import {BASE, stubRepo, type RepoAnswers, type RepoStub} from '../finishes/__tests__/repoHarness';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, VARIANTS_ENTRY, previewFileText} from '../studioFixtures';
import {stubFetch, type Answer} from './studioHarness';

/*
 * Card studio's page against GitHub with the app's repo besides (#68), for the page tests that
 * commit to it: the Version changes tray's publish (StudioVersions.test.tsx) and Edit card's Save
 * beside a staged batch (StudioPrintings.test.tsx). It stubs fetch, as branchHarness and repoHarness
 * explain why.
 */

const REPO_API = 'https://api.github.com/repos/Doberjohn/inkweave';
const CONTENTS = `${REPO_API}/contents/`;

/** The branch's previewCards.json: Mei and Ming, which the card list holds too, and Wren, which only the file holds. */
const FILE: LorcanaJSONCard[] = [PREVIEW_ENTRY, VARIANTS_ENTRY, BRANCH_ONLY_ENTRY];

/** previewCards.json, as GitHub's raw contents answer it. */
const previewFile: Answer = () => new Response(previewFileText(FILE));

/** Where a request goes: to the page's own fetch, to the branch's data files as the panel reads them, or to the repo's git data. */
function routeOf(call: Parameters<typeof fetch>): 'page' | 'branch' | 'git' {
  const [url] = call;
  if (typeof url !== 'string' || !url.startsWith(`${REPO_API}/`)) return 'page';
  if (!url.startsWith(CONTENTS)) return 'git';
  const {path, ref} = askedOf(call);
  if (path.endsWith('previewCards.json')) return 'page';
  // A publish reads the files at the commit it builds on; the panel reads them on the branch.
  return ref === BASE ? 'git' : 'branch';
}

/** What the page's repo holds: the data files on the branch, those at the commit a publish builds on, and its ref update. */
export interface StudioRepo {
  branch: Record<string, Served>;
  base?: Record<string, Served>;
  update?: RepoAnswers['update'];
}

/**
 * The page's fetch, and the app's repo besides. The panel reads the data files as `branch` holds
 * them; a publish reads them as `base` holds them, at the commit it builds on, which is how a test
 * has the branch move after the panel read it. The repo answers a commit's git calls, and its ref
 * update as `update` does: by default it moves the branch. Unstub in afterEach (`vi.unstubAllGlobals`).
 */
export function stubStudioRepo({branch, base = branch, update}: StudioRepo): RepoStub {
  stubFetch(previewFile, chunksOf({'4': SET_4_ENTRIES}));
  const page = globalThis.fetch;
  const repo = stubRepo({files: base, update});
  const git = globalThis.fetch;
  const onBranch = contentsAnswer(branch);
  const routes = {page, branch: onBranch, git};
  vi.stubGlobal('fetch', vi.fn((...call: Parameters<typeof fetch>) => routes[routeOf(call)](...call)));
  return repo;
}

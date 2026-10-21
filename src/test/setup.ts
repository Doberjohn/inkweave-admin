import '@testing-library/jest-dom/vitest';
import {resetAdminDataCache} from '../tools/analytics/adminData';
import {resetVotesFilter} from '../tools/analytics/votesFilter';
import {resetBranchFiles} from '../tools/studio/finishes/branchFiles';
import {resetCollectionOnlyCards} from '../tools/studio/finishes/collectionCards';
import {resetVersionBatch} from '../tools/studio/finishes/versionBatchStore';

// fetchAdminData keeps each artifact for the session in module state, the votes
// filter is one setting for the session (#33), the studio keeps each file it
// read from the target branch, and what it parsed to (#68), the cards of Sets 1
// to 8 it read from the app's collection chunks (#68), and its batch of
// version changes lives in module state and in localStorage (#68). Reset all
// five before every test, so no test inherits another's fetch, data, filter,
// read, cards or batch. The batch's reset deletes the master batch's saved copy
// too, so a test that saves under another branch's key clears it itself.
//
// This file loads branchFiles and versionBatchStore, and githubCommit and
// publishVersions with them, before a test file's vi.mock registers, so a
// vi.mock of either never reaches them: a test of what reads the branch's files
// stubs fetch instead (src/tools/studio/finishes/__tests__/branchHarness.ts), a
// test of a publish stubs the calls that commit too (repoHarness.ts beside it),
// and a test of the batch gives it another branch with vi.stubEnv. The cards of
// Sets 1 to 8 are the same: collectionCards is loaded here for its reset, so a
// test of what reads them stubs fetch for their chunks (collectionHarness.ts).
beforeEach(() => {
  resetAdminDataCache();
  resetVotesFilter();
  resetBranchFiles();
  resetCollectionOnlyCards();
  resetVersionBatch();
});

import '@testing-library/jest-dom/vitest';
import {resetAdminDataCache} from '../tools/analytics/adminData';
import {resetVotesFilter} from '../tools/analytics/votesFilter';
import {resetBranchFiles} from '../tools/studio/finishes/branchFiles';

// fetchAdminData keeps each artifact for the session in module state, the votes
// filter is one setting for the session (#33), and the studio keeps each file it
// read from the target branch, and what it parsed to (#68). Reset all three
// before every test, so no test inherits another's fetch, data, filter or read.
//
// This file loads branchFiles, and githubCommit with it, before a test file's
// vi.mock registers, so a vi.mock of githubCommit never reaches branchFiles: a
// test of what reads the branch's files stubs fetch instead
// (src/tools/studio/finishes/__tests__/branchHarness.ts).
beforeEach(() => {
  resetAdminDataCache();
  resetVotesFilter();
  resetBranchFiles();
});

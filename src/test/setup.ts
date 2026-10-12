import '@testing-library/jest-dom/vitest';
import {resetAdminDataCache} from '../tools/analytics/adminData';
import {resetVotesFilter} from '../tools/analytics/votesFilter';

// fetchAdminData keeps each artifact for the session in module state, and the
// votes filter is one setting for the session (#33). Reset both before every
// test, so no test inherits another's fetch, data or filter.
beforeEach(() => {
  resetAdminDataCache();
  resetVotesFilter();
});

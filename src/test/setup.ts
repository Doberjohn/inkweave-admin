import '@testing-library/jest-dom/vitest';
import {resetAdminDataCache} from '../tools/analytics/adminData';

// fetchAdminData keeps each artifact for the session in module state. Empty it
// before every test, so no test inherits another's fetch or data.
beforeEach(() => resetAdminDataCache());

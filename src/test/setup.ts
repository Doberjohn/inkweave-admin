import '@testing-library/jest-dom/vitest';
import {resetAdminDataCache} from '../tools/analytics/adminData';

// fetchAdminData keeps each artifact for the session in module state. Empty it
// before every test, so no test inherits another's fetch or data.
beforeEach(() => resetAdminDataCache());

// jsdom does no layout, so it has no scrollIntoView. A no-op stands in, so a
// component that scrolls a row into view renders; a test that checks the
// scroll spies on it. A node-environment test has no Element at all.
if (typeof Element !== 'undefined') Element.prototype.scrollIntoView ??= () => {};

import type {Preview} from '@storybook/react-vite';
import {themes} from 'storybook/theming';
// The bridge also loads the app's global stylesheet (fonts, .card-tile) and the skeleton styles.
import {COLORS} from '../src/app-bridge';
import {AdminStyles} from '../src/theme/AdminStyles';
import {resetVotesFilter} from '../src/tools/analytics/votesFilter';

// The same dark canvas as the app's Storybook.
const preview: Preview = {
  decorators: [
    (Story) => (
      <div style={{background: COLORS.background, minHeight: '100vh'}}>
        {/* Admin's adm-* classes, which AdminShell mounts on the site, so every story can use them. */}
        <AdminStyles />
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      options: {
        dark: {name: 'Inkweave dark', value: COLORS.background},
        surface: {name: 'Surface', value: COLORS.surface},
      },
    },
    docs: {theme: themes.dark},
  },
  initialGlobals: {backgrounds: {value: 'dark'}},
  // The votes filter is one setting for the session (#33), kept in module
  // state: every story opens at Any, as a reload does, and a story that wants
  // another step sets it in its own beforeEach, which runs after this one.
  beforeEach: () => {
    resetVotesFilter();
  },
};

export default preview;

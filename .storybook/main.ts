import type {StorybookConfig} from '@storybook/react-vite';
// With the extension: Storybook loads this file as native ESM.
import viteConfig from '../vite.config.ts';

// Admin's local Storybook (docs/PLAN.md, section 7): the ported stories, with no
// Chromatic and no story-coverage gate. It builds through vite.config.ts, so
// stories compile with the same React Compiler setup as the site.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  // Storybook's Vite builder replaces the project's `server` block, which drops
  // the dev proxy. Put it back, so stories load the app's fonts and card images
  // from inkweave.ink the way the site does (docs/PLAN.md, D5).
  viteFinal: (config) => ({...config, server: {...config.server, proxy: viteConfig.server?.proxy}}),
};
export default config;

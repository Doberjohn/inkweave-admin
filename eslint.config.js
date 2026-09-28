import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
// The app's design-token rules, loaded from the pinned submodule so admin UI is
// held to the same design system. Nothing is grandfathered here: the plugin's
// ledger lists app paths only, so every admin file gets the full rules.
import {inkweave} from './upstream/inkweave/apps/web/eslint-rules/index.js';

export default tseslint.config(
  {ignores: ['dist', 'coverage', 'upstream']},
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {ecmaVersion: 2022, globals: globals.browser},
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],
      'react-compiler/react-compiler': 'error',
      // Same ban as the app (#291): the React Compiler memoizes automatically.
      'no-restricted-syntax': [
        'error',
        {selector: "CallExpression[callee.name='useMemo']", message: 'Avoid useMemo: the React Compiler auto-memoizes.'},
        {selector: "CallExpression[callee.name='useCallback']", message: 'Avoid useCallback: the React Compiler auto-memoizes.'},
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {inkweave},
    rules: {
      'inkweave/no-raw-hex-colors': 'error',
      'inkweave/no-raw-rgba': 'error',
      'inkweave/no-literal-font-family': 'error',
      'inkweave/no-raw-font-size': 'error',
      'inkweave/no-raw-radius': 'error',
      'inkweave/no-raw-z-index': 'error',
      'inkweave/no-raw-easing': 'error',
      'inkweave/no-backdrop-filter': 'error',
      'inkweave/no-adhoc-buttons': 'error',
      'inkweave/no-unshelled-dialogs': 'error',
    },
  },
  // D3: app code enters admin only through src/app-bridge.ts.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app-bridge.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/upstream/**'],
              message: 'Import app code through src/app-bridge.ts (docs/PLAN.md, D3).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {ecmaVersion: 2022, sourceType: 'module', globals: globals.node},
  },
);

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

// Same ban as the app (#291): the React Compiler memoizes automatically.
const MEMO_BAN = [
  {selector: "CallExpression[callee.name='useMemo']", message: 'Avoid useMemo: the React Compiler auto-memoizes.'},
  {selector: "CallExpression[callee.name='useCallback']", message: 'Avoid useCallback: the React Compiler auto-memoizes.'},
];
// D3 also covers dynamic imports and require(), which no-restricted-imports does
// not see. esquery regexes cannot contain a literal slash, so SLASH holds the
// regex escape that matches one.
const SLASH = '\\' + 'u002F';
const UPSTREAM_PATH = `/(^|${SLASH})upstream(${SLASH}|$)/`;
const BRIDGE_MESSAGE = 'Import app code through src/app-bridge.ts (docs/PLAN.md, D3).';
const UPSTREAM_LOADS = [
  `ImportExpression > Literal[value=${UPSTREAM_PATH}]`,
  `ImportExpression > TemplateLiteral > TemplateElement[value.raw=${UPSTREAM_PATH}]`,
  `CallExpression[callee.name='require'] > Literal[value=${UPSTREAM_PATH}]`,
  `CallExpression[callee.name='require'] > TemplateLiteral > TemplateElement[value.raw=${UPSTREAM_PATH}]`,
].map((selector) => ({selector, message: BRIDGE_MESSAGE}));

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
      'no-restricted-syntax': ['error', ...MEMO_BAN],
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
  // D3: app code enters admin only through src/app-bridge.ts, from any source
  // file. The one tooling exception is this config, which loads the app's
  // design-token plugin from the submodule.
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    ignores: ['src/app-bridge.ts', 'eslint.config.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/upstream', '**/upstream/**'],
              message: BRIDGE_MESSAGE,
            },
          ],
        },
      ],
      // Flat config replaces a rule's options per file instead of merging them,
      // so this repeats the memo ban for the TypeScript files it also covers.
      'no-restricted-syntax': ['error', ...MEMO_BAN, ...UPSTREAM_LOADS],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {ecmaVersion: 2022, sourceType: 'module', globals: globals.node},
  },
);

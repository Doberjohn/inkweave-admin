import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
// The app's design-token rules, loaded from the pinned submodule so admin UI is
// held to the same design system. Admin enables every one of them by name
// below. The plugin's ledger lists app paths only, so admin files get the rules
// enabled here with no exception.
import {inkweave as appInkweave} from './upstream/inkweave/apps/web/eslint-rules/index.js';
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';

// The lint script caches results (--cache), keyed on the config, which names a plugin
// only by its version. The pinned plugin may report a fixed one, so admin versions it
// by a hash of its rule sources and ledgers: a pin that changes a rule re-lints every file.
const RULES_DIR = new URL('./upstream/inkweave/apps/web/eslint-rules/', import.meta.url);
const rulesHash = createHash('sha256');
for (const name of readdirSync(RULES_DIR).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')).sort()) {
  rulesHash.update(name).update(readFileSync(new URL(name, RULES_DIR)));
}
const inkweave = {...appInkweave, meta: {...appInkweave.meta, version: rulesHash.digest('hex').slice(0, 12)}};

// Same ban as the app (#291): the React Compiler memoizes automatically.
const MEMO_BAN = [
  {selector: "CallExpression[callee.name='useMemo']", message: 'Avoid useMemo: the React Compiler auto-memoizes.'},
  {selector: "CallExpression[callee.name='useCallback']", message: 'Avoid useCallback: the React Compiler auto-memoizes.'},
];
// A ban on importing from a folder, at any depth of ../. no-restricted-imports
// checks imports and re-exports; dynamic imports and require(), which it does
// not see, go to no-restricted-syntax. esquery regexes cannot contain a literal
// slash, so SLASH holds the regex escape that matches one.
const SLASH = '\\' + 'u002F';
function importBan(folder, message) {
  const path = `/(^|${SLASH})${folder}(${SLASH}|$)/`;
  const loads = [
    `ImportExpression > Literal[value=${path}]`,
    `ImportExpression > TemplateLiteral > TemplateElement[value.raw=${path}]`,
    `CallExpression[callee.name='require'] > Literal[value=${path}]`,
    `CallExpression[callee.name='require'] > TemplateLiteral > TemplateElement[value.raw=${path}]`,
  ];
  return {
    imports: {group: [`**/${folder}`, `**/${folder}/**`], message},
    loads: loads.map((selector) => ({selector, message})),
  };
}
// The two rules of a block that bans imports. Flat config replaces a rule's
// options per file instead of merging them, so every such block repeats the
// memo ban, which shares no-restricted-syntax with the bans.
function boundaryRules(...bans) {
  return {
    'no-restricted-imports': ['error', {patterns: bans.map((ban) => ban.imports)}],
    'no-restricted-syntax': ['error', ...MEMO_BAN, ...bans.flatMap((ban) => ban.loads)],
  };
}
const UPSTREAM = importBan('upstream', 'Import app code through src/app-bridge.ts (docs/PLAN.md, D3).');
// inkweave-ui is a workspace package (#101), imported by name, so the upstream
// ban never sees it: the bridge re-exports what admin uses of it too.
const UI_PACKAGE = importBan('inkweave-ui', 'Import inkweave-ui through src/app-bridge.ts (docs/PLAN.md, D3).');

// The layers under the tools (docs/plans/R-redesign.md, Global constraints):
// src/shell, src/ui, src/charts and src/theme never import from src/tools
// (R-53), and src/ui never imports the chart kit, which builds on src/ui.
// Stories and tests may, as in R3-9's sweep.
const LAYER_EXEMPT = ['**/*.stories.{ts,tsx}', '**/*.test.{ts,tsx}', '**/__tests__/**'];
const TOOLS = importBan(
  'tools',
  'src/shell, src/ui, src/charts and src/theme never import from src/tools (docs/plans/R-redesign.md, R-53).',
);
const CHARTS = importBan(
  'charts',
  'src/ui never imports the chart kit, which builds on src/ui (docs/plans/R-redesign.md, Global constraints).',
);

// The React Compiler skips a function it can't compile, and the build says
// nothing (Doberjohn/inkweave-admin#59). react-hooks reports each bailout
// under its category's rule. These are the ones its recommended set leaves off
// or at warn, which the commit gate lets through: syntax the compiler can't
// lower yet (todo: a try/finally, for one), its own invariants, a syntax
// error, syntax it won't support, and a library it won't memoize. A broken
// rule of hooks and a suppressed hooks rule are errors already (rules-of-hooks,
// react-compiler/react-compiler). Every source file under src/ is held to
// them, stories included; tests never ship. react-hooks runs its own copy of
// the compiler, not the build's babel-plugin-react-compiler, so bumping either
// can change what these catch.
const COMPILER_BAILOUTS = Object.fromEntries(
  ['todo', 'invariant', 'syntax', 'unsupported-syntax', 'incompatible-library'].map((rule) => [`react-hooks/${rule}`, 'error']),
);
const TEST_CODE = ['**/*.test.{ts,tsx}', '**/__tests__/**', 'src/test/**'];

export default tseslint.config(
  // .claude/worktrees holds the desktop app's session worktrees, each a checkout of its own that
  // lints itself. Linted from here, it gives typescript-eslint a second tsconfig root, and every
  // file fails to parse. Vitest leaves it out too (vite.config.ts).
  {ignores: ['dist', 'coverage', 'upstream', 'app-master', '.reveal-sync-convert', '.claude/worktrees']},
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
      // The recommended options, plus 'region': a scroll container the keyboard
      // must reach (WCAG 2.1.1) is a named region with tabIndex={0}, as Card
      // analytics' rules table is, so it needs no inline disable.
      'jsx-a11y/no-noninteractive-tabindex': ['error', {tags: [], roles: ['tabpanel', 'region'], allowExpressionValues: true}],
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
      'inkweave/no-dim-text': 'error',
      'inkweave/no-unloaded-font-weight': 'error',
      'inkweave/no-raw-spacing': 'error',
      // Not a token rule: it fails a comment that turns off a react-hooks rule, or a 'use no memo'
      // directive, either of which lets React Compiler skip code without a word (inkweave#937).
      'inkweave/no-compiler-opt-out': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: TEST_CODE,
    rules: COMPILER_BAILOUTS,
  },
  // D3: app code and inkweave-ui enter admin only through src/app-bridge.ts,
  // from any source file. The tooling exceptions are this config, which loads
  // the app's design-token plugin from the submodule before any rule exists,
  // and one import in vite.config.ts, the app's React Compiler guard for
  // inkweave-ui (#101), which disables the rule on its own line.
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    ignores: ['src/app-bridge.ts', 'eslint.config.js'],
    rules: boundaryRules(UPSTREAM, UI_PACKAGE),
  },
  // The layers (#37). Each block repeats D3's bans, since its rule options
  // replace D3's for these files.
  {
    files: ['src/{shell,charts,theme}/**'],
    ignores: LAYER_EXEMPT,
    rules: boundaryRules(UPSTREAM, UI_PACKAGE, TOOLS),
  },
  {
    files: ['src/ui/**'],
    ignores: LAYER_EXEMPT,
    rules: boundaryRules(UPSTREAM, UI_PACKAGE, CHARTS, TOOLS),
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {ecmaVersion: 2022, sourceType: 'module', globals: globals.node},
  },
);

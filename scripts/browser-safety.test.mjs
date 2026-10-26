// @vitest-environment node
import fs from 'node:fs';
import {builtinModules} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import {beforeAll, describe, expect, it} from 'vitest';
import {INKWEAVE_UI, isRelative, resolvePackage, resolveRelative} from './lib/moduleResolve.mjs';

// Vite leaves a Node builtin out of the browser bundle: it gives the importer a stub and warns. So
// an import of one in code the browser loads passes lint, tsc, Vitest and `pnpm build`, and only
// the page shows it, by failing to load or by throwing at the first call into the stub. Two doors
// lead to it: the app's plain-JavaScript scripts that src/app-bridge.ts bundles, and the fixtures
// that stories load (promoFixtures.ts). A third is inkweave-ui, whose source the bridge bundles as
// it is (#101). This walks everything src/main.tsx, the Storybook preview and each story load,
// through their relative imports and into inkweave-ui, and fails on an import of a builtin. Any
// other bare package, the synergy engine included, is not read.

// A relative specifier resolves as a bundler resolves it, and a package's subpath through its
// exports map (lib/moduleResolve.mjs). Only code is read: CSS, JSON and images load nothing.
const CODE = new Set(['.ts', '.tsx', '.mjs', '.js', '.jsx']);
const NODE_BUILTINS = new Set(builtinModules);

const isNodeBuiltin = (specifier) => specifier.startsWith('node:') || NODE_BUILTINS.has(specifier);

// A string, or a template without substitutions: the specifiers a walk can read.
const literalText = (node) => (node && ts.isStringLiteralLike(node) ? node.text : undefined);

// require(…), but not a method that happens to be called require.
const isRequireCall = ({expression}) => ts.isIdentifier(expression) && expression.text === 'require';

// import(…) or require(…).
const isLoadCall = (node) =>
  ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || isRequireCall(node));

// An import or export's module, unless it is type-only: the build erases `import type` and `export type`.
function declaredModule(node) {
  const typeOnly = ts.isImportDeclaration(node) ? node.importClause?.isTypeOnly : node.isTypeOnly;
  return typeOnly ? undefined : literalText(node.moduleSpecifier);
}

// TypeScript's `import x = require('…')`, unless it is type-only (`import type x = require('…')`).
function requiredModule(node) {
  const {moduleReference} = node;
  if (node.isTypeOnly || !ts.isExternalModuleReference(moduleReference)) return undefined;
  return literalText(moduleReference.expression);
}

// The module a node loads, if it names one with a literal: an import, a re-export, import() or require().
function specifierOf(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return declaredModule(node);
  if (ts.isImportEqualsDeclaration(node)) return requiredModule(node);
  return isLoadCall(node) ? literalText(node.arguments[0]) : undefined;
}

// Every module `text` loads. A syntax tree, not a pattern: comments and strings load nothing, and
// an import can run over several lines with a comment between its names, as app-bridge.ts's do.
// The file's name tells TypeScript whether to read JSX.
function specifiersOf(file, text) {
  const specifiers = [];
  const visit = (node) => {
    const specifier = specifierOf(node);
    if (specifier !== undefined) specifiers.push(specifier);
    ts.forEachChild(node, visit); // visit returns nothing: a truthy result would stop forEachChild
  };
  visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest));
  return specifiers;
}

/**
 * Sorts one specifier that `from` imports, for the walk: a Node builtin, a code file to read next, a
 * specifier that names no file (a miss: a TS-style "./x.js" for x.ts is one, and so is a package
 * subpath the exports map lacks), or nothing to follow (another package, or an asset).
 * @returns {{kind: 'builtin' | 'miss' | 'none'} | {kind: 'code', file: string}}
 */
function loadOf({from, specifier, tree}) {
  if (isNodeBuiltin(specifier)) return {kind: 'builtin'};
  if (!isRelative(specifier)) return packageLoad({specifier, tree});
  return fileLoad(resolveRelative({from, specifier, exists: tree.exists}));
}

// A file the walk found, or undefined for none: code is read next, and anything else loads nothing.
function fileLoad(file) {
  if (file === undefined) return {kind: 'miss'};
  return CODE.has(path.posix.extname(file)) ? {kind: 'code', file} : {kind: 'none'};
}

// A bare specifier. A subpath of one of the walk's packages is read as the exports map resolves it,
// and one the map lacks, the bare root among them, is a miss, as the build would fail on it. Any
// other package is not read.
function packageLoad({specifier, tree}) {
  const resolved = resolvePackage({specifier, packages: tree.packages});
  if (resolved === undefined) return {kind: 'none'};
  return fileLoad(resolved.file !== undefined && tree.exists(resolved.file) ? resolved.file : undefined);
}

/**
 * Every Node builtin a walk from `entries` reaches through relative imports and into `packages`
 * (each `{name, root, exports}`), every import it found no file for, and the files it visited. Paths
 * are repo-relative with "/" separators. `read(path)` gives a file's text and `exists(path)` says
 * whether a file is there.
 * @returns {{visited: string[], nodeImports: Array<{file: string, specifier: string}>, unresolved: Array<{file: string, specifier: string}>}}
 */
function walk(tree) {
  const {entries, read} = tree;
  const seen = new Set(entries);
  const visited = [...seen];
  const nodeImports = [];
  const unresolved = [];
  // A file found on the way joins `visited`, and the loop reaches it in turn.
  for (const file of visited) {
    for (const specifier of specifiersOf(file, read(file))) {
      const load = loadOf({from: file, specifier, tree});
      if (load.kind === 'builtin') nodeImports.push({file, specifier});
      if (load.kind === 'miss') unresolved.push({file, specifier});
      if (load.kind === 'code' && !seen.has(load.file)) {
        seen.add(load.file);
        visited.push(load.file);
      }
    }
  }
  return {visited, nodeImports, unresolved};
}

// The checkout's files, by path from the repo root, which is where Vitest runs, and inkweave-ui
// with the exports map its package.json holds.
const onDisk = (entries) => {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const {exports} = JSON.parse(read(`${INKWEAVE_UI.root}/package.json`));
  return {
    entries,
    read,
    exists: (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
    packages: [{...INKWEAVE_UI, exports}],
  };
};

// A plain object of path to text, with any packages the walk may read.
const inMemory = (files, entries, packages = []) => ({
  entries,
  read: (file) => files[file],
  exists: (file) => Object.hasOwn(files, file),
  packages,
});

// What the site loads, and what Storybook loads: the preview every story runs in, and each story.
// .storybook/main.ts runs in Node, so it is not an entry. fs.globSync gives the OS's separators.
const stories = fs.globSync('src/**/*.stories.{ts,tsx}').map((file) => file.split(path.sep).join('/'));
const ENTRIES = ['src/main.tsx', '.storybook/preview.tsx', ...stories];

describe('what the browser loads', () => {
  let loaded;

  // The walk parses every file the browser can load, on one thread: about 1.5s alone, and 8 to 10s inside
  // the full suite on a loaded machine, which overran a test's own 5s. It runs once, with a budget of its
  // own, and both tests read its result.
  beforeAll(() => {
    loaded = walk(onDisk(ENTRIES));
  }, 120_000);

  // A walk that went nowhere would pass the next test, so this one pins what it must reach, and that no
  // import it follows ended a branch of it unread.
  it('reaches the bridged promo merge, inkweave-ui and the promo fixtures', () => {
    for (const file of [
      'upstream/inkweave/scripts/lib/promo-printings.mjs',
      'upstream/inkweave/scripts/lib/finishes.mjs',
      'upstream/inkweave/scripts/lib/fold-variants.mjs',
      'upstream/inkweave/packages/ui/src/components/DialogShell.tsx',
      'upstream/inkweave/packages/ui/src/lorcana/CardTile.tsx',
      'upstream/inkweave/packages/ui/src/hooks/useAutocomplete.ts',
      'src/tools/studio/promos/__tests__/promoFixtures.ts',
    ]) {
      expect(loaded.visited).toContain(file);
    }
    expect(loaded.unresolved).toEqual([]);
  });

  it('finds no Node builtin in anything the build or a story loads', () => {
    expect(loaded.nodeImports).toEqual([]);
  });
});

describe('the walk', () => {
  it.each([
    [
      'a node: import two files away',
      {'a.mjs': "import {b} from './b.mjs';\n", 'b.mjs': "import {readFileSync} from 'node:fs';\n"},
      [{file: 'b.mjs', specifier: 'node:fs'}],
    ],
    ['a bare builtin', {'a.mjs': "import fs from 'fs';\n"}, [{file: 'a.mjs', specifier: 'fs'}]],
    [
      'a dynamic import',
      {'a.mjs': "export const load = () => import('node:path');\n"},
      [{file: 'a.mjs', specifier: 'node:path'}],
    ],
    ['a re-export', {'a.mjs': "export * from 'node:os';\n"}, [{file: 'a.mjs', specifier: 'node:os'}]],
    ['a require', {'a.js': "const m = require('node:module');\n"}, [{file: 'a.js', specifier: 'node:module'}]],
    ["TypeScript's import-equals require", {'a.ts': "import fs = require('node:fs');\n"}, [{file: 'a.ts', specifier: 'node:fs'}]],
    [
      'a multi-line import with a comment between its names',
      {'a.mjs': "import {\n  readFileSync, // the sync one\n  writeFileSync,\n} from 'node:fs';\n"},
      [{file: 'a.mjs', specifier: 'node:fs'}],
    ],
    [
      'a dynamic import in a template literal',
      {'a.mjs': 'export const load = () => import(`node:path`);\n'},
      [{file: 'a.mjs', specifier: 'node:path'}],
    ],
  ])('finds %s', (_, files, expected) => {
    expect(walk(inMemory(files, Object.keys(files).slice(0, 1))).nodeImports).toEqual(expected);
  });

  it('leaves out type-only imports and exports', () => {
    const files = {
      'a.ts': "import type {Stats} from 'node:fs';\nexport type {Dirent} from 'node:fs';\nimport type fs = require('node:fs');\n",
    };
    expect(walk(inMemory(files, ['a.ts'])).nodeImports).toEqual([]);
  });

  it('follows relative imports as a bundler resolves them, and only into code', () => {
    const files = {
      'a.mjs': [
        "import './b';",
        "import './c?worker';",
        "import './folder';",
        "import './d.mjs?url';",
        "import './style.css';",
        "import data from './data.json';",
        "import 'a-package';",
        '',
      ].join('\n'),
      'b.ts': '',
      'c.tsx': '',
      'folder/index.ts': '',
      'd.mjs': '',
      'style.css': 'body {}',
      'data.json': '{}',
    };
    expect(walk(inMemory(files, ['a.mjs'])).visited).toEqual(['a.mjs', 'b.ts', 'c.tsx', 'folder/index.ts', 'd.mjs']);
  });

  it('names a relative import that resolves to no file, such as a TS-style .js for a .ts', () => {
    const files = {'a.ts': "import './b.js';\nimport './style.css';\nimport 'a-package';\n", 'b.ts': '', 'style.css': 'body {}'};
    expect(walk(inMemory(files, ['a.ts'])).unresolved).toEqual([{file: 'a.ts', specifier: './b.js'}]);
  });
});

describe("the walk into a package's source", () => {
  const KIT = {name: 'kit', root: 'kit', exports: {'./components/*': './src/components/*.tsx', './styles/*.css': './src/styles/*.css'}};

  it('reads a subpath as the exports map resolves it, and finds a builtin there', () => {
    const files = {
      'a.ts': "import {Button} from 'kit/components/Button';\nimport 'kit/styles/base.css';\n",
      'kit/src/components/Button.tsx': "import {theme} from '../theme';\n",
      'kit/src/theme.ts': "import {readFileSync} from 'node:fs';\n",
      'kit/src/styles/base.css': 'body {}',
    };
    const loaded = walk(inMemory(files, ['a.ts'], [KIT]));
    expect(loaded.visited).toEqual(['a.ts', 'kit/src/components/Button.tsx', 'kit/src/theme.ts']);
    expect(loaded.nodeImports).toEqual([{file: 'kit/src/theme.ts', specifier: 'node:fs'}]);
  });

  it('names a subpath the exports map lacks, the bare root, and an exported file that is missing', () => {
    const files = {
      'a.ts': [
        "import 'kit/src/components/Button';",
        "import 'kit';",
        "import 'kit/components/Gone';",
        "import 'kit-extra/components/Button';",
        '',
      ].join('\n'),
      'kit/src/components/Button.tsx': '',
    };
    expect(walk(inMemory(files, ['a.ts'], [KIT])).unresolved).toEqual([
      {file: 'a.ts', specifier: 'kit/src/components/Button'},
      {file: 'a.ts', specifier: 'kit'},
      {file: 'a.ts', specifier: 'kit/components/Gone'},
    ]);
  });
});

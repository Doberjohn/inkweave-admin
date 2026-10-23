// @vitest-environment node
import fs from 'node:fs';
import {builtinModules} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import {describe, expect, it} from 'vitest';

// Vite leaves a Node builtin out of the browser bundle: it gives the importer a stub and warns. So
// an import of one in code the browser loads passes lint, tsc, Vitest and `pnpm build`, and only
// the page shows it, by failing to load or by throwing at the first call into the stub. Two doors
// lead to it: the app's plain-JavaScript scripts that src/app-bridge.ts bundles, and the fixtures
// that stories load (promoFixtures.ts). This walks everything src/main.tsx, the Storybook preview
// and each story load, through their relative imports, and fails on an import of a builtin. It
// follows relative imports only: a bare package, the synergy engine included, is not read.

// What a bundler tries for a relative specifier, in order: the file as written, with an extension,
// as a folder's index. Only code is read: CSS, JSON and images load nothing.
const SUFFIXES = ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx', '/index.js'];
const CODE = new Set(['.ts', '.tsx', '.mjs', '.js', '.jsx']);
const RELATIVE = /^\.\.?(\/|$)/;
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

// The module a node loads, if it names one with a literal: an import, a re-export, import() or require().
function specifierOf(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return declaredModule(node);
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

// The code file a relative specifier of `from` names. Bare packages, assets and misses give undefined.
function resolveImport({from, specifier, exists}) {
  if (!RELATIVE.test(specifier)) return undefined;
  const base = path.posix.join(path.posix.dirname(from), specifier.replace(/\?.*$/, ''));
  const found = SUFFIXES.map((suffix) => base + suffix).find((candidate) => exists(candidate));
  return found && CODE.has(path.posix.extname(found)) ? found : undefined;
}

/**
 * Every Node builtin a walk from `entries` reaches through relative imports, and the files it visited.
 * Paths are repo-relative with "/" separators. `read(path)` gives a file's text and `exists(path)` says
 * whether a file is there.
 * @returns {{visited: string[], nodeImports: Array<{file: string, specifier: string}>}}
 */
function walk({entries, read, exists}) {
  const seen = new Set(entries);
  const visited = [...seen];
  const nodeImports = [];
  // A file found on the way joins `visited`, and the loop reaches it in turn.
  for (const file of visited) {
    for (const specifier of specifiersOf(file, read(file))) {
      if (isNodeBuiltin(specifier)) nodeImports.push({file, specifier});
      const next = resolveImport({from: file, specifier, exists});
      if (next && !seen.has(next)) {
        seen.add(next);
        visited.push(next);
      }
    }
  }
  return {visited, nodeImports};
}

// The checkout's files, by path from the repo root, which is where Vitest runs.
const onDisk = (entries) => ({
  entries,
  read: (file) => fs.readFileSync(file, 'utf8'),
  exists: (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
});

// A plain object of path to text.
const inMemory = (files, entries) => ({
  entries,
  read: (file) => files[file],
  exists: (file) => Object.hasOwn(files, file),
});

// What the site loads, and what Storybook loads: the preview every story runs in, and each story.
// .storybook/main.ts runs in Node, so it is not an entry. fs.globSync gives the OS's separators.
const stories = fs.globSync('src/**/*.stories.{ts,tsx}').map((file) => file.split(path.sep).join('/'));
const ENTRIES = ['src/main.tsx', '.storybook/preview.tsx', ...stories];

describe('what the browser loads', () => {
  // A walk that went nowhere would pass the next test, so this one pins what it must reach.
  it('reaches the bridged promo merge and the promo fixtures', () => {
    const {visited} = walk(onDisk(ENTRIES));
    for (const file of [
      'upstream/inkweave/scripts/lib/promo-printings.mjs',
      'upstream/inkweave/scripts/lib/finishes.mjs',
      'upstream/inkweave/scripts/lib/fold-variants.mjs',
      'src/tools/studio/promos/__tests__/promoFixtures.ts',
    ]) {
      expect(visited).toContain(file);
    }
  });

  it('finds no Node builtin in anything the build or a story loads', () => {
    expect(walk(onDisk(ENTRIES)).nodeImports).toEqual([]);
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
    const files = {'a.ts': "import type {Stats} from 'node:fs';\nexport type {Dirent} from 'node:fs';\n"};
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
});

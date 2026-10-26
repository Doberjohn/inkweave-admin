// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {describe, expect, it} from 'vitest';
import {INKWEAVE_UI, isRelative, resolvePackage, resolveRelative, starMatch, targetPath} from './lib/moduleResolve.mjs';

// The bridge takes the app's modules by path and inkweave-ui's by name (#101). A pin bump can move
// a module out of the app and leave its name forwarded from the package by an app barrel, so the
// bridge would keep importing it through app code. Or it can delete a path the bridge names, or add
// a package stylesheet that admin never loads, which no type or build error shows. These cases read
// the real tree, by path from the repo root, which is where Vitest runs.

const BRIDGE = 'src/app-bridge.ts';
const UI = INKWEAVE_UI;
const APP_SOURCE = '../upstream/inkweave/apps/web/src/';
const APP_STYLESHEET = '../upstream/inkweave/apps/web/src/index.css';

const onDisk = {
  read: (file) => fs.readFileSync(file, 'utf8'),
  exists: (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
};

/** A file's syntax tree. The file's name tells TypeScript whether to read JSX. */
const sourceOf = ({file, read}) => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest);

/** `tree` with `source(file)`, which parses each file once for the run: every name walks the same barrels. */
function parsedOnce(tree) {
  const parsed = new Map();
  const source = (file) => {
    if (!parsed.has(file)) parsed.set(file, sourceOf({file, read: tree.read}));
    return parsed.get(file);
  };
  return {...tree, source};
}

/** inkweave-ui's exports map, from its package.json. */
const uiExports = (read = onDisk.read) => JSON.parse(read(`${UI.root}/package.json`)).exports;

/** An `export {…}` list's names: `name` as the file exports it, `local` as its module does. */
const listed = ({exportClause}) =>
  exportClause && ts.isNamedExports(exportClause)
    ? exportClause.elements.map(({name, propertyName}) => ({name: name.text, local: (propertyName ?? name).text}))
    : null;

/**
 * A file's `export … from` entries: each module, with the names it re-exports, or `names: null`
 * for `export *`.
 */
function reExports(source) {
  return source.statements
    .filter((node) => ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined)
    .map((node) => ({module: node.moduleSpecifier.text, names: listed(node)}));
}

/** The modules a file imports for their side effects: `import './x.css'`. */
const sideEffectImports = (source) =>
  source.statements
    .filter((node) => ts.isImportDeclaration(node) && node.importClause === undefined)
    .map(({moduleSpecifier}) => moduleSpecifier.text);

const isExported = (node) => node.modifiers?.some(({kind}) => kind === ts.SyntaxKind.ExportKeyword) ?? false;

/** The names a top-level declaration declares: a function, class, type, or each variable. */
function declaredNames(node) {
  if (node.declarationList) return node.declarationList.declarations.map((declaration) => declaration.name.text);
  return node.name ? [node.name.text] : [];
}

/** The names a file exports of its own: declarations marked `export`, and `export {…}` lists with no module. */
function ownExports(source) {
  return source.statements.flatMap((node) => {
    if (!ts.isExportDeclaration(node)) return isExported(node) ? declaredNames(node) : [];
    return node.moduleSpecifier === undefined ? (listed(node) ?? []).map(({name}) => name) : [];
  });
}

/** Each binding of the import clause, as [its local name, its name in the module ('*' for a namespace)]. */
const clauseBindings = ({name, namedBindings}) => [
  ...(name ? [[name.text, 'default']] : []),
  ...(namedBindings && ts.isNamespaceImport(namedBindings) ? [[namedBindings.name.text, '*']] : []),
  ...(namedBindings && ts.isNamedImports(namedBindings)
    ? namedBindings.elements.map(({name: local, propertyName}) => [local.text, (propertyName ?? local).text])
    : []),
];

/** A file's imported bindings, by local name: the module each comes from, and its name there. */
const importedBindings = (source) =>
  new Map(
    source.statements
      .filter((node) => ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly)
      .flatMap((node) =>
        clauseBindings(node.importClause).map(([local, imported]) => [local, {module: node.moduleSpecifier.text, local: imported}]),
      ),
  );

/** An `export … from` declaration's sources. A namespace export forwards only its own name. */
function fromSources(node) {
  const module = node.moduleSpecifier.text;
  const clause = node.exportClause;
  if (clause === undefined) return [{module, star: true}];
  if (ts.isNamespaceExport(clause)) return [{name: clause.name.text, module, local: '*'}];
  return listed(node).map(({name, local}) => ({name, module, local}));
}

/** An `export {…}` list with no module: each name that one of the file's imports brought in. */
const localListSources = ({node, imports}) =>
  (listed(node) ?? []).flatMap(({name, local}) => (imports.has(local) ? [{name, ...imports.get(local)}] : []));

/** `export const x = y`, where y is one of the file's imports. */
function aliasSources({node, imports}) {
  if (!ts.isVariableStatement(node) || !isExported(node)) return [];
  return node.declarationList.declarations.flatMap(({name, initializer}) => {
    const binding = initializer && ts.isIdentifier(initializer) ? imports.get(initializer.text) : undefined;
    return binding && ts.isIdentifier(name) ? [{name: name.text, ...binding}] : [];
  });
}

/**
 * Where a file's exports come from when another module holds them: `{name, module, local}` for a
 * name, `local` being its name in `module` ('*' for a namespace), or `{module, star: true}` for
 * `export *`. An `export … from`, and a local export of an import, by list or by `const x = y`.
 */
function exportSources(source) {
  const imports = importedBindings(source);
  return source.statements.flatMap((node) => {
    if (!ts.isExportDeclaration(node)) return aliasSources({node, imports});
    return node.moduleSpecifier === undefined ? localListSources({node, imports}) : fromSources(node);
  });
}

/**
 * The `inkweave-ui/…` module a file's export `name` comes from, through any chain of re-exports,
 * renames, `export *` or local exports of imports, or undefined when the name is the app's own.
 * `tree` gives `source` (parsedOnce), `exists`, and `exports`, the package's exports map.
 */
function forwardedFrom({file, name, tree, seen = new Set()}) {
  if (seen.has(file)) return undefined;
  seen.add(file);
  for (const entry of exportSources(tree.source(file))) {
    if (!entry.star && entry.name !== name) continue;
    const found = followModule({from: file, module: entry.module, name: entry.star ? name : entry.local, tree, seen, star: entry.star});
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Where `name` comes from once an export points at `module`. A namespace of an app module is the app's own. */
function followModule({from, module, name, tree, seen, star}) {
  if (module.startsWith(`${UI.name}/`)) return !star || packageExports({module, name, tree}) ? module : undefined;
  if (!isRelative(module) || name === '*') return undefined;
  const file = resolveRelative({from, specifier: module, exists: tree.exists});
  return file === undefined ? undefined : forwardedFrom({file, name, tree, seen});
}

/** Whether the package module behind `module` declares `name`: what an `export *` of it forwards. */
function packageExports({module, name, tree}) {
  const resolved = resolvePackage({specifier: module, packages: [{...UI, exports: tree.exports}]});
  return resolved?.file !== undefined && ownExports(tree.source(resolved.file)).includes(name);
}

/** Every stylesheet the package exports, as the bridge would import it: `inkweave-ui/styles/x.css`. */
function packageStylesheets(exports) {
  const paths = Object.entries(exports).flatMap(([key, target]) => (targetPath(target) ? [[key, targetPath(target)]] : []));
  return paths.flatMap(([key, target]) =>
    fs
      .globSync(path.posix.join(UI.root, target).replace('*', '**/*'))
      .map((file) => file.split(path.sep).join('/'))
      .filter((file) => file.endsWith('.css'))
      .map((file) => {
        const subpath = `./${path.posix.relative(UI.root, file)}`;
        return `${UI.name}/${key.replace('*', starMatch({pattern: target, subpath})).slice(2)}`;
      }),
  );
}

/** The bridge's re-exports from the app's source, each with the file its path names. */
function appEntries(tree) {
  return reExports(tree.source(BRIDGE))
    .filter(({module}) => module.startsWith(APP_SOURCE))
    .map((entry) => ({...entry, file: resolveRelative({from: BRIDGE, specifier: entry.module, exists: tree.exists})}));
}

describe("the bridge's sources", () => {
  const tree = parsedOnce({...onDisk, exports: uiExports()});

  it("names a file at every path into the app's source", () => {
    const missing = appEntries(tree)
      .filter(({file}) => file === undefined)
      .map(({module}) => module);
    expect(missing).toEqual([]);
  });

  it("takes no name from the app's source that the app only forwards from inkweave-ui", () => {
    const forwarded = appEntries(tree)
      .filter(({file, names}) => file !== undefined && names !== null)
      .flatMap(({file, names}) => names.map(({local}) => ({name: local, from: forwardedFrom({file, name: local, tree})})))
      .filter(({from}) => from !== undefined);
    expect(forwarded).toEqual([]);
  });

  it("loads the app's index.css and every stylesheet the package exports", () => {
    const loaded = new Set(sideEffectImports(tree.source(BRIDGE)));
    const missing = [APP_STYLESHEET, ...packageStylesheets(tree.exports)].filter((sheet) => !loaded.has(sheet));
    expect(missing).toEqual([]);
  });
});

describe('forwardedFrom', () => {
  const files = {
    'app/index.ts': [
      "export {COLORS, SPACING as GAP} from 'inkweave-ui/tokens/theme';",
      "export {useThing} from './hooks';",
      "export * from './more';",
      "export {APP_NAME} from './own';",
      "export * from './locals';",
      "export * as theme from 'inkweave-ui/tokens/theme';",
      "export * as own from './own';",
      '',
    ].join('\n'),
    'app/hooks.ts': "export {useThing as useThing} from 'inkweave-ui/hooks/useThing';\n",
    'app/more.ts': "export * from 'inkweave-ui/tokens/lorcana';\nexport {renamed as OTHER} from './own';\n",
    'app/own.ts': "export const APP_NAME = 'Inkweave';\nexport const renamed = 1;\n",
    'app/locals.ts': [
      "import {COLORS as UI_COLORS, SPACING} from 'inkweave-ui/tokens/theme';",
      "import {useThing as hook} from './hooks';",
      "import type {Ink} from 'inkweave-ui/tokens/lorcana';",
      "import {APP_NAME as name} from './own';",
      'export {UI_COLORS as PALETTE, hook};',
      'export const GAPS = SPACING;',
      'export const TITLE = name;',
      'export type {Ink};',
      '',
    ].join('\n'),
    'ui/src/tokens/lorcana.ts': 'export const ALL_INKS = [];\nexport function inkOf() {}\n',
    'ui/src/tokens/theme.ts': 'export const COLORS = {};\nexport const RADIUS = {};\n',
  };
  const memoryTree = parsedOnce({
    read: (file) => files[file.replace(`${UI.root}/`, 'ui/')],
    exists: (file) => Object.hasOwn(files, file),
    exports: {'./tokens/*': './src/tokens/*.ts'},
  });
  const from = (name) => forwardedFrom({file: 'app/index.ts', name, tree: memoryTree});

  it('follows a named re-export, a rename and a chain of files to the package', () => {
    expect(from('COLORS')).toBe('inkweave-ui/tokens/theme');
    expect(from('GAP')).toBe('inkweave-ui/tokens/theme');
    expect(from('useThing')).toBe('inkweave-ui/hooks/useThing');
  });

  it("follows `export *` into the package only for a name its module declares", () => {
    expect(from('ALL_INKS')).toBe('inkweave-ui/tokens/lorcana');
    expect(from('inkOf')).toBe('inkweave-ui/tokens/lorcana');
    expect(from('MISSING')).toBeUndefined();
  });

  it("leaves the app's own names alone, through a chain and a rename", () => {
    expect(from('APP_NAME')).toBeUndefined();
    expect(from('OTHER')).toBeUndefined();
  });

  it('follows a local export of an import, by list or by `const x = y`, to the package', () => {
    expect(from('PALETTE')).toBe('inkweave-ui/tokens/theme');
    expect(from('GAPS')).toBe('inkweave-ui/tokens/theme');
    expect(from('hook')).toBe('inkweave-ui/hooks/useThing');
    expect(from('TITLE')).toBeUndefined();
    expect(from('Ink')).toBeUndefined();
  });

  it("reads a namespace export as one name, the package's namespace or the app's own", () => {
    expect(from('theme')).toBe('inkweave-ui/tokens/theme');
    expect(from('RADIUS')).toBeUndefined();
    expect(from('own')).toBeUndefined();
  });
});

describe('packageStylesheets', () => {
  it("names each .css file an exports target reaches, by the key's subpath", () => {
    expect(packageStylesheets({'./styles/*.css': './src/styles/*.css', './assets/*': './src/assets/*'})).toEqual(
      expect.arrayContaining(['inkweave-ui/styles/primitives.css', 'inkweave-ui/styles/lorcana.css']),
    );
  });
});

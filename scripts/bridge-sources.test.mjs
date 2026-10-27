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

/**
 * Each value binding of the import clause, as [its local name, its name in the module ('*' for a
 * namespace)]. A type-only specifier binds no value, so it has none.
 */
const clauseBindings = ({name, namedBindings}) => [
  ...(name ? [[name.text, 'default']] : []),
  ...(namedBindings && ts.isNamespaceImport(namedBindings) ? [[namedBindings.name.text, '*']] : []),
  ...(namedBindings && ts.isNamedImports(namedBindings)
    ? namedBindings.elements
        .filter(({isTypeOnly}) => !isTypeOnly)
        .map(({name: local, propertyName}) => [local.text, (propertyName ?? local).text])
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

/** The names the package module behind `module` declares of its own: what an `export *` of it forwards. */
function uiModuleExports({module, tree}) {
  const resolved = resolvePackage({specifier: module, packages: [{...UI, exports: tree.exports}]});
  return resolved?.file === undefined ? [] : ownExports(tree.source(resolved.file));
}

/** Whether the package module behind `module` declares `name`. */
const packageExports = ({module, name, tree}) => uiModuleExports({module, tree}).includes(name);

/** fs.globSync's matches with "/" separators, as the rest of these paths are. */
const globbed = (pattern) => fs.globSync(pattern).map((file) => file.split(path.sep).join('/'));

/** Every file the package's exports targets reach, each `{key, target, file}`. */
function exportedFiles(exports) {
  const paths = Object.entries(exports).flatMap(([key, target]) => (targetPath(target) ? [[key, targetPath(target)]] : []));
  return paths.flatMap(([key, target]) =>
    globbed(path.posix.join(UI.root, target).replace('*', '**/*')).map((file) => ({key, target, file})),
  );
}

/** Every stylesheet the package exports, as the bridge would import it: `inkweave-ui/styles/x.css`. */
function packageStylesheets(exports) {
  return exportedFiles(exports)
    .filter(({file}) => file.endsWith('.css'))
    .map(({key, target, file}) => {
      const subpath = `./${path.posix.relative(UI.root, file)}`;
      return `${UI.name}/${key.replace('*', starMatch({pattern: target, subpath})).slice(2)}`;
    });
}

/** The bridge's re-exports from the app's source, each with the file its path names. */
function appEntries(tree) {
  return reExports(tree.source(BRIDGE))
    .filter(({module}) => module.startsWith(APP_SOURCE))
    .map((entry) => ({...entry, file: resolveRelative({from: BRIDGE, specifier: entry.module, exists: tree.exists})}));
}

const APP_ROOT = '../upstream/inkweave/apps/web/';
const APP_PACKAGE = 'upstream/inkweave/apps/web/package.json';

/**
 * Every path the bridge takes from the app, as it spells each one: its imports, side-effect imports
 * and re-exports under apps/web, sorted. The rest of the bridge is inkweave-ui's, or the app's
 * scripts/lib. A new path here also needs its packages in parity (check-shared-deps.mjs).
 */
const APP_MODULES = [
  `${APP_ROOT}public/data/previewCards.json?raw`,
  `${APP_ROOT}src/features/cards/loader`,
  `${APP_ROOT}src/features/collection/collectionParser`,
  `${APP_ROOT}src/features/collection/collectionPromos`,
  `${APP_ROOT}src/features/collection/printingFinishes`,
  `${APP_ROOT}src/features/synergies/hooks/usePrecomputedSynergies`,
  `${APP_ROOT}src/index.css`,
  `${APP_ROOT}src/shared/constants`,
  `${APP_ROOT}src/shared/contexts/CardDataContext`,
];

/**
 * The app's runtime packages that no module the bridge takes reaches. check:deps still requires
 * them: parity stays whole while the bridged modules reach the rest.
 */
const PARITY_ONLY = ['@vercel/speed-insights'];

/**
 * Admin's exports that share a name with inkweave-ui's on purpose, each `{copy: 'file: name', reason}`.
 * Empty: every promoted module has one source, the package's (#103).
 */
const KEEP_OWN = [];

const CODE = /\.(?:m?js|tsx?)$/;

/** The specifier of an import or a re-export, type-only ones too, or undefined for any other node. */
function staticSpecifierOf(node) {
  const declares = ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
  return declares ? node.moduleSpecifier?.text : undefined;
}

/** The specifier an `import('x').T` or `typeof import('x')` type names, or undefined for any other node. */
function importTypeSpecifierOf(node) {
  if (!ts.isImportTypeNode(node) || !ts.isLiteralTypeNode(node.argument)) return undefined;
  const {literal} = node.argument;
  return ts.isStringLiteral(literal) ? literal.text : undefined;
}

/** The specifier an `import('x')` call or type names, or undefined for any other node. */
function dynamicSpecifierOf(node) {
  if (!ts.isCallExpression(node)) return importTypeSpecifierOf(node);
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) return undefined;
  const [first] = node.arguments;
  return first && ts.isStringLiteralLike(first) ? first.text : undefined;
}

/** Every module a file names: its imports and re-exports, type-only ones too, and its import() calls and types. */
function specifiersIn(source) {
  const found = [];
  const visit = (node) => {
    const specifier = staticSpecifierOf(node) ?? dynamicSpecifierOf(node);
    if (specifier !== undefined) found.push(specifier);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** The package a bare specifier names: "@scope/auth" for "@scope/auth/dist/types", "react" for "react/jsx-runtime". */
function packageOf(specifier) {
  const parts = specifier.replace(/\?.*$/, '').split('/');
  return parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
}

/**
 * Where one specifier of `from` leads: `file`, the code file to read next, if there is one, and
 * `reached`, the package a bare specifier counts as. inkweave-ui's subpaths lead into its source too.
 */
function stepOf({from, specifier, tree}) {
  if (isRelative(specifier)) return {file: resolveRelative({from, specifier, exists: tree.exists})};
  const file = resolvePackage({specifier, packages: [{...UI, exports: tree.exports}]})?.file;
  return {file: file !== undefined && tree.exists(file) ? file : undefined, reached: packageOf(specifier)};
}

/** Each step out of `file`, keeping the packages it reaches in `reached`: the code files it leads to. */
function stepsOutOf({file, tree, reached}) {
  return specifiersIn(tree.source(file)).flatMap((specifier) => {
    const step = stepOf({from: file, specifier, tree});
    if (step.reached !== undefined) reached.add(step.reached);
    return step.file !== undefined && CODE.test(step.file) ? [step.file] : [];
  });
}

/**
 * The packages a walk from the code files `entries` reaches, sorted: through relative imports,
 * import() and type-only imports, into inkweave-ui's source by its exports map, and counting each
 * other bare specifier by its package. A path that names no file, relative or in inkweave-ui,
 * ends the walk there.
 */
function reachedPackages({entries, tree}) {
  const seen = new Set(entries);
  const reached = new Set();
  const queue = [...entries];
  for (const file of queue) {
    const next = stepsOutOf({file, tree, reached}).filter((step) => !seen.has(step));
    for (const step of next) seen.add(step);
    queue.push(...new Set(next));
  }
  return [...reached].sort();
}

/** The bridge's specifiers under apps/web, each once, sorted. */
const bridgedAppModules = (tree) =>
  [...new Set(specifiersIn(tree.source(BRIDGE)).filter((specifier) => specifier.startsWith(APP_ROOT)))].sort();

// A test's or a story's file: the copies that matter are the ones a page renders.
const NOT_SOURCE = /(?:^|\/)__tests__\/|\.(?:test|stories)\.[^/]+$/;

/** Admin's source files, tests, stories and the bridge aside. */
const adminSources = () => globbed('src/**/*.{ts,tsx}').filter((file) => file !== BRIDGE && !NOT_SOURCE.test(file));

/**
 * The names the bridge takes from inkweave-ui, each [its name in the bridge, its name in the
 * package]: by `export … from`, `export *` (every name the module declares) or a local export of
 * an import, renamed or not.
 */
const bridgedUi = (tree) =>
  exportSources(tree.source(BRIDGE))
    .filter(({module}) => module.startsWith(`${UI.name}/`))
    .flatMap((entry) =>
      entry.star ? uiModuleExports({module: entry.module, tree}).map((name) => [name, name]) : [[entry.name, entry.local]],
    );

/** Every name inkweave-ui's modules export of their own, tests and stories aside. */
const packageNames = (tree) =>
  new Set(
    exportedFiles(tree.exports)
      .filter(({file}) => CODE.test(file) && !NOT_SOURCE.test(file))
      .flatMap(({file}) => ownExports(tree.source(file))),
  );

/** The values `file` imports from the bridge, each [its local name, its name in the bridge]. */
const bridgeBindings = ({file, tree}) =>
  tree
    .source(file)
    .statements.filter(
      (node) =>
        ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly && isRelative(node.moduleSpecifier.text),
    )
    .filter(({moduleSpecifier}) => resolveRelative({from: file, specifier: moduleSpecifier.text, exists: tree.exists}) === BRIDGE)
    .flatMap(({importClause}) => clauseBindings(importClause));

/** The local a file exports as `name`: its own, or the one an `export {local as name}` list renames. */
function localOf({source, name}) {
  const lists = source.statements.filter((node) => ts.isExportDeclaration(node) && node.moduleSpecifier === undefined);
  return lists.flatMap((node) => listed(node) ?? []).find((entry) => entry.name === name)?.local ?? name;
}

/** Whether `node` names any of `locals`. */
function mentions(node, locals) {
  if (ts.isIdentifier(node) && locals.has(node.text)) return true;
  return ts.forEachChild(node, (child) => mentions(child, locals) || undefined) ?? false;
}

/**
 * A test of whether `file`'s export of a name wraps the package's: it forwards, or its declaration
 * uses, a value the file imports from the bridge under that name, by the bridge's name or, through
 * `aliases` (the bridge's name to the package's), the package's.
 */
function wrapsShared({file, tree, aliases}) {
  const source = tree.source(file);
  const bindings = bridgeBindings({file, tree});
  return (name) => {
    const locals = new Set(bindings.filter(([, bridged]) => bridged === name || aliases.get(bridged) === name).map(([local]) => local));
    const local = localOf({source, name});
    // `export {Base as Notice}` forwards the bridge's own.
    if (locals.has(local)) return true;
    return locals.size > 0 && source.statements.some((node) => declaredNames(node).includes(local) && mentions(node, locals));
  };
}

/**
 * The inkweave-ui names a copy in `file` would take: in src/ui, any the package exports, so a
 * module promoted but never bridged counts too; elsewhere, those the bridge takes, by its names
 * and the package's.
 */
function sharedNames({file, names}) {
  const bridged = [...names.bridged].flat();
  return new Set(file.startsWith('src/ui/') ? [...bridged, ...names.package] : bridged);
}

/**
 * Each admin export, as "file: name", that copies an inkweave-ui name, `names` holding the
 * bridge's (`bridged`, its name to the package's) and the package's (`package`). An export that
 * uses the name taken from the bridge wraps it, and KEEP_OWN's entries are admin's own on purpose.
 */
function adminCopies({files, tree, names, keepOwn = KEEP_OWN}) {
  const kept = new Set(keepOwn.map(({copy}) => copy));
  return files.flatMap((file) => {
    const shared = sharedNames({file, names});
    const wraps = wrapsShared({file, tree, aliases: names.bridged});
    return ownExports(tree.source(file))
      .filter((name) => shared.has(name) && !wraps(name))
      .map((name) => `${file}: ${name}`)
      .filter((copy) => !kept.has(copy));
  });
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

  it('takes from apps/web exactly APP_MODULES', () => {
    expect(bridgedAppModules(tree)).toEqual(APP_MODULES);
  });

  it("reaches every runtime package of the app's but PARITY_ONLY from the bridged code modules", {timeout: 60_000}, () => {
    const entries = APP_MODULES.map((specifier) => resolveRelative({from: BRIDGE, specifier, exists: tree.exists})).filter(
      (file) => file !== undefined && CODE.test(file),
    );
    const reached = new Set(reachedPackages({entries, tree}));
    const unreached = Object.keys(JSON.parse(tree.read(APP_PACKAGE)).dependencies).filter((name) => !reached.has(name));
    expect(entries).toHaveLength(7);
    expect(unreached).toEqual(PARITY_ONLY);
  });

  it('keeps no admin copy of an inkweave-ui module, and no KEEP_OWN entry whose copy is gone', () => {
    const names = {bridged: new Map(bridgedUi(tree)), package: packageNames(tree)};
    const files = adminSources();
    expect(adminCopies({files, tree, names})).toEqual([]);
    // A stale entry would let a new copy at its path pass unseen.
    const copies = new Set(adminCopies({files, tree, names, keepOwn: []}));
    expect(KEEP_OWN.map(({copy}) => copy).filter((copy) => !copies.has(copy))).toEqual([]);
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
    'app/loader.ts': [
      "import {isChaseRarity as isChase} from 'inkweave-ui/lib/printings';",
      'const own = 1;',
      'export {isChase as isChaseRarity, own};',
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

  it("follows the loader's import-then-export form, and leaves a listed local of its own alone", () => {
    const fromLoader = (name) => forwardedFrom({file: 'app/loader.ts', name, tree: memoryTree});
    expect(fromLoader('isChaseRarity')).toBe('inkweave-ui/lib/printings');
    expect(fromLoader('own')).toBeUndefined();
  });

  it("reads a namespace export as one name, the package's namespace or the app's own", () => {
    expect(from('theme')).toBe('inkweave-ui/tokens/theme');
    expect(from('RADIUS')).toBeUndefined();
    expect(from('own')).toBeUndefined();
  });
});

describe('reachedPackages', () => {
  const files = {
    'app/a.ts': [
      "import {b} from './b';",
      "import type {Session} from '@scope/auth/dist/types';",
      "import {useX} from 'inkweave-ui/hooks/useX';",
      "import {gone} from './gone';",
      "import {useGone} from 'inkweave-ui/hooks/useGone';",
      "export const lazy = () => import('lazy-pkg');",
      "export type Typed = import('typed-pkg').Typed;",
      '',
    ].join('\n'),
    'app/b.ts': 'export const b = 1;\n',
    'ui/src/hooks/useX.ts': "import {useState} from 'react';\nexport const useX = useState;\n",
  };
  const inMemory = (file) => file.replace(`${UI.root}/`, 'ui/');
  const memoryTree = parsedOnce({
    read: (file) => files[inMemory(file)],
    exists: (file) => Object.hasOwn(files, inMemory(file)),
    exports: {'./hooks/*': './src/hooks/*.ts'},
  });

  it('counts type-only imports, import() calls and types, and inkweave-ui by package, walks into the package, and skips a missing file', () => {
    expect(reachedPackages({entries: ['app/a.ts'], tree: memoryTree})).toEqual([
      '@scope/auth',
      'inkweave-ui',
      'lazy-pkg',
      'react',
      'typed-pkg',
    ]);
  });
});

describe('adminCopies', () => {
  const files = {
    'src/app-bridge.ts': '',
    'src/ui/Panel.tsx': 'export function Panel() {}\nexport const PANEL_GAP = 4;\n',
    'src/ui/Spinner.tsx': 'export function Spinner() {}\n',
    'src/tools/Spinner.tsx': 'export function Spinner() {}\n',
    'src/tools/view/Tag.tsx': 'export const Tag = 1;\n',
    // Wrappers: by a declaration, a list, a forward, and of a name the bridge renames.
    'src/ui/Notice.tsx': "import {Notice as BridgedNotice} from '../app-bridge';\nexport const Notice = BridgedNotice;\n",
    'src/tools/ListedPanel.tsx': "import {Panel as Base} from '../app-bridge';\nconst Framed = () => Base;\nexport {Framed as Panel};\n",
    'src/tools/ForwardedNotice.tsx': "import {Notice as Base} from '../app-bridge';\nexport {Base as Notice};\n",
    'src/tools/RenamedChip.tsx': "import {UiChip} from '../app-bridge';\nexport function Chip() {\n  return UiChip;\n}\n",
    // Copies beside an import of the name that wraps nothing: a type, or a value the copy never uses.
    'src/tools/TypeOnlyTag.tsx': "import type {Tag as T} from '../app-bridge';\nexport const Tag = (props: T) => props;\n",
    'src/tools/TypedTag.tsx': "import {type Tag as T} from '../app-bridge';\nexport const Tag = (props: T) => props;\n",
    'src/tools/view/StaleNotice.tsx': "import {Notice as Base} from '../../app-bridge';\nexport function Notice() {}\nexport const OLD = Base;\n",
  };
  const memoryTree = parsedOnce({read: (file) => files[file], exists: (file) => Object.hasOwn(files, file)});
  const names = {
    bridged: new Map([
      ['Notice', 'Notice'],
      ['Panel', 'Panel'],
      ['Tag', 'Tag'],
      ['UiChip', 'Chip'],
    ]),
    package: new Set(['Chip', 'Notice', 'Panel', 'Spinner', 'Tag']),
  };
  const copies = (paths, keepOwn) => adminCopies({files: paths, tree: memoryTree, names, keepOwn});
  const PLAIN = ['src/ui/Panel.tsx', 'src/ui/Spinner.tsx', 'src/tools/Spinner.tsx', 'src/tools/view/Tag.tsx'];

  it("lists a bridged name anywhere and any of the package's names in src/ui, and leaves an unrelated export alone", () => {
    expect(copies(PLAIN)).toEqual(['src/ui/Panel.tsx: Panel', 'src/ui/Spinner.tsx: Spinner', 'src/tools/view/Tag.tsx: Tag']);
  });

  it("leaves a wrapper alone: one that uses, lists or forwards what it takes from the bridge, by the bridge's name or the package's", () => {
    expect(
      copies(['src/ui/Notice.tsx', 'src/tools/ListedPanel.tsx', 'src/tools/ForwardedNotice.tsx', 'src/tools/RenamedChip.tsx']),
    ).toEqual([]);
  });

  it('lists a copy beside a type-only import of the name, or a value import the copy never uses', () => {
    expect(copies(['src/tools/TypeOnlyTag.tsx', 'src/tools/TypedTag.tsx', 'src/tools/view/StaleNotice.tsx'])).toEqual([
      'src/tools/TypeOnlyTag.tsx: Tag',
      'src/tools/TypedTag.tsx: Tag',
      'src/tools/view/StaleNotice.tsx: Notice',
    ]);
  });

  it("leaves KEEP_OWN's copies alone", () => {
    expect(copies(PLAIN, [{copy: 'src/tools/view/Tag.tsx: Tag', reason: 'admin wording'}])).toEqual([
      'src/ui/Panel.tsx: Panel',
      'src/ui/Spinner.tsx: Spinner',
    ]);
  });
});

describe('bridgedUi', () => {
  const files = {
    'src/app-bridge.ts': [
      "export {Notice} from 'inkweave-ui/components/Notice';",
      "export {Panel as UiPanel} from 'inkweave-ui/components/Panel';",
      "export * from 'inkweave-ui/components/Tag';",
      "import {Spinner as BaseSpinner} from 'inkweave-ui/components/Spinner';",
      'export const Spinner = BaseSpinner;',
      "export {APP_NAME} from '../upstream/inkweave/apps/web/src/shared/constants';",
      '',
    ].join('\n'),
    'ui/src/components/Tag.tsx': 'export function Tag() {}\nexport const TAG_GAP = 4;\n',
  };
  const memoryTree = parsedOnce({
    read: (file) => files[file.replace(`${UI.root}/`, 'ui/')],
    exists: (file) => Object.hasOwn(files, file),
    exports: {'./components/*': './src/components/*.tsx'},
  });

  it("pairs each name the bridge takes from the package with the package's, through a rename, `export *` and a local export", () => {
    expect(bridgedUi(memoryTree)).toEqual([
      ['Notice', 'Notice'],
      ['UiPanel', 'Panel'],
      ['Tag', 'Tag'],
      ['TAG_GAP', 'TAG_GAP'],
      ['Spinner', 'Spinner'],
    ]);
  });
});

describe('packageStylesheets', () => {
  it("names each .css file an exports target reaches, by the key's subpath", () => {
    expect(packageStylesheets({'./styles/*.css': './src/styles/*.css', './assets/*': './src/assets/*'})).toEqual(
      expect.arrayContaining(['inkweave-ui/styles/primitives.css', 'inkweave-ui/styles/lorcana.css']),
    );
  });
});

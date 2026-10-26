// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {exportTarget, isRelative, resolvePackage, resolveRelative, starMatch} from '../moduleResolve.mjs';

// inkweave-ui's exports map, as P1 and P2 leave it.
const UI_EXPORTS = {
  './tokens/*': './src/tokens/*.ts',
  './components/*': './src/components/*.tsx',
  './assets/*': './src/assets/*',
  './styles/*.css': './src/styles/*.css',
};
const PACKAGES = [{name: 'inkweave-ui', root: 'upstream/inkweave/packages/ui', exports: UI_EXPORTS}];

describe('resolveRelative', () => {
  const files = new Set(['src/b.ts', 'src/c.tsx', 'src/folder/index.ts', 'src/d.mjs', 'lib/e.js']);
  const exists = (file) => files.has(file);

  it.each([
    {specifier: './b', file: 'src/b.ts'},
    {specifier: './c?worker', file: 'src/c.tsx'},
    {specifier: './folder', file: 'src/folder/index.ts'},
    {specifier: './d.mjs?url', file: 'src/d.mjs'},
    {specifier: '../lib/e', file: 'lib/e.js'},
  ])('resolves $specifier as a bundler does', ({specifier, file}) => {
    expect(resolveRelative({from: 'src/a.ts', specifier, exists})).toBe(file);
  });

  it("gives nothing for a TS-style './b.js' when only b.ts exists", () => {
    expect(resolveRelative({from: 'src/a.ts', specifier: './b.js', exists})).toBeUndefined();
  });

  it('tells a relative specifier from a bare one', () => {
    expect(['./a', '../a', '.', 'a-package', 'inkweave-ui/tokens/theme'].map(isRelative)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe('starMatch', () => {
  it.each([
    {pattern: './tokens/*', subpath: './tokens/theme', star: 'theme'},
    {pattern: './styles/*.css', subpath: './styles/lorcana.css', star: 'lorcana'},
    {pattern: './styles/*.css', subpath: './styles/lorcana', star: undefined},
    {pattern: './tokens/*', subpath: './hooks/useHover', star: undefined},
    {pattern: './package.json', subpath: './package.json', star: ''},
    {pattern: './package.json', subpath: './other.json', star: undefined},
    {pattern: './a/*a', subpath: './a', star: undefined},
  ])('matches $subpath against $pattern', ({pattern, subpath, star}) => {
    expect(starMatch({pattern, subpath})).toBe(star);
  });
});

describe('exportTarget', () => {
  it('fills the target in from the key it matches', () => {
    expect(exportTarget({exports: UI_EXPORTS, subpath: './components/CtaButton'})).toBe('./src/components/CtaButton.tsx');
    expect(exportTarget({exports: UI_EXPORTS, subpath: './styles/primitives.css'})).toBe('./src/styles/primitives.css');
  });

  it('keeps a file name a target without an extension takes whole', () => {
    expect(exportTarget({exports: UI_EXPORTS, subpath: './assets/amber.svg'})).toBe('./src/assets/amber.svg');
  });

  it('gives nothing for a subpath no key matches, the root among them', () => {
    expect(exportTarget({exports: UI_EXPORTS, subpath: './lorcana/InkIcon'})).toBeUndefined();
    expect(exportTarget({exports: UI_EXPORTS, subpath: '.'})).toBeUndefined();
  });

  it('lets the most specific key decide, whatever the order, so a null under it blocks the subpath', () => {
    const exports = {'./components/*': './src/components/*.tsx', './components/internal/*': null, './components/Exact': './src/Exact.tsx'};
    expect(exportTarget({exports, subpath: './components/internal/Secret'})).toBeUndefined();
    expect(exportTarget({exports, subpath: './components/Exact'})).toBe('./src/Exact.tsx');
    expect(exportTarget({exports, subpath: './components/CtaButton'})).toBe('./src/components/CtaButton.tsx');
  });

  it("reads a condition object's import, else its default, and gives nothing for any other shape", () => {
    const exports = {
      './a/*': {types: './types/*.d.ts', import: './src/a/*.ts'},
      './b/*': {default: './src/b/*.ts'},
      './c/*': {node: './src/c/*.cjs'},
    };
    expect(exportTarget({exports, subpath: './a/x'})).toBe('./src/a/x.ts');
    expect(exportTarget({exports, subpath: './b/x'})).toBe('./src/b/x.ts');
    expect(exportTarget({exports, subpath: './c/x'})).toBeUndefined();
  });
});

describe('resolvePackage', () => {
  it("names the file a package's subpath resolves to, without the query", () => {
    expect(resolvePackage({specifier: 'inkweave-ui/tokens/theme', packages: PACKAGES})).toEqual({
      name: 'inkweave-ui',
      file: 'upstream/inkweave/packages/ui/src/tokens/theme.ts',
    });
    expect(resolvePackage({specifier: 'inkweave-ui/assets/amber.svg?no-inline', packages: PACKAGES})).toEqual({
      name: 'inkweave-ui',
      file: 'upstream/inkweave/packages/ui/src/assets/amber.svg',
    });
  });

  it('gives no file for a subpath the exports map lacks, or the bare root', () => {
    expect(resolvePackage({specifier: 'inkweave-ui/src/tokens/theme', packages: PACKAGES})).toEqual({name: 'inkweave-ui'});
    expect(resolvePackage({specifier: 'inkweave-ui', packages: PACKAGES})).toEqual({name: 'inkweave-ui'});
  });

  it('gives nothing for another package, even one whose name starts the same', () => {
    expect(resolvePackage({specifier: 'react', packages: PACKAGES})).toBeUndefined();
    expect(resolvePackage({specifier: 'inkweave-ui-extra/x', packages: PACKAGES})).toBeUndefined();
  });
});

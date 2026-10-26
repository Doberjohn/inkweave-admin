// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {alignDeps, comparePackageDeps, compareDeps} from './check-shared-deps.mjs';

const app = {
  dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
  devDependencies: {vite: '^8.3.0', storybook: '^10.6.0'},
};
// inkweave-ui's manifest, as its package.json shapes it: React as peers, and the tools it builds with.
const ui = {
  peerDependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
  devDependencies: {react: '^19.3.0', 'react-dom': '^19.3.0', '@types/react': '^19.3.0', vite: '^8.3.0'},
};

describe('compareDeps', () => {
  it('passes when admin declares every app runtime dependency at the app version', () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {vite: '^8.3.0'},
    };
    expect(compareDeps(admin, app)).toEqual([]);
  });

  it('reports an app runtime dependency admin does not declare', () => {
    const admin = {dependencies: {react: '^19.3.0'}, devDependencies: {}};
    expect(compareDeps(admin, app)).toEqual(['missing runtime dependency react-dom@^19.3.0']);
  });

  it('reports a shared package whose specifier differs', () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {vite: '^8.2.0'},
    };
    expect(compareDeps(admin, app)).toEqual(['version mismatch vite: admin ^8.2.0, app ^8.3.0']);
  });

  it('reports a runtime dependency the app no longer declares', () => {
    const admin = {dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0', 'react-virtuoso': '^4.18.19'}};
    expect(compareDeps(admin, app)).toEqual(['runtime dependency react-virtuoso the app no longer declares']);
  });

  it("keeps admin's own runtime dependencies", () => {
    const admin = {dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0', '@supabase/supabase-js': '^2.118.0'}};
    expect(compareDeps(admin, app)).toEqual([]);
  });

  it('ignores dev packages only admin declares', () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {husky: '^9.1.7'},
    };
    expect(compareDeps(admin, app)).toEqual([]);
  });
});

describe('comparePackageDeps', () => {
  it("passes when admin declares the package's peers and its specifier for every package both declare", () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {'@types/react': '^19.3.0', husky: '^9.1.7'},
    };
    expect(comparePackageDeps(admin, ui)).toEqual([]);
  });

  it('reports a peer admin does not declare as a runtime dependency', () => {
    const admin = {dependencies: {react: '^19.3.0'}, devDependencies: {'react-dom': '^19.3.0'}};
    expect(comparePackageDeps(admin, ui)).toEqual(['missing peer dependency react-dom@^19.3.0 of inkweave-ui']);
  });

  it('reports a package admin declares at another specifier than the package', () => {
    const admin = {dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'}, devDependencies: {'@types/react': '^19.2.0'}};
    expect(comparePackageDeps(admin, ui)).toEqual(['version mismatch @types/react: admin ^19.2.0, inkweave-ui ^19.3.0']);
  });
});

describe("compareDeps with inkweave-ui's manifest", () => {
  it('keeps a peer of the package that the app no longer declares', () => {
    const peers = {...ui, peerDependencies: {...ui.peerDependencies, 'react-aria': '^3.0.0'}};
    const admin = {dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0', 'react-aria': '^3.0.0'}};
    expect(compareDeps(admin, app, peers)).toEqual([]);
  });
});

describe('alignDeps', () => {
  it("drops a runtime dependency the app no longer declares, keeping admin's own", () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-virtuoso': '^4.18.19', '@supabase/supabase-js': '^2.118.0'},
      devDependencies: {},
    };
    expect(alignDeps(admin, app).dependencies).toEqual({
      react: '^19.3.0',
      '@supabase/supabase-js': '^2.118.0',
      'react-dom': '^19.3.0',
    });
  });

  it('moves an app runtime dependency out of devDependencies instead of listing it twice', () => {
    const admin = {dependencies: {react: '^19.3.0'}, devDependencies: {'react-dom': '^19.2.0', husky: '^9.1.7'}};
    expect(alignDeps(admin, app)).toEqual({
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {husky: '^9.1.7'},
    });
  });

  it("adds the package's missing peers, at the specifier it builds with, and fills in its specifiers", () => {
    const peers = {...ui, peerDependencies: {...ui.peerDependencies, 'react-aria': '^3.0.0'}};
    const admin = {dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'}, devDependencies: {'@types/react': '^19.2.0'}};
    expect(alignDeps(admin, app, peers)).toEqual({
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0', 'react-aria': '^3.0.0'},
      devDependencies: {'@types/react': '^19.3.0'},
    });
  });

  it("keeps the app's specifier where the app and the package disagree", () => {
    const behind = {...ui, devDependencies: {...ui.devDependencies, vite: '^8.2.0'}};
    const admin = {dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'}, devDependencies: {vite: '^8.1.0'}};
    expect(alignDeps(admin, app, behind).devDependencies).toEqual({vite: '^8.3.0'});
  });

  it('adds missing runtime dependencies and copies app specifiers onto shared packages', () => {
    const admin = {dependencies: {react: '^19.2.0'}, devDependencies: {vite: '^8.2.0', husky: '^9.1.7'}};
    expect(alignDeps(admin, app)).toEqual({
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {vite: '^8.3.0', husky: '^9.1.7'},
    });
  });
});

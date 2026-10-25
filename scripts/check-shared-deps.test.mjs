// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {alignDeps, compareDeps} from './check-shared-deps.mjs';

const app = {
  dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
  devDependencies: {vite: '^8.3.0', storybook: '^10.6.0'},
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

  it('adds missing runtime dependencies and copies app specifiers onto shared packages', () => {
    const admin = {dependencies: {react: '^19.2.0'}, devDependencies: {vite: '^8.2.0', husky: '^9.1.7'}};
    expect(alignDeps(admin, app)).toEqual({
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {vite: '^8.3.0', husky: '^9.1.7'},
    });
  });
});

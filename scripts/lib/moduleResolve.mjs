// Module resolution for the module-graph tests (#101): browser-safety's walk and
// bridge-sources. A relative specifier resolves as a bundler resolves it, and a
// workspace package's subpath through its package.json exports map, as Node and
// Vite read one: a key's `*` stands for the rest of the subpath, in the target too.
// Paths are repo-relative with "/" separators.
import path from 'node:path';

// What a bundler tries for a relative specifier, in order: the file as written, with an extension,
// as a folder's index.
const SUFFIXES = ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx', '/index.js'];
const RELATIVE = /^\.\.?(\/|$)/;
// A query such as ?raw or ?no-inline picks how Vite loads the file, not which file.
const withoutQuery = (specifier) => specifier.replace(/\?.*$/, '');

export const isRelative = (specifier) => RELATIVE.test(specifier);

/**
 * The file a relative `specifier` names from the file `from`, or undefined when no candidate
 * exists. `exists(path)` says whether a file is there.
 */
export function resolveRelative({from, specifier, exists}) {
  const base = path.posix.join(path.posix.dirname(from), withoutQuery(specifier));
  return SUFFIXES.map((suffix) => base + suffix).find((candidate) => exists(candidate));
}

/**
 * What a pattern's `*` stands for in `subpath`: '' for an exact key without one, or undefined
 * when the pattern doesn't match it.
 */
export function starMatch({pattern, subpath}) {
  const star = pattern.indexOf('*');
  if (star === -1) return pattern === subpath ? '' : undefined;
  const [prefix, suffix] = [pattern.slice(0, star), pattern.slice(star + 1)];
  if (subpath.length < prefix.length + suffix.length) return undefined;
  if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) return undefined;
  return subpath.slice(prefix.length, subpath.length - suffix.length);
}

/** The target an exports map gives `subpath` ("./tokens/theme"), its `*` filled in, or undefined. */
export function exportTarget({exports, subpath}) {
  for (const [pattern, target] of Object.entries(exports)) {
    const star = starMatch({pattern, subpath});
    if (star !== undefined) return target.replaceAll('*', star);
  }
  return undefined;
}

/**
 * The file a bare specifier names in one of `packages` (each `{name, root, exports}`): `{name, file}`,
 * `{name}` alone when the exports map lacks the subpath (the bare root among them, since these
 * packages export no root), or undefined when the specifier names another package.
 */
export function resolvePackage({specifier, packages}) {
  const bare = withoutQuery(specifier);
  const owner = packages.find(({name}) => bare === name || bare.startsWith(`${name}/`));
  if (owner === undefined) return undefined;
  const target = exportTarget({exports: owner.exports, subpath: `.${bare.slice(owner.name.length)}`});
  return target === undefined ? {name: owner.name} : {name: owner.name, file: path.posix.join(owner.root, target)};
}

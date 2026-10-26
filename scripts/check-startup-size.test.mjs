// @vitest-environment node
import zlib from 'node:zlib';
import {describe, expect, it} from 'vitest';
import {cssUrlProblems, measureStartup, sizeProblems, startupScripts} from './check-startup-size.mjs';

/** dist/index.html as Vite writes it, with the given modulepreloads. */
const indexHtml = (preloads = []) =>
  [
    '<!doctype html><html><head>',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<script type="module" crossorigin src="/assets/index-AAAA.js"></script>',
    ...preloads.map((name) => `<link rel="modulepreload" crossorigin href="/assets/${name}.js">`),
    '<link rel="stylesheet" crossorigin href="/assets/index-BBBB.css">',
    '</head><body><div id="root"></div><script>window.x = 1;</script></body></html>',
  ].join('');

describe('startupScripts', () => {
  it('lists the module script and each modulepreload, once each', () => {
    const html = indexHtml(['vendor-CCCC', 'vendor-CCCC']);
    expect(startupScripts(html)).toEqual(['/assets/index-AAAA.js', '/assets/vendor-CCCC.js']);
  });

  it('leaves out icons, stylesheets and inline scripts', () => {
    expect(startupScripts(indexHtml())).toEqual(['/assets/index-AAAA.js']);
  });
});

describe('measureStartup', () => {
  it('counts the startup files and adds their sizes gzipped at level 9', () => {
    const source = {'/assets/index-AAAA.js': 'console.log(1);'.repeat(50), '/assets/vendor-CCCC.js': 'let a = 2;'};
    const gzipped = Object.values(source).reduce((sum, text) => sum + zlib.gzipSync(text, {level: 9}).length, 0);
    const measured = measureStartup({html: indexHtml(['vendor-CCCC']), readAsset: (file) => source[file]});
    expect(measured).toEqual({files: 2, gzipBytes: gzipped});
  });
});

describe('sizeProblems', () => {
  const budget = {files: 1, gzipBytes: 1000};

  it('passes a startup within the budget', () => {
    expect(sizeProblems({files: 1, gzipBytes: 1000}, budget)).toEqual([]);
  });

  it('names a second startup file and bytes over the budget', () => {
    expect(sizeProblems({files: 2, gzipBytes: 1001}, budget)).toEqual([
      'startup loads 2 JS files, budget 1',
      'startup JS is 1001 B gzipped, over the 1000 B budget',
    ]);
  });
});

describe('cssUrlProblems', () => {
  const sheet = '/assets/index-BBBB.css';
  const emitted = new Set(['/assets/amber-AAAA.svg', '/favicon.svg']);
  const forwarded = ['/fonts/', '/brand/'];

  it('passes built files, forwarded paths, data URIs and fragment references', () => {
    const css =
      '.a{background:url(/assets/amber-AAAA.svg)}.b{mask:url("/brand/mark.svg?v=2")}' +
      "@font-face{src:url('/fonts/marcellus-400.woff2')}.c{background:url(data:image/svg+xml,%3Csvg%3E)}" +
      '.d{filter:url(#glow)}';
    expect(cssUrlProblems({css, sheet, emitted, forwarded})).toEqual([]);
  });

  it("passes a file from public/, another origin's url, and urls relative to the stylesheet", () => {
    const css =
      '.a{background:url(/favicon.svg)}.b{src:url(https://fonts.example/x.woff2)}.c{mask:url(//cdn.example/x.svg)}' +
      '.d{background:url(amber-AAAA.svg)}.e{mask:url(../brand/mark.svg)}';
    expect(cssUrlProblems({css, sheet, emitted, forwarded})).toEqual([]);
  });

  it("names each url that resolves to nothing, once, the prototype's relative symbol among them", () => {
    const css =
      ".a{background:url('./assets/amber.svg?no-inline')}.b{background:url(./assets/amber.svg?no-inline)}" +
      '.c{mask:url(/amber.svg)}';
    expect(cssUrlProblems({css, sheet, emitted, forwarded})).toEqual([
      'url(./assets/amber.svg?no-inline) names no built file or forwarded path',
      'url(/amber.svg) names no built file or forwarded path',
    ]);
  });
});

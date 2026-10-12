// @vitest-environment node
import {ESLint} from 'eslint';
import {beforeAll, describe, expect, it} from 'vitest';

const LEAK =
  "import {COLORS} from '../../upstream/inkweave/apps/web/src/shared/constants';\nexport const accent = COLORS.primary;\n";
const DYNAMIC_LEAK = "export const load = () => import('../../upstream/inkweave/apps/web/src/shared/constants');\n";
const TEMPLATE_LEAK = 'export const load = () => import(`../../upstream/inkweave/apps/web/src/shared/constants`);\n';
const REQUIRE_LEAK =
  "import {createRequire} from 'node:module';\nconst require = createRequire(import.meta.url);\nexport const pkg = require('../upstream/inkweave/package.json');\n";
const TEMPLATE_REQUIRE_LEAK =
  "import {createRequire} from 'node:module';\nconst require = createRequire(import.meta.url);\nexport const load = (file) => require(`../upstream/inkweave/${file}`);\n";
const ROOT_LEAK = "import app from '../../upstream';\nexport default app;\n";
const DYNAMIC_ROOT_LEAK = "export const load = () => import('../../upstream');\n";
const MEMO = "import {useMemo} from 'react';\nexport const useDouble = (n: number) => useMemo(() => n * 2, [n]);\n";

let eslint;

async function lint(filePath, code = LEAK) {
  const [result] = await eslint.lintText(code, {filePath});
  return result.messages;
}

async function ruleIds(filePath, code) {
  return (await lint(filePath, code)).map((message) => message.ruleId);
}

// An "allowed" check must also see a clean lint: a fatal parse or config error
// has no ruleId, so it would otherwise pass for the wrong reason.
async function expectAllowed(filePath, code, ruleId) {
  const messages = await lint(filePath, code);
  expect(messages.filter((message) => message.fatal)).toEqual([]);
  expect(messages.map((message) => message.ruleId)).not.toContain(ruleId);
}

// The first lint loads typescript-eslint and the React Compiler plugin (Babel):
// 23s here, 45s cold on Windows, 75s under load. The warm-up pays for it once,
// with its own budget; the cases then take milliseconds.
beforeAll(async () => {
  eslint = new ESLint();
  await lint('src/shell/Warmup.ts', 'export const warm = 1;\n');
}, 180_000);

describe('the app-bridge boundary', () => {
  it('rejects an upstream import outside the bridge', async () => {
    expect(await ruleIds('src/shell/Leak.ts')).toContain('no-restricted-imports');
  });

  it('rejects an upstream import in a Node script', async () => {
    expect(await ruleIds('scripts/leak.mjs')).toContain('no-restricted-imports');
  });

  it('rejects an import of the upstream root', async () => {
    expect(await ruleIds('src/shell/Leak.ts', ROOT_LEAK)).toContain('no-restricted-imports');
  });

  it('allows upstream imports in src/app-bridge.ts', async () => {
    await expectAllowed('src/app-bridge.ts', LEAK, 'no-restricted-imports');
  });

  it('rejects a dynamic upstream import outside the bridge', async () => {
    expect(await ruleIds('src/shell/Leak.ts', DYNAMIC_LEAK)).toContain('no-restricted-syntax');
  });

  it('rejects a template-literal dynamic upstream import', async () => {
    expect(await ruleIds('src/shell/Leak.ts', TEMPLATE_LEAK)).toContain('no-restricted-syntax');
  });

  it('rejects a require of upstream code in a Node script', async () => {
    expect(await ruleIds('scripts/leak.mjs', REQUIRE_LEAK)).toContain('no-restricted-syntax');
  });

  it('rejects a template-literal require of upstream code', async () => {
    expect(await ruleIds('scripts/leak.mjs', TEMPLATE_REQUIRE_LEAK)).toContain('no-restricted-syntax');
  });

  it('rejects a dynamic import of the upstream root', async () => {
    expect(await ruleIds('src/shell/Leak.ts', DYNAMIC_ROOT_LEAK)).toContain('no-restricted-syntax');
  });

  it('allows a dynamic upstream import in src/app-bridge.ts', async () => {
    await expectAllowed('src/app-bridge.ts', DYNAMIC_LEAK, 'no-restricted-syntax');
  });

  it('keeps the useMemo ban on files the boundary covers', async () => {
    expect(await ruleIds('src/shell/Memo.ts', MEMO)).toContain('no-restricted-syntax');
  });
});

// The layers under the tools (#37): src/ui imports neither the chart kit nor a
// tool, and src/shell, src/charts and src/theme import no tool, at any depth of
// ../ (a one-level grep missed ../../charts), statically or through import().
// Stories and tests may.
const KIT = "import {linear} from '../charts/scale';\nexport const scale = linear;\n";
const NESTED_KIT = "import {linear} from '../../charts/scale';\nexport const scale = linear;\n";
const DYNAMIC_KIT = "export const load = () => import('../charts/scale');\n";
const TOOL = "import {gapColor} from '../tools/analytics/gapColor';\nexport const color = gapColor;\n";
const NESTED_TOOL = "import {gapColor} from '../../tools/analytics/gapColor';\nexport const color = gapColor;\n";
const DYNAMIC_TOOL = "export const load = () => import('../tools/analytics/gapColor');\n";
const TOOL_TYPE = "import type {Verdict} from '../tools/analytics/verdict';\nexport type Shown = Verdict;\n";
const TOOL_REEXPORT = "export {gapColor} from '../tools/analytics/gapColor';\n";
const LAYERS = ['src/ui', 'src/shell', 'src/charts', 'src/theme'];

describe('the layer boundaries', () => {
  it('rejects a chart kit import in src/ui', async () => {
    expect(await ruleIds('src/ui/Leak.tsx', KIT)).toContain('no-restricted-imports');
  });

  it.each(LAYERS)('rejects a tool import in %s', async (dir) => {
    expect(await ruleIds(`${dir}/Leak.tsx`, TOOL)).toContain('no-restricted-imports');
  });

  it('rejects a dynamic chart kit import in src/ui', async () => {
    expect(await ruleIds('src/ui/Leak.tsx', DYNAMIC_KIT)).toContain('no-restricted-syntax');
  });

  it.each(LAYERS)('rejects a dynamic tool import in %s', async (dir) => {
    expect(await ruleIds(`${dir}/Leak.tsx`, DYNAMIC_TOOL)).toContain('no-restricted-syntax');
  });

  it.each([
    ['the chart kit', NESTED_KIT],
    ['a tool', NESTED_TOOL],
  ])('rejects an import of %s two folders up, from a folder inside src/ui', async (_, code) => {
    expect(await ruleIds('src/ui/meters/Leak.tsx', code)).toContain('no-restricted-imports');
  });

  it.each([
    ['a type-only import', TOOL_TYPE],
    ['a re-export', TOOL_REEXPORT],
  ])('rejects %s of a tool', async (_, code) => {
    expect(await ruleIds('src/shell/Leak.ts', code)).toContain('no-restricted-imports');
  });

  it.each([
    ['the upstream ban', LEAK, 'no-restricted-imports'],
    ['the dynamic upstream ban', DYNAMIC_LEAK, 'no-restricted-syntax'],
    ['the useMemo ban', MEMO, 'no-restricted-syntax'],
  ])("keeps %s in src/ui, whose block replaces D3's options", async (_, code, ruleId) => {
    expect(await ruleIds('src/ui/Leak.ts', code)).toContain(ruleId);
  });

  it.each([
    'src/charts/Charts.stories.tsx',
    'src/ui/Palette.stories.ts',
    'src/shell/AdminShell.test.tsx',
    'src/ui/__tests__/Leak.test.tsx',
  ])('allows a tool import in %s, a story or a test', async (filePath) => {
    await expectAllowed(filePath, TOOL, 'no-restricted-imports');
  });

  it('allows the tools to import the chart kit', async () => {
    await expectAllowed('src/tools/analytics/Leak.tsx', NESTED_KIT, 'no-restricted-imports');
  });
});

// Admin has no design-token exception (CLAUDE.md): every source file gets the
// app's rules. OFF_TOKEN breaks four of them: an off-token color, a 15px size,
// a 9px radius and a raw hex.
const OFF_TOKEN =
  "export const art = {color: 'rgba(43, 127, 255, 0.22)', fontSize: 15, borderRadius: 9, background: '#123456'};\n";
const TOKEN_RULES = ['inkweave/no-raw-rgba', 'inkweave/no-raw-font-size', 'inkweave/no-raw-radius', 'inkweave/no-raw-hex-colors'];

describe('the design-token rules', () => {
  it.each(TOKEN_RULES)('hold every admin source file to %s', async (rule) => {
    expect(await ruleIds('src/shell/Art.tsx', OFF_TOKEN)).toContain(rule);
  });
});

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

// inkweave-ui is a workspace package (#101), so admin imports it by name, which the upstream ban
// never sees: its own ban keeps it behind the bridge, in every block whose options replace D3's.
const UI_LEAK = "import {CtaButton} from 'inkweave-ui/components/CtaButton';\nexport const Button = CtaButton;\n";
const UI_TYPE = "import type {SPACING} from 'inkweave-ui/tokens/theme';\nexport type Gap = typeof SPACING;\n";
const UI_REEXPORT = "export {COLORS} from 'inkweave-ui/tokens/theme';\n";
const UI_ROOT = "import * as ui from 'inkweave-ui';\nexport default ui;\n";
const UI_DYNAMIC = "export const load = () => import('inkweave-ui/tokens/theme');\n";
const ENGINE = "import {SynergyEngine} from 'inkweave-synergy-engine';\nexport const engine = new SynergyEngine();\n";

describe('the inkweave-ui boundary', () => {
  it.each([
    'src/tools/studio/Leak.tsx',
    'src/shell/Leak.tsx',
    'src/ui/Leak.tsx',
    'src/theme/Leak.ts',
    'src/charts/Leak.tsx',
    'src/tools/studio/Leak.stories.tsx',
    'src/shell/__tests__/Leak.test.tsx',
    'scripts/leak.mjs',
  ])('rejects an inkweave-ui import in %s', async (filePath) => {
    expect(await ruleIds(filePath, UI_LEAK)).toContain('no-restricted-imports');
  });

  it.each([
    ['a type-only import', UI_TYPE],
    ['a re-export', UI_REEXPORT],
    ['an import of the bare root', UI_ROOT],
  ])('rejects %s of inkweave-ui', async (_, code) => {
    expect(await ruleIds('src/tools/studio/Leak.ts', code)).toContain('no-restricted-imports');
  });

  it.each(['src/tools/studio/Leak.ts', 'src/ui/Leak.ts'])('rejects a dynamic inkweave-ui import in %s', async (filePath) => {
    expect(await ruleIds(filePath, UI_DYNAMIC)).toContain('no-restricted-syntax');
  });

  it.each([
    [UI_LEAK, 'no-restricted-imports'],
    [UI_DYNAMIC, 'no-restricted-syntax'],
  ])('allows inkweave-ui in src/app-bridge.ts', async (code, ruleId) => {
    await expectAllowed('src/app-bridge.ts', code, ruleId);
  });

  it('leaves the engine, the other workspace package, importable anywhere', async () => {
    await expectAllowed('src/tools/studio/Engine.ts', ENGINE, 'no-restricted-imports');
    await expectAllowed('src/ui/Engine.ts', ENGINE, 'no-restricted-imports');
  });
});

// Admin enables every design-token rule the app's plugin has (CLAUDE.md), by name in eslint.config.js.
// The plugin is the one the config loads from the pin, so a pin bump that brings a rule fails this until
// the config enables it too (#84). It reads the plugin through the config: this file may not import upstream.
describe("the app's design-token rules", () => {
  it('enables every rule of the plugin, as an error, on admin source files', async () => {
    const config = await eslint.calculateConfigForFile('src/shell/Tokens.tsx');
    const plugin = Object.keys(config.plugins.inkweave.rules).map((rule) => `inkweave/${rule}`);
    const enabled = Object.entries(config.rules)
      .filter(([rule, [severity]]) => rule.startsWith('inkweave/') && severity === 2)
      .map(([rule]) => rule);
    expect(plugin.length).toBeGreaterThan(0);
    expect(enabled.sort()).toEqual(plugin.sort());
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
// app's rules. OFF_TOKEN breaks five of them: an off-token color, a 15px size,
// a 9px radius, a raw hex and a 30px padding.
const OFF_TOKEN =
  "export const art = {color: 'rgba(43, 127, 255, 0.22)', fontSize: 15, borderRadius: 9, background: '#123456', padding: 30};\n";
const TOKEN_RULES = [
  'inkweave/no-raw-rgba',
  'inkweave/no-raw-font-size',
  'inkweave/no-raw-radius',
  'inkweave/no-raw-hex-colors',
  'inkweave/no-raw-spacing',
];

describe('the design-token rules', () => {
  it.each(TOKEN_RULES)('hold every admin source file to %s', async (rule) => {
    expect(await ruleIds('src/shell/Art.tsx', OFF_TOKEN)).toContain(rule);
  });
});

// The React Compiler skips a function it can't compile, and the build says
// nothing (Doberjohn/inkweave-admin#59). FINALLY clears its state in a
// finally, as useEditSave's save() did: the compiler can't lower one yet (a
// Todo), so it skipped the whole hook. INCOMPATIBLE calls a library the
// compiler refuses to memoize, which the recommended set only warns about.
const FINALLY = [
  "import {useState} from 'react';",
  'export function useSave(commit: () => Promise<void>) {',
  '  const [saving, setSaving] = useState(false);',
  '  const [error, setError] = useState<unknown>(null);',
  '  async function save() {',
  '    setSaving(true);',
  '    try {',
  '      await commit();',
  '    } catch (e) {',
  '      setError(e);',
  '    } finally {',
  '      setSaving(false);',
  '    }',
  '  }',
  '  return {saving, error, save};',
  '}',
  '',
].join('\n');
const INCOMPATIBLE = [
  "import {useVirtualizer} from '@tanstack/react-virtual';",
  'export function useRows(count: number) {',
  '  const rows = useVirtualizer({count, getScrollElement: () => null, estimateSize: () => 10});',
  '  return rows.getVirtualItems();',
  '}',
  '',
].join('\n');

describe('the React Compiler bailouts', () => {
  it('rejects a hook the compiler skips for a try/finally it cannot lower yet, as an error', async () => {
    expect(await lint('src/tools/studio/useSave.ts', FINALLY)).toContainEqual(
      expect.objectContaining({ruleId: 'react-hooks/todo', severity: 2}),
    );
  });

  // No snippet makes this compiler report an invariant, a syntax error or unsupported syntax
  // (a class or a namespace inside a hook draws none of them), so these pin the setting itself.
  it.each(['react-hooks/invariant', 'react-hooks/syntax', 'react-hooks/unsupported-syntax'])(
    'holds every source file to %s, as an error',
    async (rule) => {
      const config = await eslint.calculateConfigForFile('src/tools/studio/useSave.ts');
      expect(config.rules[rule]).toEqual([2]);
    },
  );

  it('rejects an incompatible library as an error, where the recommended set only warns', async () => {
    expect(await lint('src/tools/studio/useRows.ts', INCOMPATIBLE)).toContainEqual(
      expect.objectContaining({ruleId: 'react-hooks/incompatible-library', severity: 2}),
    );
  });

  it.each(['src/tools/studio/__tests__/useSave.test.ts', 'src/tools/studio/useSave.test.tsx', 'src/test/useSave.ts'])(
    'allows a skipped hook in %s, test code that never ships',
    async (filePath) => {
      await expectAllowed(filePath, FINALLY, 'react-hooks/todo');
    },
  );
});

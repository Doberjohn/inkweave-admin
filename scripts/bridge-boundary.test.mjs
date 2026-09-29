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

// The literals SynergyBanner keeps (eslint.config.js): an off-token color, a 15px
// size and a 9px radius. RAW_HEX is a rule the exception does not cover.
const BANNER_ART = "export const art = {color: 'rgba(43, 127, 255, 0.22)', fontSize: 15, borderRadius: 9};\n";
const RAW_HEX = "export const ink = '#123456';\n";
const BANNER_RULES = ['inkweave/no-raw-rgba', 'inkweave/no-raw-font-size', 'inkweave/no-raw-radius'];

describe('the design-token exception', () => {
  it.each(BANNER_RULES)('lets SynergyBanner.tsx through %s', async (rule) => {
    await expectAllowed('src/tools/banner/SynergyBanner.tsx', BANNER_ART, rule);
  });

  it.each(BANNER_RULES)('holds every other file to %s', async (rule) => {
    expect(await ruleIds('src/tools/banner/BannerPage.tsx', BANNER_ART)).toContain(rule);
  });

  it('holds SynergyBanner.tsx to the rest of the design-token rules', async () => {
    expect(await ruleIds('src/tools/banner/SynergyBanner.tsx', RAW_HEX)).toContain('inkweave/no-raw-hex-colors');
  });
});

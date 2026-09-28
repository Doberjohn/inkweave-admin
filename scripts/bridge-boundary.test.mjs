// @vitest-environment node
import {ESLint} from 'eslint';
import {describe, expect, it} from 'vitest';

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

async function lint(filePath, code = LEAK) {
  const [result] = await new ESLint().lintText(code, {filePath});
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
// ~3.5-4.7s warm and 45s cold on Windows, past Vitest's 5s default.
describe('the app-bridge boundary', {timeout: 60_000}, () => {
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

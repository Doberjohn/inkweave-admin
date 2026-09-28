// @vitest-environment node
import {ESLint} from 'eslint';
import {describe, expect, it} from 'vitest';

const LEAK =
  "import {COLORS} from '../../upstream/inkweave/apps/web/src/shared/constants';\nexport const accent = COLORS.primary;\n";
const DYNAMIC_LEAK = "export const load = () => import('../../upstream/inkweave/apps/web/src/shared/constants');\n";
const MEMO = "import {useMemo} from 'react';\nexport const useDouble = (n: number) => useMemo(() => n * 2, [n]);\n";

async function ruleIds(filePath, code = LEAK) {
  const [result] = await new ESLint().lintText(code, {filePath});
  return result.messages.map((message) => message.ruleId);
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

  it('allows upstream imports in src/app-bridge.ts', async () => {
    expect(await ruleIds('src/app-bridge.ts')).not.toContain('no-restricted-imports');
  });

  it('rejects a dynamic upstream import outside the bridge', async () => {
    expect(await ruleIds('src/shell/Leak.ts', DYNAMIC_LEAK)).toContain('no-restricted-syntax');
  });

  it('allows a dynamic upstream import in src/app-bridge.ts', async () => {
    expect(await ruleIds('src/app-bridge.ts', DYNAMIC_LEAK)).not.toContain('no-restricted-syntax');
  });

  it('keeps the useMemo ban on files the boundary covers', async () => {
    expect(await ruleIds('src/shell/Memo.ts', MEMO)).toContain('no-restricted-syntax');
  });
});

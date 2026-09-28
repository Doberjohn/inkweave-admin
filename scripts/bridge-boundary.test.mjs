// @vitest-environment node
import {ESLint} from 'eslint';
import {describe, expect, it} from 'vitest';

const LEAK =
  "import {COLORS} from '../../upstream/inkweave/apps/web/src/shared/constants';\nexport const accent = COLORS.primary;\n";

async function ruleIds(filePath) {
  const [result] = await new ESLint().lintText(LEAK, {filePath});
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
});

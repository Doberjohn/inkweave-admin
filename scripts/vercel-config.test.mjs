// @vitest-environment node
import fs from 'node:fs';
import {expect, it} from 'vitest';

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

// deploy.yml is the only way admin ships: it refuses to deploy without All
// Deployments protection and gate-checks every URL afterwards. A Vercel Git build
// would skip both, so Git-triggered deployments stay off even if the repo is
// connected to the project again.
it('turns off Git-triggered deployments', () => {
  expect(vercel.git?.deploymentEnabled).toBe(false);
});

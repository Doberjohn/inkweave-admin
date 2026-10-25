/**
 * Load admin's TypeScript from Node: the season through the app bridge (src/app-bridge.ts,
 * the one module that reaches the pinned app), the write chain Card studio's New card uses
 * (src/tools/reveal/), and the map of the numbers released cards hold, which New card checks.
 * Vite's `runnerImport` transforms them the way the dev server does, so nothing is
 * duplicated, and a season rotation reaches the skill with a pin bump.
 *
 * The bridge imports the app's CSS, and Vite's CSS plugins only work inside a running dev
 * server ("Cannot read properties of undefined (reading 'get')"). No stylesheet matters
 * here, so each resolves to an empty module before those plugins see it.
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const EMPTY_STYLE = '\0reveal-sync:empty-style';
const NO_CSS = {
  name: 'reveal-sync:no-css',
  enforce: 'pre',
  resolveId: (id) => (/\.css(\?|$)/.test(id) ? EMPTY_STYLE : null),
  load: (id) => (id === EMPTY_STYLE ? 'export default ""' : null),
};

async function importTs(relative) {
  const {runnerImport} = await import('vite');
  const {module} = await runnerImport(path.join(ROOT, relative), {
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    plugins: [NO_CSS],
  });
  return module;
}

/** "Hyperia City" -> "hyperia-city", the slug lorcanaplayer's cardset filter uses. */
export function siteSetSlug(setName) {
  return setName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The season this run targets, as the pinned app defines it. */
export async function loadSeason() {
  const app = await importTs('src/app-bridge.ts');
  const setName = app.SET_NAMES[app.REVEAL_SET_CODE];
  if (!setName) throw new Error(`SET_NAMES has no entry for set ${app.REVEAL_SET_CODE}`);
  return {
    setCode: app.REVEAL_SET_CODE,
    setNumber: app.REVEAL_SET_NUMBER,
    setName,
    setSlug: siteSetSlug(setName),
    setTotal: app.SET_TOTAL,
    idBase: app.REVEAL_ID_BASE,
    inkBlocks: Object.fromEntries(app.ALL_INKS.map((ink) => [ink, app.inkBlock(ink)])),
  };
}

/**
 * transformRawCards and releasedRevealNumbers: allCards.json's cards built as the app's loader
 * builds them, then the numbers the reveal set's released cards hold, mapped as Card studio's
 * New card maps them (released.mjs, Doberjohn/inkweave-admin#51).
 */
export async function loadReleasedChain() {
  const [bridge, released] = await Promise.all([
    importTs('src/app-bridge.ts'),
    importTs('src/tools/reveal/releasedNumbers.ts'),
  ]);
  return {
    transformRawCards: bridge.transformRawCards,
    releasedRevealNumbers: released.releasedRevealNumbers,
  };
}

/** validateRevealCardForm, buildPreviewCard and insertCardIntoPreviewJson, as Card studio's New card uses them. */
export async function loadWriteChain() {
  const dir = 'src/tools/reveal';
  const [validate, build, insert] = await Promise.all([
    importTs(`${dir}/validateForm.ts`),
    importTs(`${dir}/buildPreviewCard.ts`),
    importTs(`${dir}/insertCardIntoPreviewJson.ts`),
  ]);
  return {
    validateRevealCardForm: validate.validateRevealCardForm,
    buildPreviewCard: build.buildPreviewCard,
    insertCardIntoPreviewJson: insert.insertCardIntoPreviewJson,
  };
}

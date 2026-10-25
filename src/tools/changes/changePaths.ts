import {RAW_DIR} from '../image/githubClient';
import {PREVIEW_PATH} from '../reveal/githubClient';
import {FEATURED_PATH} from '../featured/githubClient';
import {ALL_CARDS_PATH, CATALOG_PATH, COLLECTION_DIR} from '../studio/finishes/finishFiles';
import {TUNING_PATH} from '../tuning/githubClient';

/*
 * What the change history follows in the app repo: the files admin's tools write, and
 * the card data they write beside them. A commit that changed any of them is a change.
 */

/** What a change touched: the reveal season's preview cards, raw scans, the card data, tuning.json or the homepage's featured cards. */
export type ChangeArea = 'cards' | 'scans' | 'data' | 'tuning' | 'featured';

/** A followed path, a file or a folder and everything under it, and the area it belongs to. */
export interface TrackedPath {
  path: string;
  area: ChangeArea;
}

/** Every followed path, in the order the history reads them and lists their areas. */
export const TRACKED_PATHS: readonly TrackedPath[] = [
  {path: PREVIEW_PATH, area: 'cards'},
  {path: RAW_DIR, area: 'scans'},
  {path: ALL_CARDS_PATH, area: 'data'},
  {path: COLLECTION_DIR, area: 'data'},
  {path: CATALOG_PATH, area: 'data'},
  {path: TUNING_PATH, area: 'tuning'},
  {path: FEATURED_PATH, area: 'featured'},
];

/**
 * Each area's name, as the filter offers it. A change's tags print it lowercase, as every Tag's
 * words are (#74), and so does the line that says an area has no changes.
 */
export const AREA_LABELS: Readonly<Record<ChangeArea, string>> = {
  cards: 'Preview cards',
  scans: 'Scans',
  data: 'Card data',
  tuning: 'Tuning',
  featured: 'Featured cards',
};

/** The areas in the order a change lists them and the filter offers them. */
export const AREAS: readonly ChangeArea[] = ['cards', 'scans', 'data', 'tuning', 'featured'];

/** The area a changed file belongs to, or null for one the history doesn't follow. */
export function areaOf(file: string): ChangeArea | null {
  const tracked = TRACKED_PATHS.find(({path}) => file === path || file.startsWith(`${path}/`));
  return tracked?.area ?? null;
}

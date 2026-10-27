import {Tag} from '../app-bridge';

/**
 * Marks a number computed from the raw vote log (vote-log.json) rather than
 * the aggregates, as KpiCard's `tag`. Pages hide those numbers when the
 * artifact has no raw votes. The tag is informative, so it takes the muted
 * colour (R-6).
 */
export function RawTag() {
  return <Tag title="From the raw vote log">raw</Tag>;
}

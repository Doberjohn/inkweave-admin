import {useRef, useState} from 'react';
import {CtaButton, SPACING} from '../../app-bridge';
import {ForgetTokenOffer} from '../../github/ForgetTokenOffer';
import {isRejectedToken} from '../../github/rejectedToken';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {fmtWeekday} from '../../ui/format';
import {Notice} from '../../ui/Notice';
import {Panel} from '../../ui/Panel';
import {SegmentedControl} from '../../ui/SegmentedControl';
import {AREA_LABELS, AREAS} from './changePaths';
import {ChangeItem} from './ChangeItem';
import type {ChangeSource} from './changeSource';
import {
  byDay,
  filterChanges,
  localDay,
  mergedChanges,
  type AreaFilter,
  type Change,
  type ChangeDay,
  type PathStream,
} from './historyModel';
import {ReadFailure} from './ReadFailure';
import type {ChangeHistory, OlderRead} from './useChangeHistory';

const FILTER_OPTIONS: ReadonlyArray<{value: AreaFilter; label: string}> = [
  {value: 'all', label: 'All'},
  ...AREAS.map((area) => ({value: area, label: AREA_LABELS[area]})),
];

/** The filter's width where the row has room: its five options at an even width that holds "Preview cards". */
const FILTER_WIDTH = 440;

const countOf = (n: number) => `${n} change${n === 1 ? '' : 's'}`;

/**
 * How many changes the filter shows, and how far back the list reaches: "12 changes since
 * Thu Oct 1", or "12 changes" once it holds the whole history. The reach is the whole
 * list's, filtered or not.
 */
function reach({shown, changes, hasOlder}: {shown: number; changes: readonly Change[]; hasOlder: boolean}): string {
  const oldest = changes.at(-1);
  return hasOlder && oldest ? `${countOf(shown)} since ${fmtWeekday(localDay(oldest))}` : countOf(shown);
}

/**
 * What the filter row says when nothing in the list passes it: in the stretch read so far,
 * while older pages remain, or in the whole history once they don't.
 */
function emptyMessage({filter, hasOlder}: {filter: AreaFilter; hasOlder: boolean}): string {
  if (!hasOlder) return filter === 'all' ? 'No changes yet.' : `No changes to ${AREA_LABELS[filter].toLowerCase()}.`;
  const what = filter === 'all' ? 'No changes' : `No changes to ${AREA_LABELS[filter].toLowerCase()}`;
  return `${what} in this stretch. Show older changes to look further back.`;
}

/** What a day's changes and their reads need: the page's source, and its Forget token. */
interface DayPanelProps {
  day: ChangeDay;
  source: ChangeSource;
  onForgetToken: () => void;
}

/** One day's changes, newest first, in a flush panel headed by the day. */
function DayPanel({day, source, onForgetToken}: DayPanelProps) {
  return (
    <Panel title={fmtWeekday(day.day)} action={countOf(day.changes.length)} padded={false}>
      <ol style={{margin: 0, padding: 0, listStyle: 'none'}}>
        {day.changes.map((change, index) => (
          <ChangeItem key={change.sha} change={change} source={source} divided={index > 0} onForgetToken={onForgetToken} />
        ))}
      </ol>
    </Panel>
  );
}

/** Why the last read of older pages failed, and Forget token when GitHub rejected the saved token. */
function OlderError({error, onForgetToken}: {error: string; onForgetToken: () => void}) {
  return (
    <>
      <Notice tone="error">Older changes could not be read: {error}</Notice>
      {isRejectedToken(error) && <ForgetTokenOffer onForget={onForgetToken} />}
    </>
  );
}

interface OlderRowProps {
  older: OlderRead;
  onLoadOlder: () => void;
  onForgetToken: () => void;
}

/**
 * Reads each path's next page; while one runs the button holds, keeping its focus
 * (aria-disabled). After a failed read it is the retry, and Forget token joins it when
 * GitHub rejected the saved token.
 */
function OlderRow({older, onLoadOlder, onForgetToken}: OlderRowProps) {
  const loading = older.status === 'loading';
  return (
    <div style={{display: 'grid', justifyItems: 'center', gap: SPACING.md}}>
      {older.status === 'error' && <OlderError error={older.error} onForgetToken={onForgetToken} />}
      <CtaButton type="button" variant="neutral" aria-disabled={loading || undefined} onClick={onLoadOlder}>
        {loading ? 'Reading older changes…' : 'Show older changes'}
      </CtaButton>
    </div>
  );
}

/**
 * Where the list ends once every path is read to its start. It takes focus when the read
 * that got there took Show older changes with it (R-48), and only then: a first read that
 * holds the whole history leaves focus where it is.
 */
function HistoryEnd({handoff}: {handoff: FocusHandoff}) {
  const endRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, endRef, 'p');
  return (
    <div ref={endRef}>
      <p tabIndex={-1} style={{margin: 0, textAlign: 'center', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
        That&rsquo;s the whole history.
      </p>
    </div>
  );
}

interface HistoryListProps {
  streams: readonly PathStream[];
  older: OlderRead;
  onLoadOlder: () => void;
  source: ChangeSource;
  onForgetToken: () => void;
}

/** The paths read so far as one list: the filter, a panel per day, then Show older changes or the end of the history. */
function HistoryList({streams, older, onLoadOlder, source, onForgetToken}: HistoryListProps) {
  const [filter, setFilter] = useState<AreaFilter>('all');
  const {changes, hasOlder} = mergedChanges(streams);
  const shown = filterChanges(changes, filter);
  const endHandoff = useFocusHandoff();
  const [hadOlder, setHadOlder] = useState(hasOlder);
  if (hadOlder !== hasOlder) {
    setHadOlder(hasOlder);
    // The last page landed, and Show older changes went with the read: the end of the history takes focus.
    if (!hasOlder) endHandoff.request();
  }
  return (
    <>
      <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md}}>
        {/* FILTER_WIDTH where the row has it; narrower, it shrinks and its options wrap two by two (fill). */}
        <div style={{flex: `0 1 ${FILTER_WIDTH}px`, minWidth: 0}}>
          <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} ariaLabel="Show changes to" fill />
        </div>
        <span style={{marginLeft: 'auto', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
          {reach({shown: shown.length, changes, hasOlder})}
        </span>
      </div>
      {shown.length === 0 ? (
        <Notice>{emptyMessage({filter, hasOlder})}</Notice>
      ) : (
        byDay(shown).map((day) => <DayPanel key={day.day} day={day} source={source} onForgetToken={onForgetToken} />)
      )}
      {hasOlder ? (
        <OlderRow older={older} onLoadOlder={onLoadOlder} onForgetToken={onForgetToken} />
      ) : (
        changes.length > 0 && <HistoryEnd handoff={endHandoff} />
      )}
    </>
  );
}

interface ChangesViewProps {
  history: ChangeHistory;
  source: ChangeSource;
  /** Forgets the saved token, which GitHub rejected. */
  onForgetToken: () => void;
  /**
   * The page's focus handoff, which Try again asks for: the button goes with the error, and
   * the view the read lands on takes focus (ChangesPage).
   */
  handoff: FocusHandoff;
}

/**
 * The change history: a filter by what changed, then the changes the paths' pages hold,
 * a panel per day, and Show older changes while any path has more to read.
 */
export function ChangesView({history, source, onForgetToken, handoff}: ChangesViewProps) {
  const {state} = history;
  if (state.status === 'loading') return <Notice>Reading the app&rsquo;s history…</Notice>;
  if (state.status === 'error') {
    const onRetry = () => {
      handoff.request();
      history.retry();
    };
    return <ReadFailure what="The app’s history" error={state.error} onRetry={onRetry} onForgetToken={onForgetToken} />;
  }
  const {streams, older} = state;
  return <HistoryList streams={streams} older={older} onLoadOlder={history.loadOlder} source={source} onForgetToken={onForgetToken} />;
}

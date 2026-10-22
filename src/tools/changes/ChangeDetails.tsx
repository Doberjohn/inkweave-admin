import {Link} from 'react-router-dom';
import {SPACING} from '../../app-bridge';
import {REPO_URL} from '../../github/githubApi';
import {FILES_LISTED} from '../../github/githubHistory';
import {studioHref} from '../../shell/nav';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import {Tag} from '../../ui/Tag';
import {useDetails, useScanUrl, type ChangeSource} from './changeSource';
import type {CommitDetails, ScanFile} from './commitDetails';
import {ReadFailure} from './ReadFailure';
import type {EntryChange, ValueChange} from './entryDiff';
import {localDay, localTime, type Change} from './historyModel';
import type {TuningChange} from './tuningDiff';

/** How many cards and printings an open change lists before it counts the rest. */
export const MAX_ENTRIES = 30;

/** A scan's width in the list: the card's art at a glance, its text too small to read. */
const SCAN_WIDTH = 120;

const SECTION_TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  color: ADMIN_COLORS.muted,
};

const LIST: React.CSSProperties = {margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: SPACING.sm};

const VALUE_LIST: React.CSSProperties = {...LIST, gap: SPACING.xxs, marginTop: SPACING.xxs, paddingLeft: SPACING.lg};

const LINE: React.CSSProperties = {fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.text, overflowWrap: 'anywhere'};

const MUTED: React.CSSProperties = {color: ADMIN_COLORS.muted};

const META: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** "Versions: Not set → Foil only", or "images changed" for a value too long to print. */
function ValueLine({label, from, to}: Pick<ValueChange, 'label' | 'from' | 'to'>) {
  if (from === null || to === null) {
    return (
      <li style={LINE}>
        <span style={MUTED}>{label}</span> changed
      </li>
    );
  }
  return (
    <li style={LINE}>
      <span style={MUTED}>{label}:</span> {from} → {to}
    </li>
  );
}

/** A card's or printing's name, linked to Edit card for the card it is or reprints. */
function EntryName({entry}: {entry: EntryChange}) {
  if (entry.cardId === null) return entry.label;
  return (
    <Link to={studioHref('edit', entry.cardId)} className="adm-link">
      {entry.label}
    </Link>
  );
}

/** The cards and printings a change added, removed or changed, the first MAX_ENTRIES of them. */
function EntryList({entries}: {entries: readonly EntryChange[]}) {
  const hidden = entries.length - MAX_ENTRIES;
  return (
    <section style={{display: 'grid', gap: SPACING.sm}}>
      <h4 style={SECTION_TITLE}>Cards and printings</h4>
      <ul style={LIST}>
        {entries.slice(0, MAX_ENTRIES).map((entry) => (
          <li key={entry.id} style={LINE}>
            <span style={{display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm}}>
              <EntryName entry={entry} />
              {entry.kind !== 'changed' && <Tag>{entry.kind}</Tag>}
            </span>
            {entry.values.length > 0 && (
              <ul style={VALUE_LIST}>
                {entry.values.map((value) => (
                  <ValueLine key={value.key} label={value.label} from={value.from} to={value.to} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {hidden > 0 && <p style={META}>And {hidden} more.</p>}
    </section>
  );
}

/** The tuning.json values a change made. */
function TuningList({changes}: {changes: readonly TuningChange[]}) {
  return (
    <section style={{display: 'grid', gap: SPACING.sm}}>
      <h4 style={SECTION_TITLE}>Tuning</h4>
      <ul style={LIST}>
        {changes.map((change) => (
          <ValueLine key={change.key} label={change.label} from={change.from} to={change.to} />
        ))}
      </ul>
    </section>
  );
}

/** One scan, read from the commit that added it. */
function ScanImage({source, scan}: {source: ChangeSource; scan: ScanFile}) {
  const state = useScanUrl(source, scan);
  if (state.status === 'ready') {
    return (
      <img
        src={state.url}
        alt={`Scan for card ${scan.cardId}`}
        style={{display: 'block', width: SCAN_WIDTH, height: 'auto', borderRadius: ADMIN_RADIUS.box}}
      />
    );
  }
  return <p style={META}>{state.status === 'loading' ? 'Loading the scan…' : 'The scan could not be loaded.'}</p>;
}

/** The scans a change added or replaced, each with the card it is for, linked to Edit card. */
function ScanList({source, scans}: {source: ChangeSource; scans: readonly ScanFile[]}) {
  return (
    <section style={{display: 'grid', gap: SPACING.sm}}>
      <h4 style={SECTION_TITLE}>Scans</h4>
      <ul style={{...LIST, display: 'flex', flexWrap: 'wrap', gap: SPACING.lg}}>
        {scans.map((scan) => (
          <li key={scan.path} style={{display: 'grid', gap: SPACING.xs, width: SCAN_WIDTH}}>
            <ScanImage source={source} scan={scan} />
            <Link to={studioHref('edit', scan.cardId)} className="adm-link" style={{fontSize: ADMIN_TYPE.small}}>
              Card {scan.cardId}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const plural = (n: number) => (n === 1 ? '' : 's');

/**
 * What a change's details say beyond the lists: that GitHub listed only part of the commit,
 * the files not itemized, the files outside the history, or that it changed nothing listed.
 */
function notesOf({entries, tuning, scans, unread, otherFiles, complete}: CommitDetails): string[] {
  const notes: string[] = [];
  if (!complete) notes.push(`GitHub lists ${FILES_LISTED} of a commit's files at most, so this one isn't itemized here. Its page on GitHub has them all.`);
  else if (entries.length + tuning.length + scans.length + unread.length === 0) notes.push('It changed nothing these lists show.');
  if (unread.length > 0) notes.push(`Not itemized here: ${unread.join(', ')}.`);
  if (otherFiles > 0) notes.push(`It also changed ${complete ? '' : 'at least '}${otherFiles} file${plural(otherFiles)} outside the card data and tuning.`);
  return notes;
}

function DetailsNotes({details}: {details: CommitDetails}) {
  return notesOf(details).map((note) => (
    <p key={note} style={{...META, overflowWrap: 'anywhere'}}>
      {note}
    </p>
  ));
}

/** The lists of a change whose details have been read. */
function DetailsBody({source, details}: {source: ChangeSource; details: CommitDetails}) {
  return (
    <>
      {details.entries.length > 0 && <EntryList entries={details.entries} />}
      {details.tuning.length > 0 && <TuningList changes={details.tuning} />}
      {details.scans.length > 0 && <ScanList source={source} scans={details.scans} />}
      <DetailsNotes details={details} />
    </>
  );
}

/** Who made the change and when, and its commit on GitHub: known from the list, so shown at once. */
function CommitLine({change}: {change: Change}) {
  return (
    <p style={META}>
      {change.author} · <time dateTime={change.date}>{`${localDay(change)} ${localTime(change)}`}</time> ·{' '}
      <a href={`${REPO_URL}/commit/${change.sha}`} target="_blank" rel="noreferrer" className="adm-link">
        <code>{change.sha.slice(0, 7)}</code> on GitHub
      </a>
    </p>
  );
}

interface ChangeDetailsProps {
  change: Change;
  source: ChangeSource;
  /** Try again was pressed, and took itself away with the error: the change's header takes focus. */
  onRetried: () => void;
  /** Forgets the saved token, which GitHub rejected. */
  onForgetToken: () => void;
}

/**
 * An open change: what it did to the cards and printings, tuning.json and the scans, read
 * from its commit (commitDetails), with who made it and a link to the commit.
 */
export function ChangeDetails({change, source, onRetried, onForgetToken}: ChangeDetailsProps) {
  const {state, retry} = useDetails({source, sha: change.sha});
  const onRetry = () => {
    retry();
    onRetried();
  };
  return (
    <div style={{display: 'grid', gap: SPACING.md}}>
      {state.status === 'loading' && <p style={META}>Reading what changed…</p>}
      {state.status === 'error' && (
        <ReadFailure what="What this change did" error={state.error} onRetry={onRetry} onForgetToken={onForgetToken} />
      )}
      {state.status === 'ready' && <DetailsBody source={source} details={state.details} />}
      <CommitLine change={change} />
    </div>
  );
}

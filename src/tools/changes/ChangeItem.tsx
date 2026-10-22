import {useId, useRef, useState} from 'react';
import {SPACING, TABULAR} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {Tag} from '../../ui/Tag';
import {AREA_LABELS} from './changePaths';
import {ChangeDetails} from './ChangeDetails';
import type {ChangeSource} from './changeSource';
import {changeTitle, localTime, type Change} from './historyModel';

const TIME: React.CSSProperties = {...TABULAR, flex: 'none', fontWeight: 400, color: ADMIN_COLORS.muted};

const TITLE: React.CSSProperties = {flex: '1 1 auto', minWidth: 0, fontWeight: 500, overflowWrap: 'anywhere'};

const TAGS: React.CSSProperties = {flex: 'none', display: 'flex', flexWrap: 'wrap', gap: SPACING.xs};

interface ChangeItemProps {
  change: Change;
  source: ChangeSource;
  /** Ruled off from the change above it: every one but a day's first, which its panel's header rules off. */
  divided: boolean;
}

/**
 * One change in a day's list: its time, its title and what it touched, as an accordion
 * header (adm-acc-head) that opens what it changed. Its details are read when it first
 * opens, and kept for the session (commitDetails), so it opens at once after that.
 */
export function ChangeItem({change, source, divided}: ChangeItemProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const headerRef = useRef<HTMLButtonElement>(null);
  return (
    <li style={divided ? {borderTop: `1px solid ${ADMIN_COLORS.divider}`} : undefined}>
      <h3 style={{margin: 0, fontSize: ADMIN_TYPE.body}}>
        <button
          ref={headerRef}
          type="button"
          className="adm-acc-head"
          aria-expanded={open}
          aria-controls={open ? detailsId : undefined}
          onClick={() => setOpen(!open)}>
          <time dateTime={change.date} style={TIME}>
            {localTime(change)}
          </time>
          <span style={TITLE}>{changeTitle(change.headline)}</span>
          <span style={TAGS}>
            {change.areas.map((area) => (
              <Tag key={area}>{AREA_LABELS[area]}</Tag>
            ))}
          </span>
        </button>
      </h3>
      {open && (
        <div id={detailsId} style={{padding: `0 ${SPACING.lg}px ${SPACING.section}px`}}>
          {/* Try again goes with the error it sits in, so the header, which stays, takes focus (R-48). */}
          <ChangeDetails change={change} source={source} onRetried={() => headerRef.current?.focus()} />
        </div>
      )}
    </li>
  );
}

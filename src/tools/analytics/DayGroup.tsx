import {useState} from 'react';
import {COLORS, CtaButton, FONTS, FONT_SIZES, LinkButton, RADIUS, SPACING, TRUNCATE} from '../../app-bridge';
import type {DayGroup as DayGroupData} from './activityStats';

interface DayGroupProps {
  group: DayGroupData;
  maxCount: number;
  defaultOpen?: boolean;
}

const MAX_ROWS = 60;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Format a `YYYY-MM-DD` day string as e.g. "Wed - Jul 1" in UTC (deterministic). */
function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} - ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Score color: success at 7+, error at 4-, otherwise default text. */
function scoreColor(score: number | null): string {
  if (score == null) return COLORS.text;
  if (score >= 7) return COLORS.success;
  if (score <= 4) return COLORS.error;
  return COLORS.text;
}

/** A collapsible day of raw votes: header bar + (when open) a per-vote table. */
export function DayGroup({group, maxCount, defaultOpen = false}: DayGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  // A busy day lists its first MAX_ROWS votes until asked for the rest.
  const [showAll, setShowAll] = useState(false);
  const barPct = maxCount > 0 ? (group.count / maxCount) * 100 : 0;
  const shownVotes = showAll ? group.votes : group.votes.slice(0, MAX_ROWS);
  const overflow = group.count - shownVotes.length;

  return (
    <div style={{marginBottom: SPACING.sm}}>
      {/* Kit button (#509) as a disclosure header: ghost while open, neutral while closed. */}
      <CtaButton
        type="button"
        variant={open ? 'ghost' : 'neutral'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          justifyContent: 'flex-start',
          gap: SPACING.md,
          minHeight: 0,
          padding: `${SPACING.sm}px ${SPACING.md}px`,
          borderRadius: RADIUS.md,
          textAlign: 'left',
        }}>
        <span
          aria-hidden="true"
          style={{
            fontSize: FONT_SIZES.xs,
            color: COLORS.textMuted,
            display: 'inline-block',
            width: 10,
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 120ms',
          }}>
          ▶
        </span>
        <span style={{fontSize: FONT_SIZES.base, color: COLORS.text, fontWeight: 600, minWidth: 110}}>
          {formatDay(group.day)}
        </span>
        <span style={{flex: 1, height: 6, background: COLORS.surfaceAlt, borderRadius: RADIUS.xs, overflow: 'hidden'}}>
          <span
            style={{
              display: 'block',
              width: `${barPct}%`,
              height: '100%',
              background: COLORS.primary,
              borderRadius: RADIUS.xs,
            }}
          />
        </span>
        <span style={{fontSize: FONT_SIZES.base, color: COLORS.text, fontWeight: 700, minWidth: 40, textAlign: 'right'}}>
          {group.count}
        </span>
        <span style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, minWidth: 70, textAlign: 'right'}}>
          {group.voters} voter{group.voters === 1 ? '' : 's'}
        </span>
      </CtaButton>

      {open && (
        <div style={{overflowX: 'auto', marginTop: SPACING.xs}}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.md,
            }}>
            <thead>
              <tr style={{color: COLORS.textMuted, textAlign: 'left'}}>
                <th style={{padding: `${SPACING.xs}px ${SPACING.sm}px`, fontWeight: 600}}>Time</th>
                <th style={{padding: `${SPACING.xs}px ${SPACING.sm}px`, fontWeight: 600}}>Pair</th>
                <th style={{padding: `${SPACING.xs}px ${SPACING.sm}px`, fontWeight: 600, textAlign: 'right'}}>Score</th>
                <th style={{padding: `${SPACING.xs}px ${SPACING.sm}px`, fontWeight: 600}}>Carries</th>
              </tr>
            </thead>
            <tbody>
              {shownVotes.map((vote, i) => (
                <tr key={i} style={{borderTop: `1px solid ${COLORS.surfaceBorder}`}}>
                  <td style={{padding: `${SPACING.xs}px ${SPACING.sm}px`, color: COLORS.textMuted, whiteSpace: 'nowrap'}}>
                    {vote.ts.slice(11, 16)}
                  </td>
                  <td
                    style={{
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      color: COLORS.text,
                      maxWidth: 240,
                      ...TRUNCATE,
                    }}>
                    {vote.aName} × {vote.bName}
                  </td>
                  <td
                    style={{
                      padding: `${SPACING.xs}px ${SPACING.sm}px`,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: scoreColor(vote.score),
                    }}>
                    {vote.score == null ? '—' : vote.score}
                  </td>
                  <td style={{padding: `${SPACING.xs}px ${SPACING.sm}px`, color: COLORS.textDim, whiteSpace: 'nowrap'}}>
                    {vote.whoCarries ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {overflow > 0 && (
            <LinkButton type="button" tone="muted" size="sm" onClick={() => setShowAll(true)} style={{margin: SPACING.sm}}>
              Show {overflow} more this day
            </LinkButton>
          )}
        </div>
      )}
    </div>
  );
}

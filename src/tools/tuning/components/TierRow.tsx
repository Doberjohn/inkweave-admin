import {useId} from 'react';
import {COLORS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';

interface TierRowProps {
  label: string;
  /** What the text field shows: the pending edit, else the saved value. */
  text: string;
  /** What the score field shows: the pending edit, else the saved value. */
  score: number | string;
  showText: boolean;
  showScore: boolean;
  textError?: string;
  scoreError?: string;
  onTextChange: (raw: string) => void;
  onScoreChange: (raw: string) => void;
}

const ROW: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs};

// The handoff's field label: 12px, muted (R-6: it names data, so never dim).
const LABEL: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

const ERROR: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.error};

/**
 * Presentational, controlled editor row for a single tuning value. The parent
 * passes the value to show (a pending edit, else the saved value), so a row
 * reused for another rule, or a reverted edit, never keeps stale text. Each
 * keystroke fires `onTextChange` / `onScoreChange` with the raw string for the
 * hook to validate and stage. The fields are AdminStyles' adm-input, and a
 * field's error is its description (aria-describedby), so it is read with it.
 */
export function TierRow({
  label,
  text,
  score,
  showText,
  showScore,
  textError,
  scoreError,
  onTextChange,
  onScoreChange,
}: TierRowProps) {
  const textErrorId = useId();
  const scoreErrorId = useId();
  return (
    <div style={ROW}>
      {/* Each field's aria-label carries this text, so the visible label is a plain line (2.5.3: the name contains it). */}
      <p style={LABEL}>{label}</p>
      {showText && (
        <>
          <textarea
            className="adm-input"
            aria-label={`${label} text`}
            aria-invalid={textError ? true : undefined}
            aria-describedby={textError ? textErrorId : undefined}
            style={{width: '100%'}}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
          {textError && (
            <p id={textErrorId} style={ERROR}>
              {textError}
            </p>
          )}
        </>
      )}
      {showScore && (
        <>
          <input
            className="adm-input"
            aria-label={`${label} score`}
            aria-invalid={scoreError ? true : undefined}
            aria-describedby={scoreError ? scoreErrorId : undefined}
            type="number"
            min={1}
            max={10}
            step={1}
            style={{width: 80}}
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
          />
          {scoreError && (
            <p id={scoreErrorId} style={ERROR}>
              {scoreError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

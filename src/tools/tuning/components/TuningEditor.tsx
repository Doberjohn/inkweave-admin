import {useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {COLORS, SPACING, FONT_SIZES} from '../../../app-bridge';
import {useTuningAdmin, type PendingEdit, type StageArgs} from '../useTuningAdmin';
import {rowsForSelection, type RowSpec} from '../tuningRows';
import {RuleSelector} from './RuleSelector';
import {PendingTray} from './PendingTray';
import {TierRow} from './TierRow';

interface TuningEditorProps {
  token: string;
  /** The live tuning.json the edits apply to. */
  config: TuningConfig;
  /** Called after a successful publish, to reload the live values. */
  onPublished?: () => void;
}

type Path = (string | number)[];

/**
 * One editable row. It shows the pending value when there is one and the saved
 * value otherwise, so switching rules, reverting, and clearing always show what
 * Publish would commit.
 */
function EditableRow({
  row,
  pendingFor,
  stageEdit,
}: {
  row: RowSpec;
  pendingFor: (path: Path | undefined) => PendingEdit | undefined;
  stageEdit: (args: StageArgs) => void;
}) {
  const text = pendingFor(row.textPath);
  const score = pendingFor(row.scorePath);
  return (
    <TierRow
      label={row.label}
      text={String(text?.value ?? row.textValue ?? '')}
      score={score?.value ?? row.scoreValue ?? ''}
      showText={row.textPath !== undefined}
      showScore={row.scorePath !== undefined}
      textError={text?.error}
      scoreError={score?.error}
      onTextChange={(raw) =>
        row.textPath &&
        stageEdit({path: row.textPath, rawValue: raw, kind: 'text', oldValue: row.textValue ?? '', label: `${row.label} · text`})
      }
      onScoreChange={(raw) =>
        row.scorePath &&
        stageEdit({path: row.scorePath, rawValue: raw, kind: 'score', oldValue: row.scoreValue ?? 0, label: `${row.label} · score`})
      }
    />
  );
}

export function TuningEditor({token, config, onPublished}: TuningEditorProps) {
  const {pending, stageEdit, revertEdit, clear, publish, publishDisabled, publishing, result, error} =
    useTuningAdmin(token);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingFor = (path: Path | undefined) =>
    path ? pending.find((p) => p.pathKey === JSON.stringify(path)) : undefined;
  // The tray shows a failed publish (useTuningAdmin keeps the error); only a
  // success asks for fresh values.
  const publishThenRefresh = () => publish().then(() => onPublished?.(), () => undefined);

  const rows = selectedId ? rowsForSelection(config, selectedId) : [];

  return (
    <div>
      <div style={{display: 'flex', gap: SPACING.xl, alignItems: 'flex-start', marginTop: SPACING.md}}>
        <aside style={{flex: '0 0 220px'}}>
          <RuleSelector config={config} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <div style={{flex: '1 1 auto', minWidth: 0}}>
          {selectedId ? (
            rows.map((row) => <EditableRow key={row.label} row={row} pendingFor={pendingFor} stageEdit={stageEdit} />)
          ) : (
            <p style={{color: COLORS.gray600, fontSize: FONT_SIZES.sm}}>
              Pick a playstyle or direct synergy to edit its copy and scores.
            </p>
          )}
        </div>
      </div>

      <PendingTray
        pending={pending}
        publishDisabled={publishDisabled}
        publishing={publishing}
        result={result}
        error={error}
        onRevert={revertEdit}
        onClear={clear}
        onPublish={publishThenRefresh}
      />
    </div>
  );
}

import {useEffect, useId, useRef, useState} from 'react';
import {LETTER_SPACING, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {SegmentedControl} from '../ui/SegmentedControl';

/** The chart's data as a table: the WCAG-clean twin of every chart. The first column heads each row. */
export interface ChartTable {
  caption: string;
  columns: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
}

/** The frame's two views. A parent that controls the view passes one as `view`. */
export type ChartView = 'chart' | 'table';

const VIEWS: ReadonlyArray<{value: ChartView; label: string}> = [
  {value: 'chart', label: 'Chart'},
  {value: 'table', label: 'Table'},
];

const CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const HEAD_CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  textAlign: 'right',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};

/** The table view: a caption, column headers and a row header per row. It takes focus when a control in the chart opens it. */
function DataTable({table, tableRef}: {table: ChartTable; tableRef: React.Ref<HTMLTableElement>}) {
  return (
    <table
      ref={tableRef}
      tabIndex={-1}
      style={{width: '100%', borderCollapse: 'collapse', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.text}}>
      <caption
        style={{
          captionSide: 'top',
          textAlign: 'left',
          paddingBottom: SPACING.sm,
          fontSize: ADMIN_TYPE.label,
          color: ADMIN_COLORS.muted,
        }}>
        {table.caption}
      </caption>
      <thead>
        <tr>
          {table.columns.map((column, i) => (
            <th key={column} scope="col" style={{...HEAD_CELL, textAlign: i === 0 ? 'left' : 'right'}}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, r) => (
          <tr key={`${row[0]}-${r}`} className="adm-hover-row">
            {row.map((cell, i) =>
              i === 0 ? (
                <th key={i} scope="row" style={{...CELL, textAlign: 'left', fontWeight: 500}}>
                  {cell}
                </th>
              ) : (
                <td key={i} style={CELL}>
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ChartFrameProps {
  /** The figure's heading, which also names it. */
  title: string;
  subtitle?: React.ReactNode;
  /** A <ChartLegend />, shown above the plot in the chart view. */
  legend?: React.ReactNode;
  /** Controls for this chart alone, before the Chart | Table toggle. Page-wide filters belong in the filter row. */
  actions?: React.ReactNode;
  table: ChartTable;
  children: React.ReactNode;
  /** The heading level: 2 (default) on a page body, 3 inside a titled section. */
  titleLevel?: 2 | 3;
  /** Which view it opens in (default the chart). */
  defaultView?: ChartView;
  /** The view, when the parent controls it (the network's "and K more in the table"). Without it the frame keeps its own. */
  view?: ChartView;
  /** Called with the view the toggle picks. A controlled frame shows it once the parent passes it back as `view`. */
  onViewChange?: (view: ChartView) => void;
}

/**
 * The figure every chart sits in: a <figure> named by its title, with an
 * optional subtitle, legend and actions, and a Chart | Table toggle. The table
 * view is the chart's accessible twin (dataviz: every chart has one), so a
 * value the tooltip shows is always reachable without hovering. It draws no
 * surface; put it in an untitled Panel (R1-3), which is the card.
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  actions,
  table,
  children,
  titleLevel = 2,
  defaultView = 'chart',
  view: controlledView,
  onViewChange,
}: ChartFrameProps) {
  const [ownView, setOwnView] = useState<ChartView>(defaultView);
  const view = controlledView ?? ownView;
  const setView = (next: ChartView) => {
    setOwnView(next);
    onViewChange?.(next);
  };
  const tableRef = useRef<HTMLTableElement>(null);
  const lastView = useRef(view);
  // A control inside the chart that opens the table unmounts with the chart, so
  // focus falls to <body>: hand it to the table. Only on a switch, never on
  // mount, and the toggle keeps its own focus.
  useEffect(() => {
    const opened = lastView.current === 'chart' && view === 'table';
    lastView.current = view;
    if (opened && document.activeElement === document.body) tableRef.current?.focus();
  }, [view]);
  const titleId = useId();
  const Heading = titleLevel === 3 ? 'h3' : 'h2';
  return (
    <figure aria-labelledby={titleId} style={{display: 'flex', flexDirection: 'column', gap: SPACING.md, minWidth: 0, margin: 0}}>
      {/* The header row is the figcaption: a figcaption must be the figure's first or last child. */}
      <figcaption style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: SPACING.md}}>
        <div style={{display: 'grid', gap: SPACING.xs, minWidth: 0, flex: '1 1 200px'}}>
          <Heading id={titleId} style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
            {title}
          </Heading>
          {subtitle != null && <div style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{subtitle}</div>}
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, marginLeft: 'auto'}}>
          {actions}
          <SegmentedControl ariaLabel={`Show ${title} as`} options={VIEWS} value={view} onChange={setView} />
        </div>
      </figcaption>
      {view === 'chart' ? (
        <>
          {legend}
          {children}
        </>
      ) : (
        <DataTable table={table} tableRef={tableRef} />
      )}
    </figure>
  );
}

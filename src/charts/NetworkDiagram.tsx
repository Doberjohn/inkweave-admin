import {useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {LinkButton, SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {LABEL_HALO, px} from './axis';
import {dataFlag, dimmed} from './barPaint';
import {EmptyChart} from './ChartSvg';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {RING, type PlotPoint} from './lineLayout';
import {NAME_SIZE, NODE_TARGET, networkLayout, spokeWidth, type NetworkLayout} from './networkLayout';
import type {Domain} from './scatter';
import {chartWidth, tooltipText, type SeriesDef} from './series';

/** The most nodes the diagram draws (R-37). The rest are counted under it, and the table view lists them. */
export const NETWORK_MAX_NODES = 12;

export interface NetworkNode {
  /** Unique and stable: React keys and the hover state use it. */
  id: string;
  /**
   * Printed beside the node, inside its link, where it fits, so `tooltip.title`
   * must contain it (label in name): a card's name, with the full name as the title.
   */
  label: string;
  /** The node is a react-router Link to this path. */
  href: string;
  /** The spoke's weight, within valueDomain. */
  value: number;
  /** The SeriesDef that colours the node's spoke and dot. */
  seriesId: string;
  /** Shown on hover and focus. Its text (tooltipText) is also the node link's accessible name (R-41). */
  tooltip: TooltipContent;
}

export interface NetworkDiagramProps {
  /** Strongest first. The first NETWORK_MAX_NODES are drawn, in this order. */
  nodes: readonly NetworkNode[];
  series: readonly SeriesDef[];
  /** Names the list of node links. */
  ariaLabel: string;
  /** The value range the spoke widths span (default 0 to 10, the engine's score scale). */
  valueDomain?: Domain;
  /** The plot's whole height in px, names included (default 340). */
  height?: number;
  /** Shown with more than NETWORK_MAX_NODES nodes: "and K more in the table" calls it. */
  onShowAll?: () => void;
  /** Shown in place of the plot when there are no nodes (default "No data to chart."). */
  emptyText?: string;
}

/** The drawn nodes, placed and painted: what NetworkDiagram hands NetworkPlot, and what a hover leaves alone. */
interface PlacedNetwork {
  layout: NetworkLayout;
  /** The drawn nodes, strongest first, as the layout's slots. */
  nodes: readonly NetworkNode[];
  /** Each node's series colour. */
  colors: readonly string[];
  /** Each node's spoke width in px. */
  widths: readonly number[];
}

/** A drawing part's props: the placed network and the active node's index, −1 for none. */
type Drawing = PlacedNetwork & {active: number};

const DEFAULT_HEIGHT = 340;
/** The engine's score scale. At module scope, not inline in the parameters (see ChartSvg's asIs). */
const SCORE_DOMAIN: Domain = [0, 10];
const NODE_RADIUS = 5;
const HUB_RADIUS = 8;
const WRAP: React.CSSProperties = {display: 'grid', gap: SPACING.sm, minWidth: 0};
/**
 * The clip layer the SVG and the links sit in. Until useContainerWidth
 * reports, the plot lays out at CHART_FALLBACK_WIDTH, which would scroll a
 * phone page sideways. Being absolute, it also adds nothing to the plot's
 * min-content width. The tooltip sits outside it, so it is never clipped.
 */
const CLIP: React.CSSProperties = {position: 'absolute', inset: 0, overflow: 'hidden'};
const SVG: React.CSSProperties = {display: 'block'};
const LIST: React.CSSProperties = {margin: 0, padding: 0, listStyle: 'none'};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const NOTE_BUTTON: React.CSSProperties = {minHeight: NODE_TARGET};

/** Each node's series colour, neutral for a series the chart doesn't define (as the scatter's placeDots). */
function nodeColors(nodes: readonly NetworkNode[], series: readonly SeriesDef[]): string[] {
  const colorOf = new Map(series.map((s) => [s.id, s.color]));
  return nodes.map((node) => colorOf.get(node.seriesId) ?? ADMIN_COLORS.barNeutral);
}

/**
 * The spokes, hub to node, weakest first so the strongest draw on top. While
 * a node is active its spoke brightens and the others dim: the kit's
 * adm-chart-mark states, which reduced motion keeps from animating.
 */
function Spokes({layout, nodes, colors, widths, active}: Drawing) {
  const {hub, slots} = layout;
  return nodes
    .map((node, i) => (
      <line
        key={node.id}
        className="adm-chart-mark"
        data-active={dataFlag(i === active)}
        data-dim={dataFlag(dimmed(i, active))}
        x1={px(hub.x)}
        y1={px(hub.y)}
        x2={px(slots[i].x)}
        y2={px(slots[i].y)}
        stroke={colors[i]}
        strokeWidth={px(widths[i])}
        strokeLinecap="round"
      />
    ))
    .reverse();
}

/** A dot on its own page-coloured disc, RING wider, as the scatter's dots sit (R-23). `mark` names it for tests. */
function Disc({at, r, fill, mark}: {at: PlotPoint; r: number; fill: string; mark: string}) {
  return (
    <>
      <circle cx={px(at.x)} cy={px(at.y)} r={r + RING} fill={ADMIN_COLORS.page} />
      <circle data-mark={mark} cx={px(at.x)} cy={px(at.y)} r={r} fill={fill} />
    </>
  );
}

/** Each node's dot in its colour, the active one lifted by RING, and the hub: an unnamed dot in the text colour (R-38). */
function Dots({layout, nodes, colors, active}: Drawing) {
  return (
    <>
      {nodes.map((node, i) => (
        <Disc key={node.id} at={layout.slots[i]} r={i === active ? NODE_RADIUS + RING : NODE_RADIUS} fill={colors[i]} mark={node.id} />
      ))}
      <Disc at={layout.hub} r={HUB_RADIUS} fill={ADMIN_COLORS.text} mark="hub" />
    </>
  );
}

/** The names that fit, each beside its node with a page-coloured halo; the active node's in the text colour, the rest muted. */
function Names({layout, nodes, active}: Drawing) {
  return (
    <g
      fontSize={NAME_SIZE}
      fontWeight={500}
      stroke={ADMIN_COLORS.page}
      strokeWidth={LABEL_HALO}
      strokeLinejoin="round"
      paintOrder="stroke">
      {layout.names.map((name, i) =>
        name ? (
          <text
            key={nodes[i].id}
            x={px(name.textX)}
            y={px(name.textY)}
            textAnchor={name.anchor}
            dominantBaseline="central"
            fill={i === active ? ADMIN_COLORS.text : ADMIN_COLORS.muted}>
            {nodes[i].label}
          </text>
        ) : null,
      )}
    </g>
  );
}

interface NodeLinksProps {
  placed: PlacedNetwork;
  ariaLabel: string;
  onActive: (id: string | null) => void;
}

/** Escape hides the tooltip and leaves focus where it is (WCAG 1.4.13), as the kit's slider and bars do. */
function hideOnEscape(onActive: (id: string | null) => void): React.KeyboardEventHandler {
  return (event) => {
    if (event.key === 'Escape') onActive(null);
  };
}

/**
 * One link per node, strongest first, in a list `ariaLabel` names. Each covers
 * its node's 24px target and its printed name, and its accessible name is its
 * tooltip's text (R-41). Pointer and focus make it the active node, and
 * Escape hides its tooltip. A tap follows it, as any link: on a phone the
 * table view carries the scores.
 */
function NodeLinks({placed, ariaLabel, onActive}: NodeLinksProps) {
  return (
    <ul aria-label={ariaLabel} style={LIST}>
      {placed.nodes.map((node, i) => {
        const box = placed.layout.links[i];
        return (
          <li key={node.id} style={{position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height}}>
            <Link
              to={node.href}
              aria-label={tooltipText(node.tooltip)}
              className="adm-net-link"
              onPointerEnter={() => onActive(node.id)}
              onPointerLeave={() => onActive(null)}
              onFocus={() => onActive(node.id)}
              onBlur={() => onActive(null)}
              onKeyDown={hideOnEscape(onActive)}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** The active node's tooltip, beside its dot; nothing without one. */
function NodeTooltip({layout, nodes, active}: Drawing) {
  if (active < 0) return null;
  const slot = layout.slots[active];
  return <ChartTooltip content={nodes[active].tooltip} x={slot.x} y={slot.y} bounds={layout.size} />;
}

/**
 * The drawing and the links over a network NetworkDiagram has placed. The
 * active node lives here, not in NetworkDiagram, so a hover or a focus
 * re-renders this alone and places nothing again (as ScatterChart's
 * ScatterPlot). It is held by id, not index: when the nodes change under it
 * with no leave or blur (a followed link brings another card's partners), an
 * id that is gone shows nothing, where an index would land on whichever node
 * took its place (R-46).
 */
function NetworkPlot({placed, ariaLabel}: {placed: PlacedNetwork; ariaLabel: string}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const drawing: Drawing = {...placed, active: placed.nodes.findIndex((node) => node.id === activeId)};
  const {width, height} = placed.layout.size;
  return (
    <>
      <div style={CLIP}>
        <svg aria-hidden="true" width={width} height={height} style={SVG}>
          <Spokes {...drawing} />
          <Dots {...drawing} />
          <Names {...drawing} />
        </svg>
        <NodeLinks placed={placed} ariaLabel={ariaLabel} onActive={setActiveId} />
      </div>
      <NodeTooltip {...drawing} />
    </>
  );
}

/** "and K more in the table" under the plot: a link-style button with onShowAll, else plain text. Nothing when every node is drawn. */
function MoreNote({more, onShowAll}: {more: number; onShowAll?: () => void}) {
  if (more <= 0) return null;
  return (
    <p style={NOTE}>
      {onShowAll ? (
        <LinkButton type="button" size="sm" onClick={onShowAll} style={NOTE_BUTTON}>
          and {fmtInt(more)} more in the table
        </LinkButton>
      ) : (
        `and ${fmtInt(more)} more in the table view`
      )}
    </p>
  );
}

/**
 * A radial ego network (decision R-13): an unnamed hub (R-38), and round it
 * the subject's strongest partners on one or two rings, strongest at 12
 * o'clock and then clockwise, the stronger half on the inner ring (R-37).
 * Each spoke takes its node's series colour, and its width grows with the
 * node's value. networkLayout places everything by rule; this draws it.
 *
 * The SVG is decoration (aria-hidden). Each node is a real link in a named
 * list, in strength order, covering at least 24px round its dot and its
 * printed name. Hover or focus shows the node's tooltip and dims the other
 * spokes (R-41). A name prints only where textWidth says it fits (R-40); one
 * that doesn't stays in the tooltip, the link's name and the table view the
 * page passes ChartFrame.
 *
 * This measures the width and places the network, and nothing else: the
 * active node lives in NetworkPlot. The width follows the container
 * (useContainerWidth). Until it is measured, and always in jsdom, it lays out
 * at CHART_FALLBACK_WIDTH, and the clip layer keeps that first frame from
 * widening the page.
 */
export function NetworkDiagram({
  nodes,
  series,
  ariaLabel,
  valueDomain = SCORE_DOMAIN,
  height = DEFAULT_HEIGHT,
  onShowAll,
  emptyText,
}: NetworkDiagramProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = chartWidth(useContainerWidth(wrapRef));

  if (nodes.length === 0) {
    return (
      <div ref={wrapRef} style={WRAP}>
        <EmptyChart text={emptyText} />
      </div>
    );
  }

  const shown = nodes.slice(0, NETWORK_MAX_NODES);
  const placed: PlacedNetwork = {
    layout: networkLayout({width, height}, shown.map((node) => node.label)),
    nodes: shown,
    colors: nodeColors(shown, series),
    widths: shown.map((node) => spokeWidth(node.value, valueDomain)),
  };
  return (
    <div ref={wrapRef} style={WRAP}>
      <div style={{position: 'relative', height}}>
        <NetworkPlot placed={placed} ariaLabel={ariaLabel} />
      </div>
      <MoreNote more={nodes.length - shown.length} onShowAll={onShowAll} />
    </div>
  );
}

import {SPACING} from '../app-bridge';
import {ADMIN_TYPE} from '../theme/adminTheme';
import type {PlotPoint} from './lineLayout';
import {linear, textWidth} from './scale';
import type {Domain} from './scatter';

/*
 * The network diagram's geometry: a radial ego network laid out by rule, not
 * by a force simulation, so the same partners always land in the same places
 * and the tests can check positions. Pure, so it can be tested at any width
 * (jsdom measures none). NetworkDiagram draws it.
 *
 * Angles are radians, clockwise from 3 o'clock (SVG's y axis points down), so
 * 12 o'clock is −π/2.
 */

/** A width and a height in px: a plot's, or a name's. */
export interface Size {
  width: number;
  height: number;
}

/** A box in px: its top left corner and its size. */
export type Box = PlotPoint & Size;

/** A node's place: the angle and radius of its ring, and the point they give. */
export interface RingSlot extends PlotPoint {
  angle: number;
  radius: number;
}

/** A name's anchor point (textX, textY: the anchor, vertically centred) and the box its text covers. */
export interface LabelPlacement extends Box {
  anchor: 'start' | 'middle' | 'end';
  textX: number;
  textY: number;
}

/** Where everything goes, at one plot size. Every x and y is in px from the plot's top left. */
export interface NetworkLayout {
  /** The plot, names included. */
  size: Size;
  /** The hub: the plot's centre. */
  hub: PlotPoint;
  /** One slot per node, strongest first. */
  slots: RingSlot[];
  /** Each node's printed name, or null where it would leave the plot or cover another name, a node or the hub. */
  names: Array<LabelPlacement | null>;
  /** Each node's link: its NODE_TARGET square, grown to cover its printed name. */
  links: Box[];
}

/** Up to this many nodes share one ring; past it the weaker half moves out to a second. */
export const ONE_RING_MAX = 6;
/** The inner ring's radius as a share of the outer ring's. */
export const INNER_RING_SHARE = 0.55;
/** Room kept between the outer ring and the plot's edge, for a name above or below a node: 40px. */
export const RING_MARGIN = SPACING.xxxl + SPACING.sm;
/** The square each node's link covers at least, round its dot (the dataviz hit-target floor). Names start just past it. */
export const NODE_TARGET = 24;
/** How far a link's focus ring reaches past it (a 2px outline 2px out). Names stay this far inside the plot, so no ring is clipped. */
export const FOCUS_REACH = SPACING.xs;
/** The names' font size. Their widths come from textWidth at this size (R-40), so the layout is the same in jsdom and the browser. */
export const NAME_SIZE = ADMIN_TYPE.label;
/** A spoke's width at the bottom and the top of the value domain, in px. */
export const SPOKE_WIDTHS: Domain = [1, 4];
/** One line of names. */
const NAME_HEIGHT = Math.round(NAME_SIZE * 1.4);
/** A name's anchor sits this far from its node's centre: just outside the node's target. */
const NAME_GAP = NODE_TARGET / 2;
/** |cos(angle)| above this puts a name beside its node; at or below it, above or below the node. */
const SIDE_THRESHOLD = 0.35;
const TOP = -Math.PI / 2;
/** The slack overlaps allows: float rounding can leave a name one ulp inside its own node's target. */
const EPS = 1e-6;

/** How many nodes go on the inner and the outer ring: one ring up to ONE_RING_MAX, else the stronger ceil(n / 2) inside. */
export function ringSizes(count: number): [number, number] {
  if (count <= ONE_RING_MAX) return [count, 0];
  const inner = Math.ceil(count / 2);
  return [inner, count - inner];
}

/** The inner and outer ring radii for a plot of this size: the outer ring fills it, less RING_MARGIN. */
export function ringRadii(plot: Size): [number, number] {
  const outer = Math.max(0, Math.min(plot.width, plot.height) / 2 - RING_MARGIN);
  return [outer * INNER_RING_SHARE, outer];
}

/** The plot's centre, where the hub sits. */
function centerOf(plot: Size): PlotPoint {
  return {x: plot.width / 2, y: plot.height / 2};
}

/** The slot `ring.radius` from `center` at `ring.angle`. */
function slotAt(center: PlotPoint, ring: {angle: number; radius: number}): RingSlot {
  return {...ring, x: center.x + ring.radius * Math.cos(ring.angle), y: center.y + ring.radius * Math.sin(ring.angle)};
}

/**
 * Slots for `count` nodes round the plot's centre, strongest first. The
 * strongest sits at 12 o'clock and the rest follow clockwise. A single ring
 * uses the outer radius. With two, the inner ring holds the stronger half
 * (closer means stronger), and each outer slot sits midway between two inner
 * ones, so no spoke runs through a node.
 */
export function ringSlots(count: number, plot: Size): RingSlot[] {
  const [innerCount, outerCount] = ringSizes(count);
  const [innerRadius, outerRadius] = ringRadii(plot);
  const center = centerOf(plot);
  const step = (2 * Math.PI) / Math.max(innerCount, 1);
  const firstRadius = outerCount === 0 ? outerRadius : innerRadius;
  const inner = Array.from({length: innerCount}, (_, i) => slotAt(center, {angle: TOP + i * step, radius: firstRadius}));
  // The outer ring takes outerCount of the innerCount midpoints, spread evenly.
  const outer = Array.from({length: outerCount}, (_, j) =>
    slotAt(center, {angle: TOP + step / 2 + Math.floor((j * innerCount) / outerCount) * step, radius: outerRadius}),
  );
  return [...inner, ...outer];
}

/**
 * Where a node's name goes: just past the node's target, on the side away
 * from the centre (start-anchored on the right, end-anchored on the left), or
 * centred above or below it near 12 and 6 o'clock. So a node's own spoke never
 * runs through its name.
 */
export function labelFor(slot: Pick<RingSlot, 'x' | 'y' | 'angle'>, text: Size): LabelPlacement {
  const {width, height} = text;
  const cos = Math.cos(slot.angle);
  if (cos > SIDE_THRESHOLD) {
    const textX = slot.x + NAME_GAP;
    return {anchor: 'start', textX, textY: slot.y, x: textX, y: slot.y - height / 2, width, height};
  }
  if (cos < -SIDE_THRESHOLD) {
    const textX = slot.x - NAME_GAP;
    return {anchor: 'end', textX, textY: slot.y, x: textX - width, y: slot.y - height / 2, width, height};
  }
  const textY = Math.sin(slot.angle) < 0 ? slot.y - NAME_GAP - height / 2 : slot.y + NAME_GAP + height / 2;
  return {anchor: 'middle', textX: slot.x, textY, x: slot.x - width / 2, y: textY - height / 2, width, height};
}

/**
 * True when two boxes share area. Touching edges don't count, nor does a name
 * that float rounding leaves a hair (under EPS) inside its own node's target.
 */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width - EPS &&
    b.x < a.x + a.width - EPS &&
    a.y < b.y + b.height - EPS &&
    b.y < a.y + a.height - EPS
  );
}

/** True when `inner` lies wholly inside `outer`. */
export function contains(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** The NODE_TARGET square centred on a point: a node's, or the hub's, hit target. */
export function nodeTarget(p: PlotPoint): Box {
  const half = NODE_TARGET / 2;
  return {x: p.x - half, y: p.y - half, width: NODE_TARGET, height: NODE_TARGET};
}

/** The smallest box that holds both. */
function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y};
}

/** Where names may print: the plot less FOCUS_REACH on every side. */
function printable(plot: Size): Box {
  return {x: FOCUS_REACH, y: FOCUS_REACH, width: plot.width - 2 * FOCUS_REACH, height: plot.height - 2 * FOCUS_REACH};
}

/**
 * Which labels print. Labels are tried in order (the strongest node's first),
 * and one prints only when it lies inside `bounds` and clears every box in
 * `blocked` (the targets of the nodes and the hub) and every label already
 * placed. The rest come back null: their name stays in the node's tooltip, its
 * link's accessible name and the table view.
 */
export function placeLabels(
  labels: readonly LabelPlacement[],
  blocked: readonly Box[],
  bounds: Box,
): Array<LabelPlacement | null> {
  const placed: Box[] = [];
  return labels.map((label) => {
    const fits =
      contains(bounds, label) && !blocked.some((b) => overlaps(label, b)) && !placed.some((p) => overlaps(label, p));
    if (!fits) return null;
    placed.push(label);
    return label;
  });
}

/** A spoke's width for a value: SPOKE_WIDTHS across the domain, clamped at its ends. */
export function spokeWidth(value: number, domain: Domain): number {
  const [thin, thick] = SPOKE_WIDTHS;
  const width = linear([domain[0], domain[1]], [thin, thick])(value);
  return Math.min(Math.max(width, thin), thick);
}

/**
 * The whole diagram at one plot size, for nodes with these names, strongest
 * first: the hub, each node's slot, the names that print (measured with
 * textWidth, strongest first) and each node's link box.
 */
export function networkLayout(plot: Size, names: readonly string[]): NetworkLayout {
  const hub = centerOf(plot);
  const slots = ringSlots(names.length, plot);
  const targets = slots.map((slot) => nodeTarget(slot));
  const candidates = slots.map((slot, i) => labelFor(slot, {width: textWidth(names[i], NAME_SIZE), height: NAME_HEIGHT}));
  const printed = placeLabels(candidates, [nodeTarget(hub), ...targets], printable(plot));
  const links = targets.map((target, i) => {
    const name = printed[i];
    return name ? union(target, name) : target;
  });
  return {size: plot, hub, slots, names: printed, links};
}

import {HATCH} from './series';

/**
 * The 45° hatch as an SVG <pattern>, for a <defs> block: stripes of `color`
 * with the surface showing between them. The legend swatch and the bars draw
 * the same one, so they match.
 */
export function HatchPattern({id, color}: {id: string; color: string}) {
  return (
    <pattern
      id={id}
      width={HATCH.period}
      height={HATCH.period}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${HATCH.angle})`}>
      <rect width={HATCH.stripe} height={HATCH.period} fill={color} />
    </pattern>
  );
}

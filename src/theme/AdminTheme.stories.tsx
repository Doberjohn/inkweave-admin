import type {Meta, StoryObj} from '@storybook/react-vite';
import type {Ink} from 'inkweave-synergy-engine';
import {useState} from 'react';
import {MemoryRouter, NavLink} from 'react-router-dom';
import {ALL_INKS, FONTS, InkIcon, InkwellIcon, RaritySymbol, SPACING} from '../app-bridge';
import {useFileDrop} from '../components/useFileDrop';
import {useHiddenFileInput} from '../components/useHiddenFileInput';
import {PICK_MIN_WIDTH} from '../tools/studio/studioStyles';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS, ADMIN_TYPE} from './adminTheme';

type ColorKey = keyof typeof ADMIN_COLORS;

const GROUPS: ReadonlyArray<{title: string; keys: readonly ColorKey[]}> = [
  {title: 'Surfaces', keys: ['page', 'aside', 'sidebar', 'panel', 'card', 'rowHover', 'navHover']},
  {title: 'Lines', keys: ['divider', 'border', 'inputBorder', 'strongBorder']},
  {title: 'Chart marks', keys: ['barTrack', 'barNeutral']},
  {title: 'Text', keys: ['text', 'muted', 'dim']},
  {title: 'Accent', keys: ['accent', 'accentHover', 'accentTint', 'accentTintSoft', 'rowSelected', 'accentBorder', 'accentStrong']},
  {title: 'Semantic', keys: ['over', 'under', 'errorBg', 'errorBorder']},
];

const SECTION_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontWeight: 400,
  fontSize: ADMIN_TYPE.sectionTitle,
};

const FIELD: React.CSSProperties = {
  display: 'grid',
  gap: SPACING.xs,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.muted,
};

/** A translucent fill inside a border: clipped to the padding box, so the border stays on the ladder. */
function bordered(fill: string, border: string = ADMIN_COLORS.border): React.CSSProperties {
  return {backgroundColor: fill, backgroundClip: 'padding-box', border: `1px solid ${border}`};
}

function Swatch({name}: {name: ColorKey}) {
  const value = ADMIN_COLORS[name];
  return (
    <figure style={{margin: 0, display: 'grid', gap: SPACING.xs, minWidth: 0}}>
      <div style={{height: 56, ...bordered(value), borderRadius: ADMIN_RADIUS.box}} />
      <figcaption style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.text}}>
        {name}
        <code style={{display: 'block', fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{value}</code>
      </figcaption>
    </figure>
  );
}

const meta: Meta = {
  title: 'Admin/Theme',
  // The sample nav items are router links, so the stories need a router.
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <div style={{display: 'grid', gap: SPACING.xxl, padding: SPACING.xxxl, color: ADMIN_COLORS.text}}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj;

/** Every ADMIN_COLORS value over the page, as it renders. Fills are translucent: see the stacked sample. */
export const Palette: Story = {
  render: () => (
    <>
      {GROUPS.map((group) => (
        <section key={group.title} style={{display: 'grid', gap: SPACING.md}}>
          <h2 style={SECTION_TITLE}>{group.title}</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: SPACING.lg}}>
            {group.keys.map((key) => (
              <Swatch key={key} name={key} />
            ))}
          </div>
        </section>
      ))}
      <section style={{display: 'grid', gap: SPACING.md}}>
        <h2 style={SECTION_TITLE}>Fills stack</h2>
        <div
          style={{
            maxWidth: 360,
            padding: SPACING.lg,
            ...bordered(ADMIN_COLORS.panel),
            borderRadius: ADMIN_RADIUS.panel,
          }}>
          <div style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted, marginBottom: SPACING.sm}}>panel</div>
          <div
            style={{
              padding: SPACING.lg,
              ...bordered(ADMIN_COLORS.card),
              borderRadius: ADMIN_RADIUS.box,
              fontSize: ADMIN_TYPE.small,
              color: ADMIN_COLORS.muted,
            }}>
            card inside the panel: one step lighter
          </div>
        </div>
      </section>
    </>
  ),
};

/** ADMIN_TYPE: body sizes in the body face, titles and numbers in Tinos. */
export const Type: Story = {
  render: () => (
    <div style={{display: 'grid', gap: SPACING.md}}>
      {Object.entries(ADMIN_TYPE).map(([name, size]) => {
        const tinos = size >= ADMIN_TYPE.sectionTitle;
        return (
          <div key={name} style={{display: 'flex', alignItems: 'baseline', gap: SPACING.lg}}>
            <code style={{width: 120, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>
              {name} · {size}
            </code>
            <span style={{fontSize: size, fontFamily: tinos ? FONTS.hero : FONTS.body}}>Engine calibration 2,054</span>
          </div>
        );
      })}
    </div>
  ),
};

/** ADMIN_RADIUS on a card fill. */
export const Radius: Story = {
  render: () => (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.lg}}>
      {Object.entries(ADMIN_RADIUS).map(([name, radius]) => (
        <div
          key={name}
          style={{
            width: 120,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...bordered(ADMIN_COLORS.card, ADMIN_COLORS.strongBorder),
            borderRadius: radius,
            fontSize: ADMIN_TYPE.small,
            color: ADMIN_COLORS.muted,
          }}>
          {name} · {radius}
        </div>
      ))}
    </div>
  ),
};

const BANDS = ['All', '7+', '5–6', '≤4'] as const;

/** Every adm-* class in its states. Tab through it to see the focus rings. */
function ControlsDemo() {
  const [band, setBand] = useState<(typeof BANDS)[number]>('All');
  const [row, setRow] = useState<string | null>('Ramp');
  const [card, setCard] = useState('Searches');
  return (
    <>
      <nav
        aria-label="Sample navigation"
        style={{
          width: ADMIN_LAYOUT.sidebarOpen,
          display: 'grid',
          gap: SPACING.xxs,
          padding: SPACING.md,
          background: ADMIN_COLORS.sidebar,
        }}>
        <NavLink to="/" end className="adm-nav-item">
          <span className="adm-nav-mark" aria-hidden="true">
            Ov
          </span>
          Overview
        </NavLink>
        <NavLink to="/activity" className="adm-nav-item">
          <span className="adm-nav-mark" aria-hidden="true">
            Va
          </span>
          Vote activity
        </NavLink>
      </nav>

      <div role="group" aria-label="Score band" className="adm-seg" style={{justifySelf: 'start'}}>
        {BANDS.map((b) => (
          <button key={b} type="button" className="adm-seg-btn" aria-pressed={band === b} onClick={() => setBand(b)}>
            {b}
          </button>
        ))}
      </div>

      <div style={{maxWidth: 420, overflow: 'hidden', ...bordered(ADMIN_COLORS.card), borderRadius: ADMIN_RADIUS.panel}}>
        {['Ramp', 'Singer', 'Location shift'].map((name) => (
          <button
            key={name}
            type="button"
            className="adm-row-btn"
            aria-pressed={row === name}
            onClick={() => setRow(row === name ? null : name)}>
            <span
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: SPACING.md,
                padding: `${SPACING.md}px ${SPACING.lg}px`,
                borderTop: `1px solid ${ADMIN_COLORS.divider}`,
                fontSize: ADMIN_TYPE.body,
              }}>
              <span>{name}</span>
              <span style={{color: ADMIN_COLORS.muted}}>−0.30</span>
            </span>
          </button>
        ))}
        <div
          className="adm-hover-row"
          style={{padding: `${SPACING.md}px ${SPACING.lg}px`, borderTop: `1px solid ${ADMIN_COLORS.divider}`}}>
          A row that only hovers
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: SPACING.md}}>
        {['Searches', 'Votes submitted'].map((name) => (
          <button key={name} type="button" className="adm-card-btn" aria-pressed={card === name} onClick={() => setCard(name)}>
            <span style={{color: ADMIN_COLORS.muted}}>{name}</span>
            <span style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi}}>8,540</span>
          </button>
        ))}
      </div>

      <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.md, alignItems: 'end'}}>
        <label style={FIELD}>
          Search pairs
          <input className="adm-input" placeholder="Maui" />
        </label>
        <label style={FIELD}>
          Voter
          <select className="adm-select" defaultValue="">
            <option value="">All voters</option>
            <option value="4">Voter 4</option>
          </select>
        </label>
        <label style={FIELD}>
          Tagline
          <textarea className="adm-input" />
        </label>
        <label style={FIELD}>
          Disabled
          <input className="adm-input" placeholder="No hover" disabled />
        </label>
      </div>
    </>
  );
}

export const Controls: Story = {render: () => <ControlsDemo />};

// Card studio's controls (R4-5a), before the studio's own components use them.
const ROW: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.xs};
const INLINE: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: ADMIN_TYPE.body};
// The studio's own pick width, as PickerGroup and InkwellPicker lay their grids out.
const PICK_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${PICK_MIN_WIDTH}px, 1fr))`,
  gap: SPACING.xs,
};
const PILL: React.CSSProperties = {
  margin: SPACING.md,
  padding: `${SPACING.xs}px ${SPACING.md}px`,
  borderRadius: ADMIN_RADIUS.pill,
  backgroundColor: ADMIN_COLORS.page,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.text,
};
const ACC_BODY: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const ACCEPT = 'image/jpeg,image/png,image/webp';
const RARITY_SAMPLES = [
  {label: 'Common', key: 'common'},
  {label: 'Rare', key: 'rare'},
  {label: 'Super Rare', key: 'super rare'},
  {label: 'Legendary', key: 'legendary'},
] as const;
const INKWELLS = [
  {value: 'inkable', label: 'Inkable'},
  {value: 'uninkable', label: 'Uninkable'},
] as const;

/** A form section's accordion header (narrow layout), over its body. */
function AccordionDemo() {
  const [open, setOpen] = useState(true);
  return (
    <section style={{maxWidth: 400, ...bordered(ADMIN_COLORS.card), borderRadius: ADMIN_RADIUS.panel, overflow: 'hidden'}}>
      <h2 style={{margin: 0}}>
        <button type="button" className="adm-acc-head" aria-expanded={open} aria-controls="demo-identity" onClick={() => setOpen(!open)}>
          Identity
        </button>
      </h2>
      {/* No display in this style: one would override `hidden`. */}
      <p id="demo-identity" hidden={!open} style={{margin: 0, padding: `0 ${SPACING.lg}px ${SPACING.lg}px`, ...ACC_BODY}}>
        Collector #, name, version, franchise
      </p>
    </section>
  );
}

/** The ink tiles, the Dual-ink switch and the smaller second-ink tiles. Each tile's InkIcon alt names it (R4-5c's markup). */
function InkDemo() {
  const [ink, setInk] = useState<Ink>('Amber');
  const [ink2, setInk2] = useState<Ink | null>(null);
  const [dual, setDual] = useState(true);
  return (
    <div style={{display: 'grid', gap: SPACING.md, justifyItems: 'start'}}>
      <div role="group" aria-label="Ink" style={ROW}>
        {ALL_INKS.map((name) => (
          <button
            key={name}
            type="button"
            className="adm-pick-btn adm-ink-tile"
            aria-pressed={ink === name}
            onClick={() => setInk(name)}>
            <InkIcon ink={name} size={28} decorative={false} />
          </button>
        ))}
      </div>
      <label style={INLINE}>
        <input type="checkbox" role="switch" className="adm-switch" checked={dual} onChange={(e) => setDual(e.target.checked)} />
        Dual-ink card
      </label>
      {dual && (
        <div role="group" aria-label="Second ink" style={ROW}>
          {ALL_INKS.filter((name) => name !== ink).map((name) => (
            <button
              key={name}
              type="button"
              className="adm-pick-btn adm-ink-tile"
              data-size="sm"
              aria-pressed={ink2 === name}
              onClick={() => setInk2(name)}>
              <InkIcon ink={name} size={22} decorative={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The rarity and inkwell pick buttons: full width, so their grid sizes them. */
function PickDemo() {
  const [rarity, setRarity] = useState('Super Rare');
  const [inkable, setInkable] = useState(true);
  return (
    <div style={{display: 'grid', gap: SPACING.md, maxWidth: 480}}>
      <div role="group" aria-label="Rarity" style={PICK_GRID}>
        {RARITY_SAMPLES.map(({label, key}) => (
          <button key={key} type="button" className="adm-pick-btn" aria-pressed={rarity === label} onClick={() => setRarity(label)}>
            <RaritySymbol rarity={key} size={18} />
            {label}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label="Inkwell"
        style={{...PICK_GRID, gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${PICK_MIN_WIDTH}px), 1fr))`}}>
        {INKWELLS.map(({value, label}) => (
          <button
            key={value}
            type="button"
            className="adm-pick-btn"
            aria-pressed={inkable === (value === 'inkable')}
            onClick={() => setInkable(value === 'inkable')}>
            <InkwellIcon value={value} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The cost box and slider: the slider shows no thumb until a cost is set. */
function CostDemo() {
  const [cost, setCost] = useState('');
  const unset = cost === '';
  return (
    <div style={{...INLINE, maxWidth: 360}}>
      <label style={INLINE}>
        Cost
        <input className="adm-input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} style={{width: 64}} />
      </label>
      <input
        type="range"
        className="adm-range"
        min={0}
        max={10}
        step={1}
        aria-label="Cost slider"
        aria-valuetext={unset ? 'Not set' : undefined}
        data-unset={unset ? 'true' : undefined}
        value={Math.min(10, Number(cost) || 0)}
        onPointerDown={() => {
          if (unset) setCost('0');
        }}
        onChange={(e) => setCost(e.target.value)}
      />
    </div>
  );
}

/**
 * The two file labels: the cover over the card preview, and Replace card
 * image. Each rings while its input has focus, and while a file is dragged
 * over it (useFileDrop).
 */
function FileDemo() {
  const cover = useHiddenFileInput(() => {});
  const replace = useHiddenFileInput(() => {});
  const coverDrop = useFileDrop(() => {});
  const replaceDrop = useFileDrop(() => {});
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: SPACING.xl}}>
      <div style={{position: 'relative', width: 160, aspectRatio: '5 / 7', ...bordered(ADMIN_COLORS.card), borderRadius: ADMIN_RADIUS.preview}}>
        <label
          className="adm-file-cover"
          data-focused={cover.focused ? 'true' : undefined}
          data-dragging={coverDrop.dragging ? 'true' : undefined}
          {...coverDrop.dropProps}>
          <span style={PILL}>Click or drop to upload scan</span>
          <input {...cover.inputProps} accept={ACCEPT} />
        </label>
      </div>
      <label
        className="adm-file-btn"
        data-focused={replace.focused ? 'true' : undefined}
        data-dragging={replaceDrop.dragging ? 'true' : undefined}
        {...replaceDrop.dropProps}>
        Replace card image
        <input {...replace.inputProps} accept={ACCEPT} />
      </label>
    </div>
  );
}

/** Card studio's adm-* classes in their states. Tab through it, or drag a file over a file label, to see the rings. */
export const StudioControls: Story = {
  render: () => (
    <>
      <AccordionDemo />
      <InkDemo />
      <PickDemo />
      <CostDemo />
      <FileDemo />
    </>
  ),
};

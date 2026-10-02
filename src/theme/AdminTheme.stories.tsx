import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter, NavLink} from 'react-router-dom';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS, ADMIN_TYPE} from './adminTheme';

type ColorKey = keyof typeof ADMIN_COLORS;

const GROUPS: ReadonlyArray<{title: string; keys: readonly ColorKey[]}> = [
  {title: 'Surfaces', keys: ['page', 'aside', 'sidebar', 'panel', 'card', 'rowHover', 'navHover']},
  {title: 'Lines', keys: ['divider', 'border', 'inputBorder', 'strongBorder']},
  {title: 'Chart marks', keys: ['barTrack', 'barNeutral']},
  {title: 'Text', keys: ['text', 'muted', 'dim']},
  {title: 'Accent', keys: ['accent', 'accentHover', 'accentTint', 'accentTintSoft', 'accentBorder', 'accentStrong']},
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

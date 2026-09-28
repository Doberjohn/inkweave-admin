import {CAP_LABEL, COLORS, CtaButton, FONTS, FONT_SIZES, SPACING, SURFACE_CARD} from '../app-bridge';
import {ADMIN_TOOLS, type AdminTool} from './tools';

function ToolCard({tool}: {tool: AdminTool}) {
  const {currentUrl} = tool;
  return (
    <li style={{...SURFACE_CARD, display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <h2 style={{margin: 0, fontFamily: FONTS.hero, fontSize: FONT_SIZES.xxl, color: COLORS.text}}>
        {tool.name}
      </h2>
      <p style={{margin: 0, fontSize: FONT_SIZES.lg, color: COLORS.textMuted}}>{tool.purpose}</p>
      <CtaButton
        variant="neutral"
        aria-label={`Open ${tool.name}`}
        disabled={currentUrl === null}
        onClick={() => {
          if (currentUrl) window.open(currentUrl, '_blank', 'noopener');
        }}>
        {currentUrl ? 'Open current page' : 'Runs locally'}
      </CtaButton>
    </li>
  );
}

/** Admin landing page: every tool, and where it runs until P2 moves it here. */
export function ToolIndex() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: SPACING.xxxl,
        fontFamily: FONTS.body,
        color: COLORS.text,
      }}>
      <p style={CAP_LABEL}>Inkweave admin</p>
      <h1
        style={{
          margin: `${SPACING.sm}px 0 ${SPACING.xxl}px`,
          fontFamily: FONTS.hero,
          fontSize: FONT_SIZES.displaySm,
        }}>
        Tools
      </h1>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: SPACING.lg,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}>
        {ADMIN_TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </ul>
    </main>
  );
}

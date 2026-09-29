import {COLORS, FONT_SIZES, RADIUS, SPACING} from '../../app-bridge';

/** Shown in place of the raw-votes panels when the artifact has hasRawVotes: false. */
export function RawVotesNotice() {
  return (
    <section
      style={{
        background: COLORS.surfaceAlt,
        border: `1px dashed ${COLORS.surfaceBorder}`,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.section,
        fontSize: FONT_SIZES.base,
        color: COLORS.textMuted,
      }}>
      Weekly activity, dimension participation, and voter counts need raw votes. Set the{' '}
      <code style={{color: COLORS.primary}}>SUPABASE_SERVICE_ROLE_KEY</code> Actions secret, then re-run admin&apos;s
      Deploy workflow to enable them.
    </section>
  );
}

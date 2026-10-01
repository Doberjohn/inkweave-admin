import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {goLiveNote} from '../../github/goLiveNote';
import {PageLayout} from '../../shell/PageLayout';
import {
  useRevealAdmin,
  RevealAdminForm,
  CardPreviewPanel,
  SynergyPreviewPanel,
  type RevealAdminController,
} from './index';

/** The commit banner, the form and its previews, once a token is saved. */
function RevealTool({ctrl}: {ctrl: RevealAdminController}) {
  return (
    <>
      {ctrl.result && (
        <div
          role="status"
          style={{
            padding: SPACING.md,
            background: COLORS.surfaceAlt,
            borderRadius: RADIUS.sm,
          }}>
          Committed. {goLiveNote('Vercel is deploying (~2-3 min).')}{' '}
          <a
            href={ctrl.result.commitUrl}
            target="_blank"
            rel="noreferrer"
            style={{color: COLORS.primary500}}>
            View commit
          </a>
        </div>
      )}

      <div style={{display: 'flex', gap: SPACING.xl, flexWrap: 'wrap'}}>
        <section style={{flex: '1 1 380px', minWidth: 320}}>
          <RevealAdminForm
            form={ctrl.form}
            errors={ctrl.validation.errors}
            onChange={ctrl.patchForm}
          />
          {ctrl.publishError && (
            <div style={{color: COLORS.error, fontSize: FONT_SIZES.sm}}>{ctrl.publishError}</div>
          )}
          <CtaButton onClick={ctrl.publish} disabled={!ctrl.canPublish || ctrl.publishing} style={{marginTop: SPACING.md}}>
            {ctrl.publishing ? 'Publishing…' : `Publish to ${targetBranch()}`}
          </CtaButton>
        </section>

        <aside
          style={{
            flex: '1 1 280px',
            minWidth: 260,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.lg,
          }}>
          <div>
            <h2 style={{fontSize: FONT_SIZES.xl}}>Preview</h2>
            <CardPreviewPanel card={ctrl.previewCard} onImageChange={ctrl.onImageChange} />
          </div>
          <div>
            <h2 style={{fontSize: FONT_SIZES.xl}}>Synergies</h2>
            <SynergyPreviewPanel groups={ctrl.synergyGroups} />
          </div>
        </aside>
      </div>
    </>
  );
}

/**
 * The reveal publisher, inside the page layout that names the branch it writes
 * to. The sidebar's token box forgets the token; the gate then takes the tool's
 * place under the same header.
 */
export function RevealPage() {
  const ctrl = useRevealAdmin();
  return (
    <PageLayout title="Reveal publisher" subtitle="Add a newly revealed card to the preview set." writes>
      {ctrl.token ? <RevealTool ctrl={ctrl} /> : <GithubTokenGate onSave={ctrl.setToken} />}
    </PageLayout>
  );
}

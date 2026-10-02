import {COLORS, SPACING, FONT_SIZES, RADIUS} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {goLiveNote} from '../../github/goLiveNote';
import {PageLayout} from '../../shell/PageLayout';
import {useImageAdmin, CardImagePicker, UploadColumn, type ImageAdminController} from './index';

/** The commit banner, the card picker and the upload column, once a token is saved. */
function ImageTool({ctrl}: {ctrl: ImageAdminController}) {
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
          Committed.{' '}
          {goLiveNote('The new image goes live after the convert workflow runs and Vercel redeploys (~a few minutes).')}{' '}
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
        <section style={{flex: '1 1 320px', minWidth: 300}}>
          <h2 style={{fontSize: FONT_SIZES.xl}}>1. Pick a card</h2>
          <CardImagePicker
            cards={ctrl.cards}
            selectedId={ctrl.selectedCard?.id ?? null}
            onSelect={ctrl.selectCard}
          />
        </section>

        <UploadColumn
          selectedCard={ctrl.selectedCard}
          newImageUrl={ctrl.newImageUrl}
          imageName={ctrl.imageName}
          canPublish={ctrl.canPublish}
          publishing={ctrl.publishing}
          publishError={ctrl.publishError}
          onImageChange={ctrl.onImageChange}
          onPublish={ctrl.publish}
        />
      </div>
    </>
  );
}

/**
 * Card images: replace a card's art, inside the page layout that names the
 * branch it writes to. The sidebar's token box forgets the token; the gate then
 * takes the tool's place under the same header.
 */
export function ImagePage() {
  const ctrl = useImageAdmin();
  return (
    <PageLayout title="Card images" subtitle="Replace an existing card's image." writes>
      {ctrl.token ? <ImageTool ctrl={ctrl} /> : <GithubTokenGate onSave={ctrl.setToken} />}
    </PageLayout>
  );
}

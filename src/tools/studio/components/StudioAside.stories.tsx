import type {Meta, StoryObj} from '@storybook/react-vite';
import {CtaButton, FONTS, SET_TOTAL, SPACING} from '../../../app-bridge';
import {targetBranch} from '../../../github/githubCommit';
import {goLiveNote} from '../../../github/goLiveNote';
import {revealForm} from '../../../test/revealForm';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {changeRows} from '../changeRows';
import {revealChecklist} from '../readiness';
import {JA_SCAN_ENTRY, SYNERGY_GROUPS} from '../studioFixtures';
import {ChangeList} from './ChangeList';
import {CommitOutcome} from './CommitOutcome';
import {ReadyChecklist} from './ReadyChecklist';
import {SynergyPanel} from './SynergyPanel';

const meta: Meta = {
  title: 'Admin/Publish/Card studio/Aside',
  parameters: {layout: 'fullscreen'},
  // The studio's fourth column (280px at wide widths) on the admin page. The
  // page composes the parts in this order (R4-6a, R4-6b): the checklist or the
  // change list, the synergies, Publish or Save, then the outcome.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.lg,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.md, width: 280}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj;

/** A story's buttons do nothing. */
const noop = () => {};

/** New reveal's checklist for `form`, with an image chosen and read when `image` names one. */
function checklistFor({form, image}: {form: RevealCardForm; image: string | null}) {
  const validation = validateRevealCardForm(form, new Set(), image);
  return revealChecklist(form, validation, {ready: image !== null, error: null});
}

const FRESH = checklistFor({form: EMPTY_FORM, image: null});
// A number past the set (R-73) and a spelled-out glyph: two filled values that fail.
const HALF_DONE = checklistFor({
  form: revealForm({collectorNumber: String(SET_TOTAL + 1), fullText: 'Your other characters use this Strength.'}),
  image: null,
});
const READY = checklistFor({form: revealForm(), image: 'mei.png'});

/** admin#14's case: Miriam's Japanese scan replaced by the English one, with its new version. */
const REFRESH = changeRows({
  loaded: JA_SCAN_ENTRY,
  changes: {version: 'Band Leader', fullName: 'Miriam - Band Leader', scanLanguage: null},
  imageName: 'miriam-en.png',
});
const IMAGE_ONLY = changeRows({loaded: null, changes: {}, imageName: 'lantern-keeper.webp'});

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'};
// The notes the page picks (the R4 header's "Labels and notes"; R4-6a's newRevealNote, R4-6b's editNote):
// New reveal's, and Edit's when an image went with the save.
const NEW_NOTE = goLiveNote('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
const IMAGE_NOTE = goLiveNote('Vercel is deploying it: allow 15 to 20 minutes before the new image shows on inkweave.ink.');

/** Stands in for the page's button, which R4-6 owns. */
function Commit({label, disabled = false}: {label: 'Publish' | 'Save changes'; disabled?: boolean}) {
  return (
    <CtaButton type="button" disabled={disabled} style={{width: '100%'}}>
      {`${label} to ${targetBranch()}`}
    </CtaButton>
  );
}

/** A fresh New reveal form: 1/7, every open item saying why, no synergies yet, Publish off. */
export const NewRevealFresh: Story = {
  render: () => (
    <>
      <ReadyChecklist items={FRESH} />
      <SynergyPanel groups={[]} />
      <Commit label="Publish" disabled />
      <CommitOutcome result={null} error={null} note={NEW_NOTE} />
    </>
  ),
};

/** Half done: two filled values fail (R-73's number, a spelled-out glyph), and the image is still to come. */
export const NewRevealHalfDone: Story = {
  render: () => (
    <>
      <ReadyChecklist items={HALF_DONE} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Publish" disabled />
      <CommitOutcome result={null} error={null} note={NEW_NOTE} />
    </>
  ),
};

/** Published: the form is empty again, and the status line holds the commit and New reveal's note. */
export const NewRevealPublished: Story = {
  render: () => (
    <>
      <ReadyChecklist items={FRESH} />
      <SynergyPanel groups={[]} />
      <Commit label="Publish" disabled />
      <CommitOutcome result={COMMIT} error={null} note={NEW_NOTE} />
    </>
  ),
};

/** Ready, and the publish was refused: master moved meanwhile, so publishing again is the way out. */
export const NewRevealRace: Story = {
  render: () => (
    <>
      <ReadyChecklist items={READY} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Publish" />
      <CommitOutcome
        result={null}
        error={`${targetBranch()} changed while publishing, so nothing was published. Publish again.`}
        note={NEW_NOTE}
        onForgetToken={noop}
      />
    </>
  ),
};

/** Edit card with nothing changed yet: the empty line, no Discard, Save off. */
export const EditNoChanges: Story = {
  render: () => (
    <>
      <ChangeList rows={[]} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" disabled />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** admin#14's refresh to English: the version, the scan language and the image, with Discard. */
export const EditRefresh: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** A released card with nothing staged yet: the empty list asks only for an image, since no field can change (R-61). */
export const EditImageOnlyNoChanges: Story = {
  render: () => (
    <>
      <ChangeList rows={[]} onDiscard={noop} imageOnly />
      <Commit label="Save changes" disabled />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** A released card: the image is its only change, and the page shows no synergies (R-61). */
export const EditImageOnly: Story = {
  render: () => (
    <>
      <ChangeList rows={IMAGE_ONLY} onDiscard={noop} />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** Saved with an image: the card stays open with no changes left (R-70), and the image's note. */
export const EditSaved: Story = {
  render: () => (
    <>
      <ChangeList rows={[]} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" disabled />
      <CommitOutcome result={COMMIT} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** The card changed on the branch since it was loaded (R-67): Load it again keeps what still applies (R-68). */
export const EditStale: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome
        result={null}
        error={`${JA_SCAN_ENTRY.fullName} changed on ${targetBranch()} since you loaded it. Load it again.`}
        note={IMAGE_NOTE}
        onLoadAgain={noop}
        onForgetToken={noop}
      />
    </>
  ),
};

/** Load it again landed and dropped one edit, whose field had changed there (R-68). */
export const EditLoadedAgain: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH.slice(1)} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} dropped={1} />
    </>
  ),
};

/**
 * Load it again landed on an entry the form can't hold (R-65): the card opens
 * image-only, so the edit went with the form, and the staged image stays (R-68).
 */
export const EditLoadedAgainReadOnly: Story = {
  render: () => (
    <>
      <ChangeList rows={IMAGE_ONLY} onDiscard={noop} imageOnly />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} dropped={1} editable={false} />
    </>
  ),
};

/** The image-only view's Read previewCards.json again landed, and the entry still holds data the form can't (R-65). */
export const EditReadAgainStillReadOnly: Story = {
  render: () => (
    <>
      <ChangeList rows={[]} onDiscard={noop} imageOnly />
      <Commit label="Save changes" disabled />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} dropped={0} editable={false} />
    </>
  ),
};

/** That read found the entry fixed: the form opens, with no edit to keep, and the staged image stays (R4-8c). */
export const EditReadAgainOpened: Story = {
  render: () => (
    <>
      <ChangeList rows={IMAGE_ONLY} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} dropped={0} staged />
    </>
  ),
};

/** GitHub rejected the saved token (a 401): Forget token brings the gate back (R-26, R-84). */
export const RejectedToken: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome
        result={null}
        error={`GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/${targetBranch()}: {"message":"Bad credentials"}`}
        note={IMAGE_NOTE}
        onForgetToken={noop}
      />
    </>
  ),
};

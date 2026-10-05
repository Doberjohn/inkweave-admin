import {useSearchParams} from 'react-router-dom';
import {targetBranch} from '../../../github/githubCommit';
import {useGithubToken} from '../../../github/useGithubToken';
import {PageLayout} from '../../../shell/PageLayout';
import {UnsavedChangesGuard} from '../../../shell/UnsavedChangesGuard';
import {useLiveTuning} from '../../tuning/useLiveTuning';
import {useTuningAdmin} from '../../tuning/useTuningAdmin';
import {useVoteAnalytics} from '../useVoteAnalytics';
import {useVoteLog} from '../useVoteLog';
import {CalibrationWorkspace, type CalibrationWorkspaceProps} from './CalibrationWorkspace';
import {calibrationSubtitle} from './calibrationModel';
import {useFocusHandoff} from './focusHandoff';

/** What leaving /calibration with pending edits loses (R-19). */
const UNSAVED_TUNING = "Your pending tuning edits aren't published yet. Leaving this page drops them.";

/** What leaving mid-publish means: nothing recalls the commit, and only this page would show how it went. */
const publishingTuning = () =>
  `A publish to ${targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed.`;

/** The branch pill: only the page's tuning half writes, and the pill keeps the repo it writes to. */
const BRANCH_LABEL = 'Tuning writes to Doberjohn/inkweave';

/** "Data as of 2026-09-30": the day admin's Deploy workflow built the analytics. */
function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </>
  );
}

/**
 * Both tuning hooks need a token, so they live below the gate, and so does the
 * guard over their edits. It is the page's one guard (a router holds one
 * blocker), and it needs the data router, which a story doesn't have.
 */
function TunedWorkspace({token, ...rest}: Omit<CalibrationWorkspaceProps, 'tuning'> & {token: string}) {
  const live = useLiveTuning(token);
  const admin = useTuningAdmin(token);
  return (
    <>
      <UnsavedChangesGuard
        dirty={admin.pending.length > 0}
        message={admin.publishing ? publishingTuning() : UNSAVED_TUNING}
      />
      <CalibrationWorkspace {...rest} tuning={{live, admin}} />
    </>
  );
}

/**
 * Calibration & tuning (/calibration): the calibration analytics beside the
 * tuning editor, which writes tuning.json to the target branch. The selected
 * rule lives in ?rule= (the Overview's links carry it), and a pick writes it,
 * replacing the entry. Without a token the analytics render in full and only
 * the aside asks for one. /tuning redirects here.
 */
export function CalibrationPage() {
  const analytics = useVoteAnalytics();
  const voteLog = useVoteLog();
  const {token, setToken, clearToken} = useGithubToken();
  const [params, setParams] = useSearchParams();
  // Saving or forgetting a token swaps the aside's view, and the button pressed goes
  // with it: the view that replaces it takes focus (F2). The token changes first, so
  // the view the button was in never takes the handoff.
  const handoff = useFocusHandoff();
  const workspace = {
    analytics,
    voteLog,
    onSaveToken: (next: string) => {
      setToken(next);
      handoff.request();
    },
    onForgetToken: () => {
      clearToken();
      handoff.request();
    },
    handoff,
    selectedId: params.get('rule'),
    // Replace: a pick changes the view, and Back should leave the page, not step through picks.
    onSelect: (id: string | null) => setParams(id ? {rule: id} : {}, {replace: true}),
  };
  return (
    <PageLayout
      title="Calibration & tuning"
      subtitle={analytics.loading ? undefined : calibrationSubtitle(analytics.data?.global ?? null)}
      meta={analytics.data ? <DataAsOf generatedAt={analytics.data.generatedAt} /> : undefined}
      writes
      branchLabel={BRANCH_LABEL}
      flush>
      {/* The key: a new token starts a fresh tuning.json read and an empty tray. */}
      {token ? (
        <TunedWorkspace key={token} token={token} {...workspace} />
      ) : (
        <CalibrationWorkspace {...workspace} tuning={null} />
      )}
    </PageLayout>
  );
}

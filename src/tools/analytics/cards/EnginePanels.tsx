import {useRef, useState} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {FONTS, Notice} from '../../../app-bridge';
import {ChartFrame, type ChartView} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {NetworkDiagram} from '../../../charts/NetworkDiagram';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {useCardArt} from '../../../shell/knownCards';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {SplitMeter} from '../../../ui/SplitMeter';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import {CAPTION} from './cardStyles';
import {
  engineState,
  networkSubtitle,
  partnerNames,
  partnerNodes,
  partnerTable,
  tierParts,
  type EngineModel,
  type EngineState,
  type PartnerNames,
} from './engineCharts';
import {ENGINE_GROUP_CAP, TIER_SERIES, type EngineSummary} from './engineView';
import {RetryNotice} from './RetryNotice';
import type {UseCardSynergiesReturn} from './useCardSynergies';

export interface EnginePanelsProps {
  card: LorcanaCard;
  /** The page's useCardSynergies(card.id). */
  synergies: UseCardSynergiesReturn;
  /** Vote analytics, for the source caption's date alone: the panels never wait for it. */
  analytics: UseVoteAnalyticsReturn;
  /** The card list's lookup: each partner's full and short name. */
  getCardById: (id: string) => LorcanaCard | undefined;
}

const COUNT: React.CSSProperties = {margin: 0, color: ADMIN_COLORS.text};
/** The count is a headline number: the display face at the KPI size (R-14), as the prototype draws it (dc.html:654). */
const COUNT_NUMBER: React.CSSProperties = {fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi, lineHeight: 1};
const COUNT_WORDS: React.CSSProperties = {fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};
/** The focus wrapper is the view's grid item, so it must shrink as the panel would. */
const PANEL_WRAP: React.CSSProperties = {minWidth: 0};

// The engine cut each group's weakest partners from the file, so a capped card's split is partial.
const CAP_TEXT =
  `A synergy group lists only its top ${ENGINE_GROUP_CAP} partners, ` +
  'so the split counts only those and undercounts the weaker tiers.';
const EMPTY_TEXT =
  'The engine finds no synergies for this card (or its synergy file could not be read). ' +
  "A card revealed after the app's last deploy has no synergy file yet.";

/** "At least 142 synergy partners": the number in the display face, the words in muted body text. */
function PartnerCount({summary}: {summary: EngineSummary}) {
  return (
    <p style={COUNT}>
      {summary.capped && <span style={COUNT_WORDS}>At least </span>}
      <span style={COUNT_NUMBER}>{fmtInt(summary.partners)}</span>{' '}
      <span style={COUNT_WORDS}>{summary.partners === 1 ? 'synergy partner' : 'synergy partners'}</span>
    </p>
  );
}

/** A read with partners: the count, the cap's caveat, and the split by tier, every tier shown, zeros included. */
function EngineNumbers({summary}: {summary: EngineSummary}) {
  return (
    <>
      <PartnerCount summary={summary} />
      {summary.capped && <p style={CAPTION}>{CAP_TEXT}</p>}
      <SplitMeter parts={tierParts(summary)} ariaLabel="Partners by strength tier" />
    </>
  );
}

interface EngineBodyProps {
  state: EngineState;
  handoff: FocusHandoff;
  onRetry: () => void;
}

/** The Engine view's body for each state of the read. */
function EngineBody({state, handoff, onRetry}: EngineBodyProps) {
  switch (state.kind) {
    case 'loading':
      return <Notice>Loading engine data...</Notice>;
    case 'failed':
      return (
        <RetryNotice onRetry={onRetry} handoff={handoff}>
          Could not load this card's synergies ({state.error.message})
        </RetryNotice>
      );
    case 'empty':
      return <Notice>{EMPTY_TEXT}</Notice>;
    default:
      return <EngineNumbers summary={state.model.summary} />;
  }
}

/** Where the numbers come from. The date waits for vote analytics, whose engine is the one its Deploy built. */
function SourceCaption({analytics}: {analytics: UseVoteAnalyticsReturn}) {
  const generatedAt = analytics.data?.generatedAt;
  const asOf = generatedAt ? `; vote analytics use the engine as of ${fmtDay(generatedAt.slice(0, 10))}` : '';
  return <p style={CAPTION}>Live engine data from inkweave.ink{asOf}.</p>;
}

/**
 * The Engine view panel. Retry asks for the handoff, and the panel's heading
 * takes it once a read lands, with partners or none; a read that fails again
 * hands it to the new Retry instead (R-48).
 */
function EngineViewPanel({state, analytics, ...body}: EngineBodyProps & {analytics: UseVoteAnalyticsReturn}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(body.handoff, wrapRef, 'h2', state.kind === 'loaded' || state.kind === 'empty');
  return (
    <div ref={wrapRef} style={PANEL_WRAP}>
      <Panel title="Engine view" titleFocusable>
        <EngineBody state={state} {...body} />
        <SourceCaption analytics={analytics} />
      </Panel>
    </div>
  );
}

/**
 * The strongest partners as a network, alone in an untitled Panel, as every
 * chart is (R-39). "and K more in the table" switches the frame to its table,
 * which lists every partner, and the frame then focuses it. The table's names
 * show their cards' art (the card list's, CardArtContext).
 */
function NetworkPanel({card, model, names}: {card: LorcanaCard; model: EngineModel; names: PartnerNames}) {
  const [view, setView] = useState<ChartView>('chart');
  const artOf = useCardArt();
  return (
    <Panel>
      <ChartFrame
        title="Strongest partners"
        subtitle={networkSubtitle(model)}
        legend={<ChartLegend series={TIER_SERIES} mark="line" />}
        table={partnerTable(model.partners, card, artOf)}
        view={view}
        onViewChange={setView}>
        <NetworkDiagram
          nodes={partnerNodes(model.partners, names)}
          series={TIER_SERIES}
          ariaLabel={`Strongest synergy partners of ${card.fullName}`}
          onShowAll={() => setView('table')}
        />
      </ChartFrame>
    </Panel>
  );
}

/**
 * The card's engine side, from its live synergy file (R3-6c): the Engine view
 * panel, and under it the network in a panel of its own, once the engine pairs
 * the card with anyone. Both run the page's full width, and neither waits for
 * the vote files. CardAnalyticsView renders this last; the page keys the view
 * by card (R-46), so a new card starts on the chart, with no handoff waiting.
 */
export function EnginePanels({card, synergies, analytics, getCardById}: EnginePanelsProps) {
  const handoff = useFocusHandoff();
  const names = partnerNames(getCardById);
  const state = engineState(synergies, names);
  const retry = () => {
    handoff.request();
    synergies.retry();
  };
  return (
    <>
      <EngineViewPanel state={state} analytics={analytics} handoff={handoff} onRetry={retry} />
      {state.kind === 'loaded' && <NetworkPanel card={card} model={state.model} names={names} />}
    </>
  );
}

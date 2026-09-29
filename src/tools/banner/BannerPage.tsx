import {useEffect, useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {useCardDataContext, usePrecomputedSynergies, COLORS} from '../../app-bridge';
import {SynergyBanner} from './SynergyBanner';
import {MAX_GROUPS, ROWS_PER_PAGE} from './bannerPaging';

/**
 * Dev/generator route: /banner/:cardId?page=N renders one page of a card's synergy-breakdown
 * banner from the live app components + precomputed synergy JSON. A card with >3 synergies
 * splits into pages of 3 (hero locked on each) so a Reddit post can be a 2-image carousel.
 * scripts/export-banner.mjs screenshots the .banner-stage element per page.
 *
 * Banner needs full-res art (card.imageUrl is only a ~367px thumbnail), so we load a one-off
 * id -> images.full map from allCards.json and gate rendering until it is ready.
 */
export function BannerPage() {
  const {cardId} = useParams<{cardId: string}>();
  const [searchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const {getCardById, isLoading: cardsLoading, error: cardsError} = useCardDataContext();
  const card = cardId ? getCardById(cardId) : undefined;
  const {synergies, isLoading} = usePrecomputedSynergies(card ?? null);
  const {fullImage, loaded, error} = useFullImageMap();

  const ready = card && !isLoading && loaded;
  const problem = bannerProblem({cardsError, artError: error, missingCard: !cardsLoading && !card, cardId});

  const sorted = [...synergies].sort((a, b) => b.synergies.length - a.synergies.length).slice(0, MAX_GROUPS);
  const pageGroups = sorted.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <div style={{minHeight: '100vh', background: COLORS.background, display: 'grid', placeItems: 'center', padding: 32}}>
      <BannerBody problem={problem} ready={Boolean(ready)}>
        {ready && <SynergyBanner card={card} groups={pageGroups} fullImage={fullImage} />}
      </BannerBody>
    </div>
  );
}

/** Why no banner can render: the card data or the art failed to load, or no card has this id. */
function bannerProblem(p: {cardsError: Error | null; artError: string | null; missingCard: boolean; cardId?: string}): string | null {
  if (p.cardsError) return `Could not load the card data (${p.cardsError.message}).`;
  if (p.artError) return `Could not load full-size card art (${p.artError}).`;
  if (p.missingCard) return `No card has the id ${p.cardId ?? ''}.`;
  return null;
}

/**
 * The stage, or why there is none. A failed load is an error, never a banner
 * with holes, and an unknown id never loads forever: scripts/export-banner.mjs
 * stops on this alert.
 */
function BannerBody({problem, ready, children}: {problem: string | null; ready: boolean; children: React.ReactNode}) {
  if (problem) {
    return (
      <div role="alert" style={{color: COLORS.error}}>
        {problem}
      </div>
    );
  }
  if (!ready) {
    return (
      <div style={{color: COLORS.textMuted}} aria-busy="true">
        Loading banner…
      </div>
    );
  }
  return children;
}

interface RawCard {
  id: string | number;
  images?: {full?: string};
}

/** Fetches the raw allCards.json and maps card id -> full-res image URL. */
async function fetchFullImageMap(): Promise<Map<string, string>> {
  const r = await fetch('/data/allCards.json');
  if (!r.ok) throw new Error(`/data/allCards.json: HTTP ${r.status}`);
  const data = (await r.json()) as {cards?: RawCard[]} | RawCard[];
  const cards = Array.isArray(data) ? data : data.cards ?? [];
  const map = new Map<string, string>();
  for (const c of cards) {
    if (c.images?.full) map.set(String(c.id), c.images.full);
  }
  return map;
}

/**
 * Loads a card-id -> full-res image URL map from the raw allCards.json (banner-only).
 * A failed load is reported as `error`, not as an empty map.
 */
function useFullImageMap(): {fullImage: (id: string) => string | undefined; loaded: boolean; error: string | null} {
  const [map, setMap] = useState<Map<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFullImageMap().then(
      (next) => {
        if (!cancelled) setMap(next);
      },
      (e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'request failed');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return {fullImage: (id: string) => map?.get(String(id)), loaded: map !== null, error};
}

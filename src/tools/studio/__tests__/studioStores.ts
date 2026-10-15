import {useSyncExternalStore} from 'react';
import type {useCardDataContext} from '../../../app-bridge';

/*
 * The two stores the studio page tests move on, so the page re-renders as it
 * would in the app: the card list (R3's pattern, CardAnalyticsPage.test.tsx)
 * and the width a ResizeObserver would report. jsdom has no ResizeObserver, so
 * the real useContainerWidth stays at 0: narrow.
 *
 * Each page test's app-bridge vi.mock spreads STORE_HOOKS over the real bridge,
 * through `await import('./studioStores')`. This module imports nothing that
 * imports the bridge: a module the factory loads binds to the real bridge, not
 * the mock, so studioHarness.tsx, which renders the page, can't be the one the
 * factory loads.
 */

/** What the studio reads from the shell's card list. */
export type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;

export const cardList = {value: null as CardList | null, listeners: new Set<() => void>()};
export const measured = {width: 0, listeners: new Set<() => void>()};

const subscribe = (listeners: Set<() => void>) => (onChange: () => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};
const onCards = subscribe(cardList.listeners);
const onWidth = subscribe(measured.listeners);

/** The bridge's two hooks, reading the stores. */
export const STORE_HOOKS = {
  useCardDataContext: function useCardDataContext() {
    return useSyncExternalStore(onCards, () => cardList.value);
  },
  useContainerWidth: function useContainerWidth() {
    return useSyncExternalStore(onWidth, () => measured.width);
  },
};

import {expect, vi} from 'vitest';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent, {type UserEvent} from '@testing-library/user-event';
import {createMemoryRouter, Link, RouterProvider, useParams} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {inkBlock} from '../../../app-bridge';
import {studioHref} from '../../../shell/nav';
import {pngFile} from '../../../test/images';
import {chunksOf, setOfChunk, type ChunkAnswer} from '../finishes/__tests__/collectionHarness';
import {StudioPage} from '../StudioPage';
import {cardList, type CardList} from './studioStores';

/*
 * The studio page tests' harness (StudioPage.test.tsx, StudioEdit.test.tsx):
 * the page in a data router, the card list it reads, GitHub's answers, and the
 * steps both files take. The stores live in studioStores.ts, which each file's
 * app-bridge vi.mock loads (see there). Each file still resets its own mocks
 * and stubs in its own hooks.
 */

/** The token store's key: page tests seed the real store (the R4 header's "The token"). */
export const TOKEN_KEY = 'inkweave.reveal-admin.gh-token';
/** The call the gate's "Save token" makes to check a token can push. */
const REPO_URL = 'https://api.github.com/repos/Doberjohn/inkweave';
const PREVIEW_URL =
  'https://api.github.com/repos/Doberjohn/inkweave/contents/apps/web/public/data/previewCards.json?ref=master';

/** One answer to a request. */
export type Answer = () => Response | Promise<Response>;
/** A request that never settles, so its read stays loading. */
export const never = () => new Promise<Response>(() => {});
const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

/**
 * Stubs fetch: the token can push, previewCards.json answers with `preview`
 * (by default it never settles: New reveal never needs it), the chunks of Sets
 * 1 to 8 that Edit card's search adds answer with `chunk` (by default each
 * holds no card, so a card id waits for them only a moment), and every other
 * request never settles.
 */
export function stubFetch(preview: Answer = never, chunk: ChunkAnswer = chunksOf()) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: unknown) => {
      if (url === REPO_URL) return Promise.resolve(json({permissions: {push: true}}));
      if (url === PREVIEW_URL) return Promise.resolve(preview());
      const set = setOfChunk(url);
      return set === undefined ? never() : Promise.resolve(chunk(set));
    }),
  );
}

/** How many times previewCards.json was read. */
export interface ReadCount {
  readonly count: number;
}

/**
 * previewCards.json's answers in order: the Nth read gets the Nth answer, and
 * every read past the last gets the last one again (stubFetch otherwise).
 */
export function stubReads(...answers: Answer[]): ReadCount {
  let count = 0;
  stubFetch(() => answers[Math.min(count++, answers.length - 1)]());
  return {
    get count() {
      return count;
    },
  };
}

/** The card list's state; it holds `cards` and finds by id among them. */
export interface CardListState {
  cards: LorcanaCard[];
  isLoading?: boolean;
  error?: Error | null;
}

/** Sets the card list the page reads, and re-renders. By default it has loaded, with no error. */
export function setCardList({cards, isLoading = false, error = null}: CardListState) {
  const getCardById: CardList['getCardById'] = (id) => cards.find((card) => card.id === id);
  cardList.value = {cards, isLoading, error, getCardById, retryLoad: () => {}};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** Where renderStudio opens the studio, and with which token: none shows the gate. */
export interface StudioRender {
  path?: string;
  token?: string | null;
}

/**
 * Card studio at `path` in a data router, which the guard needs, beside a page
 * to leave to, and a card page whose "Edit in Card studio" links into it, as
 * Card analytics' does (R-82).
 */
export function renderStudio({path = '/studio', token = 'tok'}: StudioRender = {}) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  const router = createMemoryRouter(
    [
      {path: '/studio', element: <StudioPage />},
      {path: '/', element: <h1>Overview</h1>},
      {
        path: '/cards/:cardId',
        Component: function CardPage() {
          const {cardId} = useParams();
          return <Link to={studioHref('edit', cardId)}>Edit in Card studio</Link>;
        },
      },
    ],
    {initialEntries: [path]},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

/** A New reveal card to fill: who fills it, and its name. */
export interface NewCard {
  user: UserEvent;
  name: string;
}

/**
 * Fills a card New reveal can publish: a Character named `name`, numbered in
 * Amber's block (the form's default ink), with its scan, `{name}.png`.
 */
export async function fillNewCard({user, name}: NewCard) {
  await user.type(screen.getByRole('textbox', {name: 'Collector number'}), String(inkBlock('Amber').first));
  await user.type(await screen.findByRole('textbox', {name: 'Name'}), name);
  for (const [field, value] of [['Cost', '4'], ['Strength', '3'], ['Willpower', '5'], ['Lore', '2']] as const) {
    await user.type(screen.getByRole('textbox', {name: field}), value);
  }
  // The card panel's file input: the only one New reveal has.
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input) await user.upload(input, pngFile(`${name.toLowerCase()}.png`));
  await waitFor(() => expect(screen.getByRole('button', {name: /^Publish/})).toBeEnabled());
}

/**
 * Where a browser leaves focus once the focused Publish or Save button goes
 * off: on <body> (HTML's focus fixup rule). jsdom keeps it on the disabled
 * button, which can't blur, so focus another control and let that go: the
 * mode switch's New reveal, which the header shows in either mode.
 */
export function dropFocusToBody() {
  const control = within(screen.getByRole('group', {name: 'Studio mode'})).getByRole('button', {name: 'New reveal'});
  act(() => {
    control.focus();
    control.blur();
  });
}

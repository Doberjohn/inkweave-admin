import {render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {createMemoryRouter, Link, Outlet, RouterProvider} from 'react-router-dom';
import {UnsavedChangesDialog, UnsavedChangesGuard, type UnsavedMessage} from './UnsavedChangesGuard';
import type {LeavesPage} from './useUnsavedChangesGuard';
import {writeInFlightMessage} from './writeInFlight';

const MESSAGE = "2 pending tuning edits aren't published yet. Leaving this page drops them.";

/** A change of ?card= leaves too, as it does in R4's studio (shouldBlockStudioNavigation). */
const holdsCards: LeavesPage = (from, to) => from.pathname !== to.pathname || from.search !== to.search;
/** A line worded for the held navigation, as the studio's names the drafts it drops (R-58). */
const goingTo: UnsavedMessage = (to) => `Going to ${to.pathname}${to.search} drops them.`;
/** The words a held card change asks with, as the studio's do (R4-8c): it stays on the page. */
const CARD_WORDS = {title: 'Leave this card?', stay: 'Keep editing', leave: 'Drop changes'};
const CARD_LINE = 'Leaving the card drops them.';
/** A question about the card for a card change, and the page's own line for anything that leaves the page. */
const aboutTheCard: UnsavedMessage = (to) => (to.pathname === '/editor' ? {...CARD_WORDS, message: CARD_LINE} : MESSAGE);
/** The dialog's answers, in order. */
const answersIn = (dialog: HTMLElement) => within(dialog).getAllByRole('button').map((button) => button.textContent);

interface EditorProps {
  message?: UnsavedMessage;
  leaves?: LeavesPage;
}

/** A page with an "Unsaved edits" switch and links away, guarded as R2-6's page is, or as R4's studio is with props. */
function Editor({message = MESSAGE, leaves}: EditorProps) {
  const [dirty, setDirty] = useState(false);
  return (
    <>
      <h1>Editor</h1>
      <label>
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} />
        Unsaved edits
      </label>
      <Link to="/elsewhere">Elsewhere</Link>
      <Link to="/editor?card=2">Another card</Link>
      <UnsavedChangesGuard dirty={dirty} message={message} leaves={leaves} />
    </>
  );
}

/** The shell round both pages, with a link that outlives the page it leaves, as the sidebar's do. */
function Shell() {
  return (
    <>
      <nav aria-label="Sidebar">
        <Link to="/elsewhere">Sidebar link</Link>
      </nav>
      <Outlet />
    </>
  );
}

function renderEditor(props: EditorProps = {}) {
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          {path: '/editor', element: <Editor {...props} />},
          {path: '/elsewhere', element: <h1>Elsewhere</h1>},
        ],
      },
    ],
    {initialEntries: ['/editor']},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

/** Stages an edit, then follows a link the guard holds (by default the one away), and returns its question. */
async function tryToLeave(user: ReturnType<typeof userEvent.setup>, link = 'Elsewhere', title = 'Leave this page?') {
  await user.click(screen.getByRole('checkbox', {name: 'Unsaved edits'}));
  await user.click(screen.getByRole('link', {name: link}));
  return screen.findByRole('dialog', {name: title});
}

describe('UnsavedChangesGuard', () => {
  it('asks nothing while there is nothing to lose', async () => {
    const {router, user} = renderEditor();
    await user.click(screen.getByRole('link', {name: 'Elsewhere'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('asks in a modal dialog before a link leaves unsaved edits, and focuses what leaving loses', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', {level: 2, name: 'Leave this page?'})).toBeInTheDocument();
    // A screen reader hears the message first, and no single key press leaves.
    await waitFor(() => expect(within(dialog).getByText(MESSAGE)).toHaveFocus());
    expect(router.state.location.pathname).toBe('/editor');
    await user.tab();
    expect(within(dialog).getByRole('button', {name: 'Stay on this page'})).toHaveFocus();
  });

  it('keeps Shift+Tab inside the dialog from the message', async () => {
    const {user} = renderEditor();
    const dialog = await tryToLeave(user);
    await waitFor(() => expect(within(dialog).getByText(MESSAGE)).toHaveFocus());
    await user.tab({shift: true});
    // The message is no tabbable control. The app's trap counts it as sitting before the first one (Doberjohn/inkweave#732),
    // so Shift+Tab wraps to the last button and never climbs behind the scrim: this pins that fix through the bridge.
    expect(within(dialog).getByRole('button', {name: 'Leave this page'})).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('stays on the page with its edits, and hands focus back to the link', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/editor');
    expect(screen.getByRole('checkbox', {name: 'Unsaved edits'})).toBeChecked();
    expect(screen.getByRole('link', {name: 'Elsewhere'})).toHaveFocus();
  });

  it('stays on Escape', async () => {
    const {router, user} = renderEditor();
    await tryToLeave(user);
    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('stays on a click on the scrim', async () => {
    const {router, user} = renderEditor();
    await tryToLeave(user);
    // The scrim is DialogShell's aria-hidden backdrop: the only such div in the body.
    await user.click(document.body.querySelector('div[aria-hidden="true"]') as HTMLElement);
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/editor');
  });

  it('leaves when asked to', async () => {
    const {router, user} = renderEditor();
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Leave this page'}));
    expect(await screen.findByRole('heading', {name: 'Elsewhere'})).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/elsewhere');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    {link: 'Sidebar link', path: '/elsewhere', props: {}},
    {link: 'Another card', path: '/editor', props: {leaves: holdsCards}},
  ])('leaves by $link, which stays mounted, and hands focus back to it', async ({link, path, props}) => {
    const {router, user} = renderEditor(props);
    const dialog = await tryToLeave(user, link);
    await waitFor(() => expect(within(dialog).getByText(MESSAGE)).toHaveFocus());
    await user.click(within(dialog).getByRole('button', {name: 'Leave this page'}));
    // Leaving the page unmounts the dialog with it; a card change lets it fade out.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe(path);
    // Leave lets go of focus first (R-59), and the dialog still puts it back on the link that opened it.
    expect(screen.getByRole('link', {name: link})).toHaveFocus();
  });

  it.each([
    ['Another card', 'Going to /editor?card=2 drops them.'],
    ['Elsewhere', 'Going to /elsewhere drops them.'],
  ])('words its question for where the held navigation goes: %s (R-58)', async (link, line) => {
    const {user} = renderEditor({message: goingTo, leaves: holdsCards});
    expect(await tryToLeave(user, link)).toHaveTextContent(line);
  });

  it('asks in the words the page gives for the held navigation: its title, its line and both answers (R4-8c)', async () => {
    const {router, user} = renderEditor({message: aboutTheCard, leaves: holdsCards});
    const dialog = await tryToLeave(user, 'Another card', 'Leave this card?');
    expect(within(dialog).getByRole('heading', {level: 2, name: 'Leave this card?'})).toBeInTheDocument();
    expect(answersIn(dialog)).toEqual(['Keep editing', 'Drop changes']);
    await waitFor(() => expect(within(dialog).getByText(CARD_LINE)).toHaveFocus());
    // The trap is the app's, whatever the words: Shift+Tab from the message wraps to the last answer.
    await user.tab({shift: true});
    expect(within(dialog).getByRole('button', {name: 'Drop changes'})).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.search).toBe('?card=2');
  });

  it("keeps the page's words for a line alone, from a function too", async () => {
    const {user} = renderEditor({message: aboutTheCard, leaves: holdsCards});
    const dialog = await tryToLeave(user);
    expect(within(dialog).getByText(MESSAGE)).toBeInTheDocument();
    expect(answersIn(dialog)).toEqual(['Stay on this page', 'Leave this page']);
  });

  it('keeps the words it asked with while the dialog fades out after Stay', async () => {
    const {user} = renderEditor({message: goingTo});
    const dialog = await tryToLeave(user);
    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    // The hold is over, so no target is left to word a line for: the fading panel keeps the line it showed.
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Going to /elsewhere drops them.');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });
});

describe('UnsavedChangesDialog', () => {
  const answers = {onStay: vi.fn(), onLeave: vi.fn()};

  it('follows its message while open, and keeps the last one while it fades out', async () => {
    const publishing = writeInFlightMessage({action: 'publish'});
    const {rerender} = render(<UnsavedChangesDialog open message={publishing} {...answers} />);
    const dialog = screen.getByRole('dialog', {name: 'Leave this page?'});
    // The publish failed with the question open: the edits are unsaved again, and the question says so.
    rerender(<UnsavedChangesDialog open message={MESSAGE} {...answers} />);
    expect(dialog).toHaveTextContent(MESSAGE);
    // The edits cleared, so the question closes: it fades out with the words it showed, not the page's new ones.
    rerender(<UnsavedChangesDialog open={false} message="" {...answers} />);
    expect(dialog).toHaveTextContent(MESSAGE);
    await waitForElementToBeRemoved(dialog);
  });

  it('fades out with the title and answers it asked with, as with its line (R4-8c)', async () => {
    const {rerender} = render(<UnsavedChangesDialog open message={CARD_LINE} words={CARD_WORDS} {...answers} />);
    const dialog = screen.getByRole('dialog', {name: 'Leave this card?'});
    expect(answersIn(dialog)).toEqual(['Keep editing', 'Drop changes']);
    // Closing with no words of its own would read as a page leave: the fading panel keeps the card's.
    rerender(<UnsavedChangesDialog open={false} message="" {...answers} />);
    expect(dialog).toHaveAccessibleName('Leave this card?');
    expect(within(dialog).getByRole('heading', {level: 2})).toHaveTextContent('Leave this card?');
    expect(answersIn(dialog)).toEqual(['Keep editing', 'Drop changes']);
    await waitForElementToBeRemoved(dialog);
  });
});

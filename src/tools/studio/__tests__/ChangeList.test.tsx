import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {ChangeRow} from '../changeRows';
import {ChangeList} from '../components/ChangeList';

/** Edit card's rows for a card refreshed to its English scan, with a staged image last (R4-2b's order). */
const ROWS: ChangeRow[] = [
  {id: 'version', label: 'Version', from: 'Bandmate', to: 'Band Leader'},
  {id: 'scanLanguage', label: 'Scan language', from: 'Japanese', to: 'English'},
  {id: 'image', label: 'Image', from: 'current art', to: 'miriam-en.png'},
];

/**
 * Mei turned into an Action, with a staged image: the type took her three
 * stats with it, so reverting a stat takes the Type row and the other two
 * stats too (revertDraftRow), and the image stays.
 */
const TYPE_ROWS: ChangeRow[] = [
  {id: 'type', label: 'Type', from: 'Character', to: 'Action'},
  {id: 'strength', label: 'Strength', from: '3', to: '—'},
  {id: 'willpower', label: 'Willpower', from: '5', to: '—'},
  {id: 'lore', label: 'Lore', from: '2', to: '—'},
  {id: 'image', label: 'Image', from: 'current art', to: 'mei.png'},
];
const TYPE_TAKES: Partial<Record<ChangeRow['id'], ChangeRow['id'][]>> = {
  strength: ['type', 'willpower', 'lore'],
  willpower: ['type', 'strength', 'lore'],
  lore: ['type', 'strength', 'willpower'],
};

/** A list whose reverts the case doesn't follow: it answers that nothing is left. */
const noRevert = () => [];

/**
 * The list over its own rows, as the controller keeps them: Discard empties
 * it, and a revert drops its row and the rows `takes` says go with it, and
 * answers the ids left, as the controller's revertRow does.
 */
function LiveList({initial, onDiscard, takes = {}}: {initial: ChangeRow[]; onDiscard?: () => void; takes?: typeof TYPE_TAKES}) {
  const [rows, setRows] = useState(initial);
  const revert = (id: ChangeRow['id']) => {
    const gone = [id, ...(takes[id] ?? [])];
    const left = rows.filter((row) => !gone.includes(row.id));
    setRows(left);
    return left.map((row) => row.id);
  };
  return (
    <ChangeList
      rows={rows}
      onDiscard={() => {
        onDiscard?.();
        setRows([]);
      }}
      onRevert={revert}
    />
  );
}

const revertButton = (label: string) => screen.getByRole('button', {name: `Revert ${label}`});

describe('ChangeList', () => {
  it('lists each change as its label, with its Revert, over a "from → to" diff, in the order given, the image last', () => {
    render(<ChangeList rows={ROWS} onDiscard={() => {}} onRevert={noRevert} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'VersionRevertBandmate → Band Leader',
      'Scan languageRevertJapanese → English',
      'ImageRevertcurrent art → miriam-en.png',
    ]);
  });

  it('prints a long diff whole, in a <code> that wraps, as R2\'s tray does', () => {
    const text = 'PANDA POWER When you play this character, each opponent chooses and discards a card, then you draw a card.';
    render(<ChangeList rows={[{id: 'fullText', label: 'Card text', from: '—', to: text}]} onDiscard={() => {}} onRevert={noRevert} />);
    const diff = screen.getByText(`— → ${text}`);
    expect(diff.tagName).toBe('CODE');
    expect(diff).toHaveStyle({whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'});
  });

  it.each<[number, string]>([
    [0, 'No changes yet'],
    [1, '1 change'],
    [3, '3 changes'],
  ])('with %i rows, is a region headed "%s"', (count, heading) => {
    render(<ChangeList rows={ROWS.slice(0, count)} onDiscard={() => {}} onRevert={noRevert} />);
    const panel = screen.getByRole('region', {name: heading});
    expect(within(panel).getByRole('heading', {level: 2, name: heading})).toBeInTheDocument();
  });

  it.each<[string, boolean | undefined, string]>([
    ['a card whose fields can change', undefined, 'Edit any field or replace the image. Changes are listed here before you save.'],
    // Released, unnumbered, other-set or unrepresentable: no field can change here (R-61, R-65).
    ['an image-only card', true, "Replace the image to make a change. It's listed here before you save."],
  ])('says where changes will show on %s, and offers no Discard, before anything changes', (_case, imageOnly, empty) => {
    render(<ChangeList rows={[]} onDiscard={() => {}} onRevert={noRevert} imageOnly={imageOnly} />);
    expect(screen.getByText(empty)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers one Discard for every change, named for what it drops (R-77)', async () => {
    const onDiscard = vi.fn();
    render(<ChangeList rows={ROWS} onDiscard={onDiscard} onRevert={noRevert} />);
    const discard = screen.getByRole('button', {name: 'Discard all changes'});
    // The name starts with the word the button shows (2.5.3).
    expect(discard).toHaveTextContent(/^Discard$/);
    expect(screen.getAllByRole('button', {name: /^Discard/})).toEqual([discard]);
    await userEvent.click(discard);
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('holds Discard while a save runs, and offers it again once the save settles (R4-4c\'s hand-off)', async () => {
    const onDiscard = vi.fn();
    const {rerender} = render(<ChangeList rows={ROWS} onDiscard={onDiscard} onRevert={noRevert} busy />);
    const discard = screen.getByRole('button', {name: 'Discard all changes'});
    expect(discard).toBeDisabled();
    await userEvent.click(discard);
    expect(onDiscard).not.toHaveBeenCalled();
    rerender(<ChangeList rows={ROWS} onDiscard={onDiscard} onRevert={noRevert} busy={false} />);
    expect(discard).toBeEnabled();
  });

  it('gives each row its own Revert, named for the row, that takes back that row (Doberjohn/inkweave-admin#52)', async () => {
    const onRevert = vi.fn(noRevert);
    render(<ChangeList rows={ROWS} onDiscard={() => {}} onRevert={onRevert} />);
    const reverts = ['Version', 'Scan language', 'Image'].map(revertButton);
    // The name starts with the word the button shows (2.5.3).
    for (const button of reverts) expect(button).toHaveTextContent(/^Revert$/);
    await userEvent.click(revertButton('Scan language'));
    expect(onRevert).toHaveBeenCalledExactlyOnceWith('scanLanguage');
  });

  it('holds every Revert while a save runs, as Discard is', async () => {
    const onRevert = vi.fn(noRevert);
    render(<ChangeList rows={ROWS} onDiscard={() => {}} onRevert={onRevert} busy />);
    for (const label of ['Version', 'Scan language', 'Image']) expect(revertButton(label)).toBeDisabled();
    await userEvent.click(revertButton('Version'));
    expect(onRevert).not.toHaveBeenCalled();
  });

  // R2's tray (focusNearRow): a revert takes its own button with it, so focus moves to a row the list keeps.
  it.each<{name: string; rows: ChangeRow[]; revert: string; focus: string}>([
    {name: "the next row's Revert", rows: ROWS, revert: 'Version', focus: 'Revert Scan language'},
    {name: "the previous row's, for the last row", rows: ROWS, revert: 'Image', focus: 'Revert Scan language'},
    {name: "the next row's the list keeps, past the rows the revert takes too", rows: TYPE_ROWS, revert: 'Strength', focus: 'Revert Image'},
    {name: "the previous row's the list keeps, when it keeps none after", rows: [ROWS[0], ...TYPE_ROWS.slice(0, 4)], revert: 'Strength', focus: 'Revert Version'},
  ])('moves focus to $name once a row is reverted', async ({rows, revert, focus}) => {
    render(<LiveList initial={rows} takes={TYPE_TAKES} />);
    const target = screen.getByRole('button', {name: focus});
    await userEvent.click(revertButton(revert));
    expect(screen.queryByRole('button', {name: `Revert ${revert}`})).not.toBeInTheDocument();
    // The button that takes focus is the one the list kept, not a new one.
    expect(target).toHaveFocus();
  });

  it('moves focus to the heading once the last row goes, or every row with it, never to <body> (R-48)', async () => {
    const {unmount} = render(<LiveList initial={ROWS.slice(0, 1)} />);
    await userEvent.click(revertButton('Version'));
    expect(screen.getByRole('heading', {level: 2, name: 'No changes yet'})).toHaveFocus();
    unmount();

    render(<LiveList initial={TYPE_ROWS.slice(0, 4)} takes={TYPE_TAKES} />);
    await userEvent.click(revertButton('Lore'));
    expect(screen.getByRole('heading', {level: 2, name: 'No changes yet'})).toHaveFocus();
  });

  it('moves focus to the heading before Discard empties the list, never to <body> (R-48)', async () => {
    let focusedAtDiscard: Element | null = null;
    render(<LiveList initial={ROWS} onDiscard={() => (focusedAtDiscard = document.activeElement)} />);
    await userEvent.click(screen.getByRole('button', {name: 'Discard all changes'}));
    const heading = screen.getByRole('heading', {level: 2, name: 'No changes yet'});
    expect(focusedAtDiscard).toBe(heading);
    expect(heading).toHaveFocus();
  });
});

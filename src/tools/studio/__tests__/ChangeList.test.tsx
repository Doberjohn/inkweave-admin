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

/** The list over its own rows, as the controller keeps them: Discard empties it. */
function LiveList({initial, onDiscard}: {initial: ChangeRow[]; onDiscard?: () => void}) {
  const [rows, setRows] = useState(initial);
  return (
    <ChangeList
      rows={rows}
      onDiscard={() => {
        onDiscard?.();
        setRows([]);
      }}
    />
  );
}

describe('ChangeList', () => {
  it('lists each change as its label over a "from → to" diff, in the order given, the image last', () => {
    render(<ChangeList rows={ROWS} onDiscard={() => {}} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'VersionBandmate → Band Leader',
      'Scan languageJapanese → English',
      'Imagecurrent art → miriam-en.png',
    ]);
  });

  it('prints a long diff whole, in a <code> that wraps, as R2\'s tray does', () => {
    const text = 'PANDA POWER When you play this character, each opponent chooses and discards a card, then you draw a card.';
    render(<ChangeList rows={[{id: 'fullText', label: 'Card text', from: '—', to: text}]} onDiscard={() => {}} />);
    const diff = screen.getByText(`— → ${text}`);
    expect(diff.tagName).toBe('CODE');
    expect(diff).toHaveStyle({whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'});
  });

  it.each<[number, string]>([
    [0, 'No changes yet'],
    [1, '1 change'],
    [3, '3 changes'],
  ])('with %i rows, is a region headed "%s"', (count, heading) => {
    render(<ChangeList rows={ROWS.slice(0, count)} onDiscard={() => {}} />);
    const panel = screen.getByRole('region', {name: heading});
    expect(within(panel).getByRole('heading', {level: 2, name: heading})).toBeInTheDocument();
  });

  it('says where changes will show, and offers no Discard, before anything changes', () => {
    render(<ChangeList rows={[]} onDiscard={() => {}} />);
    expect(
      screen.getByText('Edit any field or replace the image. Changes are listed here before you save.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Discard/})).not.toBeInTheDocument();
  });

  it('offers one Discard for every change, named for what it drops (R-77)', async () => {
    const onDiscard = vi.fn();
    render(<ChangeList rows={ROWS} onDiscard={onDiscard} />);
    const discard = screen.getByRole('button', {name: 'Discard all changes'});
    // The name starts with the word the button shows (2.5.3).
    expect(discard).toHaveTextContent(/^Discard$/);
    expect(screen.getAllByRole('button')).toEqual([discard]);
    await userEvent.click(discard);
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('holds Discard while a save runs, and offers it again once the save settles (R4-4c\'s hand-off)', async () => {
    const onDiscard = vi.fn();
    const {rerender} = render(<ChangeList rows={ROWS} onDiscard={onDiscard} busy />);
    const discard = screen.getByRole('button', {name: 'Discard all changes'});
    expect(discard).toBeDisabled();
    await userEvent.click(discard);
    expect(onDiscard).not.toHaveBeenCalled();
    rerender(<ChangeList rows={ROWS} onDiscard={onDiscard} busy={false} />);
    expect(discard).toBeEnabled();
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

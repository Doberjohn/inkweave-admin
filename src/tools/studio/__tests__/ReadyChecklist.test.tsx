import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {revealForm} from '../../../test/revealForm';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {ReadyChecklist} from '../components/ReadyChecklist';
import {revealChecklist, type ChecklistItem} from '../readiness';

/** The checklist New card shows for `form`, with `imageName` chosen and its bytes read when `ready`. */
function checklistFor({form, imageName, ready}: {form: RevealCardForm; imageName: string | null; ready: boolean}) {
  const validation = validateRevealCardForm(form, new Set(), imageName);
  return revealChecklist(form, validation, {ready, error: null});
}

const FRESH = checklistFor({form: EMPTY_FORM, imageName: null, ready: false});
const READY = checklistFor({form: revealForm(), imageName: 'mei.png', ready: true});

function renderChecklist(items: ChecklistItem[]) {
  render(<ReadyChecklist items={items} />);
  return screen.getByRole('region', {name: 'Ready to publish'});
}

describe('ReadyChecklist', () => {
  it('reads a fresh form 1/7, with the message of every open item (R4-3a)', () => {
    const panel = renderChecklist(FRESH);
    expect(within(panel).getByRole('heading', {level: 2, name: 'Ready to publish'})).toBeInTheDocument();
    expect(within(panel).getByText('1/7')).toBeInTheDocument();
    for (const item of FRESH.filter((open) => !open.done)) {
      expect(within(panel).getByText(item.message ?? '')).toBeInTheDocument();
    }
    // Card text is optional, so it starts ticked; the Ink tick waits for the collector number.
    expect(within(panel).getByText('Checked against the collector number: set it first')).toBeInTheDocument();
  });

  it('says in words which items are done, not by colour alone', () => {
    const panel = renderChecklist(FRESH);
    const rows = within(panel).getAllByRole('listitem');
    expect(rows.map((row) => within(row).getByRole('img').getAttribute('aria-label'))).toEqual([
      'To do',
      'To do',
      'To do',
      'To do',
      'To do',
      'Done',
      'To do',
    ]);
    expect(rows[5]).toHaveTextContent('Card text');
  });

  it('reads a card ready to publish 7/7, with no messages and the bar full', () => {
    const panel = renderChecklist(READY);
    expect(within(panel).getByText('7/7')).toBeInTheDocument();
    expect(within(panel).getAllByRole('img', {name: 'Done'})).toHaveLength(7);
    // Each row is its mark and label alone: a done item has no message.
    expect(within(panel).getAllByRole('listitem').map((row) => row.textContent)).toEqual(
      READY.map((item) => `✓${item.label}`),
    );
    // The bar is decoration beside the printed count (MeterBar with no label).
    const bar = panel.querySelector<HTMLElement>('div[aria-hidden="true"] > div');
    expect(bar?.style.width).toBe('100%');
  });

  it('never turns red: an open item is work left, so its message is muted (R-72)', () => {
    const panel = renderChecklist(FRESH);
    expect(within(panel).getByText('Name is required')).toHaveStyle({color: ADMIN_COLORS.muted});
  });
});

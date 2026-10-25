import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../../app-bridge';
import {baseName} from '../../../components/fileName';
import {RAW_DIR} from '../../image/githubClient';
import {PREVIEW_PATH} from '../../reveal/githubClient';
import {SetBar, type SetBarProps} from '../components/SetBar';
import {newCardSet} from '../newCardSets';

const REVEAL = newCardSet(REVEAL_SET_CODE);

function renderBar(overrides: Partial<SetBarProps> = {}) {
  const props: SetBarProps = {
    set: REVEAL,
    collectorNumber: '',
    onChangeSet: vi.fn(),
    publishing: false,
    layout: 'wide',
    ...overrides,
  };
  const view = render(<SetBar {...props} />);
  return {...props, ...view};
}

/** The line under "Written to", which says where the card is written, as one string. */
const writtenTo = () => screen.getByText('Written to').nextElementSibling?.textContent;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('SetBar', () => {
  it('shows the second of two steps as current, the first as done in words too', () => {
    renderBar();
    const items = within(screen.getByRole('list', {name: 'New card steps'})).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual([null, 'step']);
    expect(items[0]).toHaveTextContent('Set, done');
  });

  it('names the set chosen, as a reveal', () => {
    renderBar();
    expect(screen.getByText(`Set ${REVEAL.code}`)).toBeInTheDocument();
    expect(screen.getByText('reveal')).toBeInTheDocument();
    expect(screen.getByText(REVEAL.name ?? '')).toBeInTheDocument();
  });

  it('names a set the pinned app has no name for by its number alone', () => {
    renderBar({set: newCardSet('99')});
    expect(screen.getByText('Set 99').parentElement?.nextElementSibling).toHaveTextContent('Change set');
  });

  it('says the card goes to previewCards.json under the id its collector number gives, with its scan, by the paths the commit writes', () => {
    renderBar({collectorNumber: '23'});
    expect(writtenTo()).toBe(`${PREVIEW_PATH} as card ${REVEAL_ID_BASE + 23}, with its scan in ${baseName(RAW_DIR)}/`);
  });

  it('states the rule for the id while no number of the set is typed', () => {
    renderBar({collectorNumber: ''});
    expect(writtenTo()).toContain(`as ${REVEAL_ID_BASE} + its collector number,`);
  });

  it('names the branch the commit goes to: master, or the rehearsal branch', () => {
    renderBar();
    expect(screen.getByText(/^One commit to master\./)).toBeInTheDocument();

    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderBar();
    expect(screen.getByText(/^One commit to admin-verify\./)).toBeInTheDocument();
  });

  it('goes back to step 1 on Change set', async () => {
    const {onChangeSet} = renderBar();
    await userEvent.click(screen.getByRole('button', {name: 'Change set'}));
    expect(onChangeSet).toHaveBeenCalledOnce();
  });

  it('holds Change set while a publish runs: step 1 would hide how it went', async () => {
    const {onChangeSet} = renderBar({publishing: true});
    const change = screen.getByRole('button', {name: 'Change set'});
    expect(change).toBeDisabled();
    await userEvent.click(change);
    expect(onChangeSet).not.toHaveBeenCalled();
  });

  it('sets its parts in a line, ruled apart, when wide, where is written taking the rest of it', () => {
    const {container} = renderBar();
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.style.flexDirection).toBe('');
    expect(bar.querySelectorAll(':scope > [aria-hidden="true"]')).toHaveLength(2);
    expect(screen.getByText('Written to').parentElement?.style.flex).toBe('1 1 320px');
  });

  it('stacks its parts with no rules when narrow, each as tall as its content', () => {
    const {container} = renderBar({layout: 'narrow'});
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.style.flexDirection).toBe('column');
    expect(bar.querySelectorAll(':scope > [aria-hidden="true"]')).toHaveLength(0);
    // A flex basis in the column would be a height: the "Written to" part once stood 320px tall.
    expect([...bar.children].map((part) => (part as HTMLElement).style.flex)).toEqual(['', '', '']);
  });
});

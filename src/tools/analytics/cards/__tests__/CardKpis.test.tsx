import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {CardKpis} from '../CardKpis';
import {CARD_ID, CARD_PAIRS, CARD_RULES, MAUI_LOG, RAW_LOG, THIN_CARD} from '../cardFixtures';
import {pairsForCard} from '../cardStats';
import {votesForCard} from '../cardVotes';
import type {CardCalibrationData, RawVotes} from '../cardView';

// jsdom has no ResizeObserver, so the real useContainerWidth stays at 0. The
// stub gives the row a width.
const measured = vi.hoisted(() => ({width: 0}));
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useContainerWidth: () => measured.width,
}));

beforeEach(() => {
  measured.width = 0;
});

const MAUI_CALIBRATION: CardCalibrationData = {cardPairs: pairsForCard(CARD_PAIRS, CARD_ID), rules: CARD_RULES};
const MAUI_RAW: RawVotes = {kind: 'card', cardVotes: votesForCard(MAUI_LOG, CARD_ID)};

const row = () => screen.getByRole('region', {name: 'Key figures'});
const kpi = (label: string) => within(screen.getByRole('group', {name: label}));

describe('CardKpis', () => {
  it.each([
    [1136, 6],
    [1062, 3],
    [237, 2],
  ])('lays the six out %ipx wide in %i columns, so none sits alone on a row (#34)', (width, columns) => {
    measured.width = width;
    render(<CardKpis calibration={MAUI_CALIBRATION} raw={MAUI_RAW} />);
    expect(screen.getAllByRole('group')).toHaveLength(6);
    expect(row()).toHaveStyle({gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`});
  });

  it('counts the cards it shows: the calibration four alone go 4 or 2 across', () => {
    measured.width = 1062;
    const {unmount} = render(<CardKpis calibration={MAUI_CALIBRATION} raw={{kind: 'waiting'}} />);
    expect(screen.getAllByRole('group')).toHaveLength(4);
    expect(row()).toHaveStyle({gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'});
    unmount();
    measured.width = 700;
    render(<CardKpis calibration={MAUI_CALIBRATION} raw={{kind: 'waiting'}} />);
    expect(row()).toHaveStyle({gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'});
  });

  it('reads "—" for the accuracy sentiment of a card whose votes answer no accuracy question', () => {
    render(<CardKpis calibration={null} raw={{kind: 'card', cardVotes: votesForCard(RAW_LOG.votes, THIN_CARD.id)}} />);
    expect(kpi('Accuracy sentiment').getByText('—')).toBeInTheDocument();
    expect(kpi('Accuracy sentiment').getByText('too-low vs too-high · 0 answers')).toBeInTheDocument();
    expect(kpi('Distinct voters').getByText('2')).toBeInTheDocument();
  });

  it('renders nothing when neither file has a number for the card', () => {
    const {container} = render(<CardKpis calibration={{cardPairs: [], rules: CARD_RULES}} raw={{kind: 'none'}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

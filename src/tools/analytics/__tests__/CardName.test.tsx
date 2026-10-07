import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {renderWithCards} from '../../../test/cardLinks';
import {CardName, PairLine, PairNames} from '../CardName';

// 2983 is in the card list; 17 isn't (rotated out of Core, say).
const PAIR = {a: '2983', b: '17', aName: 'Elsa - Snow Queen', bName: 'Anna - Heir to Arendelle'};

/** Each link as [its name, where it goes]. */
const links = () => screen.queryAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]);

describe('CardName', () => {
  it('links a card the card list holds to its Card analytics page (R-33)', () => {
    renderWithCards(<CardName id="2983" name="Elsa - Snow Queen" />, ['2983']);
    expect(links()).toEqual([['Elsa - Snow Queen', '/cards/2983']]);
  });

  it('prints a card the card list lacks as plain text', () => {
    renderWithCards(<CardName id="17" name="Anna - Heir to Arendelle" />, ['2983']);
    expect(screen.getByText('Anna - Heir to Arendelle')).toBeInTheDocument();
    expect(links()).toEqual([]);
  });

  it('links nothing outside the shell, so a view renders on its own, with no router', () => {
    render(<CardName id="2983" name="Elsa - Snow Queen" />);
    expect(screen.getByText('Elsa - Snow Queen')).toBeInTheDocument();
    expect(links()).toEqual([]);
  });

  it('escapes the id, so it stays one path segment', () => {
    renderWithCards(<CardName id="a/b c" name="Odd" />, ['a/b c']);
    expect(links()).toEqual([['Odd', '/cards/a%2Fb%20c']]);
  });
});

describe('PairNames', () => {
  it('links each name on its own, with a × between them', () => {
    const {container} = renderWithCards(<PairNames pair={PAIR} />, ['2983']);
    expect(container).toHaveTextContent(/^Elsa - Snow Queen × Anna - Heir to Arendelle$/);
    expect(links()).toEqual([['Elsa - Snow Queen', '/cards/2983']]);
  });
});

describe('PairLine', () => {
  it('ends in an ellipsis, with room inside its clip for a focused link’s ring', () => {
    renderWithCards(<PairLine pair={PAIR} />, ['2983', '17']);
    const line = screen.getByRole('link', {name: 'Elsa - Snow Queen'}).parentElement;
    expect(line).toHaveTextContent('Elsa - Snow Queen × Anna - Heir to Arendelle');
    // The ring is 2px wide and 2px out: 4px of padding, taken back as margin, so the line doesn't move.
    expect(line).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '4px',
      margin: '-4px',
    });
  });
});

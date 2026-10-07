import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {DataAsOf} from '../DataAsOf';

describe('DataAsOf', () => {
  it('dates the data by the UTC day of generatedAt, in a bare <code> straight inside its line', () => {
    // PageLayout puts its meta in a <p>.
    render(
      <p>
        <DataAsOf generatedAt="2026-10-05T04:12:09.123Z" />
      </p>,
    );
    const line = screen.getByText(/Data as of/);
    const day = screen.getByText('2026-10-05');
    expect(line.tagName).toBe('P');
    expect(line).toHaveTextContent('Data as of 2026-10-05');
    expect(day.tagName).toBe('CODE');
    // No wrapper of its own: the line holds the words and the <code> alone.
    expect(line.children).toHaveLength(1);
    expect(line.firstElementChild).toBe(day);
    // The meta line sets the size and the muted colour; the day takes them as they are.
    expect(day).not.toHaveAttribute('style');
  });
});

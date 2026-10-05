import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {TierRow} from '../components/TierRow';

function renderRow(props: {score: string; textError?: string; scoreError?: string}) {
  render(
    <TierRow
      label="curve.gap3"
      text="Wide 3-turn gap."
      showText
      showScore
      onTextChange={() => {}}
      onScoreChange={() => {}}
      {...props}
    />,
  );
}

const text = () => screen.getByRole('textbox', {name: 'curve.gap3 text'});
const score = () => screen.getByRole('spinbutton', {name: 'curve.gap3 score'});

describe('TierRow', () => {
  it("ties each field's error to the field, as its description", () => {
    renderRow({score: '11', textError: 'Text must not be empty', scoreError: 'Score must be between 1 and 10'});
    expect(text()).toHaveAccessibleDescription('Text must not be empty');
    expect(text()).toHaveAttribute('aria-invalid', 'true');
    expect(score()).toHaveAccessibleDescription('Score must be between 1 and 10');
    expect(score()).toHaveAttribute('aria-invalid', 'true');
  });

  it('describes a field without an error by nothing, and marks it valid', () => {
    renderRow({score: '6'});
    expect(text()).not.toHaveAttribute('aria-describedby');
    expect(score()).not.toHaveAttribute('aria-describedby');
    expect(score()).toBeValid();
  });
});

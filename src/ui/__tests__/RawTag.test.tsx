import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {RawTag} from '../RawTag';

describe('RawTag', () => {
  it('reads "raw" and says where the number comes from on hover', () => {
    render(<RawTag />);
    expect(screen.getByText('raw')).toHaveAttribute('title', 'From the raw vote log');
  });
});

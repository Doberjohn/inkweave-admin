import {describe, expect, it} from 'vitest';
import {tokenMark} from '../tokenMark';

describe('tokenMark', () => {
  it('is the 32-bit FNV-1a hash of the token’s bytes', () => {
    // FNV-1a's own test vectors.
    expect(tokenMark('')).toBe(0x811c9dc5);
    expect(tokenMark('a')).toBe(0xe40c292c);
    expect(tokenMark('foobar')).toBe(0xbf9cf968);
  });

  it('gives a token the same mark each time, and two tokens two marks', () => {
    expect(tokenMark('token-a')).toBe(tokenMark('token-a'));
    expect(tokenMark('token-a')).not.toBe(tokenMark('token-b'));
  });

  it('is a number, so nothing of the token itself is kept', () => {
    const mark = tokenMark('token-a');
    expect(Number.isInteger(mark)).toBe(true);
    expect(mark).toBeGreaterThanOrEqual(0);
    expect(mark).toBeLessThan(2 ** 32);
  });
});

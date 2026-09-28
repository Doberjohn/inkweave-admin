// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {isLoginGate} from './assert-login-gate.mjs';

describe('isLoginGate', () => {
  it('accepts a redirect to Vercel login', () => {
    expect(
      isLoginGate(302, 'https://vercel.com/sso-api?url=https%3A%2F%2Fx.vercel.app%2F&nonce=abc'),
    ).toBe(true);
  });

  it('rejects a page served to an anonymous visitor', () => {
    expect(isLoginGate(200, null)).toBe(false);
  });

  it('rejects a redirect anywhere other than Vercel login', () => {
    expect(isLoginGate(308, 'https://inkweave.ink/')).toBe(false);
  });
});

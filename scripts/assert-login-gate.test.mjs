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

  it('accepts a 307 redirect to Vercel login', () => {
    expect(isLoginGate(307, 'https://vercel.com/sso-api?url=x')).toBe(true);
  });

  it('rejects a login-status redirect to a look-alike path', () => {
    expect(isLoginGate(302, 'https://vercel.com/sso-api-other?url=x')).toBe(false);
  });

  it('rejects a login-status redirect to another host', () => {
    expect(isLoginGate(307, 'https://vercel.com.example.net/sso-api?url=x')).toBe(false);
  });
});

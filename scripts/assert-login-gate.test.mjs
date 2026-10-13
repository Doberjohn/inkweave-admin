// @vitest-environment node
import {describe, expect, it, vi} from 'vitest';
import {fetchGateResponse, isLoginGate} from './assert-login-gate.mjs';

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

  it('rejects a relative location that cannot be parsed as an absolute URL', () => {
    expect(isLoginGate(307, '/sso-api?url=x')).toBe(false);
  });
});

describe('fetchGateResponse', () => {
  const URL_UNDER_TEST = 'https://admin-abc.vercel.app/';
  const respond = (status, headers = {}) => () => Promise.resolve(new Response(null, {status, headers}));
  const quiet = {wait: async () => {}, log: () => {}};

  it('asks again after a 404 and returns the login redirect that follows', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(respond(404))
      .mockImplementationOnce(respond(302, {location: 'https://vercel.com/sso-api?url=x'}));
    const response = await fetchGateResponse(URL_UNDER_TEST, {...quiet, fetchFn});
    expect(response.status).toBe(302);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns an exposed page at once, without asking again', async () => {
    const fetchFn = vi.fn(respond(200));
    const response = await fetchGateResponse(URL_UNDER_TEST, {...quiet, fetchFn});
    expect(response.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns the last 404 once its five tries run out', async () => {
    const fetchFn = vi.fn(respond(404));
    const response = await fetchGateResponse(URL_UNDER_TEST, {...quiet, fetchFn});
    expect(response.status).toBe(404);
    expect(fetchFn).toHaveBeenCalledTimes(5);
  });
});

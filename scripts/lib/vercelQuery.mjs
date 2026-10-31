/**
 * One authenticated GET against Vercel's Web Analytics Query API, for
 * scripts/precompute-vercel-analytics.mjs. Docs:
 * https://vercel.com/docs/analytics/web-analytics-api
 */

const API_BASE = 'https://api.vercel.com/v1/query/web-analytics';
// Each request's deadline, body included. Fetch has no overall one, so a stalled
// request would hold the deploy instead of failing its event.
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Ask `endpoint` with `params` and return the response's `data` field. Its errors
 * name the endpoint and the HTTP status or the failure, never a body: the workflow
 * logs each failed event's message, and a response body can hold event data.
 */
export async function vercelQuery(endpoint, params, {token, projectId, teamId}) {
  const search = new URLSearchParams({projectId, ...params});
  if (teamId) search.set('teamId', teamId);
  // A timeout or a network failure rejects with no endpoint in its message.
  const res = await fetch(`${API_BASE}/${endpoint}?${search}`, {
    headers: {Authorization: `Bearer ${token}`},
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => {
    throw new Error(`Vercel API ${endpoint}: ${error.message}`);
  });
  if (!res.ok) throw new Error(`Vercel API ${endpoint} ${res.status}`);
  // JSON.parse quotes the text around a syntax error, so its message is replaced too.
  const body = await res.json().catch(() => {
    throw new Error(`Vercel API ${endpoint} ${res.status}: the response could not be read as JSON`);
  });
  return body.data;
}

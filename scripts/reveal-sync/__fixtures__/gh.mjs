/** A fake `gh api` for tests. */
import {setGhRunner} from '../github.mjs';

const RAW = Symbol('raw answer');

/** The media type a call asked for with `--header 'Accept: ...'`, if any. */
function acceptOf(args) {
  const at = args.indexOf('--header');
  return at === -1 ? undefined : args[at + 1].replace(/^Accept:\s*/, '');
}

/**
 * Install a fake that answers each call from `route` and records it; returns the calls. Each
 * call is {endpoint, method, accept, body}.
 */
export function fakeGh(route) {
  const calls = [];
  setGhRunner((args, input) => {
    const call = {
      endpoint: args[0],
      method: args[2],
      accept: acceptOf(args),
      body: input === undefined ? undefined : JSON.parse(input),
    };
    calls.push(call);
    const answer = route(call);
    if (answer instanceof Error) throw answer;
    if (answer?.[RAW] !== undefined) return answer[RAW];
    return answer === undefined ? '' : JSON.stringify(answer);
  });
  return calls;
}

/** An answer gh prints as it is, as it does a file asked for in the raw media type. */
export const rawAnswer = (text) => ({[RAW]: text});

/** A route answering `${method} ${endpoint}` from a table; any other call fails the test. */
export const table = (answers) => (call) => {
  const key = `${call.method} ${call.endpoint}`;
  if (!(key in answers)) throw new Error(`unexpected gh call: ${key}`);
  return answers[key];
};

/** The contents API's answer for a file holding `text`. */
export const fileAnswer = (text, sha) => ({
  content: Buffer.from(text).toString('base64'),
  encoding: 'base64',
  sha,
});

/** A failed call, as execFileSync reports one. */
export const ghError = (stderr) => Object.assign(new Error('Command failed: gh api'), {stderr});

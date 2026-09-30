/** A fake `gh api` for tests. */
import {setGhRunner} from '../github.mjs';

/** Install a fake that answers each call from `route` and records it; returns the calls. */
export function fakeGh(route) {
  const calls = [];
  setGhRunner((args, input) => {
    const call = {endpoint: args[0], method: args[2], body: input === undefined ? undefined : JSON.parse(input)};
    calls.push(call);
    const answer = route(call);
    if (answer instanceof Error) throw answer;
    return answer === undefined ? '' : JSON.stringify(answer);
  });
  return calls;
}

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

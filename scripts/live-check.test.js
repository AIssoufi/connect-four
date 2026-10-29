import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GAME_STORE_CHECK_ID } from '../worker/constants';

/** The line of `live-check.sh` that sets the id whose status the files-only check asks. */
const STORE_CHECK_ID_LINE = /^readonly STORE_CHECK_GAME_ID='([^']*)'$/m;

/** The lines of `live-check.sh` that send a request, through request or post_once. */
const REQUEST_CALL = /\b(request|post_once) \d{3}\b(?:.*\\\n)*.*$/gm;

const script = readFileSync(new URL('./live-check.sh', import.meta.url), 'utf8');

describe('live-check.sh', () => {
  it('asks the status of the id that the Worker sends to a Durable Object', () => {
    expect(script.match(STORE_CHECK_ID_LINE)?.[1]).toBe(GAME_STORE_CHECK_ID);
  });

  it('retries the GET requests twice and sends the POST requests once', () => {
    expect(script).toMatch(/^readonly GET_RETRIES=2$/m);
    expect(script).toMatch(/^readonly POST_RETRIES=0$/m);
    expect(script).toMatch(/^ {2}send_request "\$GET_RETRIES" "\$@"$/m);
    expect(script).toMatch(/^ {2}send_request "\$POST_RETRIES" "\$@" --request POST$/m);
    expect(script).not.toMatch(/^curl_options=.*--retry/m);
  });

  it('sends the new game and the first move through post_once only', () => {
    const calls = [...script.matchAll(REQUEST_CALL)].map(([line, name]) => ({ line, name }));
    const posts = calls.filter(({ name }) => name === 'post_once');

    expect(posts).toHaveLength(2);
    expect(calls.filter(({ line }) => line.includes('POST'))).toEqual([]);
  });
});

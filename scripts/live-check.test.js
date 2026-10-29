import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GAME_STORE_CHECK_ID } from '../worker/constants';

/** The line of `live-check.sh` that sets the id whose status the files-only check asks. */
const STORE_CHECK_ID_LINE = /^readonly STORE_CHECK_GAME_ID='([^']*)'$/m;

describe('live-check.sh', () => {
  it('asks the status of the id that the Worker sends to a Durable Object', () => {
    const script = readFileSync(new URL('./live-check.sh', import.meta.url), 'utf8');

    expect(script.match(STORE_CHECK_ID_LINE)?.[1]).toBe(GAME_STORE_CHECK_ID);
  });
});

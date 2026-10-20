// The entry point of the Cloudflare Worker. The platform serves the files of `public/` first;
// every other request reaches the Express app, which keeps each game in a `Game` Durable Object.
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import createApp from './routes/createApp';
import createGameStore from './worker/createGameStore';
import { SERVER_PORT } from './worker/constants';

const app = createApp({
  games: createGameStore({ namespace: env.GAMES }),
  startLimiter: env.GAME_START_LIMITER,
});
app.listen(SERVER_PORT);

export { default as Game } from './worker/Game';

export default httpServerHandler({ port: SERVER_PORT });

/** Port 0 lets the system pick a free port. */
const ANY_FREE_PORT = 0;

/**
 * Serves an app on a free port, for the tests that call it with `fetch`.
 * @param {import('express').Express} app - The app to serve.
 * @returns {Promise<{ baseUrl: string, close: () => Promise<void> }>} The URL of the server,
 * without a trailing slash, and a function that stops it.
 */
const listen = (app) => new Promise((resolve) => {
  const server = app.listen(ANY_FREE_PORT, () => {
    resolve({
      baseUrl: `http://localhost:${server.address().port}`,
      close: () => new Promise((done) => server.close(done)),
    });
  });
});

export default listen;

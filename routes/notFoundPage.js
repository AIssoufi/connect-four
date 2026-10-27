/**
 * The 404 page of a browser, in French like the game: what happened, with links to the game and
 * to the API docs. Static and without a script, it reuses the stylesheet and the icon of the game,
 * by absolute paths since it answers any unknown path, and `not-found.css` centers its text.
 */
const NOT_FOUND_PAGE = `<!DOCTYPE html>
<html lang="fr">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Cette page de Puissance 4 n'existe pas.">
  <meta name="robots" content="noindex">
  <title>Page introuvable - Puissance 4</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" type="text/css" href="/style.css">
  <link rel="stylesheet" type="text/css" href="/not-found.css">
</head>

<body>
  <header>
    <h1>Puissance 4</h1>
  </header>
  <main id="not-found">
    <h2>Page introuvable</h2>
    <p>Aucune page ne se trouve à cette adresse. Elle a peut-être été mal saisie.</p>
    <ul>
      <li><a href="/">Jouer une partie</a></li>
      <li><a href="/api/v1/">Lire la documentation de l'API</a></li>
    </ul>
  </main>
</body>

</html>
`;

module.exports = NOT_FOUND_PAGE;

const renderBoard = (matrix) => {
  const rowClassName = 'row';
  const columnClassName = 'column token';

  const boardElem = document.querySelector('#board');
  boardElem.innerHTML = '';

  matrix.forEach((row, rowIndex) => {
    const rowElem = document.createElement('div');

    rowElem.className = rowClassName;

    row.forEach((colum, columnIndex) => {
      const columnElem = document.createElement('div');
      const hasToken = colum !== 0;

      columnElem.className = columnClassName;
      columnElem.dataset.row = rowIndex;
      columnElem.dataset.column = columnIndex;

      if (hasToken) {
        const tokenType = colum;
        columnElem.classList.add(`${tokenType}-token`);
      }

      rowElem.appendChild(columnElem);
    });

    boardElem.appendChild(rowElem);
  });

  // eslint-disable-next-line no-console
  console.log('updated !');
};

/**
 * Renders one placeholder token per column; a click plays the next player in that column.
 * @param {object} params
 * @param {string} params.gameId - The id of the game to play.
 * @param {Array<Array<string|number>>} params.board - The board, top row first.
 * @param {string[]} params.players - The ids of the players.
 * @param {string} params.lastPlayerWhoPlayed - The player who made the last move.
 * @param {(statusGame: object) => void} params.onGameStatus - Receives the game status that a
 *   move returns.
 */
const renderPossibilities = ({
  gameId, board, players, lastPlayerWhoPlayed, onGameStatus,
}) => {
  const placeholderTokenClassName = 'token';
  const posElem = document.querySelector('#control-panel');
  posElem.innerHTML = '';

  const nbPossibilities = board[0].length;
  const nexPlayer = players.filter((player) => player !== lastPlayerWhoPlayed)[0];
  for (let i = 0; i < nbPossibilities; i += 1) {
    const tokenElem = document.createElement('div');

    tokenElem.className = placeholderTokenClassName;
    tokenElem.addEventListener('click', () => {
      fetch(`/game/${gameId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: nexPlayer, column: i + 1 }),
      })
        .then((response) => {
          // A refused move, such as one in a full column, leaves the board as it is.
          if (!response.ok) {
            return undefined;
          }

          return response.json().then(onGameStatus);
        });
    });

    posElem.appendChild(tokenElem);
    posElem.className = `current-plyer-is-${nexPlayer}`;
  }
};

const updateBoard = ({
  id, board, players, winner, lastPlayerWhoPlayed,
}) => {
  renderBoard(board);
  renderPossibilities({
    gameId: id, board, players, lastPlayerWhoPlayed, onGameStatus: updateBoard,
  });

  const gameIsEnd = players.some((player) => player === winner);
  if (gameIsEnd) {
    // eslint-disable-next-line no-alert
    alert(`Winner : ${winner}`);
  }
};

/**
 * Starts a new game for this page: each visitor plays their own game, and reloading the page
 * starts another one. Only this page plays the game, so the board needs no polling.
 */
const start = () => {
  fetch('/game', { method: 'POST' })
    .then((response) => response.json())
    .then(updateBoard);
};

document.addEventListener('DOMContentLoaded', () => {
  start();
});

let setIntervalId;

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
 * @param {Array<Array<string|number>>} params.board - The board, top row first.
 * @param {string[]} params.players - The ids of the players.
 * @param {string} params.lastPlayerWhoPlayed - The player who made the last move.
 * @param {(statusGame: object) => void} params.onGameStatus - Receives the game status that a
 *   move returns.
 */
const renderPossibilities = ({
  board, players, lastPlayerWhoPlayed, onGameStatus,
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
      const urlSearchParams = new URLSearchParams();

      urlSearchParams.append('playerid', nexPlayer);
      urlSearchParams.append('column', i + 1);

      const url = `/game/play?${urlSearchParams.toString()}`;
      fetch(url)
        .then((response) => response.json())
        .then((statusGame) => {
          onGameStatus(statusGame);
        });
    });

    posElem.appendChild(tokenElem);
    posElem.className = `current-plyer-is-${nexPlayer}`;
  }
};

const updateBoard = ({
  board, players, winner, lastPlayerWhoPlayed,
}) => {
  renderBoard(board);
  renderPossibilities({
    board, players, lastPlayerWhoPlayed, onGameStatus: updateBoard,
  });

  const gameIsEnd = players.some((player) => player === winner);
  if (gameIsEnd) {
    // eslint-disable-next-line no-alert
    alert(`Winner : ${winner}`);

    clearInterval(setIntervalId);
  }
};

const refreshBoard = () => {
  fetch('/game/status')
    .then((response) => response.json())
    .then((statusGame) => {
      updateBoard(statusGame);
    });
};

const start = () => {
  refreshBoard();
  setIntervalId = setInterval(refreshBoard, 2000);
};

document.addEventListener('DOMContentLoaded', () => {
  start();
});
